export interface SingaporeAddress {
  block?: string;
  building?: string;
  street?: string;
  unit?: string;
  floor?: string;
  unitNumber?: string;
  postalCode?: string;
  country: "SG";
  normalized: string;
  raw: string;
}

export function parseSingaporeAddress(raw: string): SingaporeAddress {
  if (typeof raw !== "string" || !raw.trim()) throw new Error("invalid-singapore-address");
  const normalized = raw
    .trim()
    .replace(/[，;]/g, ",")
    .replace(/\s+/g, " ");
  const blockMatch = /\b(?:blk|block)\s*([0-9]{1,4}[a-z]?)\b/i.exec(normalized);
  const block = blockMatch?.[1]?.toUpperCase();
  const unit = /#\s*(\d{1,3})\s*[-–—]\s*([a-z0-9]{1,5})\b/i.exec(normalized);
  const postal =
    /(?:singapore|s(?:ingapore)?)\s*[:,-]?\s*(\d{6})\b/i.exec(normalized)?.[1] ??
    /\b(\d{6})\b/.exec(normalized)?.[1];
  const streetStart = blockMatch ? blockMatch.index + blockMatch[0].length : 0;
  const endCandidates = [unit?.index, postal ? normalized.indexOf(postal) : undefined].filter(
    (n): n is number => n !== undefined && n >= 0,
  );
  const streetEnd = endCandidates.length ? Math.min(...endCandidates) : normalized.length;
  const street =
    normalized
      .slice(streetStart, streetEnd)
      .replace(/^\s*,?\s*|,?\s*(?:singapore|s)?\s*$/gi, "")
      .replace(/\s*,\s*/g, ", ")
      .trim() || undefined;
  const floor = unit?.[1]?.padStart(2, "0");
  const unitNumber = unit?.[2]?.toUpperCase().padStart(2, "0");
  return {
    ...(block ? { block } : {}),
    ...(street ? { street } : {}),
    ...(floor && unitNumber ? { floor, unitNumber, unit: `#${floor}-${unitNumber}` } : {}),
    ...(postal ? { postalCode: postal } : {}),
    country: "SG",
    normalized,
    raw,
  };
}

export function isSingaporePostalCode(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}
