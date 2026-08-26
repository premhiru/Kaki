import { readResponseWithLimit } from "openclaw/plugin-sdk/response-limit-runtime";
import {
  assertHttpUrlTargetsPrivateNetwork,
  fetchWithSsrFGuard,
  type LookupFn,
} from "openclaw/plugin-sdk/ssrf-runtime";
import type { HttpClient, HttpRequest, HttpResponse } from "./types.js";

const DEFAULT_MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 2;
const MAX_TIMEOUT_MS = 120_000;

type GuardedFetch = typeof fetchWithSsrFGuard;

export interface BoundedHttpClientOptions {
  /** Exact provider origins. Redirects remain inside this set. */
  allowedOrigins: readonly string[];
  /** Explicit local/self-hosted HTTP origins; public cleartext HTTP is never allowed. */
  privateHttpOrigins?: readonly string[];
  maxResponseBytes?: number;
  maxRedirects?: number;
  fetchImpl?: typeof fetch;
  lookupFn?: LookupFn;
  guardedFetch?: GuardedFetch;
}

/** Production model transport using OpenClaw's DNS-pinned SSRF and redirect guard. */
export class BoundedHttpClient implements HttpClient {
  readonly #allowedOrigins: Set<string>;
  readonly #privateHttpOrigins: Set<string>;
  readonly #maxResponseBytes: number;
  readonly #maxRedirects: number;
  readonly #fetchImpl: typeof fetch | undefined;
  readonly #lookupFn: LookupFn | undefined;
  readonly #guardedFetch: GuardedFetch;

  constructor(options: BoundedHttpClientOptions) {
    this.#allowedOrigins = normalizedOrigins(options.allowedOrigins);
    this.#privateHttpOrigins = normalizedOrigins(options.privateHttpOrigins ?? []);
    if (this.#allowedOrigins.size === 0) throw new Error("model-http-origin-allowlist-empty");
    for (const origin of this.#privateHttpOrigins) {
      if (!this.#allowedOrigins.has(origin))
        throw new Error("model-http-private-origin-not-allowed");
      if (!origin.startsWith("http://")) throw new Error("model-http-private-origin-must-use-http");
    }
    this.#maxResponseBytes = positiveInteger(
      options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES,
      "model-http-invalid-response-limit",
    );
    this.#maxRedirects = nonNegativeInteger(
      options.maxRedirects ?? DEFAULT_MAX_REDIRECTS,
      "model-http-invalid-redirect-limit",
    );
    this.#fetchImpl = options.fetchImpl;
    this.#lookupFn = options.lookupFn;
    this.#guardedFetch = options.guardedFetch ?? fetchWithSsrFGuard;
  }

  async request(request: HttpRequest): Promise<HttpResponse> {
    const url = safeRequestUrl(request.url);
    if (!this.#allowedOrigins.has(url.origin)) throw new Error("model-http-origin-denied");
    const privateHttp = url.protocol === "http:";
    if (privateHttp) {
      if (!this.#privateHttpOrigins.has(url.origin)) throw new Error("model-http-tls-required");
      await assertHttpUrlTargetsPrivateNetwork(url.href, {
        dangerouslyAllowPrivateNetwork: true,
        ...(this.#lookupFn ? { lookupFn: this.#lookupFn } : {}),
        errorMessage: "model-http-private-origin-required",
      });
    }
    const timeoutMs = positiveInteger(request.timeoutMs, "model-http-invalid-timeout");
    if (timeoutMs > MAX_TIMEOUT_MS) throw new Error("model-http-timeout-too-large");

    const guarded = await this.#guardedFetch({
      url: url.href,
      init: {
        method: request.method,
        headers: request.headers,
        body: fetchBody(request.body),
      },
      ...(this.#fetchImpl ? { fetchImpl: this.#fetchImpl } : {}),
      ...(this.#lookupFn ? { lookupFn: this.#lookupFn } : {}),
      requireHttps: !privateHttp,
      maxRedirects: this.#maxRedirects,
      timeoutMs,
      policy: {
        allowedOrigins: [...this.#allowedOrigins],
        ...(privateHttp ? { allowPrivateNetwork: true } : {}),
      },
      auditContext: "kaki-model-provider",
    });
    try {
      const body = await readResponseWithLimit(guarded.response, this.#maxResponseBytes, {
        timeoutMs,
        onOverflow: () => new Error("model-http-response-too-large"),
        onTimeout: () => new Error("model-http-response-timeout"),
      });
      return {
        status: guarded.response.status,
        headers: selectedResponseHeaders(guarded.response.headers),
        body: new Uint8Array(body),
      };
    } finally {
      await guarded.release();
    }
  }
}

function fetchBody(
  body: HttpRequest["body"],
): Exclude<NonNullable<Parameters<typeof fetch>[1]>["body"], null | undefined> {
  return typeof body === "string" ? body : Uint8Array.from(body);
}

function safeRequestUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("model-http-invalid-url");
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
    throw new Error("model-http-invalid-url");
  }
  url.hash = "";
  return url;
}

function normalizedOrigins(values: readonly string[]): Set<string> {
  const origins = new Set<string>();
  for (const value of values) {
    const url = safeRequestUrl(value);
    if (url.pathname !== "/" || url.search) throw new Error("model-http-origin-must-be-origin");
    origins.add(url.origin);
  }
  return origins;
}

function selectedResponseHeaders(headers: Headers): Record<string, string> {
  const selected: Record<string, string> = {};
  for (const name of ["content-type", "x-request-id", "request-id"]) {
    const value = headers.get(name);
    if (value) selected[name] = value.slice(0, 512);
  }
  return selected;
}

function positiveInteger(value: number, error: string): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(error);
  return value;
}

function nonNegativeInteger(value: number, error: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(error);
  return value;
}
