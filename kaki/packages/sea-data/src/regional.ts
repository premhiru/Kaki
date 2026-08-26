import type { SeaCountry } from "./profiles.js";

export interface RemittanceQuote {
  readonly provider: string;
  readonly quoteId: string;
  readonly sourceCurrency: string;
  readonly sourceAmountMinor: number;
  readonly destinationCurrency: string;
  readonly destinationAmountMinor: number;
  readonly feeMinor: number;
  readonly rate: number;
  readonly expiresAt: string;
  readonly licenceAuthority: string;
  readonly licenceReference: string;
  readonly sourceUrl: string;
}

export interface RemittanceApprovalHandoff {
  readonly category: "money.transfer";
  readonly requiresApproval: true;
  readonly quote: RemittanceQuote;
  readonly nextStep: string;
}

export function prepareRemittanceHandoff(
  quote: RemittanceQuote,
  now = Date.now(),
): RemittanceApprovalHandoff {
  const expiry = Date.parse(quote.expiresAt);
  if (
    !/^[A-Za-z0-9._-]{2,128}$/u.test(quote.quoteId) ||
    !/^[A-Z]{3}$/u.test(quote.sourceCurrency) ||
    !/^[A-Z]{3}$/u.test(quote.destinationCurrency) ||
    !Number.isSafeInteger(quote.sourceAmountMinor) ||
    quote.sourceAmountMinor <= 0 ||
    !Number.isSafeInteger(quote.destinationAmountMinor) ||
    quote.destinationAmountMinor <= 0 ||
    !Number.isSafeInteger(quote.feeMinor) ||
    quote.feeMinor < 0 ||
    !Number.isFinite(quote.rate) ||
    quote.rate <= 0 ||
    !Number.isFinite(expiry) ||
    expiry <= now ||
    !isBoundedText(quote.provider, 100) ||
    !isBoundedText(quote.licenceAuthority, 200) ||
    !isBoundedText(quote.licenceReference, 200) ||
    !isHttpsEvidenceUrl(quote.sourceUrl)
  ) {
    throw new Error("invalid-remittance-quote");
  }
  return {
    category: "money.transfer",
    requiresApproval: true,
    quote,
    nextStep: `Approve the live ${quote.provider} quote, fee, recipient and delivery details before opening the provider confirmation step.`,
  };
}

export interface HalalCertificationRecord {
  readonly authority: string;
  readonly certificateId: string;
  readonly certificateOwner: string;
  readonly outletName: string;
  readonly outletAddress: string;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly sourceUrl: string;
}

export function validateHalalCertification(
  record: HalalCertificationRecord,
  at = Date.now(),
): HalalCertificationRecord & { readonly validAtQueryTime: boolean } {
  const validFrom = Date.parse(record.validFrom);
  const validUntil = Date.parse(record.validUntil);
  if (
    !isBoundedText(record.authority, 200) ||
    !isBoundedText(record.certificateId, 200) ||
    !isBoundedText(record.certificateOwner, 500) ||
    !isBoundedText(record.outletName, 500) ||
    !isBoundedText(record.outletAddress, 1_000) ||
    !Number.isFinite(validFrom) ||
    !Number.isFinite(validUntil) ||
    validUntil < validFrom ||
    !isHttpsEvidenceUrl(record.sourceUrl)
  ) {
    throw new Error("invalid-halal-certification-record");
  }
  return { ...record, validAtQueryTime: validFrom <= at && at <= validUntil };
}

export interface PrayerSchedule {
  readonly country: SeaCountry;
  readonly authority: string;
  readonly zone: string;
  readonly date: string;
  readonly timezone: string;
  readonly fajr: string;
  readonly sunrise: string;
  readonly dhuhr: string;
  readonly asr: string;
  readonly maghrib: string;
  readonly isha: string;
  readonly sourceUrl: string;
}

export interface RegionalHoliday {
  readonly country: SeaCountry;
  readonly subdivision?: string;
  readonly date: string;
  readonly localName: string;
  readonly nationwide: boolean;
  readonly status: "gazetted" | "tentative";
  readonly authority: string;
  readonly sourceUrl: string;
}

export function validatePrayerSchedule(schedule: PrayerSchedule): PrayerSchedule {
  if (
    !isBoundedText(schedule.authority, 200) ||
    !isBoundedText(schedule.zone, 100) ||
    !/^\d{4}-\d{2}-\d{2}$/u.test(schedule.date) ||
    !isBoundedText(schedule.timezone, 100) ||
    ![
      schedule.fajr,
      schedule.sunrise,
      schedule.dhuhr,
      schedule.asr,
      schedule.maghrib,
      schedule.isha,
    ].every((time) => /^\d{2}:\d{2}(?::\d{2})?$/u.test(time)) ||
    !isHttpsEvidenceUrl(schedule.sourceUrl)
  ) {
    throw new Error("invalid-regional-prayer-schedule");
  }
  return schedule;
}

export function validateRegionalHoliday(holiday: RegionalHoliday): RegionalHoliday {
  if (
    !/^\d{4}-\d{2}-\d{2}$/u.test(holiday.date) ||
    !isBoundedText(holiday.localName, 500) ||
    (holiday.subdivision !== undefined && !isBoundedText(holiday.subdivision, 100)) ||
    !isBoundedText(holiday.authority, 200) ||
    !isHttpsEvidenceUrl(holiday.sourceUrl)
  ) {
    throw new Error("invalid-regional-holiday");
  }
  return holiday;
}

export interface RegionalReferenceProvider {
  prayerTimes?(
    country: SeaCountry,
    zone: string,
    date: string,
    signal?: AbortSignal,
  ): Promise<PrayerSchedule>;
  holidays?(
    country: SeaCountry,
    year: number,
    subdivision?: string,
    signal?: AbortSignal,
  ): Promise<readonly RegionalHoliday[]>;
  halal?(
    country: SeaCountry,
    query: string,
    signal?: AbortSignal,
  ): Promise<readonly HalalCertificationRecord[]>;
  remittanceQuotes?(
    sourceCurrency: string,
    destinationCurrency: string,
    amountMinor: number,
    signal?: AbortSignal,
  ): Promise<readonly RemittanceQuote[]>;
}

function isBoundedText(value: string, maxLength: number): boolean {
  return Boolean(value.trim()) && value.length <= maxLength;
}

function isHttpsEvidenceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port;
  } catch {
    return false;
  }
}
