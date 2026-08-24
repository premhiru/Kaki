import type { Locale, ModelRoute, ModelTask, ProviderName } from "./types.js";

export interface RoutingConfig {
  overrides?: Partial<Record<`${ModelTask}:${Locale}` | ModelTask, ModelRoute>>;
  disabledProviders?: ProviderName[];
  taskMaxCostUsd?: Partial<Record<ModelTask, number>>;
}

export function routeModel(
  task: ModelTask,
  locale: Locale,
  available: Set<string> = new Set(),
  config: RoutingConfig = {},
): ModelRoute {
  const override = config.overrides?.[`${task}:${locale}`] ?? config.overrides?.[task];
  if (override) return cap(override, task, config);
  let route: ModelRoute;
  if (task === "normalise")
    route = {
      provider: available.has("ollama") ? "ollama" : "openrouter",
      model: available.has("ollama") ? "qwen3:8b" : "qwen/qwen3-8b",
      maxCostUsd: 0.002,
      local: available.has("ollama"),
    };
  else if (task === "heartbeat")
    route = {
      provider: available.has("ollama") ? "ollama" : "openai",
      model: available.has("ollama") ? "qwen3:4b" : "gpt-5-nano",
      maxCostUsd: 0.001,
      local: available.has("ollama"),
    };
  else if (task === "safety")
    route = {
      provider: "sea-guard",
      model: "SEA-Guard",
      maxCostUsd: 0.002,
      local: available.has("sea-guard"),
    };
  else if (task === "embedding")
    route = {
      provider: available.has("ollama") ? "ollama" : "vllm",
      model: "bge-m3",
      maxCostUsd: 0.001,
      local: true,
    };
  else if (task === "asr")
    route = {
      provider: available.has("meralion") ? "meralion" : "openai",
      model: available.has("meralion") ? "MERaLiON-2" : "whisper-large-v3-turbo",
      maxCostUsd: 0.03,
      local: available.has("meralion"),
    };
  else if (task === "generate" && locale === "th")
    route = {
      provider: "typhoon",
      model: "typhoon-v2.5",
      maxCostUsd: 0.03,
      local: false,
      fallback: { provider: "sea-lion", model: "SEA-LION-v4.5", maxCostUsd: 0.03, local: false },
    };
  else if (task === "generate" && locale === "id")
    route = {
      provider: "sahabat-ai",
      model: "sahabat-70b",
      maxCostUsd: 0.03,
      local: false,
      fallback: { provider: "sea-lion", model: "SEA-LION-v4.5", maxCostUsd: 0.03, local: false },
    };
  else if (task === "generate" && ["sg", "my", "vn", "ph"].includes(locale))
    route = {
      provider: "sea-lion",
      model: "SEA-LION-v4.5",
      maxCostUsd: 0.03,
      local: false,
      fallback: { provider: "openai", model: "gpt-5-mini", maxCostUsd: 0.03, local: false },
    };
  else
    route = {
      provider: "anthropic",
      model: "claude-sonnet",
      maxCostUsd: 0.15,
      local: false,
      fallback: { provider: "openai", model: "gpt-5", maxCostUsd: 0.15, local: false },
    };
  const disabled = new Set(config.disabledProviders ?? []);
  if (disabled.has(route.provider) && route.fallback && !disabled.has(route.fallback.provider))
    route = route.fallback;
  return cap(route, task, config);
}

function cap(route: ModelRoute, task: ModelTask, config: RoutingConfig): ModelRoute {
  const configured = config.taskMaxCostUsd?.[task];
  if (configured === undefined || configured >= route.maxCostUsd) return route;
  return {
    ...route,
    maxCostUsd: configured,
    ...(route.fallback
      ? {
          fallback: {
            ...route.fallback,
            maxCostUsd: Math.min(configured, route.fallback.maxCostUsd),
          },
        }
      : {}),
  };
}
