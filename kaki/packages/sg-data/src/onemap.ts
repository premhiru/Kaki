import {
  asArray,
  requireApiRecord,
  CachedHttpClient,
  type CachedHttpClientOptions,
  SingaporeApiError,
} from "./http.js";

export interface OneMapClientOptions extends CachedHttpClientOptions {
  readonly token: string;
  readonly baseUrl?: string;
}

export interface OneMapSearchResult {
  readonly searchValue: string;
  readonly block?: string;
  readonly roadName?: string;
  readonly building?: string;
  readonly address: string;
  readonly postalCode?: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface OneMapRoute {
  readonly status: number;
  readonly message?: string;
  readonly geometry?: string;
  readonly totalTimeSeconds?: number;
  readonly totalDistanceMetres?: number;
  readonly raw: Record<string, unknown>;
}

export interface OneMapPlanningArea {
  readonly name: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly raw: Record<string, unknown>;
}

export class OneMapClient extends CachedHttpClient {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(options: OneMapClientOptions) {
    super(options);
    if (!options.token.trim())
      throw new SingaporeApiError("authentication", "OneMap token is required");
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? "https://www.onemap.gov.sg";
  }

  async search(
    searchValue: string,
    page = 1,
    signal?: AbortSignal,
  ): Promise<readonly OneMapSearchResult[]> {
    if (!searchValue.trim() || !Number.isInteger(page) || page < 1)
      throw new Error("invalid-onemap-search");
    const url = this.url("/api/common/elastic/search");
    url.searchParams.set("searchVal", searchValue.trim());
    url.searchParams.set("returnGeom", "Y");
    url.searchParams.set("getAddrDetails", "Y");
    url.searchParams.set("pageNum", String(page));
    const body = await this.get(url, 24 * 60 * 60_000, true, signal);
    if (typeof body.error === "string") throw new SingaporeApiError("authentication", body.error);
    return asArray(body.results, "OneMap results").map((item) =>
      this.mapSearchResult(requireApiRecord(item, "OneMap result")),
    );
  }

  async resolvePostalCode(
    postalCode: string,
    signal?: AbortSignal,
  ): Promise<OneMapSearchResult | undefined> {
    if (!/^\d{6}$/u.test(postalCode.trim())) throw new Error("invalid-singapore-postal-code");
    return (await this.search(postalCode.trim(), 1, signal))[0];
  }

  async reverse(
    latitude: number,
    longitude: number,
    signal?: AbortSignal,
  ): Promise<readonly OneMapSearchResult[]> {
    this.assertPoint(latitude, longitude);
    const url = this.url("/api/public/revgeocode");
    url.searchParams.set("location", `${latitude},${longitude}`);
    url.searchParams.set("buffer", "40");
    url.searchParams.set("addressType", "All");
    url.searchParams.set("otherFeatures", "N");
    const body = await this.get(url, 24 * 60 * 60_000, true, signal);
    const results = body.GeocodeInfo ?? body.results ?? [];
    return asArray(results, "OneMap reverse results").map((item) =>
      this.mapSearchResult(requireApiRecord(item, "OneMap result")),
    );
  }

  async route(
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number },
    routeType: "walk" | "drive" | "cycle" | "pt",
    options: {
      date?: string;
      time?: string;
      mode?: "TRANSIT" | "BUS" | "RAIL";
      maxWalkDistance?: number;
      numItineraries?: 1 | 2 | 3;
    } = {},
    signal?: AbortSignal,
  ): Promise<OneMapRoute> {
    this.assertPoint(start.latitude, start.longitude);
    this.assertPoint(end.latitude, end.longitude);
    if (routeType === "pt" && (!options.date || !options.time || !options.mode))
      throw new Error("onemap-pt-route-needs-date-time-mode");
    const url = this.url("/api/public/routingsvc/route");
    url.searchParams.set("start", `${start.latitude},${start.longitude}`);
    url.searchParams.set("end", `${end.latitude},${end.longitude}`);
    url.searchParams.set("routeType", routeType);
    if (options.date) url.searchParams.set("date", options.date);
    if (options.time) url.searchParams.set("time", options.time);
    if (options.mode) url.searchParams.set("mode", options.mode);
    if (options.maxWalkDistance !== undefined)
      url.searchParams.set("maxWalkDistance", String(options.maxWalkDistance));
    if (options.numItineraries !== undefined)
      url.searchParams.set("numItineraries", String(options.numItineraries));
    const raw = await this.get(url, 5 * 60_000, true, signal);
    const summary =
      raw.route_summary && typeof raw.route_summary === "object"
        ? requireApiRecord(raw.route_summary)
        : undefined;
    return {
      status: Number(raw.status),
      ...(typeof raw.status_message === "string" ? { message: raw.status_message } : {}),
      ...(typeof raw.route_geometry === "string" ? { geometry: raw.route_geometry } : {}),
      ...(summary && Number.isFinite(Number(summary.total_time))
        ? { totalTimeSeconds: Number(summary.total_time) }
        : {}),
      ...(summary && Number.isFinite(Number(summary.total_distance))
        ? { totalDistanceMetres: Number(summary.total_distance) }
        : {}),
      raw,
    };
  }

  async planningArea(
    latitude: number,
    longitude: number,
    year?: number,
    signal?: AbortSignal,
  ): Promise<readonly OneMapPlanningArea[]> {
    this.assertPoint(latitude, longitude);
    if (year !== undefined && (!Number.isInteger(year) || year < 1998 || year > 2100)) {
      throw new Error("invalid-onemap-planning-year");
    }
    const url = this.url("/api/public/popapi/getPlanningarea");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lng", String(longitude));
    if (year !== undefined) url.searchParams.set("year", String(year));
    const raw = await this.getJson(url, {
      headers: this.authHeaders(),
      ttlMs: 24 * 60 * 60_000,
      ...(signal ? { signal } : {}),
      validate: (value) => value,
    });
    const rows = Array.isArray(raw) ? raw : [raw];
    return rows.map((item) => {
      const record = requireApiRecord(item, "OneMap planning area");
      const name = scalar(record.pln_area_n ?? record.PLN_AREA_N ?? record.name);
      if (!name) throw new SingaporeApiError("invalid-response", "Planning area name is missing");
      const lat = Number(record.lat ?? record.latitude);
      const lng = Number(record.lng ?? record.longitude);
      return {
        name,
        ...(Number.isFinite(lat) ? { latitude: lat } : {}),
        ...(Number.isFinite(lng) ? { longitude: lng } : {}),
        raw: record,
      };
    });
  }

  private url(path: string): URL {
    return new URL(path, this.baseUrl);
  }

  private get(
    url: URL,
    ttlMs: number,
    authenticated: boolean,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    return this.getJson(url, {
      headers: authenticated ? this.authHeaders() : { Accept: "application/json" },
      ttlMs,
      ...(signal ? { signal } : {}),
      validate: (value) => requireApiRecord(value, "OneMap response"),
    });
  }

  private authHeaders(): Readonly<Record<string, string>> {
    return { Authorization: this.token, Accept: "application/json" };
  }

  private mapSearchResult(record: Record<string, unknown>): OneMapSearchResult {
    const latitude = Number(record.LATITUDE ?? record.LAT ?? record.latitude);
    const longitude = Number(record.LONGITUDE ?? record.LON ?? record.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude))
      throw new SingaporeApiError("invalid-response", "OneMap result coordinates are invalid");
    return {
      searchValue: scalar(record.SEARCHVAL ?? record.BUILDINGNAME ?? record.ADDRESS),
      ...(scalar(record.BLK_NO) && scalar(record.BLK_NO) !== "NIL"
        ? { block: scalar(record.BLK_NO) }
        : {}),
      ...(scalar(record.ROAD_NAME) && scalar(record.ROAD_NAME) !== "NIL"
        ? { roadName: scalar(record.ROAD_NAME) }
        : {}),
      ...(scalar(record.BUILDING) && scalar(record.BUILDING) !== "NIL"
        ? { building: scalar(record.BUILDING) }
        : {}),
      address: scalar(record.ADDRESS ?? record.SEARCHVAL),
      ...(scalar(record.POSTAL) && scalar(record.POSTAL) !== "NIL"
        ? { postalCode: scalar(record.POSTAL) }
        : {}),
      latitude,
      longitude,
    };
  }

  private assertPoint(latitude: number, longitude: number): void {
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < 1.1 ||
      latitude > 1.5 ||
      longitude < 103.5 ||
      longitude > 104.2
    ) {
      throw new Error("coordinates-outside-singapore");
    }
  }
}

function scalar(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}
