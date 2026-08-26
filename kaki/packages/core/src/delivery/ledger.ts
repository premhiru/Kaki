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

export interface DeliveryLedgerStore {
  get<T = unknown>(id: string): Promise<DeliveryRecord<T> | undefined>;
  create<T = unknown>(record: DeliveryRecord<T>): Promise<boolean>;
  compareAndSwap<T = unknown>(
    id: string,
    expected: DeliveryStatus,
    record: DeliveryRecord<T>,
  ): Promise<boolean>;
  values<T = unknown>(): Promise<readonly DeliveryRecord<T>[]>;
}

export class MemoryDeliveryLedgerStore implements DeliveryLedgerStore {
  readonly #records = new Map<string, DeliveryRecord>();
  async get<T = unknown>(id: string): Promise<DeliveryRecord<T> | undefined> {
    const record = this.#records.get(id);
    return record ? (structuredClone(record) as DeliveryRecord<T>) : undefined;
  }
  async create<T = unknown>(record: DeliveryRecord<T>): Promise<boolean> {
    if (this.#records.has(record.id)) return false;
    this.#records.set(record.id, structuredClone(record));
    return true;
  }
  async compareAndSwap<T = unknown>(
    id: string,
    expected: DeliveryStatus,
    record: DeliveryRecord<T>,
  ): Promise<boolean> {
    if (this.#records.get(id)?.status !== expected) return false;
    this.#records.set(id, structuredClone(record));
    return true;
  }
  async values<T = unknown>(): Promise<readonly DeliveryRecord<T>[]> {
    return [...this.#records.values()].map(
      (record) => structuredClone(record) as DeliveryRecord<T>,
    );
  }
}

/**
 * Delivery state machine over a host-owned durable store. Production wires this to OpenClaw's
 * SQLite delivery queue; this package never creates a parallel file or database.
 */
export class DeliveryLedger {
  public constructor(private readonly store: DeliveryLedgerStore) {}

  public async create(input: {
    taskId: string;
    channel: string;
    recipient: string;
    id?: string;
  }): Promise<DeliveryRecord> {
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
    if (!(await this.store.create(record)))
      throw new Error(`Duplicate delivery record: ${record.id}`);
    return record;
  }

  public async transition<T>(
    id: string,
    status: Exclude<DeliveryStatus, "pending">,
    details: { payload?: T; error?: string } = {},
  ): Promise<DeliveryRecord<T>> {
    const current = await this.get<T>(id);
    if (!current) throw new Error(`Unknown delivery record: ${id}`);
    assertTransition(current.status, status);
    const record: DeliveryRecord<T> = {
      ...current,
      ...details,
      status,
      updatedAt: new Date().toISOString(),
    };
    if (!(await this.store.compareAndSwap(id, current.status, record))) {
      throw new Error(`Concurrent delivery transition: ${id}`);
    }
    return record;
  }

  public get<T = unknown>(id: string): Promise<DeliveryRecord<T> | undefined> {
    return this.store.get<T>(id);
  }

  public async undelivered<T = unknown>(): Promise<readonly DeliveryRecord<T>[]> {
    return (await this.store.values<T>()).filter((record) => record.status === "completed");
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
