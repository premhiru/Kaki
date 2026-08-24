import { expect, it, vi } from "vitest";
import { BrowserRuntime, type BrowserPage } from "../src/index.js";

it("falls back from resilient selectors to vision", async () => {
  const click = vi.fn(async (selector: string) => {
    if (selector !== "vision:confirm") throw new Error("missing");
  });
  const page: BrowserPage = {
    goto: vi.fn(),
    click,
    fill: vi.fn(),
    waitFor: vi.fn(),
    text: async () => "Checkout",
    screenshot: async () => new Uint8Array([1]),
    extract: async () => "",
  };
  await new BrowserRuntime(page, { find: async () => "vision:confirm" }).run([
    { action: "click", selector: "button:has-text('Confirm')" },
  ]);
  expect(click).toHaveBeenLastCalledWith("vision:confirm");
});
