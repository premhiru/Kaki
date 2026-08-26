import type { ModelTask, ProviderName, TokenUsage } from "./types.js";

export interface Pricing {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}
export interface CostEvent {
  timestamp: Date;
  task: ModelTask;
  provider: ProviderName;
  model: string;
  usage: TokenUsage;
  costUsd: number;
  cacheHit: boolean;
}

export interface CostLedgerContract {
  record(event: CostEvent): void | Promise<void>;
  events(): CostEvent[] | Promise<CostEvent[]>;
  total(filter?: { task?: ModelTask; provider?: ProviderName }): number | Promise<number>;
}

export interface CostEventStore {
  append(event: {
    timestamp: string;
    task: ModelTask;
    provider: ProviderName;
    model: string;
    usage: TokenUsage;
    costUsd: number;
    cacheHit: boolean;
  }): Promise<void>;
  list(): Promise<unknown[]>;
}

/** In-memory implementation for fixtures and short-lived tools only. */
export class CostLedger implements CostLedgerContract {
  readonly #events: CostEvent[] = [];
  record(event: CostEvent): void {
    this.#events.push({ ...event, usage: { ...event.usage } });
  }
  events(): CostEvent[] {
    return this.#events.map((event) => ({ ...event, usage: { ...event.usage } }));
  }
  total(filter: { task?: ModelTask; provider?: ProviderName } = {}): number {
    return this.#events
      .filter(
        (event) =>
          (!filter.task || event.task === filter.task) &&
          (!filter.provider || event.provider === filter.provider),
      )
      .reduce((sum, event) => sum + event.costUsd, 0);
  }
}

/** Durable ledger contract backed by the host's atomic state owner. */
export class DurableCostLedger implements CostLedgerContract {
  constructor(private readonly store: CostEventStore) {}

  async record(event: CostEvent): Promise<void> {
    validateEvent(event);
    await this.store.append({
      ...event,
      timestamp: event.timestamp.toISOString(),
      usage: { ...event.usage },
    });
  }

  async events(): Promise<CostEvent[]> {
    const values = await this.store.list();
    return values.map(parseStoredEvent);
  }

  async total(filter: { task?: ModelTask; provider?: ProviderName } = {}): Promise<number> {
    return (await this.events())
      .filter(
        (event) =>
          (!filter.task || event.task === filter.task) &&
          (!filter.provider || event.provider === filter.provider),
      )
      .reduce((sum, event) => sum + event.costUsd, 0);
  }
}
export function calculateCost(usage: TokenUsage, pricing: Pricing): number {
  return (
    (usage.inputTokens * pricing.inputPerMillionUsd +
      usage.outputTokens * pricing.outputPerMillionUsd) /
    1_000_000
  );
}
export class BudgetManager {
  #gate: Promise<void> = Promise.resolve();
  #reservedTotalUsd = 0;
  readonly #reservedTaskUsd = new Map<ModelTask, number>();

  constructor(
    private readonly ledger: CostLedgerContract,
    private readonly totalCapUsd: number,
    private readonly taskCaps: Partial<Record<ModelTask, number>> = {},
  ) {
    assertBudget(totalCapUsd);
    for (const cap of Object.values(taskCaps)) {
      assertBudget(cap);
    }
  }
  async assertCanSpend(task: ModelTask, requestedMaxUsd: number): Promise<void> {
    const reservation = await this.reserve(task, requestedMaxUsd);
    await reservation.release();
  }

  /** Reserve the worst-case route cost until its durable cost event is recorded. */
  async reserve(task: ModelTask, requestedMaxUsd: number): Promise<{ release(): Promise<void> }> {
    assertBudget(requestedMaxUsd);
    return await this.#withLock(async () => {
      if (
        (await this.ledger.total()) + this.#reservedTotalUsd + requestedMaxUsd >
        this.totalCapUsd
      ) {
        throw new Error("model-total-budget-exceeded");
      }
      const taskCap = this.taskCaps[task];
      const taskReserved = this.#reservedTaskUsd.get(task) ?? 0;
      if (
        taskCap !== undefined &&
        (await this.ledger.total({ task })) + taskReserved + requestedMaxUsd > taskCap
      ) {
        throw new Error(`model-task-budget-exceeded:${task}`);
      }
      this.#reservedTotalUsd += requestedMaxUsd;
      this.#reservedTaskUsd.set(task, taskReserved + requestedMaxUsd);
      let active = true;
      return {
        release: async () => {
          await this.#withLock(() => {
            if (!active) return;
            active = false;
            this.#reservedTotalUsd -= requestedMaxUsd;
            const remaining = (this.#reservedTaskUsd.get(task) ?? 0) - requestedMaxUsd;
            if (remaining > 0) this.#reservedTaskUsd.set(task, remaining);
            else this.#reservedTaskUsd.delete(task);
          });
        },
      };
    });
  }

  async #withLock<T>(run: () => T | Promise<T>): Promise<T> {
    let unlock!: () => void;
    const previous = this.#gate;
    this.#gate = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    await previous;
    try {
      return await run();
    } finally {
      unlock();
    }
  }
}

const MODEL_TASKS = new Set<ModelTask>([
  "planner",
  "tool",
  "vision",
  "normalise",
  "generate",
  "safety",
  "embedding",
  "heartbeat",
  "asr",
  "tts",
]);

const PROVIDERS = new Set<ProviderName>([
  "anthropic",
  "openai",
  "openrouter",
  "ollama",
  "vllm",
  "sea-lion",
  "typhoon",
  "sahabat-ai",
  "mallam",
  "ilmu",
  "sea-guard",
  "meralion",
  "openclaw",
]);

function validateEvent(event: CostEvent): void {
  if (
    !Number.isFinite(event.timestamp.getTime()) ||
    !event.model ||
    event.model.length > 256 ||
    !MODEL_TASKS.has(event.task) ||
    !PROVIDERS.has(event.provider) ||
    !Number.isSafeInteger(event.usage.inputTokens) ||
    event.usage.inputTokens < 0 ||
    !Number.isSafeInteger(event.usage.outputTokens) ||
    event.usage.outputTokens < 0 ||
    !Number.isFinite(event.costUsd) ||
    event.costUsd < 0
  ) {
    throw new Error("model-cost-event-invalid");
  }
}

function assertBudget(value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("model-budget-invalid");
  }
}

function parseStoredEvent(value: unknown): CostEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("model-cost-event-invalid");
  }
  const row = value as Partial<Record<keyof CostEvent, unknown>>;
  const usage = row.usage;
  if (!usage || typeof usage !== "object" || Array.isArray(usage)) {
    throw new Error("model-cost-event-invalid");
  }
  const event = {
    timestamp: new Date(String(row.timestamp)),
    task: row.task as ModelTask,
    provider: row.provider as ProviderName,
    model: row.model,
    usage: {
      inputTokens: (usage as TokenUsage).inputTokens,
      outputTokens: (usage as TokenUsage).outputTokens,
    },
    costUsd: row.costUsd,
    cacheHit: row.cacheHit,
  };
  if (
    typeof event.model !== "string" ||
    typeof event.costUsd !== "number" ||
    typeof event.cacheHit !== "boolean"
  ) {
    throw new Error("model-cost-event-invalid");
  }
  validateEvent(event as CostEvent);
  return event as CostEvent;
}
