import type { HouseholdFieldCipher } from "./field-cipher.js";
import type { HouseholdMemoryRepository, StoredVectorRow } from "./persistence.js";
import { assertNoSecrets, maskSensitiveIdentifiers } from "./privacy.js";

const MAX_HOUSEHOLD_VECTORS = 10_000;

export interface BgeM3EmbeddingProvider {
  readonly model: "BAAI/bge-m3";
  readonly dimension: number;
  embed(texts: readonly string[]): Promise<readonly (readonly number[])[]>;
}

export interface VectorMatch {
  readonly id: string;
  readonly score: number;
  readonly householdId: string;
}

export class HouseholdVectorIndex {
  public constructor(
    private readonly repository: HouseholdMemoryRepository,
    private readonly cipher: HouseholdFieldCipher,
    private readonly embeddings: BgeM3EmbeddingProvider,
    private readonly clock: () => Date = () => new Date(),
  ) {
    if (!Number.isSafeInteger(embeddings.dimension) || embeddings.dimension < 1)
      throw new Error("memory-vector-dimension-invalid");
  }

  public async upsertText(input: { id: string; householdId: string; text: string }): Promise<void> {
    validateIdentity(input.id, input.householdId);
    if (!input.text.trim() || input.text.length > 16_384)
      throw new Error("memory-vector-text-invalid");
    assertNoSecrets(input.text);
    const safeText = maskSensitiveIdentifiers(input.text);
    const [values] = await this.embeddings.embed([safeText]);
    if (!values) throw new Error("memory-vector-embedding-missing");
    validateVector(values, this.embeddings.dimension);
    const row: StoredVectorRow = {
      id: input.id,
      householdId: input.householdId,
      model: this.embeddings.model,
      dimension: this.embeddings.dimension,
      valuesCiphertext: await this.cipher.encrypt(
        input.householdId,
        vectorContext(input.id),
        JSON.stringify(values),
      ),
      updatedAt: this.clock().toISOString(),
    };
    await this.repository.putVector(row);
  }

  public async queryText(
    householdId: string,
    query: string,
    limit = 10,
  ): Promise<readonly VectorMatch[]> {
    if (!householdId.trim() || !query.trim() || query.length > 16_384)
      throw new Error("memory-vector-query-invalid");
    assertNoSecrets(query);
    const [needle] = await this.embeddings.embed([maskSensitiveIdentifiers(query)]);
    if (!needle) throw new Error("memory-vector-embedding-missing");
    validateVector(needle, this.embeddings.dimension);
    const result = await this.repository.listVectors(householdId, MAX_HOUSEHOLD_VECTORS);
    if (result.truncated) throw new Error("memory-vector-capacity-exceeded");
    const rows = result.rows;
    const matches = await Promise.all(rows.map((row) => this.match(row, needle)));
    if (!Number.isFinite(limit) || limit < 1) throw new Error("memory-vector-limit-invalid");
    const requested = Math.max(1, Math.min(100, Math.floor(limit)));
    return matches
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, requested);
  }

  public delete(id: string, householdId: string): Promise<boolean> {
    validateIdentity(id, householdId);
    return this.repository.deleteVector(id, householdId);
  }

  private async match(row: StoredVectorRow, needle: readonly number[]): Promise<VectorMatch> {
    if (row.dimension !== this.embeddings.dimension)
      throw new Error("memory-vector-model-dimension-mismatch");
    const plaintext = await this.cipher.decrypt(
      row.householdId,
      vectorContext(row.id),
      row.valuesCiphertext,
    );
    let values: unknown;
    try {
      values = JSON.parse(plaintext) as unknown;
    } catch {
      throw new Error("memory-vector-payload-invalid");
    }
    if (!Array.isArray(values)) throw new Error("memory-vector-payload-invalid");
    validateVector(values, row.dimension);
    return { id: row.id, householdId: row.householdId, score: cosine(needle, values) };
  }
}

function validateIdentity(id: string, householdId: string): void {
  if (!id.trim() || id.length > 128 || !householdId.trim() || householdId.length > 128)
    throw new Error("memory-vector-identity-invalid");
}

function validateVector(values: readonly unknown[], dimension: number): asserts values is number[] {
  if (
    values.length !== dimension ||
    values.some((value) => typeof value !== "number" || !Number.isFinite(value))
  )
    throw new Error("memory-vector-dimension-mismatch");
}

function cosine(left: readonly number[], right: readonly number[]): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function vectorContext(id: string): string {
  return `vector:${id}:values`;
}
