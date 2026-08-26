import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  DataGovSgClient,
  decodeSgqrImage,
  encodePayNow,
  FixedWindowRateLimiter,
  LtaDatamallClient,
  OneMapClient,
  SingaporeMonitorRegistry,
  SingaporeMonitorRunner,
  SingaporePublicDatasetClient,
  SingaporePublicServicesClient,
  type HttpTransport,
} from "../src/index.js";

function jsonFixture(name: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"),
  ) as Record<string, unknown>;
}

describe("complete Singapore provider surface", () => {
  it("maps each required LTA DataMall dataset to a typed result", async () => {
    const datasets = jsonFixture("lta-datasets");
    const transport: HttpTransport = async ({ url }) => {
      const name = new URL(url).pathname.split("/").at(-1) ?? "";
      return response({ value: datasets[name] });
    };
    const client = new LtaDatamallClient({ accountKey: "fixture", transport });

    expect((await client.busRoutes())[0]).toMatchObject({ busStopCode: "01019", distanceKm: 1.4 });
    expect((await client.carParkAvailability())[0]).toMatchObject({ availableLots: 42 });
    expect((await client.erpRates())[0]).toMatchObject({ chargeAmount: 2 });
    expect((await client.taxiAvailability())[0]).toMatchObject({ latitude: 1.3 });
    expect((await client.trafficIncidents())[0]).toMatchObject({ type: "Accident" });
    expect((await client.estimatedTravelTimes())[0]).toMatchObject({ estimatedTimeMinutes: 18 });
    expect((await client.trafficImages())[0]).toMatchObject({ cameraId: "1001" });
  });

  it("resolves postal codes and planning areas through OneMap", async () => {
    const transport: HttpTransport = async ({ url }) => {
      const parsed = new URL(url);
      if (parsed.pathname.includes("getPlanningarea")) {
        return response([{ pln_area_n: "ANG MO KIO", lat: 1.37, lng: 103.85 }]);
      }
      return response({
        results: [
          {
            SEARCHVAL: "123 ANG MO KIO AVENUE 3",
            ADDRESS: "123 ANG MO KIO AVENUE 3 SINGAPORE 560123",
            POSTAL: "560123",
            LATITUDE: "1.37",
            LONGITUDE: "103.85",
          },
        ],
      });
    };
    const client = new OneMapClient({ token: "fixture", transport });
    expect(await client.resolvePostalCode("560123")).toMatchObject({ postalCode: "560123" });
    expect(await client.planningArea(1.37, 103.85)).toEqual([
      expect.objectContaining({ name: "ANG MO KIO" }),
    ]);
  });

  it("maps configured public datasets and browser-owned public portals", async () => {
    const fixtures = jsonFixture("public-datasets");
    const dataGov = new DataGovSgClient({
      limiter: new FixedWindowRateLimiter(100, 10_000),
      downloadUrlPolicy: (url) => url.hostname === "fixtures.invalid",
      transport: async ({ url }) => {
        const parsed = new URL(url);
        if (parsed.pathname.includes("/poll-download")) {
          return response({ code: 0, data: { url: "https://fixtures.invalid/dengue.json" } });
        }
        if (parsed.hostname === "fixtures.invalid") {
          return response({
            type: "FeatureCollection",
            features: (fixtures.dengue as Record<string, unknown>[]).map((properties) => ({
              type: "Feature",
              geometry: { type: "Polygon", coordinates: [] },
              properties,
            })),
          });
        }
        const id = parsed.searchParams.get("resource_id") ?? "";
        return response({ success: true, result: { records: fixtures[id] } });
      },
    });
    const datasets = new SingaporePublicDatasetClient(dataGov, {
      dengueClusters: "dengue",
      hdbResalePrices: "hdb",
      hawkerCentreClosures: "hawker",
      schoolHolidays: "school",
      publicHolidays: "public",
      coeResults: "coe",
      mohClinics: "moh",
      neaWarnings: "nea",
    });
    const portals = {
      searchNlbCatalogue: vi.fn(async () => [{ title: "The Art of Charlie Chan Hock Chye" }]),
      searchActiveSgSlots: vi.fn(async () => [
        {
          facility: "Bishan",
          activity: "swim",
          startsAt: "2026-08-27T10:00:00+08:00",
          available: true,
        },
      ]),
    };
    const services = new SingaporePublicServicesClient(datasets, portals);

    expect((await datasets.dengueClusters())[0]).toMatchObject({ cases: 8 });
    expect((await datasets.hdbResalePrices())[0]).toMatchObject({ resalePrice: 650000 });
    expect((await datasets.hawkerClosures())[0]).toMatchObject({ reason: "Cleaning" });
    expect((await datasets.schoolHolidays())[0]).toMatchObject({ kind: "school" });
    expect((await datasets.publicHolidays())[0]).toMatchObject({ kind: "public" });
    expect((await datasets.coeResults())[0]).toMatchObject({ premium: 95000 });
    expect((await services.mohClinicHours())[0]).toMatchObject({ name: "AMK Polyclinic" });
    expect((await services.neaWarnings())[0]).toMatchObject({ severity: "moderate" });
    expect((await services.nlbCatalogue("Charlie Chan"))[0]?.title).toContain("Charlie");
    expect((await services.activeSgSlots("swim", "2026-08-27"))[0]?.available).toBe(true);
  });
});

it("decodes SGQR image bytes through the host decoder and validates the EMV payload", async () => {
  const raw = encodePayNow({ proxyType: "0", proxyValue: "+6591234567", merchantName: "KOPITIAM" });
  const decoded = await decodeSgqrImage(new Uint8Array([137, 80, 78, 71]), "image/png", {
    decode: async () => raw,
  });
  expect(decoded).toMatchObject({ crcValid: true, merchantName: "KOPITIAM" });
});

it("schedules, evaluates, and deduplicates heartbeat monitor notifications", async () => {
  const registry = new SingaporeMonitorRegistry();
  registry.register({
    id: "home-haze",
    kind: "haze",
    intervalMs: 60_000,
    collect: async () => ({ psi: 120, period: "2026-08-26T10" }),
  });
  let scheduled: (() => Promise<void>) | undefined;
  const notify = vi.fn(async () => undefined);
  const runner = new SingaporeMonitorRunner(
    registry,
    { every: (_id, _interval, run) => ((scheduled = run), () => undefined) },
    { notify },
  );
  runner.start();
  await scheduled?.();
  await runner.runOnce("home-haze");
  expect(notify).toHaveBeenCalledTimes(1);
  runner.stop();
});

function response(value: unknown) {
  return {
    status: 200,
    json: async () => value,
    text: async () => JSON.stringify(value),
  };
}
