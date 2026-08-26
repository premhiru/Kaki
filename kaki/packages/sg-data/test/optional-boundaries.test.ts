import { describe, expect, it, vi } from "vitest";
import {
  OneMapClient,
  SingaporePublicDatasetClient,
  SingaporePublicServicesClient,
  optionalText,
  requiredNumber,
  requiredText,
  type DataGovSgClient,
  type HttpTransport,
} from "../src/index.js";

const response = (value: unknown) => ({
  status: 200,
  json: async () => value,
  text: async () => JSON.stringify(value),
});

describe("OneMap optional response boundary", () => {
  it("rejects missing credentials and invalid searches, points, years, and transit plans", async () => {
    expect(() => new OneMapClient({ token: "   " })).toThrow("OneMap token is required");
    const client = new OneMapClient({ token: "fixture", transport: async () => response({}) });
    await expect(client.search(" ")).rejects.toThrow("invalid-onemap-search");
    await expect(client.search("home", 0)).rejects.toThrow("invalid-onemap-search");
    await expect(client.resolvePostalCode("123")).rejects.toThrow("invalid-singapore-postal-code");
    for (const [latitude, longitude] of [
      [Number.NaN, 103.8],
      [1.3, Number.NaN],
      [1.09, 103.8],
      [1.51, 103.8],
      [1.3, 103.49],
      [1.3, 104.21],
    ] as const) {
      await expect(client.reverse(latitude, longitude)).rejects.toThrow(
        "coordinates-outside-singapore",
      );
    }
    await expect(client.planningArea(1.3, 103.8, 1997)).rejects.toThrow(
      "invalid-onemap-planning-year",
    );
    await expect(client.planningArea(1.3, 103.8, 2101)).rejects.toThrow(
      "invalid-onemap-planning-year",
    );
    await expect(
      client.route(
        { latitude: 1.3, longitude: 103.8 },
        { latitude: 1.31, longitude: 103.81 },
        "pt",
      ),
    ).rejects.toThrow("onemap-pt-route-needs-date-time-mode");
  });

  it("maps reverse, route, and planning variants without inventing absent optional facts", async () => {
    const requests: string[] = [];
    const transport: HttpTransport = async ({ url }) => {
      requests.push(url);
      const parsed = new URL(url);
      if (parsed.pathname.includes("revgeocode")) {
        return response({
          GeocodeInfo: [
            {
              SEARCHVAL: 123,
              ADDRESS: "123 ROAD",
              BLK_NO: "NIL",
              ROAD_NAME: "ROAD",
              BUILDING: "NIL",
              POSTAL: "NIL",
              LAT: 1.3,
              LON: 103.8,
            },
          ],
        });
      }
      if (parsed.pathname.includes("routingsvc")) {
        return response({
          status: "0",
          status_message: "ok",
          route_geometry: "encoded",
          route_summary: { total_time: "120", total_distance: "800" },
        });
      }
      if (parsed.pathname.includes("getPlanningarea")) {
        return response({ PLN_AREA_N: "BEDOK", latitude: "1.32", longitude: "not-known" });
      }
      return response({ results: [] });
    };
    const client = new OneMapClient({ token: "fixture", transport });

    await expect(client.reverse(1.3, 103.8)).resolves.toEqual([
      expect.objectContaining({ searchValue: "123", roadName: "ROAD" }),
    ]);
    const route = await client.route(
      { latitude: 1.3, longitude: 103.8 },
      { latitude: 1.31, longitude: 103.81 },
      "pt",
      {
        date: "2026-08-26",
        time: "10:00:00",
        mode: "TRANSIT",
        maxWalkDistance: 500,
        numItineraries: 2,
      },
    );
    expect(route).toMatchObject({
      status: 0,
      message: "ok",
      geometry: "encoded",
      totalTimeSeconds: 120,
      totalDistanceMetres: 800,
    });
    await expect(client.planningArea(1.3, 103.8, 2026)).resolves.toEqual([
      expect.objectContaining({ name: "BEDOK", latitude: 1.32 }),
    ]);
    expect(requests.at(-1)).toContain("year=2026");
  });

  it("rejects response variants missing coordinates or planning-area identity", async () => {
    const invalidSearch = new OneMapClient({
      token: "fixture",
      transport: async () => response({ results: [{ ADDRESS: "unknown" }] }),
    });
    await expect(invalidSearch.search("unknown")).rejects.toThrow(
      "OneMap result coordinates are invalid",
    );
    const invalidArea = new OneMapClient({
      token: "fixture",
      transport: async () => response({ lat: 1.3, lng: 103.8 }),
    });
    await expect(invalidArea.planningArea(1.3, 103.8)).rejects.toThrow(
      "Planning area name is missing",
    );
  });
});

describe("public dataset optional-field boundary", () => {
  const records = {
    hawker: [
      {
        fields: {
          Name: "Market",
          q1_startdate: "NIL",
          q2_cleaningstartdate: "2026-09-01",
          q2_cleaningenddate: "N/A",
          remarks_q2: "nil",
          other_works_startdate: "2026-10-01",
          other_works_enddate: "2026-10-02",
          other_works_remarks: "Repairs",
        },
      },
    ],
    coe: [
      {
        fields: {
          Month: "2026-08",
          category: "A",
          Quota: "1,000",
          "Bids Received": 1200,
          Premium: "S$95,000",
        },
      },
    ],
    moh: [{ fields: { Name: "Clinic", "Opening Hours": "24 hours" } }],
    nea: [{ fields: { Warning: "Heavy rain" } }],
    school: [{ fields: { Date: "2026-09-01", Holiday: "School break" } }],
    public: [{ fields: { holiday_date: "2026-08-09", name: "National Day" } }],
    hdb: [],
  } as const;
  const dataGov = {
    datasetRows: vi.fn(async (id: string) => {
      if (!Object.hasOwn(records, id)) throw new Error(`unexpected-dataset-id:${id}`);
      return records[id as keyof typeof records];
    }),
    datasetGeoJson: vi.fn(async () => [
      {
        properties: { LOCALITY: "AMK", CASE_SIZE: 8, last_updated: 20260826 },
        geometry: null,
      },
      {
        properties: { cluster: "BEDOK", cases: "9" },
        geometry: { type: "Point", coordinates: [103.8, 1.3] },
      },
    ]),
  } as unknown as DataGovSgClient;
  const ids = {
    dengueClusters: "dengue",
    hdbResalePrices: "hdb",
    hawkerCentreClosures: "hawker",
    schoolHolidays: "school",
    publicHolidays: "public",
    coeResults: "coe",
    mohClinics: "moh",
    neaWarnings: "nea",
  };

  it("maps numeric text, fallback closure periods, and omitted optional service fields", async () => {
    const datasets = new SingaporePublicDatasetClient(dataGov, ids);
    expect(await datasets.dengueClusters()).toEqual([
      expect.objectContaining({ locality: "AMK", cases: 8, updatedAt: "20260826" }),
      expect.objectContaining({
        locality: "BEDOK",
        cases: 9,
        geometry: { type: "Point", coordinates: [103.8, 1.3] },
      }),
    ]);
    expect((await datasets.hawkerClosures())[0]).toMatchObject({
      startDate: "2026-09-01",
      periods: [
        { startDate: "2026-09-01" },
        { startDate: "2026-10-01", endDate: "2026-10-02", reason: "Repairs" },
      ],
    });
    expect((await datasets.coeResults())[0]).toMatchObject({
      exercise: "2026-08-1",
      quota: 1000,
      bidsReceived: 1200,
      premium: 95000,
    });
    const services = new SingaporePublicServicesClient(datasets, {
      searchNlbCatalogue: vi.fn(async () => []),
      searchActiveSgSlots: vi.fn(async () => []),
    });
    expect(await services.mohClinicHours()).toEqual([
      expect.objectContaining({ name: "Clinic", hours: "24 hours" }),
    ]);
    expect(await services.neaWarnings()).toEqual([
      expect.objectContaining({ title: "Heavy rain" }),
    ]);
  });

  it("validates portal queries, configured IDs, and required scalar fields", async () => {
    const datasets = new SingaporePublicDatasetClient(dataGov, { ...ids, hdbResalePrices: " " });
    await expect(datasets.hdbResalePrices()).rejects.toThrow("singapore-dataset-id-not-configured");
    const portals = {
      searchNlbCatalogue: vi.fn(async () => []),
      searchActiveSgSlots: vi.fn(async () => []),
    };
    const services = new SingaporePublicServicesClient(datasets, portals);
    expect(() => services.nlbCatalogue(" ")).toThrow("nlb-catalogue-query-required");
    expect(() => services.activeSgSlots("", "2026-08-26")).toThrow("invalid-activesg-slot-query");
    expect(() => services.activeSgSlots("swim", "tomorrow")).toThrow("invalid-activesg-slot-query");
    await services.nlbCatalogue("  books  ");
    await services.activeSgSlots("  swim ", "2026-08-26");
    expect(portals.searchNlbCatalogue).toHaveBeenCalledWith("books", undefined);
    expect(portals.searchActiveSgSlots).toHaveBeenCalledWith("swim", "2026-08-26", undefined);
    expect(optionalText({ a: " ", b: Number.NaN }, ["a", "b"])).toBeUndefined();
    expect(() => requiredText({}, [])).toThrow("singapore-dataset-field-missing:unknown");
    expect(() => requiredNumber({ price: "not-a-number" }, ["price"])).toThrow(
      "singapore-dataset-field-invalid:price",
    );
  });
});
