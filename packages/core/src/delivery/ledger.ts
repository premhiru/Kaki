import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export type DeliveryStatus = "pending" | "running" | "completed" | "failed" | "acknowledged";

export interface DeliveryRecord<T = unknown> {
  readonly id: string;
  readonly taskId: string;
  readonly channel: string;
  readonly recipient: string;
  readonly status: DeliveryStatus;
  readonly payload?: T;
  readonly error?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface LedgerEvent<T = unknown> {
  readonly record: DeliveryRecord<T>;
}

/**
 * Append-only result ledger. A completed result is persisted before channel delivery, so a
 * restarted gateway can replay unacknowledged work without recomputing the task.
 */
export class DeliveryLedger {
  public constructor(private readonly file: string) {
    mkdirSync(dirname(file), { recursive: true });
  }

  public create(input: {
    taskId: string;
    channel: string;
    recipient: string;
    id?: string;
  }): DeliveryRecord {
    const now = new Date().toISOString();
    const record: DeliveryRecord = {
      id: input.id ?? randomUUID(),
      taskId: input.taskId,
      channel: input.channel,
      recipient: input.recipient,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    this.append(record);
    return record;
  }

  public transition<T>(
    id: string,
    status: Exclude<DeliveryStatus, "pending">,
    details: { payload?: T; error?: string } = {},
  ): DeliveryRecord<T> {
    const current = this.get<T>(id);
    if (!current) throw new Error(`Unknown delivery record: ${id}`);
    assertTransition(current.status, status);
    const record: DeliveryRecord<T> = {
      ...current,
      ...details,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.append(record);
    return record;
  }

  public get<T = unknown>(id: string): DeliveryRecord<T> | undefined {
    return this.read<T>().get(id);
  }

  public undelivered<T = unknown>(): DeliveryRecord<T>[] {
    return [...this.read<T>().values()].filter((record) => record.status === "completed");
  }

  private append<T>(record: DeliveryRecord<T>): void {
    appendFileSync(this.file, `${JSON.stringify({ record } satisfies LedgerEvent<T>)}\n`, {
      encoding: "utf8",
      flush: true,
    });
  }

  private read<T>(): Map<string, DeliveryRecord<T>> {
    const records = new Map<string, DeliveryRecord<T>>();
    if (!existsSync(this.file)) return records;
    for (const line of readFileSync(this.file, "utf8").split("\n")) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as LedgerEvent<T>;
      records.set(event.record.id, event.record);
    }
    return records;
  }
}

function assertTransition(from: DeliveryStatus, to: DeliveryStatus): void {
  const allowed: Readonly<Record<DeliveryStatus, readonly DeliveryStatus[]>> = {
    pending: ["running", "failed"],
    running: ["completed", "failed"],
    completed: ["acknowledged"],
    failed: ["running"],
    acknowledged: [],
  };
  if (!allowed[from].includes(to)) throw new Error(`Invalid delivery transition: ${from} -> ${to}`);
}
