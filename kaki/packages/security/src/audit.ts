import { createHmac, timingSafeEqual } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { JsonObject, RiskCategory } from "@kaki/core";
import { redactJson } from "./redaction.js";

export interface AuditInput {
  id: string;
  timestamp: string;
  taskId: string;
  householdId: string;
  actor: string;
  action: string;
  riskCategory: RiskCategory;
  outcome: "allowed" | "denied" | "failed";
  fields?: JsonObject;
}
export interface AuditRecord extends AuditInput {
  previousHash: string;
  hash: string;
}

export interface AuditRecordStore {
  append(build: (previousHash: string) => AuditRecord): AuditRecord;
  records(): AuditRecord[];
  close?(): void;
}

export class MemoryAuditRecordStore implements AuditRecordStore {
  readonly #records: AuditRecord[] = [];
  append(build: (previousHash: string) => AuditRecord): AuditRecord {
    const record = build(this.#records.at(-1)?.hash ?? "GENESIS");
    this.#records.push(structuredClone(record));
    return structuredClone(record);
  }
  records(): AuditRecord[] {
    return structuredClone(this.#records);
  }
}

/** Standalone/local-test store. Production Gateway wiring injects its Kysely-backed store. */
export class StandaloneSqliteAuditRecordStore implements AuditRecordStore {
  readonly #database: DatabaseSync;
  constructor(path: string) {
    this.#database = new DatabaseSync(path);
    this.#database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;");
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS kaki_audit_records (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
        timestamp TEXT NOT NULL,
        task_id TEXT NOT NULL,
        household_id TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        risk_category TEXT NOT NULL,
        outcome TEXT NOT NULL,
        fields_json TEXT,
        previous_hash TEXT NOT NULL UNIQUE,
        hash TEXT NOT NULL UNIQUE
      ) STRICT
    `);
  }

  append(build: (previousHash: string) => AuditRecord): AuditRecord {
    this.#database.exec("BEGIN IMMEDIATE");
    try {
      const previous = this.#database
        .prepare("SELECT hash FROM kaki_audit_records ORDER BY sequence DESC LIMIT 1")
        .get() as { hash?: string } | undefined;
      const record = build(previous?.hash ?? "GENESIS");
      this.#database
        .prepare(
          `
          INSERT INTO kaki_audit_records (
            id, timestamp, task_id, household_id, actor, action, risk_category,
            outcome, fields_json, previous_hash, hash
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        )
        .run(
          record.id,
          record.timestamp,
          record.taskId,
          record.householdId,
          record.actor,
          record.action,
          record.riskCategory,
          record.outcome,
          record.fields ? JSON.stringify(record.fields) : null,
          record.previousHash,
          record.hash,
        );
      this.#database.exec("COMMIT");
      return structuredClone(record);
    } catch (error) {
      this.#database.exec("ROLLBACK");
      throw error;
    }
  }

  records(): AuditRecord[] {
    const rows = this.#database
      .prepare(
        `
        SELECT id, timestamp, task_id, household_id, actor, action,
               risk_category, outcome, fields_json, previous_hash, hash
        FROM kaki_audit_records ORDER BY sequence ASC
      `,
      )
      .all() as Array<{
      id: string;
      timestamp: string;
      task_id: string;
      household_id: string;
      actor: string;
      action: string;
      risk_category: RiskCategory;
      outcome: AuditInput["outcome"];
      fields_json: string | null;
      previous_hash: string;
      hash: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      taskId: row.task_id,
      householdId: row.household_id,
      actor: row.actor,
      action: row.action,
      riskCategory: row.risk_category,
      outcome: row.outcome,
      ...(row.fields_json ? { fields: JSON.parse(row.fields_json) as JsonObject } : {}),
      previousHash: row.previous_hash,
      hash: row.hash,
    }));
  }

  close(): void {
    this.#database.close();
  }
}

export class TamperEvidentAudit {
  constructor(
    private readonly key: Uint8Array,
    private readonly store: AuditRecordStore = new MemoryAuditRecordStore(),
  ) {
    if (key.byteLength < 32) throw new Error("audit-key-too-short");
  }
  append(input: AuditInput): AuditRecord {
    return this.store.append((previousHash) => {
      const safe = {
        ...input,
        ...(input.fields ? { fields: redactJson(input.fields) as JsonObject } : {}),
        previousHash,
      };
      return { ...safe, hash: this.hash(safe) };
    });
  }
  records(): AuditRecord[] {
    return this.store.records();
  }
  verify(records: readonly AuditRecord[] = this.store.records()): boolean {
    let previousHash = "GENESIS";
    for (const record of records) {
      if (record.previousHash !== previousHash) return false;
      const { hash, ...unsigned } = record;
      const actual = Buffer.from(hash);
      const expected = Buffer.from(this.hash(unsigned));
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
      previousHash = hash;
    }
    return true;
  }
  close(): void {
    this.store.close?.();
  }
  private hash(value: object): string {
    return createHmac("sha256", this.key).update(canonical(value)).digest("hex");
  }
}
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
    .join(",")}}`;
}
