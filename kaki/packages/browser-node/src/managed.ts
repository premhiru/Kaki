import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import {
  BrowserRuntime,
  type BrowserPage,
  type BrowserRunResult,
  type BrowserStep,
  type RuntimeOptions,
  type VisionSelector,
} from "./index.js";

export interface PersistentBrowserOptions {
  readonly userDataDir: string;
  readonly locale: string;
  readonly timezoneId: string;
  readonly headless: boolean;
  readonly acceptDownloads: boolean;
}

export interface ManagedBrowserSession {
  readonly page: BrowserPage;
  close(): Promise<void>;
}

/** Adapter boundary implemented by Playwright in production and by fixtures in CI. */
export interface ManagedBrowserAdapter {
  launchPersistent(options: PersistentBrowserOptions): Promise<ManagedBrowserSession>;
}

export interface BrowserTask {
  readonly taskId: string;
  readonly householdId: string;
  readonly steps: readonly BrowserStep[];
  readonly dryRun?: boolean;
}

export class ManagedBrowserNode {
  private readonly activeHouseholds = new Set<string>();
  public constructor(
    private readonly adapter: ManagedBrowserAdapter,
    private readonly vision: VisionSelector,
    private readonly options: {
      profileRoot?: string;
      locale?: string;
      timezoneId?: string;
      headless?: boolean;
      runtime?: Omit<RuntimeOptions, "taskId" | "dryRun">;
    } = {},
  ) {}

  public profilePath(householdId: string): string {
    ensureSafeId(householdId);
    return join(resolveProfileRoot(this.options.profileRoot), householdId);
  }

  public async open(householdId: string): Promise<ManagedBrowserSession> {
    return this.adapter.launchPersistent({
      userDataDir: this.profilePath(householdId),
      locale: this.options.locale ?? "en-SG",
      timezoneId: this.options.timezoneId ?? "Asia/Singapore",
      headless: this.options.headless ?? true,
      acceptDownloads: true,
    });
  }

  public async run(task: BrowserTask): Promise<BrowserRunResult> {
    if (this.activeHouseholds.has(task.householdId)) {
      throw new Error("household-browser-profile-already-active");
    }
    this.activeHouseholds.add(task.householdId);
    let session: ManagedBrowserSession | undefined;
    try {
      session = await this.open(task.householdId);
      return await new BrowserRuntime(session.page, this.vision, {
        ...this.options.runtime,
        taskId: task.taskId,
        dryRun: task.dryRun ?? false,
      }).run(task.steps);
    } finally {
      try {
        await session?.close();
      } finally {
        this.activeHouseholds.delete(task.householdId);
      }
    }
  }
}

function resolveProfileRoot(configured?: string): string {
  if (!configured) return join(homedir(), ".kaki", "chrome");
  return isAbsolute(configured) ? configured : resolve(configured);
}

function ensureSafeId(value: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/u.test(value)) {
    throw new Error("Invalid household id for browser profile");
  }
}
