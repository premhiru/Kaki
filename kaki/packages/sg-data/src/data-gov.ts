import {
  asArray,
  requireApiRecord,
  CachedHttpClient,
  type CachedHttpClientOptions,
  FixedWindowRateLimiter,
} from "./http.js";

export type DataGovRealtimeDataset =
  | "two-hr-forecast"
  | "twenty-four-hr-forecast"
  | "four-day-outlook"
  | "rainfall"
  | "psi"
  | "pm25"
  | "uv";

export interface DataGovClientOptions extends CachedHttpClientOptions {
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly datastoreBaseUrl?: string;
  readonly downloadBaseUrl?: string;
  readonly downloadLimiter?: FixedWindowRateLimiter;
  readonly downloadUrlPolicy?: (url: URL) => boolean;
}

export interface DataGovRealtimeResponse {
  readonly code?: number;
  readonly errorMsg?: string;
  readonly data: Record<string, unknown>;
}

export interface DatasetRecord {
  readonly rowId?: string;
  readonly fields: Record<string, unknown>;
}

export class DataGovSgClient extends CachedHttpClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly datastoreBaseUrl: string;
  private readonly downloadBaseUrl: string;
  private readonly downloadLimiter: FixedWindowRateLimiter;
  private readonly downloadUrlPolicy: (url: URL) => boolean;

  constructor(options: DataGovClientOptions = {}) {
    super({
      ...options,
      limiter:
        options.limiter ??
        new FixedWindowRateLimiter(options.apiKey ? 30 : 4, 60_000, options.clock),
    });
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api-open.data.gov.sg";
    this.datastoreBaseUrl = options.datastoreBaseUrl ?? "https://data.gov.sg";
    this.downloadBaseUrl = options.downloadBaseUrl ?? "https://api-open.data.gov.sg";
    this.downloadLimiter = options.downloadLimiter ?? this.limiter;
    this.downloadUrlPolicy = options.downloadUrlPolicy ?? isOfficialDataGovDownloadUrl;
  }

  async realtime(
    dataset: DataGovRealtimeDataset,
    date?: string,
    signal?: AbortSignal,
  ): Promise<DataGovRealtimeResponse> {
    if (date && !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2})?$/.test(date))
      throw new Error("invalid-data-gov-date");
    const url = new URL(`${this.baseUrl.replace(/\/$/, "")}/v2/real-time/api/${dataset}`);
    if (date) url.searchParams.set("date", date);
    const headers = this.headers();
    return this.getJson(url, {
      ...(headers ? { headers } : {}),
      ttlMs: date ? 5 * 60_000 : 60_000,
      ...(signal ? { signal } : {}),
      validate: (value) => {
        const record = requireApiRecord(value, "data.gov.sg response");
        return {
          ...(typeof record.code === "number" ? { code: record.code } : {}),
          ...(typeof record.errorMsg === "string" ? { errorMsg: record.errorMsg } : {}),
          data: requireApiRecord(record.data, "data.gov.sg data"),
        };
      },
    });
  }

  async datasetRows(
    datasetId: string,
    limit = 100,
    offset = 0,
    signal?: AbortSignal,
  ): Promise<readonly DatasetRecord[]> {
    if (!/^[A-Za-z0-9_-]+$/.test(datasetId)) throw new Error("invalid-data-gov-dataset-id");
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 500 ||
      !Number.isInteger(offset) ||
      offset < 0
    ) {
      throw new Error("invalid-data-gov-pagination");
    }
    const url = new URL("/api/action/datastore_search", this.datastoreBaseUrl);
    url.searchParams.set("resource_id", datasetId);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    const headers = this.headers();
    return this.getJson(url, {
      ...(headers ? { headers } : {}),
      ttlMs: 6 * 60 * 60_000,
      ...(signal ? { signal } : {}),
      validate: (value) => {
        const root = requireApiRecord(value, "data.gov.sg dataset response");
        if (root.success !== true) throw new Error("data-gov-datastore-failed");
        const data = requireApiRecord(root.result, "data.gov.sg dataset result");
        const rows = data.records ?? [];
        return asArray(rows, "data.gov.sg records").map((row) => {
          const record = requireApiRecord(row, "data.gov.sg record");
          return {
            ...(typeof record.rowId === "string" ? { rowId: record.rowId } : {}),
            fields: requireApiRecord(record.fields ?? record, "data.gov.sg record fields"),
          };
        });
      },
    });
  }

  async datasetGeoJson(
    datasetId: string,
    signal?: AbortSignal,
  ): Promise<readonly Record<string, unknown>[]> {
    if (!/^[A-Za-z0-9_-]+$/.test(datasetId)) throw new Error("invalid-data-gov-dataset-id");
    const poll = new URL(
      `/v1/public/api/datasets/${datasetId}/poll-download`,
      this.downloadBaseUrl,
    );
    const headers = this.headers();
    const download = await this.getJson(poll, {
      ...(headers ? { headers } : {}),
      ttlMs: 60_000,
      limiter: this.downloadLimiter,
      ...(signal ? { signal } : {}),
      validate: (value) => {
        const root = requireApiRecord(value, "data.gov.sg download response");
        if (root.code !== 0) throw new Error("data-gov-download-not-ready");
        const data = requireApiRecord(root.data, "data.gov.sg download data");
        if (typeof data.url !== "string" || !/^https:\/\//u.test(data.url)) {
          throw new Error("data-gov-download-url-missing");
        }
        return data.url;
      },
    });
    const downloadUrl = new URL(download);
    if (!this.downloadUrlPolicy(downloadUrl)) throw new Error("data-gov-download-url-denied");
    return this.getJson(downloadUrl, {
      ttlMs: 10 * 60_000,
      limiter: this.downloadLimiter,
      ...(signal ? { signal } : {}),
      validate: (value) => {
        const root = requireApiRecord(value, "data.gov.sg GeoJSON");
        if (root.type !== "FeatureCollection") throw new Error("data-gov-geojson-invalid");
        return asArray(root.features, "data.gov.sg GeoJSON features").map((feature) =>
          requireApiRecord(feature, "data.gov.sg GeoJSON feature"),
        );
      },
    });
  }

  private headers(): Readonly<Record<string, string>> | undefined {
    return this.apiKey ? { "x-api-key": this.apiKey, Accept: "application/json" } : undefined;
  }
}

function isOfficialDataGovDownloadUrl(url: URL): boolean {
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  if (url.hostname === "blobs.data.gov.sg") return true;
  return (
    url.hostname === "s3.ap-southeast-1.amazonaws.com" &&
    url.pathname.startsWith("/blobs.data.gov.sg/")
  );
}
