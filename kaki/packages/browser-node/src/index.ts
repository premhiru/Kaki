import { detectHandoff } from "@kaki/approval-node";

export type BrowserStep =
  | { action: "goto"; url: string }
  | { action: "click"; selector: string; alternatives?: string[]; description?: string }
  | {
      action: "fill";
      selector: string;
      value: string;
      alternatives?: string[];
      description?: string;
    }
  | { action: "wait"; selector: string; alternatives?: string[]; description?: string }
  | {
      action: "extract";
      selector: string;
      key: string;
      alternatives?: string[];
      description?: string;
    }
  | { action: "checkpoint"; label: string };

export interface BrowserPage {
  goto(url: string): Promise<void>;
  click(selector: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  waitFor(selector: string): Promise<void>;
  text(): Promise<string>;
  screenshot(): Promise<Uint8Array>;
  extract(selector: string): Promise<string>;
  url?(): Promise<string>;
}

export interface VisionSelector {
  find(screenshot: Uint8Array, description: string): Promise<string | undefined>;
}

export type BrowserHandoff = "singpass" | "bank-2fa" | "captcha" | "otp" | "paynow";
export type SelectorResolution = "primary" | "alternative" | "vision";
export type RedactedBrowserStep =
  | Omit<Extract<BrowserStep, { action: "fill" }>, "value">
  | Exclude<BrowserStep, { action: "fill" }>;

export interface BrowserTrace {
  readonly step: RedactedBrowserStep;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly status: "ok" | "dry-run" | "handoff" | "failed";
  readonly attempt: number;
  readonly selectorUsed?: string;
  readonly resolution?: SelectorResolution;
  readonly handoff?: BrowserHandoff;
  readonly error?: string;
}

export interface TraceArtifactSink {
  append(event: BrowserTrace, screenshot?: Uint8Array): Promise<void>;
}

export interface LayoutAnnotation {
  readonly taskId?: string;
  readonly pageUrl?: string;
  readonly action: BrowserStep["action"];
  readonly failedSelector: string;
  readonly workingSelector: string;
  readonly resolution: Exclude<SelectorResolution, "primary">;
  readonly observedAt: string;
}

export interface LayoutAnnotationSink {
  append(annotation: LayoutAnnotation): Promise<void>;
}

export interface RuntimeOptions {
  readonly dryRun?: boolean;
  readonly taskId?: string;
  readonly maxAttempts?: number;
  readonly initialBackoffMs?: number;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly traces?: TraceArtifactSink;
  readonly annotations?: LayoutAnnotationSink;
}

export interface BrowserRunResult {
  readonly data: Record<string, string>;
  readonly handoff?: string;
  readonly screenshot?: Uint8Array;
}

export class BrowserRuntime {
  public readonly trace: BrowserTrace[] = [];
  private readonly options: Required<
    Pick<RuntimeOptions, "dryRun" | "maxAttempts" | "initialBackoffMs" | "sleep">
  > &
    RuntimeOptions;

  public constructor(
    private readonly page: BrowserPage,
    private readonly vision: VisionSelector,
    options: RuntimeOptions | boolean = {},
  ) {
    const normalised = typeof options === "boolean" ? { dryRun: options } : options;
    this.options = {
      ...normalised,
      dryRun: normalised.dryRun ?? false,
      maxAttempts: Math.max(1, Math.floor(normalised.maxAttempts ?? 3)),
      initialBackoffMs: Math.max(0, Math.floor(normalised.initialBackoffMs ?? 250)),
      sleep: normalised.sleep ?? delay,
    };
  }

  public async run(steps: readonly BrowserStep[]): Promise<BrowserRunResult> {
    const data: Record<string, string> = {};
    for (const step of steps) {
      const detected = classifyHandoff(await this.page.text());
      if (detected) return this.stopForHandoff(step, data, detected);
      if (step.action === "checkpoint") return this.stopForHandoff(step, data, step.label);
      if (this.options.dryRun && (step.action === "click" || step.action === "fill")) {
        await this.record({
          step: redact(step),
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          status: "dry-run",
          attempt: 0,
        });
        continue;
      }
      const startedAt = new Date().toISOString();
      try {
        const outcome = await this.executeWithRetry(step, data);
        await this.record({
          step: redact(step),
          startedAt,
          finishedAt: new Date().toISOString(),
          status: "ok",
          attempt: outcome.attempt,
          ...(outcome.selectorUsed ? { selectorUsed: outcome.selectorUsed } : {}),
          ...(outcome.resolution ? { resolution: outcome.resolution } : {}),
        });
      } catch (error) {
        const event: BrowserTrace = {
          step: redact(step),
          startedAt,
          finishedAt: new Date().toISOString(),
          status: "failed",
          attempt: this.options.maxAttempts,
          error: error instanceof Error ? error.message : String(error),
        };
        await this.record(event, await safeScreenshot(this.page));
        throw error;
      }
      const afterAction = classifyHandoff(await this.page.text());
      if (afterAction) return this.stopForHandoff(step, data, afterAction);
    }
    return { data };
  }

  private async executeWithRetry(
    step: Exclude<BrowserStep, { action: "checkpoint" }>,
    data: Record<string, string>,
  ): Promise<{ attempt: number; selectorUsed?: string; resolution?: SelectorResolution }> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt += 1) {
      try {
        const selectorResult = await this.executeStep(step, data);
        return { attempt, ...selectorResult };
      } catch (error) {
        lastError = error;
        if (attempt < this.options.maxAttempts) {
          await this.options.sleep(this.options.initialBackoffMs * 2 ** (attempt - 1));
        }
      }
    }
    throw lastError;
  }

  private async executeStep(
    step: Exclude<BrowserStep, { action: "checkpoint" }>,
    data: Record<string, string>,
  ): Promise<{ selectorUsed?: string; resolution?: SelectorResolution }> {
    switch (step.action) {
      case "goto":
        await this.page.goto(step.url);
        return {};
      case "click":
        return this.withFallback(step, (selector) => this.page.click(selector));
      case "fill":
        return this.withFallback(step, (selector) => this.page.fill(selector, step.value));
      case "wait":
        return this.withFallback(step, (selector) => this.page.waitFor(selector));
      case "extract": {
        let value = "";
        const result = await this.withFallback(step, async (selector) => {
          value = await this.page.extract(selector);
        });
        data[step.key] = value;
        return result;
      }
    }
  }

  private async withFallback(
    step: Extract<BrowserStep, { selector: string }>,
    action: (selector: string) => Promise<void>,
  ): Promise<{ selectorUsed: string; resolution: SelectorResolution }> {
    const candidates = [step.selector, ...(step.alternatives ?? [])];
    for (const [index, candidate] of candidates.entries()) {
      try {
        await action(candidate);
        const resolution = index === 0 ? "primary" : "alternative";
        if (resolution !== "primary") await this.annotate(step, candidate, resolution);
        return { selectorUsed: candidate, resolution };
      } catch {
        // Try the next reviewed selector before asking vision.
      }
    }
    const visual = await this.vision.find(
      await this.page.screenshot(),
      step.description ?? step.selector,
    );
    if (!visual) throw new Error(`selector-not-found:${step.selector}`);
    await action(visual);
    await this.annotate(step, visual, "vision");
    return { selectorUsed: visual, resolution: "vision" };
  }

  private async annotate(
    step: Extract<BrowserStep, { selector: string }>,
    workingSelector: string,
    resolution: "alternative" | "vision",
  ): Promise<void> {
    if (!this.options.annotations) return;
    const pageUrl = await this.page.url?.();
    await this.options.annotations.append({
      ...(this.options.taskId ? { taskId: this.options.taskId } : {}),
      ...(pageUrl ? { pageUrl } : {}),
      action: step.action,
      failedSelector: step.selector,
      workingSelector,
      resolution,
      observedAt: new Date().toISOString(),
    });
  }

  private async stopForHandoff(
    step: BrowserStep,
    data: Record<string, string>,
    handoff: string,
  ): Promise<BrowserRunResult> {
    const screenshot = await safeScreenshot(this.page);
    const now = new Date().toISOString();
    await this.record(
      {
        step: redact(step),
        startedAt: now,
        finishedAt: now,
        status: "handoff",
        attempt: 0,
        ...(isBrowserHandoff(handoff) ? { handoff } : {}),
      },
      screenshot,
    );
    return { data, handoff, ...(screenshot ? { screenshot } : {}) };
  }

  private async record(event: BrowserTrace, screenshot?: Uint8Array): Promise<void> {
    this.trace.push(event);
    await this.options.traces?.append(event, screenshot);
  }
}

function classifyHandoff(pageText: string): BrowserHandoff | undefined {
  const detected = detectHandoff(pageText);
  if (detected) return detected;
  if (/\b(one[- ]time (?:code|pin)|verification code|enter otp)\b/iu.test(pageText)) return "otp";
  return undefined;
}

function redact(step: BrowserStep): RedactedBrowserStep {
  if (step.action !== "fill") return step;
  return {
    action: "fill",
    selector: step.selector,
    ...(step.alternatives ? { alternatives: step.alternatives } : {}),
    ...(step.description ? { description: step.description } : {}),
  };
}

function isBrowserHandoff(value: string): value is BrowserHandoff {
  return ["singpass", "bank-2fa", "captcha", "otp", "paynow"].includes(value);
}

async function safeScreenshot(page: BrowserPage): Promise<Uint8Array | undefined> {
  try {
    return await page.screenshot();
  } catch {
    return undefined;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export * from "./managed.js";
export * from "./artifacts.js";
export * from "./surface.js";
export * from "./playwright-adapter.js";
export * from "./openclaw-adapter.js";
