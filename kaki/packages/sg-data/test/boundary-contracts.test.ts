import { describe, expect, it, vi } from "vitest";
import {
  CachedHttpClient,
  FixedWindowRateLimiter,
  MemoryCache,
  NeaPublicClient,
  SingaporeApiError,
  asArray,
  evaluateMonitor,
  fetchTransport,
  requireApiRecord,
  systemClock,
  type Clock,
  type DataGovSgClient,
  type HttpTransport,
} from "../src/index.js";

class ProbeClient extends CachedHttpClient {
  read(url: string, validate: (value: unknown) => string, cacheKey?: string) {
    return this.getJson(new URL(url), { ttlMs: 10, validate, ...(cacheKey ? { cacheKey } : {}) });
  }
}

describe("Singapore HTTP safety boundary", () => {
  it("reuses fresh cache entries, deletes stale values, and marks retryable HTTP failures", async () => {
    let now = 100;
    const clock: Clock = { now: () => now, sleep: async () => undefined };
    const cache = new MemoryCache();
    const transport = vi.fn<HttpTransport>(async () => ({
      status: 200,
      json: async () => ({ value: "live" }),
      text: async () => "",
    }));
    const client = new ProbeClient({ cache, clock, transport });
    await cache.set("shared", { value: "cached", expiresAt: 101 });
    await expect(
      client.read(
        "https://api.test/value",
        (value) => requireApiRecord(value).value as string,
        "shared",
      ),
    ).resolves.toBe("cached");
    expect(transport).not.toHaveBeenCalled();
    now = 102;
    await expect(
      client.read(
        "https://api.test/value",
        (value) => requireApiRecord(value).value as string,
        "shared",
      ),
    ).resolves.toBe("live");
    expect(transport).toHaveBeenCalledTimes(1);

    const limited = new ProbeClient({
      transport: async () => ({ status: 429, json: async () => ({}), text: async () => "" }),
      clock,
    });
    await expect(limited.read("https://api.test/limited", String)).rejects.toMatchObject({
      code: "http",
      status: 429,
      retryable: true,
    });
  });

  it("rejects malformed JSON, invalid record/array shapes, and oversized bodies", async () => {
    const client = new ProbeClient({
      transport: async () => ({
        status: 200,
        json: async () => {
          throw new SyntaxError("bad json");
        },
        text: async () => "bad",
      }),
    });
    await expect(client.read("https://api.test/bad", String)).rejects.toMatchObject({
      code: "invalid-response",
    });
    expect(() => requireApiRecord([], "payload")).toThrow("payload must be an object");
    expect(() => asArray({}, "items")).toThrow("items must be an array");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("large", { headers: { "content-length": "5" } })),
    );
    await expect(
      fetchTransport({ url: "https://api.test", maxResponseBytes: 4 }),
    ).rejects.toBeInstanceOf(SingaporeApiError);
    vi.unstubAllGlobals();
  });

  it("waits once when the fixed window is exhausted and propagates abort reasons", async () => {
    let now = 10;
    const sleeps: number[] = [];
    const clock: Clock = {
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
    };
    const limiter = new FixedWindowRateLimiter(1, 50, clock);
    await limiter.acquire();
    await limiter.acquire();
    expect(sleeps).toEqual([50]);
    expect(() => new FixedWindowRateLimiter(0, 10, clock)).toThrow("invalid-rate-limit");

    const controller = new AbortController();
    controller.abort(new Error("cancelled-by-operator"));
    await expect(systemClock.sleep(1, controller.signal)).rejects.toThrow("cancelled-by-operator");
  });
});

describe("monitor and NEA public contracts", () => {
  it("produces a notification and a quiet result for every monitor family", () => {
    const cases = [
      ["rain-before-commute", { probability: 80, minutesUntilCommute: 20 }],
      ["train-disruption", { affected: true, line: "NSL" }],
      ["haze", { psi: 120 }],
      ["hawker-closure", { closed: true, name: "Market" }],
      ["cpf-deadline", { daysRemaining: 2 }],
      ["srs-deadline", { daysRemaining: 2 }],
      ["iras-window", { open: true, daysRemaining: 2 }],
      ["dengue-near-home", { distanceMetres: 200, cases: 3 }],
      ["erp-change", { oldRate: 1, newRate: 2 }],
      ["vehicle-expiry", { daysRemaining: 2 }],
      ["road-tax-expiry", { daysRemaining: 2 }],
      ["season-parking-expiry", { daysRemaining: 2 }],
      ["insurance-expiry", { daysRemaining: 2 }],
      ["coe-result", { watched: true, premium: 99_000 }],
      ["housing-match", { newMatches: 2 }],
      ["bto-match", { newMatches: 1 }],
      ["resale-match", { newMatches: 2 }],
    ] as const;
    for (const [kind, input] of cases) {
      const active = evaluateMonitor(kind, input);
      expect(active.shouldNotify, kind).toBe(true);
      expect(active.message, kind).toBeTruthy();
      const quiet = evaluateMonitor(kind, {});
      expect(quiet.shouldNotify, kind).toBe(false);
      expect(quiet.message, kind).toBeUndefined();
    }
  });

  it("maps every NEA observation name onto the owning data.gov.sg client", async () => {
    const realtime = vi.fn(async (dataset: string) => ({
      dataset,
      readings: [],
      updatedAt: "now",
    }));
    const client = new NeaPublicClient({ realtime } as unknown as DataGovSgClient);
    await Promise.all([
      client.twoHourForecast(),
      client.twentyFourHourForecast(),
      client.rainfall(),
      client.psi(),
      client.pm25(),
      client.uv(),
    ]);
    expect(realtime.mock.calls.map(([dataset]) => dataset)).toEqual([
      "two-hr-forecast",
      "twenty-four-hr-forecast",
      "rainfall",
      "psi",
      "pm25",
      "uv",
    ]);
  });
});
