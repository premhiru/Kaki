import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { BrowserRuntime, type BrowserPage, type BrowserStep } from "../src/index.js";

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

it("replays the selector-change fixture", async () => {
  const fixture = JSON.parse(readFileSync(join(fixtureRoot, "selector-change.json"), "utf8")) as {
    steps: BrowserStep[];
    page: { url: string; text: string; workingSelectors: string[] };
    expect: { resolution: string; annotation: boolean };
  };
  const annotations: unknown[] = [];
  const page: BrowserPage = {
    goto: async () => undefined,
    click: async (selector) => {
      if (!fixture.page.workingSelectors.includes(selector)) throw new Error("missing selector");
    },
    fill: async () => undefined,
    waitFor: async () => undefined,
    text: async () => fixture.page.text,
    screenshot: async () => new Uint8Array([1]),
    extract: async () => "",
    url: async () => fixture.page.url,
  };
  const runtime = new BrowserRuntime(
    page,
    { find: async () => undefined },
    {
      annotations: { append: async (annotation) => void annotations.push(annotation) },
    },
  );
  await runtime.run(fixture.steps);
  expect(runtime.trace[0]?.resolution).toBe(fixture.expect.resolution);
  expect(annotations.length > 0).toBe(fixture.expect.annotation);
});

describe("handoff fixtures", () => {
  const fixtures = JSON.parse(readFileSync(join(fixtureRoot, "handoffs.json"), "utf8")) as Array<{
    name: string;
    pageText: string;
    expect: string;
  }>;
  it.each(fixtures)("detects $name", async (fixture) => {
    const click = vi.fn(async () => undefined);
    const page: BrowserPage = {
      goto: async () => undefined,
      click,
      fill: async () => undefined,
      waitFor: async () => undefined,
      text: async () => fixture.pageText,
      screenshot: async () => new Uint8Array([9]),
      extract: async () => "",
    };
    const result = await new BrowserRuntime(page, { find: async () => undefined }).run([
      { action: "click", selector: "button" },
    ]);
    expect(result.handoff).toBe(fixture.expect);
    expect(click).not.toHaveBeenCalled();
    expect(result.screenshot).toEqual(new Uint8Array([9]));
  });
});
