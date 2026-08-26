export interface EmvField {
  tag: string;
  value: string;
  children?: EmvField[];
}
export interface SgqrPayload {
  raw: string;
  merchantName?: string;
  amount?: number;
  amountMinor?: number;
  currency?: string;
  reference?: string;
  paynow?: { proxyType?: string; proxyValue?: string; editable?: boolean };
  fields: EmvField[];
  crcValid: boolean;
  warnings: string[];
}

export interface QrImageDecoder {
  /** Decode one QR payload from image bytes. Implementations may use ZXing or host vision. */
  decode(image: Uint8Array, mediaType: "image/png" | "image/jpeg" | "image/webp"): Promise<string>;
}

function parseFields(value: string): EmvField[] {
  const fields: EmvField[] = [];
  const bytes = new TextEncoder().encode(value);
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let offset = 0;
  while (offset + 4 <= bytes.length) {
    const tag = decoder.decode(bytes.subarray(offset, offset + 2));
    const lengthText = decoder.decode(bytes.subarray(offset + 2, offset + 4));
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText)) {
      throw new Error(`invalid-emv-header-at-${offset}`);
    }
    const length = Number(lengthText);
    if (!Number.isInteger(length) || length < 0 || offset + 4 + length > bytes.length)
      throw new Error(`invalid-emv-field-${tag}`);
    const data = decoder.decode(bytes.subarray(offset + 4, offset + 4 + length));
    fields.push({ tag, value: data });
    offset += 4 + length;
  }
  if (offset !== bytes.length) throw new Error("invalid-emv-trailing-data");
  return fields;
}

function crc16(value: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(value)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i += 1)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function nested(field: EmvField): EmvField[] {
  if (!field.children) field.children = parseFields(field.value);
  return field.children;
}

export function decodeSgqr(raw: string): SgqrPayload {
  const normalized = raw.trim();
  const fields = parseFields(normalized);
  const warnings: string[] = [];
  const duplicates = fields.filter(
    (item, index) => fields.findIndex((candidate) => candidate.tag === item.tag) !== index,
  );
  if (duplicates.length)
    warnings.push(`duplicate-tags:${[...new Set(duplicates.map((item) => item.tag))].join(",")}`);
  const find = (tag: string) => fields.find((field) => field.tag === tag)?.value;
  const merchant = fields.find((field) => field.tag === "26");
  let paynow: SgqrPayload["paynow"];
  if (merchant) {
    const items = nested(merchant);
    if (items.find((item) => item.tag === "00")?.value === "SG.PAYNOW") {
      const proxyType = items.find((item) => item.tag === "01")?.value;
      const proxyValue = items.find((item) => item.tag === "02")?.value;
      paynow = {
        ...(proxyType ? { proxyType } : {}),
        ...(proxyValue ? { proxyValue } : {}),
        editable: items.find((item) => item.tag === "03")?.value === "1",
      };
    }
  }
  const additional = fields.find((field) => field.tag === "62");
  const crcField = fields.find((field) => field.tag === "63");
  const crcPrefix = normalized.slice(0, -4);
  const amountText = find("54");
  const amount =
    amountText && /^\d{1,10}(?:\.\d{1,2})?$/.test(amountText) ? Number(amountText) : undefined;
  if (amountText && amount === undefined) warnings.push("invalid-amount");
  if (!crcField || fields.at(-1)?.tag !== "63" || crcField.value.length !== 4)
    warnings.push("missing-or-misplaced-crc");
  if (find("58") !== "SG") warnings.push("country-is-not-sg");
  if (!paynow) warnings.push("paynow-template-not-found");
  const crcValid = Boolean(
    crcField && crcField.value.length === 4 && crc16(crcPrefix) === crcField.value.toUpperCase(),
  );
  if (!crcValid) warnings.push("crc-invalid");
  const merchantName = find("59");
  const currencyTag = find("53");
  const reference = additional
    ? nested(additional).find((item) => item.tag === "01")?.value
    : undefined;
  return {
    raw: normalized,
    fields,
    ...(merchantName ? { merchantName } : {}),
    ...(amount !== undefined ? { amount, amountMinor: Math.round(amount * 100) } : {}),
    ...(currencyTag ? { currency: currencyTag === "702" ? "SGD" : currencyTag } : {}),
    ...(reference ? { reference } : {}),
    ...(paynow ? { paynow } : {}),
    crcValid,
    warnings,
  };
}

export async function decodeSgqrImage(
  image: Uint8Array,
  mediaType: "image/png" | "image/jpeg" | "image/webp",
  decoder: QrImageDecoder,
): Promise<SgqrPayload> {
  if (!(image instanceof Uint8Array) || image.byteLength === 0) throw new Error("empty-sgqr-image");
  if (image.byteLength > 20 * 1024 * 1024) throw new Error("sgqr-image-too-large");
  const raw = await decoder.decode(image, mediaType);
  if (!raw.trim()) throw new Error("sgqr-image-has-no-qr");
  return decodeSgqr(raw);
}

function field(tag: string, value: string): string {
  const byteLength = new TextEncoder().encode(value).byteLength;
  if (!/^\d{2}$/.test(tag) || byteLength > 99) throw new Error("invalid-emv-field");
  return `${tag}${byteLength.toString().padStart(2, "0")}${value}`;
}

export function encodePayNow(input: {
  proxyType: "0" | "2";
  proxyValue: string;
  merchantName: string;
  amount?: number;
  reference?: string;
  editable?: boolean;
}): string {
  if (input.proxyType === "0" && !/^\+65\d{8}$/.test(input.proxyValue))
    throw new Error("invalid-paynow-mobile-proxy");
  if (input.proxyType === "2" && !/^[A-Za-z0-9]{9,13}$/.test(input.proxyValue))
    throw new Error("invalid-paynow-uen-proxy");
  if (!input.merchantName.trim()) throw new Error("invalid-paynow-merchant-name");
  if (
    input.amount !== undefined &&
    (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 99_999_999.99)
  ) {
    throw new Error("invalid-paynow-amount");
  }
  const merchant =
    field("00", "SG.PAYNOW") +
    field("01", input.proxyType) +
    field("02", input.proxyValue) +
    field("03", input.editable ? "1" : "0");
  let payload =
    field("00", "01") +
    field("01", "12") +
    field("26", merchant) +
    field("52", "0000") +
    field("53", "702");
  if (input.amount !== undefined) payload += field("54", input.amount.toFixed(2));
  payload +=
    field("58", "SG") +
    field("59", truncateUtf8(input.merchantName.trim(), 25)) +
    field("60", "SINGAPORE");
  if (input.reference) payload += field("62", field("01", input.reference));
  payload += "6304";
  return payload + crc16(payload);
}

function truncateUtf8(value: string, maxBytes: number): string {
  let output = "";
  let bytes = 0;
  for (const character of value) {
    const width = new TextEncoder().encode(character).byteLength;
    if (bytes + width > maxBytes) break;
    output += character;
    bytes += width;
  }
  return output;
}
