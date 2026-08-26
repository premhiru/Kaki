import type { DatasetRecord } from "./data-gov.js";
import type { SingaporePublicDatasetClient } from "./public-datasets.js";
import { optionalText, requiredText } from "./public-datasets.js";

export interface NeaWarning {
  readonly title: string;
  readonly severity?: string;
  readonly issuedAt?: string;
  readonly detail?: string;
  readonly fields: Readonly<Record<string, unknown>>;
}

export interface MohClinicHours {
  readonly name: string;
  readonly address?: string;
  readonly phone?: string;
  readonly hours: string;
  readonly fields: Readonly<Record<string, unknown>>;
}

export interface NlbCatalogueItem {
  readonly title: string;
  readonly author?: string;
  readonly format?: string;
  readonly availability?: string;
  readonly url?: string;
}

export interface ActiveSgFacilitySlot {
  readonly facility: string;
  readonly activity: string;
  readonly startsAt: string;
  readonly available: boolean;
  readonly bookingUrl?: string;
}

/** Browser-backed portals keep their authenticated automation in the browser owner. */
export interface SingaporePortalSearchAdapter {
  searchNlbCatalogue(query: string, signal?: AbortSignal): Promise<readonly NlbCatalogueItem[]>;
  searchActiveSgSlots(
    activity: string,
    date: string,
    signal?: AbortSignal,
  ): Promise<readonly ActiveSgFacilitySlot[]>;
}

export class SingaporePublicServicesClient {
  constructor(
    private readonly datasets: SingaporePublicDatasetClient,
    private readonly portals: SingaporePortalSearchAdapter,
  ) {}

  async neaWarnings(signal?: AbortSignal): Promise<readonly NeaWarning[]> {
    return (await this.datasets.rawNeaWarningRows(signal)).map(mapWarning);
  }

  async mohClinicHours(signal?: AbortSignal): Promise<readonly MohClinicHours[]> {
    return (await this.datasets.rawMohClinicRows(signal)).map(mapClinic);
  }

  nlbCatalogue(query: string, signal?: AbortSignal): Promise<readonly NlbCatalogueItem[]> {
    if (!query.trim()) throw new Error("nlb-catalogue-query-required");
    return this.portals.searchNlbCatalogue(query.trim(), signal);
  }

  activeSgSlots(
    activity: string,
    date: string,
    signal?: AbortSignal,
  ): Promise<readonly ActiveSgFacilitySlot[]> {
    if (!activity.trim() || !/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
      throw new Error("invalid-activesg-slot-query");
    }
    return this.portals.searchActiveSgSlots(activity.trim(), date, signal);
  }
}

function mapWarning(row: DatasetRecord): NeaWarning {
  const severity = optionalText(row.fields, ["severity", "Severity"]);
  const issuedAt = optionalText(row.fields, ["issued_at", "Issued At", "date"]);
  const detail = optionalText(row.fields, ["detail", "Details", "description"]);
  return {
    title: requiredText(row.fields, ["title", "Title", "warning", "Warning"]),
    ...(severity ? { severity } : {}),
    ...(issuedAt ? { issuedAt } : {}),
    ...(detail ? { detail } : {}),
    fields: row.fields,
  };
}

function mapClinic(row: DatasetRecord): MohClinicHours {
  const address = optionalText(row.fields, ["address", "Address"]);
  const phone = optionalText(row.fields, ["phone", "Telephone", "contact"]);
  return {
    name: requiredText(row.fields, ["name", "Name", "clinic_name", "Clinic Name"]),
    ...(address ? { address } : {}),
    ...(phone ? { phone } : {}),
    hours: requiredText(row.fields, ["hours", "Opening Hours", "operating_hours"]),
    fields: row.fields,
  };
}
