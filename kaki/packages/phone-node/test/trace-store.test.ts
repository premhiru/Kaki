import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { FileTraceSink } from "../src/trace-store.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

it("persists ordered private screenshot, accessibility, and decision evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "kaki-phone-trace-"));
  roots.push(root);
  const sink = new FileTraceSink(root);
  await sink.append(
    "task-1",
    {
      screenshot: new Uint8Array([1, 2, 3]),
      accessibilityTree: '<node text="redacted" />',
      capturedAt: "2026-08-26T00:00:00Z",
    },
    {
      observation: "Ready",
      progress: "Complete",
      action: { type: "done", target: "receipt" },
      confidence: 1,
    },
  );
  await sink.append(
    "task-1",
    { screenshot: new Uint8Array([4]), capturedAt: "2026-08-26T00:00:01Z" },
    {
      observation: "Saved",
      progress: "Complete",
      action: { type: "done", target: "receipt" },
      confidence: 1,
    },
  );
  const directory = join(root, "task-1");
  await expect(readFile(join(directory, "001.png"))).resolves.toEqual(Buffer.from([1, 2, 3]));
  await expect(readFile(join(directory, "001.xml"), "utf8")).resolves.toContain("redacted");
  await expect(stat(join(directory, "002.xml"))).rejects.toMatchObject({ code: "ENOENT" });
  const rows = (await readFile(join(directory, "trace.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map((line): unknown => JSON.parse(line));
  expect(rows).toMatchObject([
    { index: 1, capturedAt: "2026-08-26T00:00:00Z" },
    { index: 2, capturedAt: "2026-08-26T00:00:01Z" },
  ]);
});

it("rejects path traversal before creating trace state", async () => {
  const root = await mkdtemp(join(tmpdir(), "kaki-phone-trace-"));
  roots.push(root);
  await expect(
    new FileTraceSink(root).append(
      "../escape",
      { screenshot: new Uint8Array(), capturedAt: "now" },
      {
        observation: "x",
        progress: "x",
        action: { type: "fail", target: "x" },
        confidence: 1,
      },
    ),
  ).rejects.toThrow("Invalid trace task id");
});
