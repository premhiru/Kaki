import {
  asArray,
  asRecord,
  CachedHttpClient,
  type CachedHttpClientOptions,
  SingaporeApiError,
} from "./http.js";

export interface LtaClientOptions extends CachedHttpClientOptions {
  readonly accountKey: string;
  readonly baseUrl?: string;
}

export interface LtaBusArrival {
  readonly serviceNo: string;
  readonly operator: string;
  readonly nextBuses: readonly {
    readonly estimatedArrival: string;
    readonly latitude?: number;
    readonly longitude?: number;
    readonly load?: string;
    readonly feature?: string;
    readonly type?: string;
  }[];
}

export interface LtaBusStop {
  readonly code: string;
  readonly roadName: string;
  readonly description: string;
  readonly latitude: number;
  readonly longitude: number;
}

export interface LtaTrainAlert {
  readonly status: number;
  readonly affectedSegments: readonly unknown[];
  readonly message: readonly unknown[];
}

type LtaDataset =
  | "BusRoutes"
  | "BusStops"
  | "CarParkAvailabilityv2"
  | "ERPRates"
  | "Taxi-Availability"
  | "TrafficIncidents"
  | "EstTravelTimes"
  | "Traffic-Imagesv2";

function string(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string")
    throw new SingaporeApiError("invalid-response", `LTA ${key} must be a string`);
  return value;
}

function number(record: Record<string, unknown>, key: string): number {
  const value = Number(record[key]);
  if (!Number.isFinite(value))
    throw new SingaporeApiError("invalid-response", `LTA ${key} must be numeric`);
  return value;
}

export class LtaDatamallClient extends CachedHttpClient {
  private readonly accountKey: string;
  private readonly baseUrl: string;

  constructor(options: LtaClientOptions) {
    super(options);
    if (!options.accountKey.trim())
      throw new SingaporeApiError("authentication", "LTA AccountKey is required");
    this.accountKey = options.accountKey;
    this.baseUrl = options.baseUrl ?? "https://datamall2.mytransport.sg/ltaodataservice";
  }

  async busArrival(
    busStopCode: string,
    serviceNo?: string,
    signal?: AbortSignal,
  ): Promise<readonly LtaBusArrival[]> {
    if (!/^\d{5}$/.test(busStopCode)) throw new Error("invalid-lta-bus-stop-code");
    const url = this.url("BusArrivalv2");
    url.searchParams.set("BusStopCode", busStopCode);
    if (serviceNo) url.searchParams.set("ServiceNo", serviceNo);
    const body = await this.get(url, 15_000, signal);
    return asArray(body.Services, "LTA Services").map((value) => {
      const service = asRecord(value, "LTA service");
      const buses = [service.NextBus, service.NextBus2, service.NextBus3]
        .filter((bus): bus is Record<string, unknown> =>
          Boolean(
            bus &&
            typeof bus === "object" &&
            !Array.isArray(bus) &&
            typeof (bus as Record<string, unknown>).EstimatedArrival === "string" &&
            (bus as Record<string, unknown>).EstimatedArrival,
          ),
        )
        .map((bus) => ({
          estimatedArrival: typeof bus.EstimatedArrival === "string" ? bus.EstimatedArrival : "",
          ...(Number.isFinite(Number(bus.Latitude)) ? { latitude: Number(bus.Latitude) } : {}),
          ...(Number.isFinite(Number(bus.Longitude)) ? { longitude: Number(bus.Longitude) } : {}),
          ...(typeof bus.Load === "string" ? { load: bus.Load } : {}),
          ...(typeof bus.Feature === "string" ? { feature: bus.Feature } : {}),
          ...(typeof bus.Type === "string" ? { type: bus.Type } : {}),
        }));
      return {
        serviceNo: string(service, "ServiceNo"),
        operator: string(service, "Operator"),
        nextBuses: buses,
      };
    });
  }

  async busStops(skip = 0, signal?: AbortSignal): Promise<readonly LtaBusStop[]> {
    const rows = await this.dataset("BusStops", skip, 24 * 60 * 60_000, signal);
    return rows.map((row) => ({
      code: string(row, "BusStopCode"),
      roadName: string(row, "RoadName"),
      description: string(row, "Description"),
      latitude: number(row, "Latitude"),
      longitude: number(row, "Longitude"),
    }));
  }

  async trainServiceAlerts(signal?: AbortSignal): Promise<LtaTrainAlert> {
    const body = await this.get(this.url("TrainServiceAlerts"), 30_000, signal);
    const value = asRecord(body.value, "LTA train alert value");
    return {
      status: Number(value.Status),
      affectedSegments: Array.isArray(value.AffectedSegments) ? value.AffectedSegments : [],
      message: Array.isArray(value.Message) ? value.Message : [],
    };
  }

  async dataset(
    name: LtaDataset,
    skip = 0,
    ttlMs = 60_000,
    signal?: AbortSignal,
  ): Promise<readonly Record<string, unknown>[]> {
    if (!Number.isInteger(skip) || skip < 0 || skip % 500 !== 0)
      throw new Error("invalid-lta-skip");
    const url = this.url(name);
    url.searchParams.set("$skip", String(skip));
    const body = await this.get(url, ttlMs, signal);
    return asArray(body.value, `LTA ${name} value`).map((item) =>
      asRecord(item, `LTA ${name} item`),
    );
  }

  private url(path: string): URL {
    return new URL(`${this.baseUrl.replace(/\/$/, "")}/${path}`);
  }

  private get(url: URL, ttlMs: number, signal?: AbortSignal): Promise<Record<string, unknown>> {
    return this.getJson(url, {
      headers: { AccountKey: this.accountKey, Accept: "application/json" },
      ttlMs,
      ...(signal ? { signal } : {}),
      validate: (value) => asRecord(value, "LTA response"),
    });
  }
}
