import type { DataGovSgClient, DatasetRecord } from "./data-gov.js";

export interface SingaporeDatasetIds {
  readonly dengueClusters: string;
  readonly hdbResalePrices: string;
  readonly hawkerCentreClosures: string;
  readonly schoolHolidays: string;
  readonly publicHolidays: string;
  readonly coeResults: string;
  readonly mohClinics: string;
  readonly neaWarnings: string;
}

export interface DengueCluster {
  readonly locality: string;
  readonly cases: number;
  readonly updatedAt?: string;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly geometry?: Readonly<Record<string, unknown>>;
}

export interface HdbResaleTransaction {
  readonly month: string;
  readonly town: string;
  readonly flatType: string;
  readonly block: string;
  readonly streetName: string;
  readonly resalePrice: number;
  readonly fields: Readonly<Record<string, unknown>>;
}

export interface HawkerClosure {
  readonly name: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly reason?: string;
  readonly periods: readonly { startDate: string; endDate?: string; reason?: string }[];
  readonly fields: Readonly<Record<string, unknown>>;
}

export interface SingaporeHoliday {
  readonly date: string;
  readonly name: string;
  readonly kind: "school" | "public";
  readonly fields: Readonly<Record<string, unknown>>;
}

export interface CoeResult {
  readonly exercise: string;
  readonly category: string;
  readonly quota: number;
  readonly bidsReceived: number;
  readonly premium: number;
  readonly fields: Readonly<Record<string, unknown>>;
}

/** Configured IDs avoid silently binding to stale data.gov.sg resources. */
export class SingaporePublicDatasetClient {
  constructor(
    private readonly dataGov: DataGovSgClient,
    private readonly ids: SingaporeDatasetIds,
  ) {}

  async dengueClusters(signal?: AbortSignal): Promise<readonly DengueCluster[]> {
    return (
      await this.dataGov.datasetGeoJson(assertDatasetId(this.ids.dengueClusters), signal)
    ).map((feature) => {
      const fields = asFields(feature.properties);
      const geometry = asOptionalFields(feature.geometry);
      const updatedAt = optionalText(fields, ["FMEL_UPD_D", "updated_at", "last_updated"]);
      return {
        locality: requiredText(fields, ["LOCALITY", "locality", "cluster"]),
        cases: requiredNumber(fields, ["CASE_SIZE", "cases", "case_size"]),
        ...(updatedAt ? { updatedAt } : {}),
        ...(geometry ? { geometry } : {}),
        fields,
      };
    });
  }

  async hdbResalePrices(signal?: AbortSignal): Promise<readonly HdbResaleTransaction[]> {
    return (await this.rows(this.ids.hdbResalePrices, signal)).map((row) => ({
      month: requiredText(row.fields, ["month", "Month"]),
      town: requiredText(row.fields, ["town", "Town"]),
      flatType: requiredText(row.fields, ["flat_type", "Flat Type"]),
      block: requiredText(row.fields, ["block", "Block"]),
      streetName: requiredText(row.fields, ["street_name", "Street Name"]),
      resalePrice: requiredNumber(row.fields, ["resale_price", "Resale Price"]),
      fields: row.fields,
    }));
  }

  async hawkerClosures(signal?: AbortSignal): Promise<readonly HawkerClosure[]> {
    return (await this.rows(this.ids.hawkerCentreClosures, signal)).map((row) => {
      const periods = closurePeriods(row.fields);
      const startDate =
        optionalText(row.fields, ["start_date", "Start Date"]) ?? periods[0]?.startDate;
      const endDate = optionalText(row.fields, ["end_date", "End Date"]) ?? periods[0]?.endDate;
      const reason = optionalText(row.fields, ["reason", "Reason"]) ?? periods[0]?.reason;
      return {
        name: requiredText(row.fields, ["name", "Name", "hawker_centre", "Hawker Centre"]),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(reason ? { reason } : {}),
        periods,
        fields: row.fields,
      };
    });
  }

  schoolHolidays(signal?: AbortSignal): Promise<readonly SingaporeHoliday[]> {
    return this.holidays(this.ids.schoolHolidays, "school", signal);
  }

  publicHolidays(signal?: AbortSignal): Promise<readonly SingaporeHoliday[]> {
    return this.holidays(this.ids.publicHolidays, "public", signal);
  }

  async coeResults(signal?: AbortSignal): Promise<readonly CoeResult[]> {
    return (await this.rows(this.ids.coeResults, signal)).map((row) => ({
      exercise: `${requiredText(row.fields, ["month", "Month", "exercise"])}-${optionalText(row.fields, ["bidding_no", "Bidding No"]) ?? "1"}`,
      category: requiredText(row.fields, ["vehicle_class", "Vehicle Class", "category"]),
      quota: requiredNumber(row.fields, ["quota", "Quota"]),
      bidsReceived: requiredNumber(row.fields, ["bids_received", "Bids Received"]),
      premium: requiredNumber(row.fields, ["premium", "Premium", "quota_premium"]),
      fields: row.fields,
    }));
  }

  rawMohClinicRows(signal?: AbortSignal): Promise<readonly DatasetRecord[]> {
    return this.rows(this.ids.mohClinics, signal);
  }

  rawNeaWarningRows(signal?: AbortSignal): Promise<readonly DatasetRecord[]> {
    return this.rows(this.ids.neaWarnings, signal);
  }

  private rows(id: string, signal?: AbortSignal): Promise<readonly DatasetRecord[]> {
    return this.dataGov.datasetRows(assertDatasetId(id), 500, 0, signal);
  }

  private async holidays(
    id: string,
    kind: SingaporeHoliday["kind"],
    signal?: AbortSignal,
  ): Promise<readonly SingaporeHoliday[]> {
    return (await this.rows(id, signal)).map((row) => ({
      date: requiredText(row.fields, ["date", "Date", "holiday_date"]),
      name: requiredText(row.fields, ["name", "Name", "holiday", "Holiday"]),
      kind,
      fields: row.fields,
    }));
  }
}

function asFields(value: unknown): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("singapore-dataset-properties-invalid");
  }
  return value as Record<string, unknown>;
}

function asOptionalFields(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function closurePeriods(fields: Readonly<Record<string, unknown>>): readonly {
  startDate: string;
  endDate?: string;
  reason?: string;
}[] {
  const periods: { startDate: string; endDate?: string; reason?: string }[] = [];
  for (const prefix of ["q1", "q2", "q3", "q4", "other_works"] as const) {
    const startDate = optionalText(fields, [`${prefix}_cleaningstartdate`, `${prefix}_startdate`]);
    if (!startDate || /^(?:nil|na|n\/a|tbc)$/iu.test(startDate)) continue;
    const endDate = optionalText(fields, [`${prefix}_cleaningenddate`, `${prefix}_enddate`]);
    const reason = optionalText(fields, [`remarks_${prefix}`, `${prefix}_remarks`]);
    periods.push({
      startDate,
      ...(endDate && !/^(?:nil|na|n\/a|tbc)$/iu.test(endDate) ? { endDate } : {}),
      ...(reason && !/^nil$/iu.test(reason) ? { reason } : {}),
    });
  }
  return periods;
}

function assertDatasetId(value: string): string {
  if (!value.trim()) throw new Error("singapore-dataset-id-not-configured");
  return value;
}

export function optionalText(
  fields: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = fields[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

export function requiredText(
  fields: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): string {
  const value = optionalText(fields, keys);
  if (!value) throw new Error(`singapore-dataset-field-missing:${keys[0] ?? "unknown"}`);
  return value;
}

export function requiredNumber(
  fields: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): number {
  const text = requiredText(fields, keys).replaceAll(",", "").replace(/^S\$/u, "");
  const value = Number(text);
  if (!Number.isFinite(value)) throw new Error(`singapore-dataset-field-invalid:${keys[0]}`);
  return value;
}
