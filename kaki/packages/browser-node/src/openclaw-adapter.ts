import type {
  BrowserPage,
  ManagedBrowserAdapter,
  ManagedBrowserSession,
  PersistentBrowserOptions,
} from "./index.js";

/** Canonical action surface exposed by OpenClaw's managed-browser plugin. */
export interface OpenClawManagedBrowserControl {
  open(options: PersistentBrowserOptions): Promise<{
    readonly sessionId: string;
    readonly page: BrowserPage;
  }>;
  close(sessionId: string): Promise<void>;
}

/** Connects Kaki to OpenClaw's supervised Chrome instead of launching a second process. */
export class OpenClawManagedBrowserAdapter implements ManagedBrowserAdapter {
  constructor(private readonly control: OpenClawManagedBrowserControl) {}

  async launchPersistent(options: PersistentBrowserOptions): Promise<ManagedBrowserSession> {
    const opened = await this.control.open(options);
    if (!opened.sessionId.trim()) throw new Error("openclaw-browser-session-id-missing");
    return {
      page: opened.page,
      close: () => this.control.close(opened.sessionId),
    };
  }
}
