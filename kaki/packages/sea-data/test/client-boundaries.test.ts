import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RegionalMemoryCache,
  RegionalPublicClient,
  RegionalRateLimiter,
  RegionalSourceError,
  regionalFetchTransport,
  type RegionalClientConfig,
  type RegionalRequest,
  type RegionalTransport,
} from "../src/index.js";

const config: RegionalClientConfig = {
  country: "my",
  endpoints: {
    "my.weather": {
      sourceId: "my.weather",
      capabilityId: "my.weather",
      authority: "Fixture authority",
      url: "https://weather.example/forecast?location={location}",
      response: "json",
      cacheSeconds: 60,
      parser: (value) => value,
      headers: { Accept: "application/json" },
      credential: { id: "weather-token", header: "Authorization", prefix: "Bearer " },
    },
    "my.holidays": {
      sourceId: "my.holidays",
      capabilityId: "regional.holidays",
      authority: "Fixture authority",
      url: "https://calendar.example/{year}",
      response: "text",
      cacheSeconds: 10,
      parser: (value) => ({ publication: value }),
    },
    "my.prayer": {
      sourceId: "my.prayer",
      capabilityId: "regional.prayer",
      authority: "Fixture authority",
      url: "https://prayer.example/{location}/{date}",
      response: "json",
      cacheSeconds: 10,
      parser: (value) => value,
    },
    "my.causeway": {
      sourceId: "my.causeway",
      capabilityId: "my.causeway",
      authority: "Fixture authority",
      url: "https://traffic.example/{checkpoint}",
      response: "json",
      cacheSeconds: 10,
      parser: (value) => value,
    },
  },
};

const okTransport =
  (requests: RegionalRequest[]): RegionalTransport =>
  async (request) => {
    requests.push(request);
    return {
      status: 200,
      json: async () => ({ ok: true }),
      text: async () => "official publication",
    };
  };

describe("regional client request boundary", () => {
  it("adds credential prefixes, fixed headers, encoded parameters, and provenance", async () => {
    const requests: RegionalRequest[] = [];
    let now = Date.parse("2026-08-26T00:00:00.000Z");
    const client = new RegionalPublicClient(config, {
      transport: okTransport(requests),
      credentials: { "weather-token": "secret-ref-value" },
      now: () => now,
    });
    const first = await client.weather("Johor Bahru");
    now += 1_000;
    const cached = await client.weather("Johor Bahru");

    expect(first).toEqual({
      country: "my",
      sourceId: "my.weather",
      authority: "Fixture authority",
      sourceUrl: "https://weather.example/forecast?location=Johor%20Bahru",
      observedAt: "2026-08-26T00:00:00.000Z",
      data: { ok: true },
    });
    expect(cached).toBe(first);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.headers).toEqual({
      Accept: "application/json",
      Authorization: "Bearer secret-ref-value",
    });
  });

  it("supports the legacy injected transport form and text endpoints", async () => {
    const requests: RegionalRequest[] = [];
    const client = new RegionalPublicClient(
      config,
      okTransport(requests),
      new RegionalMemoryCache(),
      new RegionalRateLimiter(),
      () => Date.parse("2026-08-26T00:00:00.000Z"),
    );
    await expect(client.holidays(2026)).resolves.toMatchObject({
      data: { publication: "official publication" },
    });
    expect(requests[0]?.headers).toBeUndefined();
  });

  it("rejects invalid public parameters and unavailable country capabilities before transport", async () => {
    const transport = vi.fn<RegionalTransport>();
    const client = new RegionalPublicClient(config, { transport });
    expect(() => client.holidays(1999)).toThrow("invalid-holiday-year");
    expect(() => client.holidays(2101)).toThrow("invalid-holiday-year");
    expect(() => client.prayerTimes("KL", "tomorrow")).toThrow("invalid-prayer-date");
    await expect(client.query("id.krl", {}, undefined)).rejects.toThrow(
      "id.krl-source-not-configured",
    );
    expect(() =>
      new RegionalPublicClient({ country: "id", endpoints: {} }, { transport }).causeway(
        "woodlands",
      ),
    ).toThrow("causeway-only-supported-for-my");
    expect(transport).not.toHaveBeenCalled();
  });

  it("classifies retryable provider failures without hiding permanent HTTP errors", async () => {
    for (const [status, retryable] of [
      [400, false],
      [429, true],
      [503, true],
    ] as const) {
      const client = new RegionalPublicClient(config, {
        credentials: { "weather-token": "token" },
        transport: async () => ({
          status,
          json: async () => ({}),
          text: async () => "",
        }),
      });
      const error = await client.weather("KL").catch((reason: unknown) => reason);
      expect(error).toBeInstanceOf(RegionalSourceError);
      expect(error).toMatchObject({ code: "http", status, retryable });
    }
  });
});

describe("regional limiter boundary", () => {
  it("rejects unusable limits and waits exactly until the active window resets", async () => {
    expect(() => new RegionalRateLimiter(0)).toThrow("invalid-regional-rate-limit");
    expect(() => new RegionalRateLimiter(1, 0)).toThrow("invalid-regional-rate-limit");
    let now = 1_000;
    const sleep = vi.fn(async (milliseconds: number) => {
      now += milliseconds;
    });
    const limiter = new RegionalRateLimiter(1, 500, () => now, sleep);
    await limiter.acquire();
    await limiter.acquire();
    expect(sleep).toHaveBeenCalledWith(500, undefined);
    now += 500;
    await limiter.acquire();
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("propagates an already-aborted request instead of waiting through a rate window", async () => {
    const limiter = new RegionalRateLimiter(1, 500, () => 1_000);
    const controller = new AbortController();
    await limiter.acquire(controller.signal);
    controller.abort(new Error("caller-cancelled"));
    await expect(limiter.acquire(controller.signal)).rejects.toThrow("caller-cancelled");
  });
});

describe("regional fetch security boundary", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects unsafe target URLs before fetch and invalid response limits before body reading", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    for (const url of [
      "http://official.example/data",
      "https://user:password@official.example/data",
      "https://official.example:8443/data",
      "https://localhost/data",
      "https://10.0.0.1/data",
      "https://192.168.1.1/data",
      "https://169.254.1.1/data",
      "https://172.16.0.1/data",
    ]) {
      await expect(regionalFetchTransport({ url })).rejects.toBeInstanceOf(RegionalSourceError);
    }
    await expect(
      regionalFetchTransport({ url: "https://official.example/data", maxResponseBytes: 0 }),
    ).rejects.toThrow("invalid-response-limit");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects declared oversized bodies and malformed JSON while allowing an empty body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("small", { status: 200, headers: { "content-length": "100" } }),
      )
      .mockResolvedValueOnce(new Response("not-json", { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      regionalFetchTransport({ url: "https://official.example/data", maxResponseBytes: 10 }),
    ).rejects.toThrow("response-too-large");
    const malformed = await regionalFetchTransport({ url: "https://official.example/data" });
    await expect(malformed.json()).rejects.toThrow("invalid-json");
    const empty = await regionalFetchTransport({ url: "https://official.example/data" });
    await expect(empty.text()).resolves.toBe("");
  });
});
