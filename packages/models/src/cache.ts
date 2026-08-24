import { createHash } from "node:crypto";
import type { ModelRequest, ModelResponse, ModelRoute } from "./types.js";

export interface ModelCache {
  get(key: string): Promise<ModelResponse | undefined>;
  set(key: string, value: ModelResponse, ttlMs: number): Promise<void>;
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
      }),
    )
    .digest("hex");
}
