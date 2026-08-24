import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  Account,
  ChannelKind,
  Household,
  MemoryEntity,
  Person,
  Place,
  PrivacyScope,
  Vendor,
} from "@kaki/core";
import { assertNoSecrets, canAccess, maskSensitiveIdentifiers } from "./privacy.js";

export interface Routine extends MemoryEntity {
  readonly kind: "routine";
  readonly title: string;
  readonly schedule?: string;
  readonly placeIds?: readonly string[];
}
export interface Preference extends MemoryEntity {
  readonly kind: "preference";
  readonly ownerPersonId?: string;
  readonly key: string;
  readonly value: string;
}
export interface HouseholdEvent extends MemoryEntity {
  readonly kind: "event";
  readonly title: string;
  readonly startsAt: string;
  readonly endsAt?: string;
  readonly placeId?: string;
}
export type HouseholdGraphEntity =
  | Household
  | Person
  | Place
  | Vendor
  | Account
  | Routine
  | Preference
  | HouseholdEvent;
type Row = Record<string, unknown>;

export class HouseholdGraphStore implements Disposable {
  private readonly db: DatabaseSync;
  constructor(file: string) {
    if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    this.migrate();
  }

  upsert(entity: HouseholdGraphEntity): void {
    validateEntity(entity);
    const safe = sanitiseEntity(entity);
    this.db
      .prepare(
        `INSERT INTO household_entities (id, household_id, kind, privacy_json, entity_json, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET household_id=excluded.household_id, kind=excluded.kind, privacy_json=excluded.privacy_json, entity_json=excluded.entity_json, updated_at=excluded.updated_at`,
      )
      .run(
        safe.id,
        safe.householdId,
        safe.kind,
        JSON.stringify(safe.privacy),
        JSON.stringify(safe),
        safe.updatedAt,
      );
  }

  get(
    id: string,
    householdId: string,
    requesterPersonId?: string,
    purpose?: string,
    childSafe = false,
  ): HouseholdGraphEntity | undefined {
    const row = this.db
      .prepare(
        "SELECT entity_json, privacy_json FROM household_entities WHERE id = ? AND household_id = ?",
      )
      .get(id, householdId) as Row | undefined;
    if (!row) return undefined;
    const privacy = JSON.parse(String(row.privacy_json)) as PrivacyScope;
    if (!canAccess(privacy, requesterPersonId, purpose, childSafe)) return undefined;
    return JSON.parse(String(row.entity_json)) as HouseholdGraphEntity;
  }

  list(
    householdId: string,
    requesterPersonId?: string,
    purpose?: string,
    childSafe = false,
  ): HouseholdGraphEntity[] {
    const rows = this.db
      .prepare(
        "SELECT entity_json, privacy_json FROM household_entities WHERE household_id = ? ORDER BY updated_at DESC",
      )
      .all(householdId) as Row[];
    return rows
      .filter((row) =>
        canAccess(
          JSON.parse(String(row.privacy_json)) as PrivacyScope,
          requesterPersonId,
          purpose,
          childSafe,
        ),
      )
      .map((row) => JSON.parse(String(row.entity_json)) as HouseholdGraphEntity);
  }

  delete(id: string, householdId: string): boolean {
    return (
      this.db
        .prepare("DELETE FROM household_entities WHERE id = ? AND household_id = ?")
        .run(id, householdId).changes > 0
    );
  }

  bindSpeaker(householdId: string, personId: string, channel: ChannelKind, jid: string): void {
    if (!jid.trim()) throw new Error("speaker-jid-required");
    const person = this.db
      .prepare("SELECT kind FROM household_entities WHERE id = ? AND household_id = ?")
      .get(personId, householdId) as Row | undefined;
    if (!person || person.kind !== "person") throw new Error("speaker-person-not-found");
    const existing = this.db
      .prepare(
        "SELECT person_id FROM speaker_identities WHERE household_id = ? AND channel = ? AND jid = ?",
      )
      .get(householdId, channel, jid) as Row | undefined;
    if (existing && existing.person_id !== personId) throw new Error("speaker-identity-conflict");
    this.db
      .prepare(
        "INSERT INTO speaker_identities (household_id, person_id, channel, jid, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(household_id, channel, jid) DO NOTHING",
      )
      .run(householdId, personId, channel, jid, new Date().toISOString());
  }

  resolveSpeaker(householdId: string, channel: ChannelKind, jid: string): Person | undefined {
    const row = this.db
      .prepare(
        `SELECT e.entity_json FROM speaker_identities s JOIN household_entities e ON e.id=s.person_id AND e.household_id=s.household_id WHERE s.household_id=? AND s.channel=? AND s.jid=?`,
      )
      .get(householdId, channel, jid) as Row | undefined;
    return row ? (JSON.parse(String(row.entity_json)) as Person) : undefined;
  }

  exportMarkdown(householdId: string, requesterPersonId?: string): string {
    const lines = ["# MEMORY.md", "", `Household: ${householdId}`, ""];
    for (const entity of this.list(householdId, requesterPersonId)) {
      const exportable = { ...entity } as Record<string, unknown>;
      delete exportable.secretHandle;
      delete exportable.encryptionKeyRef;
      lines.push(
        `## ${entity.kind}: ${"displayName" in entity ? entity.displayName : "title" in entity ? entity.title : entity.id}`,
        "",
        "```json",
        maskSensitiveIdentifiers(JSON.stringify(exportable, null, 2)),
        "```",
        "",
      );
    }
    return lines.join("\n");
  }

  close(): void {
    this.db.close();
  }
  [Symbol.dispose](): void {
    this.close();
  }
  private migrate(): void {
    this.db.exec(
      `CREATE TABLE IF NOT EXISTS household_entities (id TEXT PRIMARY KEY, household_id TEXT NOT NULL, kind TEXT NOT NULL, privacy_json TEXT NOT NULL, entity_json TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS entity_household_kind ON household_entities(household_id, kind); CREATE TABLE IF NOT EXISTS speaker_identities (household_id TEXT NOT NULL, person_id TEXT NOT NULL, channel TEXT NOT NULL, jid TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(household_id, channel, jid)); CREATE INDEX IF NOT EXISTS speaker_person ON speaker_identities(household_id, person_id);`,
    );
  }
}

const allowedAccountKeys = new Set([
  "id",
  "householdId",
  "createdAt",
  "updatedAt",
  "version",
  "privacy",
  "tags",
  "kind",
  "provider",
  "displayLabel",
  "ownerPersonId",
  "capabilities",
  "secretHandle",
]);
function validateEntity(entity: HouseholdGraphEntity): void {
  if (!entity.id || !entity.householdId) throw new Error("memory-entity-invalid");
  const valuesForSecretScan = { ...entity } as Record<string, unknown>;
  delete valuesForSecretScan.encryptionKeyRef;
  delete valuesForSecretScan.secretHandle;
  assertNoSecrets(valuesForSecretScan);
  if (entity.kind === "household") {
    if (entity.id !== entity.householdId) throw new Error("household-id-mismatch");
    if (!/^(?:keychain|secret|kms):\/\//.test(entity.encryptionKeyRef))
      throw new Error("household-key-reference-invalid");
  }
  if (entity.kind === "account")
    for (const key of Object.keys(entity))
      if (!allowedAccountKeys.has(key)) throw new Error(`account-secret-field-rejected:${key}`);
}
function sanitiseEntity(entity: HouseholdGraphEntity): HouseholdGraphEntity {
  const clone = structuredClone(entity);
  if (clone.kind === "preference")
    return { ...clone, value: maskSensitiveIdentifiers(clone.value) };
  return clone;
}

export function newEntityBase(
  householdId: string,
  privacy: PrivacyScope,
): Pick<MemoryEntity, "id" | "householdId" | "createdAt" | "updatedAt" | "version" | "privacy"> {
  const now = new Date().toISOString();
  return { id: randomUUID(), householdId, createdAt: now, updatedAt: now, version: 1, privacy };
}
