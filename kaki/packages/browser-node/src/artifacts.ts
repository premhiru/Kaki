import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  BrowserTrace,
  LayoutAnnotation,
  LayoutAnnotationSink,
  TraceArtifactSink,
} from "./index.js";

export class FileBrowserTraceSink implements TraceArtifactSink {
  private sequence = 0;

  public constructor(
    private readonly root: string,
    private readonly taskId: string,
  ) {
    ensureSafeSegment(taskId);
  }

  public async append(event: BrowserTrace, screenshot?: Uint8Array): Promise<void> {
    const directory = join(this.root, this.taskId);
    this.sequence += 1;
    const prefix = String(this.sequence).padStart(3, "0");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await appendFile(join(directory, "trace.jsonl"), `${JSON.stringify(event)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    if (screenshot) {
      await writeFile(join(directory, `${prefix}-${event.status}.png`), screenshot, {
        mode: 0o600,
      });
    }
  }
}

/** Writes selector drift observations for nightly learning consolidation. */
export class FileLayoutAnnotationSink implements LayoutAnnotationSink {
  public constructor(private readonly learnedRoot: string) {}

  public async append(annotation: LayoutAnnotation): Promise<void> {
    const host = annotation.pageUrl ? safeHost(annotation.pageUrl) : "unknown-host";
    const directory = join(this.learnedRoot, "browser-layout");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await appendFile(join(directory, `${host}.jsonl`), `${JSON.stringify(annotation)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/[^a-zA-Z0-9.-]/gu, "_").slice(0, 128) || "unknown-host";
  } catch {
    return "unknown-host";
  }
}

function ensureSafeSegment(value: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/u.test(value)) throw new Error("Invalid trace task id");
}
