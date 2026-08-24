export interface VectorDocument {
  readonly id: string;
  readonly householdId: string;
  readonly values: readonly number[];
}
export interface VectorMatch {
  readonly id: string;
  readonly score: number;
  readonly householdId?: string;
}
export interface VectorAdapter {
  upsert(document: VectorDocument): Promise<void>;
  query(values: readonly number[], limit: number): Promise<readonly VectorMatch[]>;
  delete(id: string): Promise<void>;
}

/** Enforces tenant filtering even when the underlying vector service ignores metadata. */
export class HouseholdVectorIndex {
  constructor(private readonly adapter: VectorAdapter) {}
  async upsert(document: VectorDocument): Promise<void> {
    if (
      !document.householdId ||
      !document.id ||
      !document.values.length ||
      document.values.some((value) => !Number.isFinite(value))
    )
      throw new Error("invalid-vector-document");
    await this.adapter.upsert(document);
  }
  async query(
    householdId: string,
    values: readonly number[],
    limit = 10,
  ): Promise<readonly VectorMatch[]> {
    if (!householdId || !values.length || values.some((value) => !Number.isFinite(value)))
      throw new Error("invalid-vector-query");
    const requested = Math.max(1, Math.min(100, Math.floor(limit)));
    const matches = await this.adapter.query(values, Math.min(500, requested * 10));
    return matches.filter((match) => match.householdId === householdId).slice(0, requested);
  }
  delete(id: string): Promise<void> {
    return this.adapter.delete(id);
  }
}
