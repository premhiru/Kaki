const SENSITIVE_PATTERNS: Array<[RegExp, string]> = [
  [/[STFG]\d{7}[A-Z]/gi, "[NRIC_REDACTED]"],
  [/\b[A-Z]\d{7}[A-Z]\b/gi, "[ID_REDACTED]"],
  [/\b(?:\d[ -]*?){13,19}\b/g, "[CARD_REDACTED]"],
  [/(password|passwd|api[_-]?key|token)\s*[:=]\s*\S+/gi, "$1=[SECRET_REDACTED]"],
  [/\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/g, "[API_KEY_REDACTED]"],
  [/\b(?:Bearer\s+)[A-Za-z0-9._~-]{12,}\b/gi, "Bearer [TOKEN_REDACTED]"],
  [/(?:cookie|set-cookie)\s*[:=]\s*[^\r\n]+/gi, "cookie=[COOKIE_REDACTED]"],
  [/\b(?:otp|one[- ]time password|verification code)\s*[:=]?\s*\d{4,8}\b/gi, "otp=[OTP_REDACTED]"],
  [/\b[A-Z]{1,2}\d{7,9}\b/g, "[PASSPORT_REDACTED]"],
];

export function redactSecrets(value: string): string {
  return SENSITIVE_PATTERNS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  );
}

export function containsPromptInjection(value: string): boolean {
  return /(ignore (all|any|the|previous)|system prompt|developer message|transfer .*money|send .*otp|reveal .*secret|upload .*memory|exfiltrat|绕过.{0,8}(规则|指令)|忽略.{0,8}(指令|规则)|abaikan.{0,12}(arahan|instruksi)|เพิกเฉย.{0,12}(คำสั่ง)|bỏ qua.{0,12}(chỉ dẫn|hướng dẫn))/iu.test(
    value,
  );
}

export function redactJson(value: unknown): unknown {
  if (typeof value === "string") return redactSecrets(value);
  if (Array.isArray(value)) return value.map(redactJson);
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value))
      output[key] = /password|secret|token|cookie|credential|otp/iu.test(key)
        ? "[SECRET_REDACTED]"
        : redactJson(item);
    return output;
  }
  return value;
}

export function assertMemorySafe(value: unknown): void {
  const serialised = JSON.stringify(value);
  if (serialised !== JSON.stringify(redactJson(value)))
    throw new Error("sensitive-data-memory-denied");
}
