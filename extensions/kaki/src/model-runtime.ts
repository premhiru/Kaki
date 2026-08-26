import { randomUUID } from "node:crypto";
import {
  BudgetManager,
  DurableCostLedger,
  DurableModelCache,
  ModelRuntime,
  OpenClawRuntimeProvider,
  type CostEventStore,
  type ModelCacheStore,
  type ModelTask,
  type Pricing,
  type ProviderName,
  type RoutingConfig,
} from "@kaki/models";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";

type Runtime = OpenClawPluginApi["runtime"];

/** Bind Kaki model execution to OpenClaw's configured model/auth and SQLite state owners. */
export function createKakiHostModelRuntime(options: {
  runtime: Runtime;
  totalBudgetUsd: number;
  taskBudgetsUsd?: Partial<Record<ModelTask, number>>;
  pricing?: Partial<Record<ProviderName, Pricing>>;
  routing?: RoutingConfig;
}) {
  const cacheStore = options.runtime.state.openKeyedStore<{
    response: Parameters<ModelCacheStore["write"]>[1]["response"];
    expiresAt: number;
  }>({
    namespace: "kaki-model-cache",
    maxEntries: 2_000,
    overflowPolicy: "evict-oldest",
  });
  const costStore = options.runtime.state.openKeyedStore<
    Awaited<ReturnType<CostEventStore["list"]>>[number]
  >({
    namespace: "kaki-model-costs",
    maxEntries: 50_000,
    overflowPolicy: "evict-oldest",
  });
  const cache = new DurableModelCache({
    lookup: (key) => cacheStore.lookup(key),
    write: (key, value) => cacheStore.register(key, value),
    remove: async (key) => {
      await cacheStore.delete(key);
    },
  });
  const ledger = new DurableCostLedger({
    append: (event) => costStore.register(`${event.timestamp}:${randomUUID()}`, event),
    async list() {
      return (await costStore.entries())
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((entry) => entry.value);
    },
  });
  const provider = new OpenClawRuntimeProvider({
    complete: (input) => options.runtime.llm.complete(input),
  });
  const budget = new BudgetManager(ledger, options.totalBudgetUsd, options.taskBudgetsUsd);
  return {
    runtime: new ModelRuntime(
      [provider],
      ledger,
      budget,
      options.pricing ?? {},
      cache,
      options.routing,
    ),
    ledger,
  };
}
