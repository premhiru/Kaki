import { asFiniteNumber, asOptionalRecord } from "openclaw/plugin-sdk/string-coerce-runtime";
import { readStringValue } from "openclaw/plugin-sdk/string-coerce-runtime";
import type { RegionalCapabilityId } from "./capabilities.js";
import type { SeaCountry } from "./profiles.js";

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

export type RegionalSourceId =
  | "my.weather"
  | "my.prayer"
  | "my.causeway"
  | "my.holidays"
  | "id.weather"
  | "id.krl"
  | "id.transjakarta"
  | "id.prayer"
  | "th.weather"
  | "th.bts"
  | "th.mrt"
  | "th.holy-days"
  | "th.alcohol-ban-days"
  | "vn.weather"
  | "vn.tet"
  | "ph.weather"
  | "regional.halal"
  | "regional.prayer"
  | "regional.holidays";

export interface RegionalRequest {
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
  readonly allowedOrigin?: string;
  readonly maxResponseBytes?: number;
  readonly timeoutMs?: number;
}
export interface RegionalResponse {
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  json(): Promise<unknown>;
  text(): Promise<string>;
}
export type RegionalTransport = (request: RegionalRequest) => Promise<RegionalResponse>;
export type RegionalParser = (value: unknown) => unknown;

export interface RegionalEndpoint {
  readonly sourceId: RegionalSourceId;
  readonly capabilityId: RegionalCapabilityId | "vn.weather";
  readonly authority: string;
  readonly url: string;
  readonly response: "json" | "text";
  readonly cacheSeconds: number;
  readonly parser: RegionalParser;
  readonly headers?: Readonly<Record<string, string>>;
  readonly credential?: { readonly id: string; readonly header: string; readonly prefix?: string };
}
export interface RegionalClientConfig {
  readonly country: SeaCountry;
  readonly endpoints: Partial<Record<RegionalSourceId, RegionalEndpoint>>;
}
export interface RegionalObservation<T = unknown> {
  readonly country: SeaCountry;
  readonly sourceId: RegionalSourceId;
  readonly authority: string;
  readonly sourceUrl: string;
  readonly observedAt: string;
  readonly data: T;
}
export interface RegionalClientOptions {
  readonly transport?: RegionalTransport;
  readonly cache?: RegionalMemoryCache;
  readonly limiter?: RegionalRateLimiter;
  readonly credentials?: Readonly<Record<string, string>>;
  readonly now?: () => number;
}

export const regionalFetchTransport: RegionalTransport = async (request) => {
  const url = validateRegionalUrl(request.url);
  if (request.allowedOrigin && url.origin !== request.allowedOrigin) {
    throw new RegionalSourceError("url-policy", `regional-source-origin-denied:${url.origin}`);
  }
  const timeout = AbortSignal.timeout(request.timeoutMs ?? 15_000);
  const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;
  const response = await fetch(url, {
    ...(request.headers ? { headers: request.headers } : {}),
    signal,
    redirect: "error",
  });
  const body = await readBoundedBody(response, request.maxResponseBytes ?? MAX_RESPONSE_BYTES);
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    json: async () => {
      try {
        return JSON.parse(body) as unknown;
      } catch {
        throw new RegionalSourceError("invalid-response", "regional-source-invalid-json");
      }
    },
    text: async () => body,
  };
};

function validateRegionalUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new RegionalSourceError("url-policy", "regional-source-https-required");
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    /^127\./u.test(host) ||
    /^10\./u.test(host) ||
    /^192\.168\./u.test(host) ||
    /^169\.254\./u.test(host) ||
    /^172\.(?:1[6-9]|2\d|3[01])\./u.test(host) ||
    host === "::1" ||
    host.startsWith("fe80:") ||
    host.startsWith("fc") ||
    host.startsWith("fd")
  ) {
    throw new RegionalSourceError("url-policy", "regional-source-private-host-denied");
  }
  return url;
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<string> {
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_RESPONSE_BYTES) {
    throw new RegionalSourceError("url-policy", "regional-source-invalid-response-limit");
  }
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new RegionalSourceError("response-too-large", "regional-source-response-too-large");
  }
  if (!response.body) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of response.body) {
    if (!(chunk instanceof Uint8Array)) {
      throw new RegionalSourceError("invalid-response", "regional-source-invalid-body-chunk");
    }
    total += chunk.byteLength;
    if (total > maxBytes) {
      throw new RegionalSourceError("response-too-large", "regional-source-response-too-large");
    }
    chunks.push(chunk);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

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
    private readonly limit = 4,
    private readonly windowMs = 60_000,
    private readonly now = () => Date.now(),
    private readonly sleep = (ms: number, signal?: AbortSignal) =>
      new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
          reject(signal.reason instanceof Error ? signal.reason : new Error("operation-aborted"));
          return;
        }
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(signal.reason instanceof Error ? signal.reason : new Error("operation-aborted"));
          },
          { once: true },
        );
      }),
  ) {
    if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs <= 0)
      throw new Error("invalid-regional-rate-limit");
  }
  async acquire(signal?: AbortSignal): Promise<void> {
    const time = this.now();
    if (!this.startedAt || time - this.startedAt >= this.windowMs) {
      this.startedAt = time;
      this.used = 0;
    }
    if (this.used >= this.limit) {
      await this.sleep(Math.max(0, this.windowMs - (time - this.startedAt)), signal);
      this.startedAt = this.now();
      this.used = 0;
    }
    this.used += 1;
  }
}

export class RegionalPublicClient {
  private readonly transport: RegionalTransport;
  private readonly cache: RegionalMemoryCache;
  private readonly limiter: RegionalRateLimiter;
  private readonly credentials: Readonly<Record<string, string>>;
  private readonly now: () => number;
  constructor(
    readonly config: RegionalClientConfig,
    optionsOrTransport: RegionalClientOptions | RegionalTransport = {},
    legacyCache?: RegionalMemoryCache,
    legacyLimiter?: RegionalRateLimiter,
    legacyNow?: () => number,
  ) {
    const options: RegionalClientOptions =
      typeof optionsOrTransport === "function"
        ? {
            transport: optionsOrTransport,
            ...(legacyCache ? { cache: legacyCache } : {}),
            ...(legacyLimiter ? { limiter: legacyLimiter } : {}),
            ...(legacyNow ? { now: legacyNow } : {}),
          }
        : optionsOrTransport;
    this.transport = options.transport ?? regionalFetchTransport;
    this.cache = options.cache ?? new RegionalMemoryCache();
    this.limiter = options.limiter ?? new RegionalRateLimiter();
    this.credentials = options.credentials ?? {};
    this.now = options.now ?? (() => Date.now());
  }
  weather(location: string, signal?: AbortSignal) {
    return this.query(`${this.config.country}.weather` as RegionalSourceId, { location }, signal);
  }
  holidays(year: number, signal?: AbortSignal) {
    if (!Number.isInteger(year) || year < 2000 || year > 2100)
      throw new Error("invalid-holiday-year");
    return this.query(
      `${this.config.country}.holidays` as RegionalSourceId,
      { year: String(year) },
      signal,
    );
  }
  prayerTimes(location: string, date: string, signal?: AbortSignal) {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) throw new Error("invalid-prayer-date");
    return this.query(
      `${this.config.country}.prayer` as RegionalSourceId,
      { location, date },
      signal,
    );
  }
  causeway(checkpoint: "woodlands" | "tuas", signal?: AbortSignal) {
    if (this.config.country !== "my") throw new Error("causeway-only-supported-for-my");
    return this.query("my.causeway", { checkpoint }, signal);
  }
  async query(
    sourceId: RegionalSourceId,
    parameters: Readonly<Record<string, string>>,
    signal?: AbortSignal,
  ): Promise<RegionalObservation> {
    const endpoint = this.config.endpoints[sourceId];
    if (!endpoint) throw new Error(`${sourceId}-source-not-configured`);
    let rendered = endpoint.url;
    for (const [name, value] of Object.entries(parameters))
      rendered = rendered.replaceAll(`{${name}}`, encodeURIComponent(value));
    if (/\{[a-z-]+\}/iu.test(rendered)) throw new Error(`${sourceId}-missing-parameter`);
    const url = validateRegionalUrl(rendered);
    const configuredOrigin = validateRegionalUrl(
      endpoint.url.replace(/\{[a-z-]+\}/giu, "x"),
    ).origin;
    if (url.origin !== configuredOrigin) throw new Error(`${sourceId}-origin-changed`);
    const cached = this.cache.get(url.toString(), this.now());
    if (cached) return cached;
    const headers: Record<string, string> = { ...(endpoint.headers ?? {}) };
    if (endpoint.credential) {
      const secret = this.credentials[endpoint.credential.id];
      if (!secret)
        throw new RegionalSourceError("authentication", `${sourceId}-credential-required`);
      headers[endpoint.credential.header] = `${endpoint.credential.prefix ?? ""}${secret}`;
    }
    await this.limiter.acquire(signal);
    const response = await this.transport({
      url: url.toString(),
      allowedOrigin: configuredOrigin,
      maxResponseBytes: MAX_RESPONSE_BYTES,
      ...(Object.keys(headers).length ? { headers } : {}),
      ...(signal ? { signal } : {}),
    });
    if (response.status < 200 || response.status >= 300)
      throw new RegionalSourceError(
        "http",
        `regional-source-http-${response.status}`,
        response.status,
        response.status === 429 || response.status >= 500,
      );
    const raw = endpoint.response === "json" ? await response.json() : await response.text();
    const data = endpoint.parser(raw);
    const observation: RegionalObservation = {
      country: this.config.country,
      sourceId,
      authority: endpoint.authority,
      sourceUrl: url.toString(),
      observedAt: new Date(this.now()).toISOString(),
      data,
    };
    this.cache.set(url.toString(), observation, this.now() + endpoint.cacheSeconds * 1000);
    return observation;
  }
}

export class RegionalSourceError extends Error {
  constructor(
    readonly code:
      | "http"
      | "authentication"
      | "invalid-response"
      | "response-too-large"
      | "url-policy",
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "RegionalSourceError";
  }
}

export interface MalaysiaWeatherForecast {
  readonly locationId: string;
  readonly locationName: string;
  readonly date: string;
  readonly morning: string;
  readonly afternoon: string;
  readonly night: string;
  readonly summary: string;
  readonly minCelsius: number;
  readonly maxCelsius: number;
}
export function parseMalaysiaWeather(value: unknown): readonly MalaysiaWeatherForecast[] {
  return asArray(value, "Malaysia weather response")
    .slice(0, 14)
    .map((item) => {
      const row = requireRegionalRecord(item, "Malaysia weather row");
      const location = requireRegionalRecord(row.location, "Malaysia weather location");
      return {
        locationId: requireRegionalString(location.location_id, "Malaysia weather location_id"),
        locationName: requireRegionalString(
          location.location_name,
          "Malaysia weather location_name",
        ),
        date: asDate(row.date, "Malaysia weather date"),
        morning: requireRegionalString(row.morning_forecast, "Malaysia weather morning_forecast"),
        afternoon: requireRegionalString(
          row.afternoon_forecast,
          "Malaysia weather afternoon_forecast",
        ),
        night: requireRegionalString(row.night_forecast, "Malaysia weather night_forecast"),
        summary: requireRegionalString(row.summary_forecast, "Malaysia weather summary_forecast"),
        minCelsius: requireRegionalNumber(row.min_temp, "Malaysia weather min_temp"),
        maxCelsius: requireRegionalNumber(row.max_temp, "Malaysia weather max_temp"),
      };
    });
}

export interface BmkgWeatherForecast {
  readonly administrativeCode: string;
  readonly locationName: string;
  readonly timezone: string;
  readonly at: string;
  readonly description: string;
  readonly temperatureCelsius: number;
  readonly humidityPercent: number;
  readonly windKph: number;
  readonly precipitationMm: number;
}
export function parseBmkgWeather(value: unknown): readonly BmkgWeatherForecast[] {
  const root = requireRegionalRecord(value, "BMKG response");
  const location = requireRegionalRecord(root.lokasi, "BMKG location");
  const administrativeCode = requireRegionalString(location.adm4, "BMKG adm4");
  const locationName = requireRegionalString(location.desa, "BMKG desa");
  const timezone = requireRegionalString(location.timezone, "BMKG timezone");
  const output: BmkgWeatherForecast[] = [];
  for (const group of asArray(root.data, "BMKG data")) {
    const data = requireRegionalRecord(group, "BMKG data row");
    for (const day of asArray(data.cuaca, "BMKG cuaca"))
      for (const item of asArray(day, "BMKG forecast group")) {
        const row = requireRegionalRecord(item, "BMKG forecast");
        output.push({
          administrativeCode,
          locationName,
          timezone,
          at: asDateTime(row.datetime, "BMKG datetime"),
          description: requireRegionalString(row.weather_desc, "BMKG weather_desc"),
          temperatureCelsius: requireRegionalNumber(row.t, "BMKG temperature"),
          humidityPercent: requireRegionalNumber(row.hu, "BMKG humidity"),
          windKph: requireRegionalNumber(row.ws, "BMKG wind"),
          precipitationMm: requireRegionalNumber(row.tp, "BMKG precipitation"),
        });
        if (output.length >= 40) return output;
      }
  }
  if (!output.length) throw new RegionalSourceError("invalid-response", "BMKG forecast is empty");
  return output;
}

export interface JakimPrayerDay {
  readonly zone: string;
  readonly date: string;
  readonly hijri: string;
  readonly fajr: string;
  readonly sunrise: string;
  readonly dhuhr: string;
  readonly asr: string;
  readonly maghrib: string;
  readonly isha: string;
}
export function parseJakimPrayer(value: unknown): readonly JakimPrayerDay[] {
  const root = requireRegionalRecord(value, "JAKIM response");
  if (root.status !== "OK!")
    throw new RegionalSourceError("invalid-response", "JAKIM status is not OK");
  const zone = requireRegionalString(root.zone, "JAKIM zone");
  return asArray(root.prayerTime, "JAKIM prayerTime")
    .slice(0, 35)
    .map((item) => {
      const row = requireRegionalRecord(item, "JAKIM prayer day");
      return {
        zone,
        date: requireRegionalString(row.date, "JAKIM date"),
        hijri: requireRegionalString(row.hijri, "JAKIM hijri"),
        fajr: asTime(row.fajr, "JAKIM fajr"),
        sunrise: asTime(row.syuruk, "JAKIM syuruk"),
        dhuhr: asTime(row.dhuhr, "JAKIM dhuhr"),
        asr: asTime(row.asr, "JAKIM asr"),
        maghrib: asTime(row.maghrib, "JAKIM maghrib"),
        isha: asTime(row.isha, "JAKIM isha"),
      };
    });
}

export interface TmdWeatherForecast {
  readonly province: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly at: string;
  readonly temperatureCelsius: number;
  readonly humidityPercent: number;
  readonly rainMm?: number;
  readonly windMetresPerSecond?: number;
  readonly condition?: string;
}
export function parseTmdWeather(value: unknown): readonly TmdWeatherForecast[] {
  const root = requireRegionalRecord(value, "TMD response");
  const output: TmdWeatherForecast[] = [];
  for (const item of asArray(root.WeatherForecast, "TMD WeatherForecast")) {
    const row = requireRegionalRecord(item, "TMD location forecast");
    const location = requireRegionalRecord(row.location, "TMD location");
    const province = requireRegionalString(location.province, "TMD province");
    const latitude = requireRegionalNumber(location.lat, "TMD latitude");
    const longitude = requireRegionalNumber(location.lon, "TMD longitude");
    for (const forecast of asArray(row.forecasts, "TMD forecasts")) {
      const forecastRow = requireRegionalRecord(forecast, "TMD forecast");
      const data = requireRegionalRecord(forecastRow.data, "TMD forecast data");
      output.push({
        province,
        latitude,
        longitude,
        at: asDateTime(forecastRow.time, "TMD time"),
        temperatureCelsius: requireRegionalNumber(data.tc, "TMD temperature"),
        humidityPercent: requireRegionalNumber(data.rh, "TMD humidity"),
        ...(typeof data.rain === "number"
          ? { rainMm: requireRegionalNumber(data.rain, "TMD rain") }
          : {}),
        ...(typeof data.ws10m === "number"
          ? { windMetresPerSecond: requireRegionalNumber(data.ws10m, "TMD wind") }
          : {}),
        ...(typeof data.cond === "string"
          ? { condition: requireRegionalString(data.cond, "TMD condition") }
          : {}),
      });
      if (output.length >= 48) return output;
    }
  }
  if (!output.length) throw new RegionalSourceError("invalid-response", "TMD forecast is empty");
  return output;
}

export interface OfficialPublication {
  readonly excerpt: string;
  readonly characterCount: number;
}
export function officialPublicationParser(
  ...requiredMarkers: readonly string[]
): (value: unknown) => OfficialPublication {
  return (value) => {
    if (typeof value !== "string")
      throw new RegionalSourceError("invalid-response", "official publication must be text");
    for (const marker of requiredMarkers)
      if (!value.toLocaleLowerCase().includes(marker.toLocaleLowerCase()))
        throw new RegionalSourceError(
          "invalid-response",
          `official publication marker missing:${marker}`,
        );
    const text = value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
      .replace(/<[^>]+>/gu, " ")
      .replace(/&nbsp;|&#160;/giu, " ")
      .replace(/&amp;/giu, "&")
      .replace(/&lt;/giu, "<")
      .replace(/&gt;/giu, ">")
      .replace(/\s+/gu, " ")
      .trim();
    if (text.length < 20)
      throw new RegionalSourceError("invalid-response", "official publication is empty");
    return {
      excerpt: text.slice(0, 6_000),
      characterCount: text.length,
    } satisfies OfficialPublication;
  };
}

const publication = (
  sourceId: RegionalSourceId,
  capabilityId: RegionalEndpoint["capabilityId"],
  authority: string,
  url: string,
  ...markers: readonly string[]
): RegionalEndpoint => ({
  sourceId,
  capabilityId,
  authority,
  url,
  response: "text",
  cacheSeconds: 900,
  parser: officialPublicationParser(...markers),
});
export const REGIONAL_CLIENT_CONFIGS: Readonly<Record<SeaCountry, RegionalClientConfig>> = {
  my: {
    country: "my",
    endpoints: {
      "my.weather": {
        sourceId: "my.weather",
        capabilityId: "my.weather",
        authority: "MET Malaysia via data.gov.my",
        url: "https://api.data.gov.my/weather/forecast/?contains={location}@location__location_name&limit=7",
        response: "json",
        cacheSeconds: 900,
        parser: parseMalaysiaWeather,
      },
      "my.prayer": {
        sourceId: "my.prayer",
        capabilityId: "my.prayer",
        authority: "JAKIM e-Solat",
        url: "https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=date&zone={location}&date={date}",
        response: "json",
        cacheSeconds: 3600,
        parser: parseJakimPrayer,
      },
      "my.causeway": publication(
        "my.causeway",
        "my.causeway",
        "LTA OneMotoring",
        "https://onemotoring.lta.gov.sg/content/onemotoring/home/driving/traffic_information/traffic-cameras.html",
        "Traffic Cameras",
      ),
      "my.holidays": publication(
        "my.holidays",
        "my.holidays",
        "Malaysia Cabinet Division",
        "https://www.kabinet.gov.my/hari-kelepasan-am/",
        "HARI KELEPASAN AM",
      ),
    },
  },
  id: {
    country: "id",
    endpoints: {
      "id.weather": {
        sourceId: "id.weather",
        capabilityId: "id.weather",
        authority: "BMKG",
        url: "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={location}",
        response: "json",
        cacheSeconds: 900,
        parser: parseBmkgWeather,
      },
    },
  },
  th: {
    country: "th",
    endpoints: {
      "th.weather": {
        sourceId: "th.weather",
        capabilityId: "th.weather",
        authority: "Thai Meteorological Department",
        url: "https://data.tmd.go.th/nwpapi/v1/forecast/location/hourly/place?province={location}&fields=tc,rh,rain,ws10m,cond&duration=24",
        response: "json",
        cacheSeconds: 900,
        parser: parseTmdWeather,
        credential: { id: "tmd-api-token", header: "Authorization", prefix: "Bearer " },
      },
      "th.bts": publication(
        "th.bts",
        "th.bts",
        "Bangkok Mass Transit System",
        "https://www.bts.co.th/eng/traintime-frequency/",
        "Service Hours",
      ),
      "th.mrt": publication(
        "th.mrt",
        "th.mrt",
        "Mass Rapid Transit Authority of Thailand",
        "https://www.mrta.co.th/",
        "MRTA",
      ),
    },
  },
  vn: {
    country: "vn",
    endpoints: {
      "vn.weather": publication(
        "vn.weather",
        "vn.weather",
        "National Center for Hydro-Meteorological Forecasting",
        "https://nchmf.gov.vn/kttvsiteE/en-US/2/index.html",
        "National Center",
      ),
      "vn.tet": publication(
        "vn.tet",
        "vn.tet",
        "Vietnam Government Portal",
        "https://xaydungchinhsach.chinhphu.vn/",
        "CHÍNH PHỦ",
      ),
    },
  },
  ph: {
    country: "ph",
    endpoints: {
      "ph.weather": publication(
        "ph.weather",
        "ph.weather",
        "DOST-PAGASA",
        "https://bagong.pagasa.dost.gov.ph/weather/weather-outlook-weekly",
        "PAGASA",
        "Issued at",
      ),
    },
  },
};

export interface RegionalDataSource {
  readonly id: RegionalSourceId;
  readonly country: SeaCountry;
  readonly authority: string;
  readonly url: string;
  readonly cacheSeconds: number;
  readonly credentialGate?: string;
  readonly fixture: string;
}
export const REGIONAL_SOURCES: readonly RegionalDataSource[] = Object.values(
  REGIONAL_CLIENT_CONFIGS,
).flatMap((config) =>
  Object.values(config.endpoints).map((endpoint) => ({
    id: endpoint.sourceId,
    country: config.country,
    authority: endpoint.authority,
    url: endpoint.url,
    cacheSeconds: endpoint.cacheSeconds,
    ...(endpoint.credential ? { credentialGate: endpoint.credential.id } : {}),
    fixture: `fixtures/${endpoint.sourceId.replace(".", "-")}.json`,
  })),
);

function requireRegionalRecord(value: unknown, label: string): Record<string, unknown> {
  const record = asOptionalRecord(value);
  if (!record) throw new RegionalSourceError("invalid-response", `${label} must be an object`);
  return record;
}
function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value))
    throw new RegionalSourceError("invalid-response", `${label} must be an array`);
  return value;
}
function requireRegionalString(value: unknown, label: string): string {
  const text = readStringValue(value);
  if (text === undefined || !text.trim() || text.length > 1_000)
    throw new RegionalSourceError("invalid-response", `${label} must be a bounded string`);
  return text;
}
function requireRegionalNumber(value: unknown, label: string): number {
  const number = asFiniteNumber(value);
  if (number === undefined)
    throw new RegionalSourceError("invalid-response", `${label} must be a finite number`);
  return number;
}
function asDate(value: unknown, label: string): string {
  const text = requireRegionalString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(text))
    throw new RegionalSourceError("invalid-response", `${label} must be an ISO date`);
  return text;
}
function asDateTime(value: unknown, label: string): string {
  const text = requireRegionalString(value, label);
  if (!Number.isFinite(Date.parse(text)))
    throw new RegionalSourceError("invalid-response", `${label} must be an ISO datetime`);
  return text;
}
function asTime(value: unknown, label: string): string {
  const text = requireRegionalString(value, label);
  if (!/^\d{2}:\d{2}:\d{2}$/u.test(text))
    throw new RegionalSourceError("invalid-response", `${label} must be HH:MM:SS`);
  return text;
}
