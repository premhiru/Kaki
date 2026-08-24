import type { PrivacyScope } from "@kaki/core";

const credentialPatterns: readonly RegExp[] = [
  /\b(?:password|passwd|pin|otp|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|secret)\s*[:=]\s*\S+/i,
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/i,
  /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];

export function assertNoSecrets(value: unknown): void {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (credentialPatterns.some((pattern) => pattern.test(text)))
    throw new Error("memory-secret-rejected");
}

export function maskSensitiveIdentifiers(text: string): string {
  return text
    .replace(
      /\b([STFGM])\d{7}([A-Z])\b/gi,
      (_match, prefix: string, suffix: string) =>
        `${prefix.toUpperCase()}***${suffix.toUpperCase()}`,
    )
    .replace(/\b([A-Z])\d{7}\b/g, (_match, prefix: string) => `${prefix}***`)
    .replace(/\b(?:\d[ -]?){12,19}\b/g, (match) => `****${match.replace(/\D/g, "").slice(-4)}`);
}

export function canAccess(
  scope: PrivacyScope,
  requesterPersonId?: string,
  purpose?: string,
  childSafe = false,
): boolean {
  if (childSafe && ["medical", "financial", "private"].includes(scope.sensitivity)) return false;
  if (scope.purposes?.length && (!purpose || !scope.purposes.includes(purpose))) return false;
  if (scope.audience.kind === "household") return true;
  if (!requesterPersonId) return false;
  if (scope.audience.kind === "owner") return scope.audience.personId === requesterPersonId;
  return scope.audience.personIds.includes(requesterPersonId);
}

export const householdPrivacy: PrivacyScope = {
  audience: { kind: "household" },
  sensitivity: "household",
};
