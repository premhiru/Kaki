import type { ModelCache } from "./cache.js";
import { modelCacheKey } from "./cache.js";
import type { Pricing, BudgetManager, CostLedgerContract } from "./cost.js";
import { calculateCost } from "./cost.js";
import { routeModel, type RoutingConfig } from "./routing.js";
import type {
  ModelProvider,
  ModelRequest,
  ModelResponse,
  ModelRoute,
  ProviderName,
} from "./types.js";

export interface ModelExecution {
  response: ModelResponse;
  route: ModelRoute;
  costUsd: number;
  cacheHit: boolean;
}
export class ModelRuntime {
  readonly #providers = new Map<ProviderName, ModelProvider>();
  constructor(
    providers: ModelProvider[],
    private readonly ledger: CostLedgerContract,
    private readonly budget: BudgetManager,
    private readonly pricing: Partial<Record<ProviderName, Pricing>>,
    private readonly cache?: ModelCache,
    private readonly routing: RoutingConfig = {},
    private readonly cacheTtlMs = 300_000,
  ) {
    for (const provider of providers) this.#providers.set(provider.name, provider);
  }
  async execute(request: ModelRequest): Promise<ModelExecution> {
    const available = new Set(this.#providers.keys());
    const route = routeModel(request.task, request.locale, available, this.routing);
    const key = modelCacheKey(route, request);
    const cacheAllowed = isCacheAllowed(request);
    if (cacheAllowed && this.cache) {
      const cached = await this.cache.get(key);
      if (cached) {
        await this.ledger.record({
          timestamp: new Date(),
          task: request.task,
          provider: cached.provider,
          model: cached.model,
          usage: { inputTokens: 0, outputTokens: 0 },
          costUsd: 0,
          cacheHit: true,
        });
        return { response: cached, route, costUsd: 0, cacheHit: true };
      }
    }
    const reservation = await this.budget.reserve(request.task, route.maxCostUsd);
    try {
      const selected = await this.completeWithFallback(route, request);
      const rates = this.pricing[selected.response.provider] ?? {
        inputPerMillionUsd: 0,
        outputPerMillionUsd: 0,
      };
      const costUsd = selected.response.costUsd ?? calculateCost(selected.response.usage, rates);
      await this.ledger.record({
        timestamp: new Date(),
        task: request.task,
        provider: selected.response.provider,
        model: selected.response.model,
        usage: selected.response.usage,
        costUsd,
        cacheHit: false,
      });
      if (costUsd > selected.route.maxCostUsd) throw new Error("model-response-cost-exceeded");
      if (cacheAllowed && this.cache) await this.cache.set(key, selected.response, this.cacheTtlMs);
      return { response: selected.response, route: selected.route, costUsd, cacheHit: false };
    } finally {
      await reservation.release();
    }
  }
  private async completeWithFallback(
    route: ModelRoute,
    request: ModelRequest,
  ): Promise<{ response: ModelResponse; route: ModelRoute }> {
    const provider = this.#providers.get(route.provider);
    try {
      if (!provider) throw new Error(`model-provider-unavailable:${route.provider}`);
      return { response: await provider.complete(route.model, request), route };
    } catch (error) {
      if (!route.fallback) throw error;
      const fallback = this.#providers.get(route.fallback.provider);
      if (!fallback) throw error;
      return {
        response: await fallback.complete(route.fallback.model, request),
        route: route.fallback,
      };
    }
  }
}

function isCacheAllowed(request: ModelRequest): boolean {
  return (
    request.cacheable === true &&
    request.dataClass === "public" &&
    request.task !== "safety" &&
    request.task !== "asr" &&
    request.task !== "tts" &&
    request.task !== "vision"
  );
}
