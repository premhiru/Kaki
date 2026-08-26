import { createHash } from "node:crypto";
import type { ModelRequest, ModelResponse, ModelRoute } from "./types.js";

export interface ModelCache {
  get(key: string): Promise<ModelResponse | undefined>;
  set(key: string, value: ModelResponse, ttlMs: number): Promise<void>;
}

export interface ModelCacheStore {
  lookup(key: string): Promise<unknown>;
  write(key: string, value: { response: ModelResponse; expiresAt: number }): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Durable cache adapter for a host-owned bounded key/value namespace. */
export class DurableModelCache implements ModelCache {
  constructor(
    private readonly store: ModelCacheStore,
    private readonly clock: () => number = Date.now,
  ) {}

  async get(key: string): Promise<ModelResponse | undefined> {
    const value = await this.store.lookup(key);
    if (value === undefined) return undefined;
    const entry = parseCacheEntry(value);
    if (entry.expiresAt <= this.clock()) {
      await this.store.remove(key);
      return undefined;
    }
    return structuredClone(entry.response);
  }

  async set(key: string, value: ModelResponse, ttlMs: number): Promise<void> {
    if (!Number.isSafeInteger(ttlMs) || ttlMs < 1) throw new Error("model-cache-invalid-ttl");
    await this.store.write(key, {
      response: parseResponse(value),
      expiresAt: this.clock() + ttlMs,
    });
  }
}
export class MemoryModelCache implements ModelCache {
  readonly #items = new Map<string, { value: ModelResponse; expiresAt: number }>();
  constructor(private readonly clock: () => number = Date.now) {}
  async get(key: string): Promise<ModelResponse | undefined> {
    const item = this.#items.get(key);
    if (!item) return undefined;
    if (item.expiresAt <= this.clock()) {
      this.#items.delete(key);
      return undefined;
    }
    return structuredClone(item.value);
  }
  async set(key: string, value: ModelResponse, ttlMs: number): Promise<void> {
    this.#items.set(key, { value: structuredClone(value), expiresAt: this.clock() + ttlMs });
  }
}
export function modelCacheKey(route: ModelRoute, request: ModelRequest): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        provider: route.provider,
        model: route.model,
        task: request.task,
        locale: request.locale,
        messages: request.messages,
        maxOutputTokens: request.maxOutputTokens,
        temperature: request.temperature,
        jsonSchema: request.jsonSchema,
        dataClass: request.dataClass,
      }),
    )
    .digest("hex");
}

function parseCacheEntry(value: unknown): { response: ModelResponse; expiresAt: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("model-cache-invalid-entry");
  }
  const entry = value as { response?: unknown; expiresAt?: unknown };
  if (!Number.isSafeInteger(entry.expiresAt) || (entry.expiresAt as number) < 0) {
    throw new Error("model-cache-invalid-entry");
  }
  return { response: parseResponse(entry.response), expiresAt: entry.expiresAt as number };
}

function parseResponse(value: unknown): ModelResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("model-cache-invalid-entry");
  }
  const response = value as Partial<ModelResponse>;
  if (
    typeof response.text !== "string" ||
    response.text.length > 4_000_000 ||
    typeof response.model !== "string" ||
    response.model.length > 256 ||
    typeof response.provider !== "string" ||
    !PROVIDERS.has(response.provider) ||
    !response.usage ||
    !Number.isSafeInteger(response.usage.inputTokens) ||
    response.usage.inputTokens < 0 ||
    !Number.isSafeInteger(response.usage.outputTokens) ||
    response.usage.outputTokens < 0
  ) {
    throw new Error("model-cache-invalid-entry");
  }
  if (
    (response.costUsd !== undefined &&
      (typeof response.costUsd !== "number" ||
        !Number.isFinite(response.costUsd) ||
        response.costUsd < 0)) ||
    (response.sourceProvider !== undefined &&
      (typeof response.sourceProvider !== "string" || response.sourceProvider.length > 256)) ||
    (response.finishReason !== undefined &&
      (typeof response.finishReason !== "string" || response.finishReason.length > 256))
  ) {
    throw new Error("model-cache-invalid-entry");
  }
  return structuredClone(response as ModelResponse);
}

const PROVIDERS = new Set([
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
