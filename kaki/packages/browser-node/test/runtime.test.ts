import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { FileBrowserTraceSink } from "../src/artifacts.js";
import { BrowserRuntime, type BrowserPage, type LayoutAnnotation } from "../src/index.js";
import { ManagedBrowserNode, type ManagedBrowserAdapter } from "../src/managed.js";

function page(overrides: Partial<BrowserPage> = {}): BrowserPage {
  return {
    goto: async () => undefined,
    click: async () => undefined,
    fill: async () => undefined,
    waitFor: async () => undefined,
    text: async () => "ordinary page",
    screenshot: async () => new Uint8Array([1, 2, 3]),
    extract: async () => "value",
    url: async () => "https://example.gov.sg/form",
    ...overrides,
  };
}

describe("BrowserRuntime", () => {
  it("uses an alternative selector and files a learned layout annotation", async () => {
    const annotations: LayoutAnnotation[] = [];
    const clicked: string[] = [];
    const runtime = new BrowserRuntime(
      page({
        click: async (selector) => {
          clicked.push(selector);
          if (selector === "old") throw new Error("detached");
        },
      }),
      { find: async () => undefined },
      { annotations: { append: async (annotation) => void annotations.push(annotation) } },
    );
    await runtime.run([{ action: "click", selector: "old", alternatives: ["new"] }]);
    expect(clicked).toEqual(["old", "new"]);
    expect(runtime.trace[0]).toMatchObject({ resolution: "alternative", selectorUsed: "new" });
    expect(annotations).toMatchObject([{ failedSelector: "old", workingSelector: "new" }]);
  });

  it("retries transient navigation failures with exponential backoff", async () => {
    let attempts = 0;
    const waits: number[] = [];
    const runtime = new BrowserRuntime(
      page({
        goto: async () => {
          attempts += 1;
          if (attempts < 3) throw new Error("net::ERR_CONNECTION_RESET");
        },
      }),
      { find: async () => undefined },
      {
        maxAttempts: 3,
        initialBackoffMs: 10,
        sleep: async (milliseconds) => void waits.push(milliseconds),
      },
    );
    await runtime.run([{ action: "goto", url: "https://example.gov.sg" }]);
    expect(attempts).toBe(3);
    expect(waits).toEqual([10, 20]);
    expect(runtime.trace[0]?.attempt).toBe(3);
  });

  it("dry-run skips clicks and fills and never records a field value", async () => {
    const click = vi.fn(async () => undefined);
    const fill = vi.fn(async () => undefined);
    const runtime = new BrowserRuntime(
      page({ click, fill }),
      { find: async () => undefined },
      true,
    );
    await runtime.run([
      { action: "fill", selector: "#nric", value: "S1234567A" },
      { action: "click", selector: "button[type=submit]" },
    ]);
    expect(click).not.toHaveBeenCalled();
    expect(fill).not.toHaveBeenCalled();
    expect(JSON.stringify(runtime.trace)).not.toContain("S1234567A");
    expect(runtime.trace.map((event) => event.status)).toEqual(["dry-run", "dry-run"]);
  });

  it("persists redacted trace events and handoff evidence", async () => {
    const root = mkdtempSync(join(tmpdir(), "kaki-browser-trace-"));
    const sink = new FileBrowserTraceSink(root, "task-1");
    const runtime = new BrowserRuntime(
      page({ text: async () => "Enter one-time code sent to your phone" }),
      { find: async () => undefined },
      { traces: sink },
    );
    const result = await runtime.run([{ action: "fill", selector: "#otp", value: "123456" }]);
    expect(result.handoff).toBe("otp");
    const trace = readFileSync(join(root, "task-1", "trace.jsonl"), "utf8");
    expect(trace).not.toContain("123456");
    expect(trace).toContain('"status":"handoff"');
  });
});

it("opens an isolated persistent profile with Singapore defaults", async () => {
  const close = vi.fn(async () => undefined);
  const launches: unknown[] = [];
  const adapter: ManagedBrowserAdapter = {
    launchPersistent: async (options) => {
      launches.push(options);
      return { page: page(), close };
    },
  };
  const profiles = mkdtempSync(join(tmpdir(), "kaki-browser-profiles-"));
  const node = new ManagedBrowserNode(
    adapter,
    { find: async () => undefined },
    { profileRoot: profiles },
  );
  await node.run({ taskId: "t1", householdId: "family-1", steps: [] });
  expect(launches).toEqual([
    {
      userDataDir: join(profiles, "family-1"),
      locale: "en-SG",
      timezoneId: "Asia/Singapore",
      headless: true,
      acceptDownloads: true,
    },
  ]);
  expect(close).toHaveBeenCalledOnce();
});
