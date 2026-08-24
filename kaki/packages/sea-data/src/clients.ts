import type { SeaCountry } from "./profiles.js";

export type RegionalSourceKind = "weather" | "holidays" | "prayer" | "causeway";
export interface RegionalEndpoint {
  readonly url: string;
  readonly response: "json" | "text";
  readonly cacheSeconds: number;
  readonly headers?: Readonly<Record<string, string>>;
}
export interface RegionalClientConfig {
  readonly country: SeaCountry;
  readonly endpoints: Partial<Record<RegionalSourceKind, RegionalEndpoint>>;
}
export interface RegionalRequest {
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
}
export interface RegionalResponse {
  readonly status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}
export type RegionalTransport = (request: RegionalRequest) => Promise<RegionalResponse>;
export interface RegionalObservation<T = unknown> {
  readonly country: SeaCountry;
  readonly kind: RegionalSourceKind;
  readonly sourceUrl: string;
  readonly observedAt: string;
  readonly data: T;
}

export const regionalFetchTransport: RegionalTransport = async (request) => {
  const response = await fetch(request.url, {
    ...(request.headers ? { headers: request.headers } : {}),
    ...(request.signal ? { signal: request.signal } : {}),
  });
  return { status: response.status, json: () => response.json(), text: () => response.text() };
};
interface CacheEntry {
  readonly expiresAt: number;
  readonly value: RegionalObservation;
}
export class RegionalMemoryCache {
  private readonly entries = new Map<string, CacheEntry>();
  get(key: string, now: number): RegionalObservation | undefined {
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }
  set(key: string, value: RegionalObservation, expiresAt: number): void {
    this.entries.set(key, { value, expiresAt });
  }
}
export class RegionalRateLimiter {
  private startedAt = 0;
  private used = 0;
  constructor(
    private readonly limit = 6,
    private readonly windowMs = 10_000,
    private readonly now = () => Date.now(),
    private readonly sleep = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ) {}
  async acquire(): Promise<void> {
    const time = this.now();
    if (!this.startedAt || time - this.startedAt >= this.windowMs) {
      this.startedAt = time;
      this.used = 0;
    }
    if (this.used >= this.limit) {
      await this.sleep(Math.max(0, this.windowMs - (time - this.startedAt)));
      this.startedAt = this.now();
      this.used = 0;
    }
    this.used += 1;
  }
}

export class RegionalPublicClient {
  constructor(
    readonly config: RegionalClientConfig,
    private readonly transport: RegionalTransport = regionalFetchTransport,
    private readonly cache = new RegionalMemoryCache(),
    private readonly limiter = new RegionalRateLimiter(),
    private readonly now = () => Date.now(),
  ) {}

  weather(location: string, signal?: AbortSignal) {
    return this.query("weather", { location }, signal);
  }
  holidays(year: number, signal?: AbortSignal) {
    if (!Number.isInteger(year) || year < 2000 || year > 2100)
      throw new Error("invalid-holiday-year");
    return this.query("holidays", { year: String(year) }, signal);
  }
  prayerTimes(location: string, date: string, signal?: AbortSignal) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("invalid-prayer-date");
    return this.query("prayer", { location, date }, signal);
  }
  causeway(checkpoint: "woodlands" | "tuas", signal?: AbortSignal) {
    if (this.config.country !== "my") throw new Error("causeway-only-supported-for-my");
    return this.query("causeway", { checkpoint }, signal);
  }

  async query(
    kind: RegionalSourceKind,
    parameters: Readonly<Record<string, string>>,
    signal?: AbortSignal,
  ): Promise<RegionalObservation> {
    const endpoint = this.config.endpoints[kind];
    if (!endpoint) throw new Error(`${this.config.country}-${kind}-source-not-configured`);
    let rendered = endpoint.url;
    for (const [name, value] of Object.entries(parameters))
      rendered = rendered.replaceAll(`{${name}}`, encodeURIComponent(value));
    if (/\{[a-z]+\}/i.test(rendered))
      throw new Error(`${this.config.country}-${kind}-missing-parameter`);
    const cached = this.cache.get(rendered, this.now());
    if (cached) return cached;
    await this.limiter.acquire();
    const response = await this.transport({
      url: rendered,
      ...(endpoint.headers ? { headers: endpoint.headers } : {}),
      ...(signal ? { signal } : {}),
    });
    if (response.status < 200 || response.status >= 300)
      throw new RegionalSourceError(
        response.status,
        response.status === 429 || response.status >= 500,
      );
    const data = endpoint.response === "json" ? await response.json() : await response.text();
    const observation: RegionalObservation = {
      country: this.config.country,
      kind,
      sourceUrl: rendered,
      observedAt: new Date(this.now()).toISOString(),
      data,
    };
    this.cache.set(rendered, observation, this.now() + endpoint.cacheSeconds * 1000);
    return observation;
  }
}

export class RegionalSourceError extends Error {
  constructor(
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(`regional-source-http-${status}`);
    this.name = "RegionalSourceError";
  }
}

/** Official-agency defaults; hooks without stable public APIs remain explicitly configurable. */
export const REGIONAL_CLIENT_CONFIGS: Readonly<Record<SeaCountry, RegionalClientConfig>> = {
  my: {
    country: "my",
    endpoints: {
      weather: {
        url: "https://api.met.gov.my/v2/data?datasetid=FORECAST&datacategoryid=GENERAL&locationid={location}",
        response: "json",
        cacheSeconds: 900,
      },
      causeway: {
        url: "https://onemotoring.lta.gov.sg/content/onemotoring/home/driving/traffic_information/traffic-cameras/{checkpoint}.html",
        response: "text",
        cacheSeconds: 60,
      },
    },
  },
  id: {
    country: "id",
    endpoints: {
      weather: {
        url: "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={location}",
        response: "json",
        cacheSeconds: 900,
      },
    },
  },
  th: {
    country: "th",
    endpoints: {
      weather: {
        url: "https://data.tmd.go.th/nwpapi/v1/forecast/location/hourly/at?lat={location}",
        response: "json",
        cacheSeconds: 900,
      },
    },
  },
  vn: {
    country: "vn",
    endpoints: {
      weather: {
        url: "https://nchmf.gov.vn/kttvsiteE/en-US/2/index.html",
        response: "text",
        cacheSeconds: 900,
      },
    },
  },
  ph: {
    country: "ph",
    endpoints: {
      weather: {
        url: "https://bagong.pagasa.dost.gov.ph/weather/weather-outlook-selected-tourist-areas",
        response: "text",
        cacheSeconds: 900,
      },
    },
  },
};

export interface RegionalDataSource {
  readonly id: string;
  readonly country: SeaCountry;
  readonly url: string;
  readonly cacheSeconds: number;
  readonly fixture: string;
}
export const REGIONAL_SOURCES: readonly RegionalDataSource[] = Object.values(
  REGIONAL_CLIENT_CONFIGS,
).flatMap((config) =>
  Object.entries(config.endpoints).map(([kind, endpoint]) => ({
    id: `${config.country}.${kind}`,
    country: config.country,
    url: endpoint.url,
    cacheSeconds: endpoint.cacheSeconds,
    fixture: `fixtures/${config.country}-${kind}.json`,
  })),
);
