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
export class CostLedger {
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
export function calculateCost(usage: TokenUsage, pricing: Pricing): number {
  return (
    (usage.inputTokens * pricing.inputPerMillionUsd +
      usage.outputTokens * pricing.outputPerMillionUsd) /
    1_000_000
  );
}
export class BudgetManager {
  constructor(
    private readonly ledger: CostLedger,
    private readonly totalCapUsd: number,
    private readonly taskCaps: Partial<Record<ModelTask, number>> = {},
  ) {}
  assertCanSpend(task: ModelTask, requestedMaxUsd: number): void {
    if (this.ledger.total() + requestedMaxUsd > this.totalCapUsd)
      throw new Error("model-total-budget-exceeded");
    const taskCap = this.taskCaps[task];
    if (taskCap !== undefined && this.ledger.total({ task }) + requestedMaxUsd > taskCap)
      throw new Error(`model-task-budget-exceeded:${task}`);
  }
}
