export interface HttpRequest {
  readonly url: string;
  readonly method?: "GET" | "POST";
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
  readonly signal?: AbortSignal;
  readonly maxResponseBytes?: number;
}

export interface HttpResponse {
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type HttpTransport = (request: HttpRequest) => Promise<HttpResponse>;

export interface Clock {
  now(): number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: (ms, signal) =>
    new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError(signal));
        return;
      }
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(abortError(signal));
        },
        { once: true },
      );
    }),
};

function abortError(signal: AbortSignal): Error {
  return signal.reason instanceof Error ? signal.reason : new Error("operation-aborted");
}

export const fetchTransport: HttpTransport = async (request) => {
  const response = await fetch(request.url, {
    method: request.method ?? "GET",
    ...(request.headers ? { headers: request.headers } : {}),
    ...(request.body ? { body: request.body } : {}),
    ...(request.signal ? { signal: request.signal } : {}),
    redirect: "error",
  });
  const body = await readBoundedBody(response, request.maxResponseBytes ?? 25 * 1024 * 1024);
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    json: async () => JSON.parse(body) as unknown,
    text: async () => body,
  };
};

async function readBoundedBody(response: Response, maxBytes: number): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new SingaporeApiError("invalid-response", "Singapore API response exceeded size limit");
  }
  if (!response.body) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of response.body) {
    if (!(chunk instanceof Uint8Array)) {
      throw new SingaporeApiError(
        "invalid-response",
        "Singapore API returned an invalid body chunk",
      );
    }
    total += chunk.byteLength;
    if (total > maxBytes) {
      throw new SingaporeApiError("invalid-response", "Singapore API response exceeded size limit");
    }
    chunks.push(chunk);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export interface CacheEntry<T> {
  readonly value: T;
  readonly expiresAt: number;
}

export interface CacheStore {
  get<T>(key: string): Promise<CacheEntry<T> | undefined>;
  set<T>(key: string, entry: CacheEntry<T>): Promise<void>;
  delete(key: string): Promise<void>;
}

export class MemoryCache implements CacheStore {
  private readonly values = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<CacheEntry<T> | undefined> {
    return this.values.get(key) as CacheEntry<T> | undefined;
  }

  async set<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    this.values.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}

export class FixedWindowRateLimiter {
  private windowStartedAt = 0;
  private used = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly clock: Clock = systemClock,
  ) {
    if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs <= 0) {
      throw new Error("invalid-rate-limit");
    }
  }

  async acquire(signal?: AbortSignal): Promise<void> {
    const now = this.clock.now();
    if (this.windowStartedAt === 0 || now - this.windowStartedAt >= this.windowMs) {
      this.windowStartedAt = now;
      this.used = 0;
    }
    if (this.used >= this.limit) {
      const waitMs = this.windowMs - (now - this.windowStartedAt);
      await this.clock.sleep(Math.max(0, waitMs), signal);
      this.windowStartedAt = this.clock.now();
      this.used = 0;
    }
    this.used += 1;
  }
}

export interface CachedHttpClientOptions {
  readonly transport?: HttpTransport;
  readonly cache?: CacheStore;
  readonly limiter?: FixedWindowRateLimiter;
  readonly clock?: Clock;
}

export class SingaporeApiError extends Error {
  constructor(
    readonly code: "http" | "invalid-response" | "provider" | "authentication",
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "SingaporeApiError";
  }
}

export abstract class CachedHttpClient {
  protected readonly transport: HttpTransport;
  protected readonly cache: CacheStore;
  protected readonly clock: Clock;
  protected readonly limiter: FixedWindowRateLimiter;

  constructor(options: CachedHttpClientOptions = {}) {
    this.transport = options.transport ?? fetchTransport;
    this.cache = options.cache ?? new MemoryCache();
    this.clock = options.clock ?? systemClock;
    this.limiter = options.limiter ?? new FixedWindowRateLimiter(30, 60_000, this.clock);
  }

  protected async getJson<T>(
    url: URL,
    options: {
      readonly headers?: Readonly<Record<string, string>>;
      readonly ttlMs: number;
      readonly cacheKey?: string;
      readonly limiter?: FixedWindowRateLimiter;
      readonly signal?: AbortSignal;
      readonly validate: (value: unknown) => T;
    },
  ): Promise<T> {
    const key = options.cacheKey ?? url.toString();
    const cached = await this.cache.get<T>(key);
    if (cached && cached.expiresAt > this.clock.now()) return cached.value;
    if (cached) await this.cache.delete(key);

    await (options.limiter ?? this.limiter).acquire(options.signal);
    const response = await this.transport({
      url: url.toString(),
      maxResponseBytes: 25 * 1024 * 1024,
      ...(options.headers ? { headers: options.headers } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (response.status < 200 || response.status >= 300) {
      throw new SingaporeApiError(
        "http",
        `Singapore API request failed with HTTP ${response.status}`,
        response.status,
        response.status === 429 || response.status >= 500,
      );
    }
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new SingaporeApiError("invalid-response", "Singapore API returned invalid JSON");
    }
    const value = options.validate(raw);
    await this.cache.set(key, { value, expiresAt: this.clock.now() + options.ttlMs });
    return value;
  }
}

export function requireApiRecord(value: unknown, label = "response"): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new SingaporeApiError("invalid-response", `${label} must be an object`);
  }
  return value;
}

export function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value))
    throw new SingaporeApiError("invalid-response", `${label} must be an array`);
  return value;
}
import { isRecord } from "@openclaw/normalization-core/record-coerce";
