import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COUNTRY_PROFILES,
  crossBorderHandoff,
  createRegionalHandoff,
  decodeRegionalQr,
  encodeRegionalQr,
  encodeRegionalQrFixture,
  officialPublicationParser,
  parseBmkgWeather,
  parseJakimPrayer,
  parseMalaysiaWeather,
  parseTmdWeather,
  prepareRemittanceHandoff,
  regionalFetchTransport,
  RegionalCapabilityRouter,
  REGIONAL_CAPABILITIES,
  REGIONAL_CLIENT_CONFIGS,
  RegionalMemoryCache,
  RegionalPublicClient,
  RegionalRateLimiter,
  REGIONAL_SOURCES,
  validateHalalCertification,
  type QrRail,
  type RegionalCapabilityId,
  type RegionalRequest,
  type RegionalTransport,
} from "../src/index.js";

const fixtures = new URL("./fixtures/", import.meta.url);
const loadFixture = async (name: string): Promise<unknown> =>
  JSON.parse(await readFile(new URL(name, fixtures), "utf8")) as unknown;

const rails: readonly QrRail[] = ["duitnow", "qris", "promptpay", "vietqr", "qrph"];

describe("SEA national QR rails", () => {
  for (const rail of rails) {
    it(`decodes and validates a marked non-payable ${rail} fixture`, () => {
      const input = {
        rail,
        proxy: `FIXTURE_${rail.toUpperCase()}_12345`,
        merchant: "KAKI FIXTURE 商户",
        merchantCity: "CITY",
        amount: rail === "vietqr" ? 125_000 : 12.5,
        reference: "ORDER1",
      } as const;
      const fixture = encodeRegionalQrFixture(input);
      const payment = decodeRegionalQr(fixture, rail, true);
      expect(payment).toMatchObject({
        rail,
        amount: input.amount,
        merchant: input.merchant,
        reference: "ORDER1",
        crcValid: true,
        warnings: [],
      });
      expect(encodeRegionalQr(input, { encode: () => fixture })).toBe(fixture);
      expect(payment.amountMinor).toBe(rail === "vietqr" ? 125_000 : 1_250);
    });
  }

  it("rejects unmarked fixture generation and tampered QR material", () => {
    expect(() =>
      encodeRegionalQrFixture({ rail: "duitnow", proxy: "60123456789", merchant: "REAL SHOP" }),
    ).toThrow("fixture-markers-required");
    const raw = encodeRegionalQrFixture({
      rail: "duitnow",
      proxy: "FIXTURE_DUITNOW",
      merchant: "KAKI FIXTURE",
    });
    const tampered = `${raw.slice(0, -1)}${raw.endsWith("0") ? "1" : "0"}`;
    expect(() => decodeRegionalQr(tampered, "duitnow", true)).toThrow("crc-invalid");
  });

  it("rejects institution output that changes approved material facts", () => {
    const input = {
      rail: "duitnow",
      proxy: "FIXTURE_DUITNOW",
      merchant: "KAKI FIXTURE EXPECTED",
      amount: 10,
      reference: "EXPECTED",
    } as const;
    const changed = encodeRegionalQrFixture({ ...input, merchant: "KAKI FIXTURE CHANGED" });
    expect(() => encodeRegionalQr(input, { encode: () => changed })).toThrow("merchant-mismatch");
  });

  it("requires fresh matching bank evidence before proposing a bank handoff", () => {
    const raw = encodeRegionalQrFixture({
      rail: "duitnow",
      proxy: "FIXTURE_DUITNOW",
      merchant: "KAKI FIXTURE",
      amount: 20,
    });
    const payment = decodeRegionalQr(raw, "duitnow", true);
    const checkedAt = "2026-08-26T01:00:00.000Z";
    expect(crossBorderHandoff(payment, "sg")).toMatchObject({ action: "regenerate-qr" });
    const handoff = crossBorderHandoff(
      payment,
      "sg",
      {
        bankId: "fixture-bank",
        checkedAt,
        sourceCountry: "sg",
        destinationCountry: "my",
        rail: "duitnow",
        supported: true,
        fxRate: 0.31,
        feeMinor: 10,
      },
      Date.parse(checkedAt) + 60_000,
    );
    expect(handoff).toMatchObject({
      action: "bank-handoff",
      category: "money.transfer",
      requiresApproval: true,
      facts: { destinationCountry: "my", amountMinor: 2_000, bankId: "fixture-bank", feeMinor: 10 },
    });
    expect(handoff.facts.payloadHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(() =>
      crossBorderHandoff(
        payment,
        "sg",
        {
          bankId: "fixture-bank",
          checkedAt,
          sourceCountry: "sg",
          destinationCountry: "th",
          rail: "duitnow",
          supported: true,
        },
        Date.parse(checkedAt) + 60_000,
      ),
    ).toThrow("evidence-invalid");
  });
});

const requiredCapabilities: readonly RegionalCapabilityId[] = [
  "my.duitnow",
  "my.tng",
  "my.causeway",
  "my.vep",
  "my.weather",
  "my.prayer",
  "my.identity",
  "my.holidays",
  "id.qris",
  "id.gojek",
  "id.tokopedia",
  "id.weather",
  "id.krl",
  "id.transjakarta",
  "id.prayer",
  "id.identity",
  "th.promptpay",
  "th.line",
  "th.bts",
  "th.mrt",
  "th.weather",
  "th.identity",
  "th.holy-days",
  "th.alcohol-ban-days",
  "vn.vietqr",
  "vn.zalo",
  "vn.momo",
  "vn.zalopay",
  "vn.identity",
  "vn.tet",
  "ph.qrph",
  "ph.gcash",
  "ph.maya",
  "ph.egovph-sso",
  "ph.egovph-everify",
  "ph.weather",
  "ph.messenger",
  "ph.viber",
  "regional.wise",
  "regional.remitly",
  "regional.cross-border-qr",
  "regional.halal",
  "regional.prayer",
  "regional.holidays",
];

describe("section 14 capability contracts", () => {
  it("keeps every named country and regional family explicit", () => {
    expect(REGIONAL_CAPABILITIES.map(({ id }) => id)).toEqual(requiredCapabilities);
    expect(new Set(REGIONAL_CAPABILITIES.map(({ id }) => id)).size).toBe(
      requiredCapabilities.length,
    );
    expect(Object.keys(COUNTRY_PROFILES)).toEqual(["my", "id", "th", "vn", "ph"]);
  });

  it.each([
    ["my.tng", "phone", "read-only"],
    ["id.gojek", "phone", "read-only"],
    ["id.tokopedia", "phone", "read-only"],
    ["vn.momo", "phone", "read-only"],
    ["vn.zalopay", "phone", "read-only"],
    ["ph.gcash", "phone", "read-only"],
    ["ph.maya", "phone", "read-only"],
    ["my.identity", "identity-app", "approval-required"],
    ["id.identity", "identity-app", "approval-required"],
    ["th.identity", "identity-app", "approval-required"],
    ["vn.identity", "identity-app", "approval-required"],
    ["ph.egovph-sso", "identity-app", "approval-required"],
    ["ph.egovph-everify", "identity-app", "approval-required"],
    ["th.line", "channel", "approval-required"],
    ["vn.zalo", "channel", "approval-required"],
    ["ph.messenger", "channel", "approval-required"],
    ["ph.viber", "channel", "approval-required"],
    ["my.vep", "browser", "approval-required"],
    ["regional.wise", "browser", "approval-required"],
    ["regional.remitly", "browser", "approval-required"],
  ] as const)("routes %s to an honest human/device boundary", (id, target, mode) => {
    expect(createRegionalHandoff(id, { request: "fixture" })).toMatchObject({
      capabilityId: id,
      target,
      mode,
    });
  });

  it("fails closed when no capability provider is configured", async () => {
    await expect(
      new RegionalCapabilityRouter().execute({
        id: "ph.egovph-everify",
        operation: "handoff",
        parameters: {},
      }),
    ).rejects.toThrow("regional-provider-not-configured:ph.egovph-everify");
  });
});

describe("typed official-source parsing", () => {
  it("normalizes current Malaysia, BMKG, and JAKIM fixture shapes", async () => {
    expect(parseMalaysiaWeather(await loadFixture("my-weather.json"))).toMatchObject([
      { locationName: "Johor Bahru", minCelsius: 24, maxCelsius: 33 },
    ]);
    expect(parseBmkgWeather(await loadFixture("bmkg-weather.json"))).toMatchObject([
      { administrativeCode: "31.71.01.1001", description: "Cerah Berawan", temperatureCelsius: 29 },
    ]);
    expect(parseJakimPrayer(await loadFixture("jakim-prayer.json"))).toMatchObject([
      { zone: "WLY01", fajr: "06:01:00", isha: "20:33:00" },
    ]);
    expect(parseTmdWeather(await loadFixture("tmd-weather.json"))).toMatchObject([
      { province: "กรุงเทพมหานคร", temperatureCelsius: 29.1, humidityPercent: 78 },
    ]);
  });

  it("detects field and official-publication drift", async () => {
    const malaysia = (await loadFixture("my-weather.json")) as Record<string, unknown>[];
    expect(() => parseMalaysiaWeather([{ ...malaysia[0], min_temp: "24" }])).toThrow(
      "min_temp must be a finite number",
    );
    expect(() => parseBmkgWeather({ lokasi: {}, data: [] })).toThrow("BMKG adm4");
    expect(() => parseJakimPrayer({ status: "ERROR", prayerTime: [] })).toThrow("status is not OK");
    expect(() => parseTmdWeather({ WeatherForecast: [{ location: {}, forecasts: [] }] })).toThrow(
      "TMD province",
    );
    const parsePagasa = officialPublicationParser("PAGASA", "Issued at");
    const publication = parsePagasa(
      "<html><body>PAGASA — Issued at 05:00. Weekly outlook.</body></html>",
    );
    expect(publication.excerpt).toContain("Weekly outlook");
    expect(() => parsePagasa("<html>generic forecast</html>")).toThrow("marker missing:PAGASA");
  });

  it("catalogues every shipped official source and its credential gate", () => {
    const ids = REGIONAL_SOURCES.map(({ id }) => id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "my.weather",
        "my.prayer",
        "my.causeway",
        "my.holidays",
        "id.weather",
        "th.weather",
        "th.bts",
        "th.mrt",
        "vn.weather",
        "vn.tet",
        "ph.weather",
      ]),
    );
    expect(ids).not.toEqual(
      expect.arrayContaining([
        "id.krl",
        "id.transjakarta",
        "id.prayer",
        "th.holy-days",
        "th.alcohol-ban-days",
      ]),
    );
    expect(REGIONAL_SOURCES.find(({ id }) => id === "th.weather")?.credentialGate).toBe(
      "tmd-api-token",
    );
  });
});

describe("bounded regional client", () => {
  it("renders, parses, and caches an official source request", async () => {
    const requests: RegionalRequest[] = [];
    const transport: RegionalTransport = async (request) => {
      requests.push(request);
      return {
        status: 200,
        json: async () => loadFixture("bmkg-weather.json"),
        text: async () => "",
      };
    };
    const client = new RegionalPublicClient(REGIONAL_CLIENT_CONFIGS.id, {
      transport,
      cache: new RegionalMemoryCache(),
      limiter: new RegionalRateLimiter(),
    });
    expect((await client.weather("31.71.01.1001")).data).toMatchObject([
      { locationName: "Gambir" },
    ]);
    await client.weather("31.71.01.1001");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      url: "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=31.71.01.1001",
      allowedOrigin: "https://api.bmkg.go.id",
      maxResponseBytes: 2 * 1024 * 1024,
    });
  });

  it("fails before network when a credential-gated source is not configured", async () => {
    const transport = vi.fn<RegionalTransport>();
    const client = new RegionalPublicClient(REGIONAL_CLIENT_CONFIGS.th, { transport });
    await expect(client.weather("13.7563")).rejects.toThrow("th.weather-credential-required");
    expect(transport).not.toHaveBeenCalled();
  });
});

describe("regional transport security", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects private targets and cross-origin requests before fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(regionalFetchTransport({ url: "https://127.0.0.1/private" })).rejects.toThrow(
      "private-host-denied",
    );
    await expect(
      regionalFetchTransport({
        url: "https://official.example/data",
        allowedOrigin: "https://different.example",
      }),
    ).rejects.toThrow("origin-denied");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("disables redirects and bounds the complete response body", async () => {
    const fetchMock = vi.fn(async () => new Response("123456", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      regionalFetchTransport({ url: "https://official.example/data", maxResponseBytes: 5 }),
    ).rejects.toThrow("response-too-large");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({ redirect: "error" }),
    );
  });
});

describe("regional remittance, halal, prayer, and holiday contracts", () => {
  it("binds a non-expired licensed remittance quote to approval", () => {
    const now = Date.parse("2026-08-26T01:00:00Z");
    expect(
      prepareRemittanceHandoff(
        {
          provider: "wise",
          quoteId: "quote-1",
          sourceCurrency: "SGD",
          sourceAmountMinor: 100_000,
          destinationCurrency: "MYR",
          destinationAmountMinor: 310_000,
          feeMinor: 800,
          rate: 3.125,
          expiresAt: "2026-08-26T01:05:00Z",
          licenceAuthority: "fixture authority",
          licenceReference: "fixture-licence",
          sourceUrl: "https://wise.com/",
        },
        now,
      ),
    ).toMatchObject({
      category: "money.transfer",
      requiresApproval: true,
      quote: { quoteId: "quote-1", feeMinor: 800 },
    });
  });

  it("distinguishes current official halal certification from an expired record", () => {
    const record = {
      authority: "fixture national halal authority",
      certificateId: "CERT-1",
      certificateOwner: "Fixture Foods",
      outletName: "Fixture Outlet",
      outletAddress: "1 Fixture Road",
      validFrom: "2026-01-01T00:00:00Z",
      validUntil: "2026-12-31T23:59:59Z",
      sourceUrl: "https://halal.example/cert/CERT-1",
    };
    expect(
      validateHalalCertification(record, Date.parse("2026-08-26T00:00:00Z")).validAtQueryTime,
    ).toBe(true);
    expect(
      validateHalalCertification(record, Date.parse("2027-01-01T00:00:00Z")).validAtQueryTime,
    ).toBe(false);
  });
});
