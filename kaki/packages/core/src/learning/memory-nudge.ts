/** Adds a small recall prompt without exposing raw private memories to external contacts. */
export function memoryNudge(query: string, recalled: readonly string[]): string {
  const facts = recalled.map((fact) => `- ${fact}`).join("\n");
  return recalled.length
    ? `Before acting on "${query}", consider these household-scoped memories:\n${facts}\nUse only facts allowed by the current speaker's privacy scope.`
    : `No relevant household memory was found for "${query}". Do not invent one.`;
}
