import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  HouseholdMemoryRepository,
  StoredEntityRow,
  StoredJourneyRow,
  StoredMemoryRow,
  StoredVectorRow,
} from "../src/index.js";

type Row = Record<string, unknown>;

/** Test-only SQLite/FTS5 adapter; production uses the host shared-state Kysely owner. */
export class SqliteMemoryTestRepository implements HouseholdMemoryRepository, Disposable {
  private readonly db: DatabaseSync;

  public constructor(file: string) {
    if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_entries (
        id TEXT NOT NULL,
        household_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        scope_person_id TEXT,
        payload_ciphertext TEXT NOT NULL,
        search_tokens TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (household_id, id)
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
        search_tokens, content='memory_entries', content_rowid='rowid', tokenize='unicode61'
      );
      CREATE TRIGGER IF NOT EXISTS memory_ai AFTER INSERT ON memory_entries BEGIN
        INSERT INTO memory_fts(rowid, search_tokens) VALUES (new.rowid, new.search_tokens);
      END;
      CREATE TRIGGER IF NOT EXISTS memory_ad AFTER DELETE ON memory_entries BEGIN
        INSERT INTO memory_fts(memory_fts, rowid, search_tokens)
        VALUES ('delete', old.rowid, old.search_tokens);
      END;
      CREATE TRIGGER IF NOT EXISTS memory_au AFTER UPDATE ON memory_entries BEGIN
        INSERT INTO memory_fts(memory_fts, rowid, search_tokens)
        VALUES ('delete', old.rowid, old.search_tokens);
        INSERT INTO memory_fts(rowid, search_tokens) VALUES (new.rowid, new.search_tokens);
      END;
      CREATE TABLE IF NOT EXISTS household_entities (
        id TEXT NOT NULL,
        household_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        version INTEGER NOT NULL,
        payload_ciphertext TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (household_id, id)
      );
      CREATE TABLE IF NOT EXISTS speaker_identities (
        household_id TEXT NOT NULL,
        person_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        jid_fingerprint TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (household_id, channel, jid_fingerprint)
      );
      CREATE TABLE IF NOT EXISTS journey_events (
        id TEXT NOT NULL,
        household_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        payload_ciphertext TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (household_id, id)
      );
      CREATE TABLE IF NOT EXISTS memory_vectors (
        id TEXT NOT NULL,
        household_id TEXT NOT NULL,
        model TEXT NOT NULL,
        dimension INTEGER NOT NULL,
        values_ciphertext TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (household_id, id)
      );
    `);
  }

  public async insertMemory(row: StoredMemoryRow): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO memory_entries
         (id, household_id, kind, scope_person_id, payload_ciphertext, search_tokens, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        row.id,
        row.householdId,
        row.kind,
        row.scopePersonId ?? null,
        row.payloadCiphertext,
        row.searchTokens,
        row.createdAt,
        row.updatedAt,
      );
  }

  public async findMemory(id: string, householdId: string): Promise<StoredMemoryRow | undefined> {
    const row = this.db
      .prepare("SELECT * FROM memory_entries WHERE id = ? AND household_id = ?")
      .get(id, householdId) as Row | undefined;
    return row ? memoryRow(row) : undefined;
  }

  public async searchMemory(
    householdId: string,
    searchTokens: string,
    candidateLimit: number,
  ): Promise<readonly StoredMemoryRow[]> {
    const query = searchTokens
      .split(" ")
      .filter(Boolean)
      .map((token) => `"${token}"`)
      .join(" AND ");
    if (!query) return [];
    const rows = this.db
      .prepare(
        `SELECT m.* FROM memory_fts f
         JOIN memory_entries m ON m.rowid=f.rowid
         WHERE memory_fts MATCH ? AND m.household_id=?
         ORDER BY bm25(memory_fts), m.updated_at DESC LIMIT ?`,
      )
      .all(query, householdId, candidateLimit) as Row[];
    return rows.map(memoryRow);
  }

  public async deleteMemory(id: string, householdId: string): Promise<boolean> {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare("DELETE FROM memory_vectors WHERE id = ? AND household_id = ?")
        .run(id, householdId);
      const deleted =
        this.db
          .prepare("DELETE FROM memory_entries WHERE id = ? AND household_id = ?")
          .run(id, householdId).changes > 0;
      this.db.exec("COMMIT");
      return deleted;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  public async putEntity(
    row: StoredEntityRow,
    expectedPreviousVersion: number | null,
  ): Promise<boolean> {
    if (expectedPreviousVersion === null) {
      return (
        this.db
          .prepare(
            `INSERT OR IGNORE INTO household_entities
             (id, household_id, kind, version, payload_ciphertext, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(row.id, row.householdId, row.kind, row.version, row.payloadCiphertext, row.updatedAt)
          .changes > 0
      );
    }
    return (
      this.db
        .prepare(
          `UPDATE household_entities SET kind=?, version=?, payload_ciphertext=?, updated_at=?
           WHERE id=? AND household_id=? AND version=?`,
        )
        .run(
          row.kind,
          row.version,
          row.payloadCiphertext,
          row.updatedAt,
          row.id,
          row.householdId,
          expectedPreviousVersion,
        ).changes > 0
    );
  }

  public async findEntity(id: string, householdId: string): Promise<StoredEntityRow | undefined> {
    const row = this.db
      .prepare("SELECT * FROM household_entities WHERE id=? AND household_id=?")
      .get(id, householdId) as Row | undefined;
    return row ? entityRow(row) : undefined;
  }

  public async listEntities(householdId: string): Promise<readonly StoredEntityRow[]> {
    return (
      this.db
        .prepare("SELECT * FROM household_entities WHERE household_id=? ORDER BY updated_at DESC")
        .all(householdId) as Row[]
    ).map(entityRow);
  }

  public async deleteEntity(id: string, householdId: string): Promise<boolean> {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare("DELETE FROM speaker_identities WHERE person_id=? AND household_id=?")
        .run(id, householdId);
      const deleted =
        this.db
          .prepare("DELETE FROM household_entities WHERE id=? AND household_id=?")
          .run(id, householdId).changes > 0;
      this.db.exec("COMMIT");
      return deleted;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  public async bindSpeaker(input: {
    householdId: string;
    personId: string;
    channel: string;
    jidFingerprint: string;
    createdAt: string;
  }): Promise<"created" | "same-person" | "conflict"> {
    const existing = this.db
      .prepare(
        `SELECT person_id FROM speaker_identities
         WHERE household_id=? AND channel=? AND jid_fingerprint=?`,
      )
      .get(input.householdId, input.channel, input.jidFingerprint) as Row | undefined;
    if (existing) return existing.person_id === input.personId ? "same-person" : "conflict";
    this.db
      .prepare(
        `INSERT INTO speaker_identities
         (household_id, person_id, channel, jid_fingerprint, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(input.householdId, input.personId, input.channel, input.jidFingerprint, input.createdAt);
    return "created";
  }

  public async findSpeaker(
    householdId: string,
    channel: string,
    jidFingerprint: string,
  ): Promise<string | undefined> {
    const row = this.db
      .prepare(
        `SELECT person_id FROM speaker_identities
         WHERE household_id=? AND channel=? AND jid_fingerprint=?`,
      )
      .get(householdId, channel, jidFingerprint) as Row | undefined;
    return row ? String(row.person_id) : undefined;
  }

  public async insertJourney(row: StoredJourneyRow): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO journey_events
         (id, household_id, task_id, version, payload_ciphertext, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        row.id,
        row.householdId,
        row.taskId,
        row.version,
        row.payloadCiphertext,
        row.createdAt,
        row.updatedAt,
      );
  }

  public async findJourney(id: string, householdId: string): Promise<StoredJourneyRow | undefined> {
    const row = this.db
      .prepare("SELECT * FROM journey_events WHERE id=? AND household_id=?")
      .get(id, householdId) as Row | undefined;
    return row ? journeyRow(row) : undefined;
  }

  public async listJourney(
    householdId: string,
    limit: number,
  ): Promise<readonly StoredJourneyRow[]> {
    return (
      this.db
        .prepare(
          "SELECT * FROM journey_events WHERE household_id=? ORDER BY created_at DESC LIMIT ?",
        )
        .all(householdId, limit) as Row[]
    ).map(journeyRow);
  }

  public async updateJourney(
    id: string,
    householdId: string,
    payloadCiphertext: string,
    updatedAt: string,
    expectedVersion: number,
  ): Promise<boolean> {
    return (
      this.db
        .prepare(
          `UPDATE journey_events SET payload_ciphertext=?, updated_at=?, version=version+1
           WHERE id=? AND household_id=? AND version=?`,
        )
        .run(payloadCiphertext, updatedAt, id, householdId, expectedVersion).changes > 0
    );
  }

  public async deleteJourney(id: string, householdId: string): Promise<boolean> {
    return (
      this.db
        .prepare("DELETE FROM journey_events WHERE id=? AND household_id=?")
        .run(id, householdId).changes > 0
    );
  }

  public async putVector(row: StoredVectorRow): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO memory_vectors
         (id, household_id, model, dimension, values_ciphertext, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(household_id, id) DO UPDATE SET
           model=excluded.model, dimension=excluded.dimension,
           values_ciphertext=excluded.values_ciphertext, updated_at=excluded.updated_at`,
      )
      .run(row.id, row.householdId, row.model, row.dimension, row.valuesCiphertext, row.updatedAt);
  }

  public async listVectors(
    householdId: string,
    limit: number,
  ): Promise<{ readonly rows: readonly StoredVectorRow[]; readonly truncated: boolean }> {
    const rows = this.db
      .prepare("SELECT * FROM memory_vectors WHERE household_id=? ORDER BY id LIMIT ?")
      .all(householdId, limit + 1) as Row[];
    return { rows: rows.slice(0, limit).map(vectorRow), truncated: rows.length > limit };
  }

  public async deleteVector(id: string, householdId: string): Promise<boolean> {
    return (
      this.db
        .prepare("DELETE FROM memory_vectors WHERE id=? AND household_id=?")
        .run(id, householdId).changes > 0
    );
  }

  public close(): void {
    this.db.close();
  }

  public [Symbol.dispose](): void {
    this.close();
  }
}

function memoryRow(row: Row): StoredMemoryRow {
  return {
    id: String(row.id),
    householdId: String(row.household_id),
    kind: String(row.kind),
    ...(typeof row.scope_person_id === "string" ? { scopePersonId: row.scope_person_id } : {}),
    payloadCiphertext: String(row.payload_ciphertext),
    searchTokens: String(row.search_tokens),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function entityRow(row: Row): StoredEntityRow {
  return {
    id: String(row.id),
    householdId: String(row.household_id),
    kind: String(row.kind),
    version: Number(row.version),
    payloadCiphertext: String(row.payload_ciphertext),
    updatedAt: String(row.updated_at),
  };
}

function journeyRow(row: Row): StoredJourneyRow {
  return {
    id: String(row.id),
    householdId: String(row.household_id),
    taskId: String(row.task_id),
    version: Number(row.version),
    payloadCiphertext: String(row.payload_ciphertext),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function vectorRow(row: Row): StoredVectorRow {
  const model = String(row.model);
  if (model !== "BAAI/bge-m3") throw new Error("memory-vector-model-invalid");
  return {
    id: String(row.id),
    householdId: String(row.household_id),
    model,
    dimension: Number(row.dimension),
    valuesCiphertext: String(row.values_ciphertext),
    updatedAt: String(row.updated_at),
  };
}
