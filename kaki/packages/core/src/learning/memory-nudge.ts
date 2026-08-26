const MAX_FACTS = 8;
const MAX_QUERY_LENGTH = 160;
const MAX_FACT_LENGTH = 100;

/** Adds a bounded recall prompt without exposing credential-shaped memory. */
export function memoryNudge(query: string, recalled: readonly string[]): string {
  const safeQuery = boundedSafeText(query, MAX_QUERY_LENGTH);
  const safeFacts = recalled
    .slice(0, MAX_FACTS)
    .map((fact) => boundedSafeText(fact, MAX_FACT_LENGTH));
  const facts = safeFacts.map((fact) => `- ${fact}`).join("\n");
  return safeFacts.length
    ? `Before acting on "${safeQuery}", consider these household-scoped memories:\n${facts}\nUse only facts allowed by the current speaker's privacy scope.`
    : `No relevant household memory was found for "${safeQuery}". Do not invent one.`;
}

function boundedSafeText(value: string, max: number): string {
  const normalized = value.normalize("NFKC").trim();
  if (!normalized) throw new Error("memory-nudge-text-required");
  if (
    /\b(?:password|passwd|pin|otp|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|secret)\s*[:=]\s*\S+/iu.test(
      normalized,
    )
  )
    throw new Error("memory-nudge-secret-rejected");
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}
