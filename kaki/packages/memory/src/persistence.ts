export interface StoredMemoryRow {
  readonly id: string;
  readonly householdId: string;
  readonly kind: string;
  readonly scopePersonId?: string;
  readonly payloadCiphertext: string;
  readonly searchTokens: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StoredEntityRow {
  readonly id: string;
  readonly householdId: string;
  readonly kind: string;
  readonly version: number;
  readonly payloadCiphertext: string;
  readonly updatedAt: string;
}

export interface StoredJourneyRow {
  readonly id: string;
  readonly householdId: string;
  readonly taskId: string;
  readonly version: number;
  readonly payloadCiphertext: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StoredVectorRow {
  readonly id: string;
  readonly householdId: string;
  readonly model: "BAAI/bge-m3";
  readonly dimension: number;
  readonly valuesCiphertext: string;
  readonly updatedAt: string;
}

/**
 * Host-owned persistence seam for the shared OpenClaw state database.
 * Production adapters implement these operations with Kysely and atomic host transactions.
 */
export interface HouseholdMemoryRepository {
  insertMemory(row: StoredMemoryRow): Promise<void>;
  findMemory(id: string, householdId: string): Promise<StoredMemoryRow | undefined>;
  searchMemory(
    householdId: string,
    searchTokens: string,
    candidateLimit: number,
  ): Promise<readonly StoredMemoryRow[]>;
  /** Deletes the memory row and a same-id vector in one host transaction. */
  deleteMemory(id: string, householdId: string): Promise<boolean>;

  /** `expectedPreviousVersion=null` creates; otherwise this is an atomic compare-and-swap. */
  putEntity(row: StoredEntityRow, expectedPreviousVersion: number | null): Promise<boolean>;
  findEntity(id: string, householdId: string): Promise<StoredEntityRow | undefined>;
  listEntities(householdId: string): Promise<readonly StoredEntityRow[]>;
  /** Deletes the entity and any speaker bindings it owns in one host transaction. */
  deleteEntity(id: string, householdId: string): Promise<boolean>;

  bindSpeaker(input: {
    householdId: string;
    personId: string;
    channel: string;
    jidFingerprint: string;
    createdAt: string;
  }): Promise<"created" | "same-person" | "conflict">;
  findSpeaker(
    householdId: string,
    channel: string,
    jidFingerprint: string,
  ): Promise<string | undefined>;

  insertJourney(row: StoredJourneyRow): Promise<void>;
  findJourney(id: string, householdId: string): Promise<StoredJourneyRow | undefined>;
  listJourney(householdId: string, limit: number): Promise<readonly StoredJourneyRow[]>;
  updateJourney(
    id: string,
    householdId: string,
    payloadCiphertext: string,
    updatedAt: string,
    expectedVersion: number,
  ): Promise<boolean>;
  deleteJourney(id: string, householdId: string): Promise<boolean>;

  putVector(row: StoredVectorRow): Promise<void>;
  listVectors(
    householdId: string,
    limit: number,
  ): Promise<{ readonly rows: readonly StoredVectorRow[]; readonly truncated: boolean }>;
  deleteVector(id: string, householdId: string): Promise<boolean>;
}
