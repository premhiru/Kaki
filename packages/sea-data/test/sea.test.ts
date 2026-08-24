import { describe, expect, it } from "vitest";
import {
  COUNTRY_PROFILES,
  crossBorderHandoff,
  decodeRegionalQr,
  encodeRegionalQr,
  RegionalMemoryCache,
  RegionalPublicClient,
  RegionalRateLimiter,
  type QrRail,
  type RegionalRequest,
  type RegionalTransport,
} from "../src/index.js";

const rails: readonly QrRail[] = ["duitnow", "qris", "promptpay", "vietqr", "qrph"];
describe("SEA national QR rails", () => {
  for (const rail of rails) {
    it(`validates and round-trips ${rail}`, () => {
      const raw = encodeRegionalQr({
        rail,
        proxy: "FIXTURE12345",
        merchant: "KAKI FIXTURE",
        merchantCity: "CITY",
        amount: 12.5,
        reference: "ORDER1",
      });
      expect(decodeRegionalQr(raw, rail, true)).toMatchObject({
        rail,
        amount: 12.5,
        amountMinor: 1250,
        merchant: "KAKI FIXTURE",
        reference: "ORDER1",
        crcValid: true,
        warnings: [],
      });
    });
  }
  it("rejects a tampered QR in strict mode", () => {
    const raw = encodeRegionalQr({ rail: "duitnow", proxy: "FIXTURE12345", merchant: "KAKI" });
    const tampered = `${raw.slice(0, -1)}${raw.endsWith("0") ? "1" : "0"}`;
    expect(() => decodeRegionalQr(tampered, "duitnow", true)).toThrow("crc-invalid");
  });
  it("binds cross-border approval to validated material facts", () => {
    const payment = decodeRegionalQr(
      encodeRegionalQr({ rail: "duitnow", proxy: "FIXTURE12345", merchant: "KAKI", amount: 20 }),
      "duitnow",
      true,
    );
    const handoff = crossBorderHandoff(payment, "sg");
    expect(handoff).toMatchObject({
      action: "bank-handoff",
      category: "money.transfer",
      requiresApproval: true,
      facts: { destinationCountry: "my", currency: "MYR", amountMinor: 2000 },
    });
    expect(handoff.facts.payloadHash).toMatch(/^[0-9a-f]{8}$/);
  });
  it("covers all starter markets", () => {
    expect(Object.keys(COUNTRY_PROFILES)).toEqual(["my", "id", "th", "vn", "ph"]);
  });
});

describe("injectable regional public clients", () => {
  it("renders weather hooks and caches identical requests", async () => {
    const requests: RegionalRequest[] = [];
    const transport: RegionalTransport = async (request) => {
      requests.push(request);
      return { status: 200, json: async () => ({ forecast: "rain" }), text: async () => "rain" };
    };
    const client = new RegionalPublicClient(
      {
        country: "id",
        endpoints: {
          weather: {
            url: "https://fixture.test/weather?area={location}",
            response: "json",
            cacheSeconds: 60,
          },
        },
      },
      transport,
      new RegionalMemoryCache(),
    );
    expect((await client.weather("31.71")).data).toEqual({ forecast: "rain" });
    await client.weather("31.71");
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe("https://fixture.test/weather?area=31.71");
  });
  it("supports injectable holiday, prayer, and MY causeway hooks", async () => {
    const transport: RegionalTransport = async (request) => ({
      status: 200,
      json: async () => ({ url: request.url }),
      text: async () => request.url,
    });
    const client = new RegionalPublicClient(
      {
        country: "my",
        endpoints: {
          holidays: {
            url: "https://fixture.test/holidays/{year}",
            response: "json",
            cacheSeconds: 86400,
          },
          prayer: {
            url: "https://fixture.test/prayer/{location}/{date}",
            response: "json",
            cacheSeconds: 3600,
          },
          causeway: {
            url: "https://fixture.test/causeway/{checkpoint}",
            response: "text",
            cacheSeconds: 60,
          },
        },
      },
      transport,
      new RegionalMemoryCache(),
      new RegionalRateLimiter(),
    );
    expect((await client.holidays(2027)).sourceUrl).toContain("/2027");
    expect((await client.prayerTimes("johor", "2027-01-01")).sourceUrl).toContain(
      "johor/2027-01-01",
    );
    expect((await client.causeway("woodlands")).data).toContain("woodlands");
  });
});
