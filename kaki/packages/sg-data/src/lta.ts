import {
  asArray,
  requireApiRecord,
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

export interface LtaBusRoute {
  readonly serviceNo: string;
  readonly operator: string;
  readonly direction: number;
  readonly stopSequence: number;
  readonly busStopCode: string;
  readonly distanceKm?: number;
  readonly schedule: Readonly<Record<string, string>>;
}

export interface LtaCarParkAvailability {
  readonly carParkId: string;
  readonly area: string;
  readonly development: string;
  readonly location: string;
  readonly availableLots: number;
  readonly lotType: string;
}

export interface LtaErpRate {
  readonly vehicleType: string;
  readonly dayType: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly zoneId: string;
  readonly chargeAmount: number;
}

export interface LtaCoordinate {
  readonly latitude: number;
  readonly longitude: number;
}

export interface LtaTrafficIncident extends LtaCoordinate {
  readonly type: string;
  readonly message: string;
}

export interface LtaEstimatedTravelTime {
  readonly name: string;
  readonly direction: string;
  readonly farEndPoint: string;
  readonly estimatedTimeMinutes: number;
}

export interface LtaTrafficImage extends LtaCoordinate {
  readonly cameraId: string;
  readonly imageUrl: string;
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
      const service = requireApiRecord(value, "LTA service");
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

  async busRoutes(skip = 0, signal?: AbortSignal): Promise<readonly LtaBusRoute[]> {
    const rows = await this.dataset("BusRoutes", skip, 24 * 60 * 60_000, signal);
    return rows.map((row) => ({
      serviceNo: string(row, "ServiceNo"),
      operator: string(row, "Operator"),
      direction: number(row, "Direction"),
      stopSequence: number(row, "StopSequence"),
      busStopCode: string(row, "BusStopCode"),
      ...(Number.isFinite(Number(row.Distance)) ? { distanceKm: Number(row.Distance) } : {}),
      schedule: Object.fromEntries(
        Object.entries(row).flatMap(([key, value]) =>
          /^(?:WD|SAT|SUN)_/u.test(key) && typeof value === "string" ? [[key, value]] : [],
        ),
      ),
    }));
  }

  async carParkAvailability(signal?: AbortSignal): Promise<readonly LtaCarParkAvailability[]> {
    return (await this.dataset("CarParkAvailabilityv2", 0, 60_000, signal)).map((row) => ({
      carParkId: string(row, "CarParkID"),
      area: string(row, "Area"),
      development: string(row, "Development"),
      location: string(row, "Location"),
      availableLots: number(row, "AvailableLots"),
      lotType: string(row, "LotType"),
    }));
  }

  async erpRates(signal?: AbortSignal): Promise<readonly LtaErpRate[]> {
    return (await this.dataset("ERPRates", 0, 15 * 60_000, signal)).map((row) => ({
      vehicleType: string(row, "VehicleType"),
      dayType: string(row, "DayType"),
      startTime: string(row, "StartTime"),
      endTime: string(row, "EndTime"),
      zoneId: string(row, "ZoneID"),
      chargeAmount: number(row, "ChargeAmount"),
    }));
  }

  async taxiAvailability(signal?: AbortSignal): Promise<readonly LtaCoordinate[]> {
    return (await this.dataset("Taxi-Availability", 0, 30_000, signal)).map((row) => ({
      latitude: number(row, "Latitude"),
      longitude: number(row, "Longitude"),
    }));
  }

  async trafficIncidents(signal?: AbortSignal): Promise<readonly LtaTrafficIncident[]> {
    return (await this.dataset("TrafficIncidents", 0, 30_000, signal)).map((row) => ({
      type: string(row, "Type"),
      latitude: number(row, "Latitude"),
      longitude: number(row, "Longitude"),
      message: string(row, "Message"),
    }));
  }

  async estimatedTravelTimes(signal?: AbortSignal): Promise<readonly LtaEstimatedTravelTime[]> {
    return (await this.dataset("EstTravelTimes", 0, 60_000, signal)).map((row) => ({
      name: string(row, "Name"),
      direction: string(row, "Direction"),
      farEndPoint: string(row, "FarEndPoint"),
      estimatedTimeMinutes: number(row, "EstTime"),
    }));
  }

  async trafficImages(signal?: AbortSignal): Promise<readonly LtaTrafficImage[]> {
    return (await this.dataset("Traffic-Imagesv2", 0, 60_000, signal)).map((row) => ({
      cameraId: string(row, "CameraID"),
      latitude: number(row, "Latitude"),
      longitude: number(row, "Longitude"),
      imageUrl: string(row, "ImageLink"),
    }));
  }

  async trainServiceAlerts(signal?: AbortSignal): Promise<LtaTrainAlert> {
    const body = await this.get(this.url("TrainServiceAlerts"), 30_000, signal);
    const value = requireApiRecord(body.value, "LTA train alert value");
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
      requireApiRecord(item, `LTA ${name} item`),
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
      validate: (value) => requireApiRecord(value, "LTA response"),
    });
  }
}
