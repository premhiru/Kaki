import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { PrivacyScope } from "@kaki/core";
import {
  assertNoSecrets,
  canAccess,
  householdPrivacy,
  maskSensitiveIdentifiers,
} from "./privacy.js";

export interface MemoryEntry {
  readonly id: string;
  readonly householdId: string;
  readonly kind: string;
  readonly text: string;
  readonly scopePersonId?: string;
  readonly privacy: PrivacyScope;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface JourneyEvent {
  readonly id: string;
  readonly householdId: string;
  readonly taskId: string;
  readonly title: string;
  readonly detail: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

type SqlRow = Record<string, unknown>;

export class HouseholdMemoryStore implements Disposable {
  private readonly db: DatabaseSync;

  public constructor(file: string) {
    if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  public addMemory(input: {
    householdId: string;
    kind: string;
    text: string;
    scopePersonId?: string;
    privacy?: PrivacyScope;
    id?: string;
  }): MemoryEntry {
    assertNoSecrets(input.text);
    const text = maskSensitiveIdentifiers(input.text);
    const privacy =
      input.privacy ??
      (input.scopePersonId
        ? {
            ownerPersonId: input.scopePersonId,
            audience: { kind: "owner" as const, personId: input.scopePersonId },
            sensitivity:
              input.kind === "medical"
                ? ("medical" as const)
                : input.kind === "financial"
                  ? ("financial" as const)
                  : ("private" as const),
          }
        : householdPrivacy);
    const id = input.id ?? randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO memory_entries
         (id, household_id, kind, text, scope_person_id, audience_json, sensitivity, purposes_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.householdId,
        input.kind,
        text,
        input.scopePersonId ?? null,
        JSON.stringify(privacy.audience),
        privacy.sensitivity,
        JSON.stringify(privacy.purposes ?? []),
        now,
        now,
      );
    return {
      id,
      householdId: input.householdId,
      kind: input.kind,
      text,
      ...(input.scopePersonId ? { scopePersonId: input.scopePersonId } : {}),
      privacy,
      createdAt: now,
      updatedAt: now,
    };
  }

  /** FTS5 recall constrained to the requesting household and speaker privacy wall. */
  public recall(
    query: string,
    householdId: string,
    requesterPersonId?: string,
    limit = 10,
    options: { purpose?: string; childSafe?: boolean } = {},
  ): MemoryEntry[] {
    const safeQuery = ftsQuery(query);
    if (!safeQuery) return [];
    const requested = Math.max(1, Math.min(100, Math.floor(limit)));
    const rows = this.db
      .prepare(
        `SELECT m.*
         FROM memory_fts AS f
         JOIN memory_entries AS m ON m.rowid = f.rowid
         WHERE memory_fts MATCH ?
           AND m.household_id = ?
         ORDER BY bm25(memory_fts), m.updated_at DESC
         LIMIT ?`,
      )
      .all(safeQuery, householdId, Math.min(1000, requested * 10)) as SqlRow[];
    return rows
      .map(memoryFromRow)
      .filter((entry) =>
        canAccess(entry.privacy, requesterPersonId, options.purpose, options.childSafe),
      )
      .slice(0, requested);
  }

  public getMemory(
    id: string,
    householdId: string,
    requesterPersonId?: string,
    options: { purpose?: string; childSafe?: boolean } = {},
  ): MemoryEntry | undefined {
    const row = this.db
      .prepare("SELECT * FROM memory_entries WHERE id = ? AND household_id = ?")
      .get(id, householdId) as SqlRow | undefined;
    if (!row) return undefined;
    const entry = memoryFromRow(row);
    return canAccess(entry.privacy, requesterPersonId, options.purpose, options.childSafe)
      ? entry
      : undefined;
  }

  public deleteMemory(id: string, householdId: string): boolean {
    return (
      this.db
        .prepare("DELETE FROM memory_entries WHERE id = ? AND household_id = ?")
        .run(id, householdId).changes > 0
    );
  }

  public addJourney(input: {
    householdId: string;
    taskId: string;
    title: string;
    detail: string;
    id?: string;
  }): JourneyEvent {
    assertNoSecrets(input.title);
    assertNoSecrets(input.detail);
    const id = input.id ?? randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO journey_events
         (id, household_id, task_id, title, detail, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.householdId,
        input.taskId,
        maskSensitiveIdentifiers(input.title),
        maskSensitiveIdentifiers(input.detail),
        now,
        now,
      );
    return {
      ...input,
      title: maskSensitiveIdentifiers(input.title),
      detail: maskSensitiveIdentifiers(input.detail),
      id,
      createdAt: now,
      updatedAt: now,
    };
  }

  public journey(householdId: string, limit = 100): JourneyEvent[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM journey_events WHERE household_id = ?
         ORDER BY created_at DESC LIMIT ?`,
      )
      .all(householdId, Math.max(1, Math.floor(limit))) as SqlRow[];
    return rows.map(journeyFromRow);
  }

  public editJourney(
    id: string,
    householdId: string,
    patch: { title?: string; detail?: string },
  ): boolean {
    if (patch.title) assertNoSecrets(patch.title);
    if (patch.detail) assertNoSecrets(patch.detail);
    const result = this.db
      .prepare(
        `UPDATE journey_events SET
           title = COALESCE(?, title), detail = COALESCE(?, detail), updated_at = ?
         WHERE id = ? AND household_id = ?`,
      )
      .run(
        patch.title ? maskSensitiveIdentifiers(patch.title) : null,
        patch.detail ? maskSensitiveIdentifiers(patch.detail) : null,
        new Date().toISOString(),
        id,
        householdId,
      );
    return result.changes > 0;
  }

  public deleteJourney(id: string, householdId: string): boolean {
    return (
      this.db
        .prepare("DELETE FROM journey_events WHERE id = ? AND household_id = ?")
        .run(id, householdId).changes > 0
    );
  }

  public exportJourneyMarkdown(householdId: string, limit = 1000): string {
    const lines = ["# Journey", ""];
    for (const event of this.journey(householdId, Math.min(1000, limit)))
      lines.push(
        `## ${maskSensitiveIdentifiers(event.title)}`,
        "",
        `- Task: ${event.taskId}`,
        `- Time: ${event.createdAt}`,
        "",
        maskSensitiveIdentifiers(event.detail),
        "",
      );
    return lines.join("\n");
  }

  public close(): void {
    this.db.close();
  }

  public [Symbol.dispose](): void {
    this.close();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_entries (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        text TEXT NOT NULL,
        scope_person_id TEXT,
        audience_json TEXT,
        sensitivity TEXT,
        purposes_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS memory_household_scope
        ON memory_entries(household_id, scope_person_id);
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
        text, content='memory_entries', content_rowid='rowid', tokenize='unicode61'
      );
      CREATE TRIGGER IF NOT EXISTS memory_ai AFTER INSERT ON memory_entries BEGIN
        INSERT INTO memory_fts(rowid, text) VALUES (new.rowid, new.text);
      END;
      CREATE TRIGGER IF NOT EXISTS memory_ad AFTER DELETE ON memory_entries BEGIN
        INSERT INTO memory_fts(memory_fts, rowid, text) VALUES ('delete', old.rowid, old.text);
      END;
      CREATE TRIGGER IF NOT EXISTS memory_au AFTER UPDATE ON memory_entries BEGIN
        INSERT INTO memory_fts(memory_fts, rowid, text) VALUES ('delete', old.rowid, old.text);
        INSERT INTO memory_fts(rowid, text) VALUES (new.rowid, new.text);
      END;
      CREATE TABLE IF NOT EXISTS journey_events (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        detail TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS journey_household_created
        ON journey_events(household_id, created_at DESC);
    `);
    this.ensureColumn("memory_entries", "audience_json", "TEXT");
    this.ensureColumn("memory_entries", "sensitivity", "TEXT");
    this.ensureColumn("memory_entries", "purposes_json", "TEXT");
  }

  private ensureColumn(table: string, column: string, type: string): void {
    const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as SqlRow[];
    if (!columns.some((item) => item.name === column))
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

function memoryFromRow(row: SqlRow): MemoryEntry {
  const scopePersonId = row.scope_person_id;
  const audience =
    typeof row.audience_json === "string"
      ? (JSON.parse(row.audience_json) as PrivacyScope["audience"])
      : typeof scopePersonId === "string"
        ? { kind: "owner" as const, personId: scopePersonId }
        : { kind: "household" as const };
  const purposes =
    typeof row.purposes_json === "string" ? (JSON.parse(row.purposes_json) as string[]) : [];
  const privacy: PrivacyScope = {
    ...(typeof scopePersonId === "string" ? { ownerPersonId: scopePersonId } : {}),
    audience,
    sensitivity:
      typeof row.sensitivity === "string"
        ? (row.sensitivity as PrivacyScope["sensitivity"])
        : typeof scopePersonId === "string"
          ? "private"
          : "household",
    ...(purposes.length ? { purposes } : {}),
  };
  return {
    id: String(row.id),
    householdId: String(row.household_id),
    kind: String(row.kind),
    text: String(row.text),
    ...(typeof scopePersonId === "string" ? { scopePersonId } : {}),
    privacy,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function ftsQuery(query: string): string {
  return [...query.normalize("NFKC").matchAll(/[\p{L}\p{N}]+/gu)]
    .map((match) => `"${match[0].replaceAll('"', '""')}"`)
    .join(" AND ");
}

function journeyFromRow(row: SqlRow): JourneyEvent {
  return {
    id: String(row.id),
    householdId: String(row.household_id),
    taskId: String(row.task_id),
    title: String(row.title),
    detail: String(row.detail),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
