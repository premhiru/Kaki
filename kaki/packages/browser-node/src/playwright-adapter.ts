import type {
  BrowserPage,
  ManagedBrowserAdapter,
  ManagedBrowserSession,
  PersistentBrowserOptions,
} from "./index.js";

export interface PlaywrightLocatorLike {
  click(): Promise<void>;
  fill(value: string): Promise<void>;
  waitFor(): Promise<void>;
  innerText(): Promise<string>;
}

export interface PlaywrightPageLike {
  goto(url: string): Promise<unknown>;
  locator(selector: string): PlaywrightLocatorLike;
  textContent(selector: string): Promise<string | null>;
  screenshot(options?: { type?: "png" }): Promise<Uint8Array>;
  url(): string;
}

export interface PlaywrightContextLike {
  pages(): readonly PlaywrightPageLike[];
  newPage(): Promise<PlaywrightPageLike>;
  close(): Promise<void>;
  tracing?: {
    start(options: { screenshots: boolean; snapshots: boolean; sources: boolean }): Promise<void>;
  };
}

export interface PlaywrightChromiumLike {
  launchPersistentContext(
    userDataDir: string,
    options: {
      locale: string;
      timezoneId: string;
      headless: boolean;
      acceptDownloads: boolean;
    },
  ): Promise<PlaywrightContextLike>;
}

/**
 * Production adapter for `playwright-core` or Playwright's Chromium object.
 * The host supplies OpenClaw's pinned runtime, avoiding a second browser download.
 */
export class PlaywrightManagedBrowserAdapter implements ManagedBrowserAdapter {
  constructor(private readonly chromium: PlaywrightChromiumLike) {}

  async launchPersistent(options: PersistentBrowserOptions): Promise<ManagedBrowserSession> {
    const context = await this.chromium.launchPersistentContext(options.userDataDir, {
      locale: options.locale,
      timezoneId: options.timezoneId,
      headless: options.headless,
      acceptDownloads: options.acceptDownloads,
    });
    await context.tracing?.start({ screenshots: true, snapshots: true, sources: false });
    const page = context.pages()[0] ?? (await context.newPage());
    return {
      page: new PlaywrightBrowserPage(page),
      close: () => context.close(),
    };
  }
}

class PlaywrightBrowserPage implements BrowserPage {
  constructor(private readonly page: PlaywrightPageLike) {}

  async goto(url: string): Promise<void> {
    await this.page.goto(url);
  }

  click(selector: string): Promise<void> {
    return this.page.locator(selector).click();
  }

  fill(selector: string, value: string): Promise<void> {
    return this.page.locator(selector).fill(value);
  }

  waitFor(selector: string): Promise<void> {
    return this.page.locator(selector).waitFor();
  }

  async text(): Promise<string> {
    return (await this.page.textContent("body")) ?? "";
  }

  screenshot(): Promise<Uint8Array> {
    return this.page.screenshot({ type: "png" });
  }

  extract(selector: string): Promise<string> {
    return this.page.locator(selector).innerText();
  }

  async url(): Promise<string> {
    return this.page.url();
  }
}
