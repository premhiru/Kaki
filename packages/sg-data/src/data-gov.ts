import {
  asArray,
  asRecord,
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

  constructor(options: DataGovClientOptions = {}) {
    super({
      ...options,
      limiter:
        options.limiter ??
        new FixedWindowRateLimiter(options.apiKey ? 12 : 6, 10_000, options.clock),
    });
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? "https://api-open.data.gov.sg";
    this.datastoreBaseUrl = options.datastoreBaseUrl ?? "https://data.gov.sg";
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
        const record = asRecord(value, "data.gov.sg response");
        return {
          ...(typeof record.code === "number" ? { code: record.code } : {}),
          ...(typeof record.errorMsg === "string" ? { errorMsg: record.errorMsg } : {}),
          data: asRecord(record.data, "data.gov.sg data"),
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
        const root = asRecord(value, "data.gov.sg dataset response");
        if (root.success !== true) throw new Error("data-gov-datastore-failed");
        const data = asRecord(root.result, "data.gov.sg dataset result");
        const rows = data.records ?? [];
        return asArray(rows, "data.gov.sg records").map((row) => {
          const record = asRecord(row, "data.gov.sg record");
          return {
            ...(typeof record.rowId === "string" ? { rowId: record.rowId } : {}),
            fields: asRecord(record.fields ?? record, "data.gov.sg record fields"),
          };
        });
      },
    });
  }

  private headers(): Readonly<Record<string, string>> | undefined {
    return this.apiKey ? { "x-api-key": this.apiKey, Accept: "application/json" } : undefined;
  }
}
