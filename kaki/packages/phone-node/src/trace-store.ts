import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PhoneSnapshot, TraceSink, VisionDecision } from "./index.js";

export class FileTraceSink implements TraceSink {
  private readonly sequence = new Map<string, number>();

  public constructor(private readonly root: string) {}

  public async append(
    taskId: string,
    snapshot: PhoneSnapshot,
    decision: VisionDecision,
  ): Promise<void> {
    const safeTaskId = safeSegment(taskId);
    const directory = join(this.root, safeTaskId);
    const index = (this.sequence.get(safeTaskId) ?? 0) + 1;
    this.sequence.set(safeTaskId, index);
    const prefix = String(index).padStart(3, "0");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await Promise.all([
      writeFile(join(directory, `${prefix}.png`), snapshot.screenshot, { mode: 0o600 }),
      snapshot.accessibilityTree
        ? writeFile(join(directory, `${prefix}.xml`), snapshot.accessibilityTree, {
            encoding: "utf8",
            mode: 0o600,
          })
        : Promise.resolve(),
    ]);
    await appendFile(
      join(directory, "trace.jsonl"),
      `${JSON.stringify({ index, capturedAt: snapshot.capturedAt, decision })}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
  }
}

function safeSegment(value: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/u.test(value)) throw new Error("Invalid trace task id");
  return value;
}
