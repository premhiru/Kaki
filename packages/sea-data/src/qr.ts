import {
  encodeEmvField as field,
  nestedEmv,
  parseEmv,
  verifyCrc,
  withCrc,
  type EmvField,
} from "./emv.js";
import { COUNTRY_PROFILES, countryForRail, type QrRail } from "./profiles.js";

export interface QrPayment {
  readonly rail: QrRail;
  readonly country: string;
  readonly merchant?: string;
  readonly proxy?: string;
  readonly amount?: number;
  readonly amountMinor?: number;
  readonly currency: string;
  readonly reference?: string;
  readonly merchantCity?: string;
  readonly raw: string;
  readonly crcValid: boolean;
  readonly warnings: readonly string[];
  readonly fields: readonly EmvField[];
}
export interface RegionalQrInput {
  readonly rail: QrRail;
  readonly proxy: string;
  readonly merchant: string;
  readonly merchantCity?: string;
  readonly amount?: number;
  readonly reference?: string;
  readonly dynamic?: boolean;
}

const rails: Readonly<Record<QrRail, { guid: string; templateTag: string }>> = {
  duitnow: { guid: "A0000006150001", templateTag: "26" },
  qris: { guid: "ID.CO.QRIS.WWW", templateTag: "26" },
  promptpay: { guid: "A000000677010111", templateTag: "29" },
  vietqr: { guid: "A000000727", templateTag: "38" },
  qrph: { guid: "PH.PPMI.P2M", templateTag: "28" },
};
const get = (fields: readonly EmvField[], tag: string) =>
  fields.find((item) => item.tag === tag)?.value;
const accounts = (fields: readonly EmvField[]) =>
  fields.filter((item) => Number(item.tag) >= 26 && Number(item.tag) <= 51);
function detectRail(fields: readonly EmvField[]): QrRail | undefined {
  for (const account of accounts(fields)) {
    try {
      const guid = get(nestedEmv(account), "00")?.toUpperCase();
      const match = Object.entries(rails).find(([, config]) => guid === config.guid);
      if (match) return match[0] as QrRail;
    } catch {
      /* Some EMV merchant templates are not nested TLV. */
    }
  }
  const currency = get(fields, "53");
  return Object.values(COUNTRY_PROFILES).find((profile) => profile.numericCurrency === currency)
    ?.rail;
}
function maskProxy(value: string): string {
  return value.length <= 4
    ? "****"
    : `${"*".repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;
}

export function decodeRegionalQr(raw: string, railHint?: QrRail, strict = false): QrPayment {
  const normalized = raw.trim();
  const fields = parseEmv(normalized);
  const detected = detectRail(fields);
  const rail = railHint ?? detected;
  if (!rail) throw new Error("unsupported-regional-qr");
  const profile = COUNTRY_PROFILES[countryForRail(rail)];
  const warnings: string[] = [];
  if (detected && railHint && detected !== railHint) warnings.push("rail-hint-mismatch");
  if (get(fields, "53") !== profile.numericCurrency) warnings.push("currency-rail-mismatch");
  const country = get(fields, "58");
  if (country && country !== profile.countryCode) warnings.push("country-rail-mismatch");
  const crcValid = verifyCrc(normalized, fields);
  if (!crcValid) warnings.push("crc-invalid");
  const amountText = get(fields, "54");
  const amount =
    amountText && /^\d{1,12}(?:\.\d{1,2})?$/.test(amountText) ? Number(amountText) : undefined;
  if (amountText && amount === undefined) warnings.push("invalid-amount");
  const account = accounts(fields).find((item) => {
    try {
      return get(nestedEmv(item), "00")?.toUpperCase() === rails[rail].guid;
    } catch {
      return false;
    }
  });
  const accountNested = account ? nestedEmv(account) : [];
  const proxy = get(accountNested, "02") ?? get(accountNested, "01");
  const additional = fields.find((item) => item.tag === "62");
  const reference = additional ? get(nestedEmv(additional), "01") : undefined;
  if (strict && warnings.length) throw new Error(`invalid-${rail}-qr:${warnings.join(",")}`);
  const merchant = get(fields, "59");
  const city = get(fields, "60");
  return {
    rail,
    country: profile.country,
    currency: profile.currency,
    raw: normalized,
    crcValid,
    warnings,
    fields,
    ...(merchant ? { merchant } : {}),
    ...(proxy ? { proxy: maskProxy(proxy) } : {}),
    ...(amount !== undefined ? { amount, amountMinor: Math.round(amount * 100) } : {}),
    ...(reference ? { reference } : {}),
    ...(city ? { merchantCity: city } : {}),
  };
}

export function encodeRegionalQr(input: RegionalQrInput): string {
  const profile = COUNTRY_PROFILES[countryForRail(input.rail)];
  if (!input.proxy.trim() || input.proxy.length > 32)
    throw new Error(`invalid-${input.rail}-proxy`);
  if (!input.merchant.trim()) throw new Error(`invalid-${input.rail}-merchant`);
  if (
    input.amount !== undefined &&
    (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 999_999_999.99)
  )
    throw new Error(`invalid-${input.rail}-amount`);
  const config = rails[input.rail];
  const account = field("00", config.guid) + field("02", input.proxy);
  let payload =
    field("00", input.rail === "duitnow" ? "02" : "01") +
    field("01", input.dynamic || input.amount !== undefined ? "12" : "11") +
    field(config.templateTag, account) +
    field("52", "0000") +
    field("53", profile.numericCurrency);
  if (input.amount !== undefined) payload += field("54", input.amount.toFixed(2));
  payload +=
    field("58", profile.countryCode) +
    field("59", input.merchant.trim().slice(0, 25)) +
    field("60", (input.merchantCity ?? profile.countryCode).trim().slice(0, 15));
  if (input.reference) payload += field("62", field("01", input.reference.slice(0, 25)));
  return withCrc(payload);
}
export const decodeDuitNow = (raw: string, strict = true) =>
  decodeRegionalQr(raw, "duitnow", strict);
export const decodeQris = (raw: string, strict = true) => decodeRegionalQr(raw, "qris", strict);
export const decodePromptPay = (raw: string, strict = true) =>
  decodeRegionalQr(raw, "promptpay", strict);
export const decodeVietQr = (raw: string, strict = true) => decodeRegionalQr(raw, "vietqr", strict);
export const decodeQrPh = (raw: string, strict = true) => decodeRegionalQr(raw, "qrph", strict);
