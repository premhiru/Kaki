export interface EmvField {
  readonly tag: string;
  readonly value: string;
}

export function parseEmv(raw: string): readonly EmvField[] {
  const value = raw.trim();
  if (!value) throw new Error("invalid-emv:empty");
  const bytes = new TextEncoder().encode(value);
  const fields: EmvField[] = [];
  let offset = 0;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  while (offset + 4 <= bytes.length) {
    const tag = decoder.decode(bytes.slice(offset, offset + 2));
    const lengthText = decoder.decode(bytes.slice(offset + 2, offset + 4));
    if (!/^\d{2}$/.test(tag) || !/^\d{2}$/.test(lengthText))
      throw new Error(`invalid-emv:header:${offset}`);
    const length = Number(lengthText);
    if (offset + 4 + length > bytes.length) throw new Error(`invalid-emv:length:${tag}`);
    let decoded: string;
    try {
      decoded = decoder.decode(bytes.slice(offset + 4, offset + 4 + length));
    } catch {
      throw new Error(`invalid-emv:utf8-boundary:${tag}`);
    }
    fields.push({ tag, value: decoded });
    offset += 4 + length;
  }
  if (offset !== bytes.length) throw new Error("invalid-emv:trailing");
  return fields;
}

export function encodeEmvField(tag: string, value: string): string {
  const length = new TextEncoder().encode(value).byteLength;
  if (!/^\d{2}$/.test(tag) || length > 99) throw new Error("invalid-emv:field");
  return `${tag}${String(length).padStart(2, "0")}${value}`;
}

export function crc16Ccitt(value: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(value)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function withCrc(payload: string): string {
  const prefix = `${payload}6304`;
  return `${prefix}${crc16Ccitt(prefix)}`;
}
export function verifyCrc(raw: string, fields = parseEmv(raw)): boolean {
  const crc = fields.at(-1);
  return (
    crc?.tag === "63" &&
    crc.value.length === 4 &&
    crc16Ccitt(raw.trim().slice(0, -4)) === crc.value.toUpperCase()
  );
}
export function nestedEmv(field: EmvField): readonly EmvField[] {
  return parseEmv(field.value);
}
