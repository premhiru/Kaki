import { describe, expect, it, vi } from "vitest";
import {
  ManagedBrowserNode,
  OpenClawManagedBrowserAdapter,
  PlaywrightManagedBrowserAdapter,
  type BrowserPage,
} from "../src/index.js";

describe("production managed-browser adapters", () => {
  it("passes the persistent household profile and SG settings to Playwright", async () => {
    const locator = {
      click: vi.fn(async () => undefined),
      fill: vi.fn(async () => undefined),
      waitFor: vi.fn(async () => undefined),
      innerText: vi.fn(async () => "result"),
    };
    const page = {
      goto: vi.fn(async () => undefined),
      locator: vi.fn(() => locator),
      textContent: vi.fn(async () => "page"),
      screenshot: vi.fn(async () => new Uint8Array([1])),
      url: vi.fn(() => "https://example.sg"),
    };
    const close = vi.fn(async () => undefined);
    const launchPersistentContext = vi.fn(async () => ({
      pages: () => [page],
      newPage: async () => page,
      close,
    }));
    const adapter = new PlaywrightManagedBrowserAdapter({ launchPersistentContext });
    const session = await adapter.launchPersistent({
      userDataDir: "C:/profiles/household-a",
      locale: "en-SG",
      timezoneId: "Asia/Singapore",
      headless: true,
      acceptDownloads: true,
    });

    await session.page.fill("#postal", "560123");
    expect(launchPersistentContext).toHaveBeenCalledWith("C:/profiles/household-a", {
      locale: "en-SG",
      timezoneId: "Asia/Singapore",
      headless: true,
      acceptDownloads: true,
    });
    expect(locator.fill).toHaveBeenCalledWith("560123");
    await session.close();
    expect(close).toHaveBeenCalledOnce();
  });

  it("delegates session ownership and cleanup to OpenClaw's managed browser", async () => {
    const page = fakePage();
    const close = vi.fn(async () => undefined);
    const control = {
      open: vi.fn(async () => ({ sessionId: "managed-1", page })),
      close,
    };
    const session = await new OpenClawManagedBrowserAdapter(control).launchPersistent({
      userDataDir: "/profiles/home",
      locale: "en-SG",
      timezoneId: "Asia/Singapore",
      headless: true,
      acceptDownloads: true,
    });
    expect(session.page).toBe(page);
    await session.close();
    expect(close).toHaveBeenCalledWith("managed-1");
  });
});

it("prevents concurrent sessions from sharing one household cookie profile", async () => {
  let releaseNavigation: (() => void) | undefined;
  const navigation = new Promise<void>((resolve) => {
    releaseNavigation = resolve;
  });
  const page = { ...fakePage(), goto: async () => navigation };
  const node = new ManagedBrowserNode(
    { launchPersistent: async () => ({ page, close: async () => undefined }) },
    { find: async () => undefined },
  );
  const first = node.run({
    taskId: "first",
    householdId: "home",
    steps: [{ action: "goto", url: "https://example.sg" }],
  });
  await Promise.resolve();
  await expect(node.run({ taskId: "second", householdId: "home", steps: [] })).rejects.toThrow(
    "household-browser-profile-already-active",
  );
  releaseNavigation?.();
  await first;
});

function fakePage(): BrowserPage {
  return {
    goto: async () => undefined,
    click: async () => undefined,
    fill: async () => undefined,
    waitFor: async () => undefined,
    text: async () => "",
    screenshot: async () => new Uint8Array(),
    extract: async () => "",
  };
}
