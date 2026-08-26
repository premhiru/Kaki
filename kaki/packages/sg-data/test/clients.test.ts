import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { SingaporeApiError } from "../src/index.js";
import {
  DataGovSgClient,
  FixedWindowRateLimiter,
  LtaDatamallClient,
  MemoryCache,
  NeaPublicClient,
  OneMapClient,
  type Clock,
  type HttpRequest,
  type HttpTransport,
} from "../src/index.js";

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"));
}

function fixtureTransport(
  value: unknown,
  capture: HttpRequest[] = [],
  status = 200,
): HttpTransport {
  return async (request) => {
    capture.push(request);
    return {
      status,
      json: async () => value,
      text: async () => JSON.stringify(value),
    };
  };
}

describe("LTA DataMall client", () => {
  it("calls the real BusArrivalv2 path, maps arrivals, and caches identical reads", async () => {
    const requests: HttpRequest[] = [];
    const client = new LtaDatamallClient({
      accountKey: "fixture-key",
      transport: fixtureTransport(fixture("lta-bus-arrival"), requests),
      cache: new MemoryCache(),
    });

    const first = await client.busArrival("12345", "166");
    const second = await client.busArrival("12345", "166");
    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({
      serviceNo: "166",
      operator: "SBST",
      nextBuses: [{ latitude: 1.3001, load: "SEA" }],
    });
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toContain(
      "/ltaodataservice/BusArrivalv2?BusStopCode=12345&ServiceNo=166",
    );
    expect(requests[0]?.headers).toMatchObject({ AccountKey: "fixture-key" });
  });

  it("marks provider throttling as retryable", async () => {
    const client = new LtaDatamallClient({
      accountKey: "fixture-key",
      transport: fixtureTransport({}, [], 429),
    });
    await expect(client.busArrival("12345")).rejects.toMatchObject({
      code: "http",
      status: 429,
      retryable: true,
    } satisfies Partial<SingaporeApiError>);
  });
});

describe("data.gov.sg and NEA public client", () => {
  it("uses the v2 realtime endpoint and x-api-key", async () => {
    const requests: HttpRequest[] = [];
    const dataGov = new DataGovSgClient({
      apiKey: "fixture-key",
      transport: fixtureTransport(fixture("data-gov-pm25"), requests),
    });
    const nea = new NeaPublicClient(dataGov);
    const response = await nea.pm25("2026-08-24");
    expect(response.data).toHaveProperty("records");
    expect(requests[0]?.url).toBe(
      "https://api-open.data.gov.sg/v2/real-time/api/pm25?date=2026-08-24",
    );
    expect(requests[0]?.headers).toMatchObject({ "x-api-key": "fixture-key" });
  });

  it("queries the official datastore_search endpoint", async () => {
    const requests: HttpRequest[] = [];
    const dataGov = new DataGovSgClient({
      transport: fixtureTransport(
        { success: true, result: { records: [{ _id: 1, name: "fixture hawker" }] } },
        requests,
      ),
    });
    const rows = await dataGov.datasetRows("d_fixture", 20, 40);
    expect(rows[0]?.fields.name).toBe("fixture hawker");
    expect(requests[0]?.url).toBe(
      "https://data.gov.sg/api/action/datastore_search?resource_id=d_fixture&limit=20&offset=40",
    );
  });

  it("refuses a poll response that points downloads outside official blob hosts", async () => {
    const requests: HttpRequest[] = [];
    const dataGov = new DataGovSgClient({
      transport: fixtureTransport(
        { code: 0, data: { url: "https://127.0.0.1/internal" } },
        requests,
      ),
    });
    await expect(dataGov.datasetGeoJson("d_fixture")).rejects.toThrow(
      "data-gov-download-url-denied",
    );
    expect(requests).toHaveLength(1);
  });
});

describe("OneMap client", () => {
  it("sends the token required by Search and maps authoritative address fields", async () => {
    const requests: HttpRequest[] = [];
    const client = new OneMapClient({
      token: "fixture-token",
      transport: fixtureTransport(fixture("onemap-search"), requests),
    });
    const results = await client.search("200640");
    expect(results[0]).toMatchObject({
      block: "640",
      roadName: "ROWELL ROAD",
      postalCode: "200640",
      latitude: 1.30743547948389,
    });
    expect(requests[0]?.headers).toMatchObject({ Authorization: "fixture-token" });
    expect(requests[0]?.url).toContain("/api/common/elastic/search?searchVal=200640");
  });

  it("surfaces OneMap's HTTP-200 authentication errors", async () => {
    const client = new OneMapClient({
      token: "expired",
      transport: fixtureTransport({ error: "Authentication token expired", results: [] }),
    });
    await expect(client.search("200640")).rejects.toMatchObject({ code: "authentication" });
  });
});

describe("fixed-window limiter", () => {
  it("waits once the configured request count is consumed", async () => {
    let now = 1;
    const sleeps: number[] = [];
    const clock: Clock = {
      now: () => now,
      sleep: async (ms) => {
        sleeps.push(ms);
        now += ms;
      },
    };
    const limiter = new FixedWindowRateLimiter(2, 1_000, clock);
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    expect(sleeps).toEqual([1_000]);
  });
});
