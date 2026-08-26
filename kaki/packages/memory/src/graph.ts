import { randomUUID } from "node:crypto";
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
import type { HouseholdFieldCipher } from "./field-cipher.js";
import type { HouseholdMemoryRepository, StoredEntityRow } from "./persistence.js";
import { assertNoSecrets, canAccess, maskSensitiveIdentifiers } from "./privacy.js";
import { parseGraphEntity } from "./validation.js";

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

export class HouseholdGraphStore {
  public constructor(
    private readonly repository: HouseholdMemoryRepository,
    private readonly cipher: HouseholdFieldCipher,
  ) {}

  public async upsert(input: unknown): Promise<void> {
    const entity = parseGraphEntity(input);
    validateNoSecrets(entity);
    const safe = sanitiseEntity(entity);
    const row: StoredEntityRow = {
      id: safe.id,
      householdId: safe.householdId,
      kind: safe.kind,
      version: safe.version,
      payloadCiphertext: await this.cipher.encrypt(
        safe.householdId,
        entityContext(safe.id),
        JSON.stringify(safe),
      ),
      updatedAt: safe.updatedAt,
    };
    const expectedPreviousVersion = safe.version === 1 ? null : safe.version - 1;
    if (!(await this.repository.putEntity(row, expectedPreviousVersion)))
      throw new Error("memory-entity-version-conflict");
  }

  public async get(
    id: string,
    householdId: string,
    requesterPersonId?: string,
    purpose?: string,
    childSafe = false,
  ): Promise<HouseholdGraphEntity | undefined> {
    const row = await this.repository.findEntity(id, householdId);
    if (!row) return undefined;
    const entity = await this.decryptEntity(row);
    return canAccess(entity.privacy, requesterPersonId, purpose, childSafe) ? entity : undefined;
  }

  public async list(
    householdId: string,
    requesterPersonId?: string,
    purpose?: string,
    childSafe = false,
  ): Promise<HouseholdGraphEntity[]> {
    const rows = await this.repository.listEntities(householdId);
    const entities = await Promise.all(rows.map((row) => this.decryptEntity(row)));
    return entities.filter((entity) =>
      canAccess(entity.privacy, requesterPersonId, purpose, childSafe),
    );
  }

  public delete(id: string, householdId: string): Promise<boolean> {
    return this.repository.deleteEntity(id, householdId);
  }

  public async bindSpeaker(
    householdId: string,
    personId: string,
    channel: ChannelKind,
    jid: string,
  ): Promise<void> {
    if (!jid.trim()) throw new Error("speaker-jid-required");
    const person = await this.get(personId, householdId, personId);
    if (!person || person.kind !== "person") throw new Error("speaker-person-not-found");
    const jidFingerprint = await this.cipher.speakerFingerprint(householdId, channel, jid);
    const outcome = await this.repository.bindSpeaker({
      householdId,
      personId,
      channel,
      jidFingerprint,
      createdAt: new Date().toISOString(),
    });
    if (outcome === "conflict") throw new Error("speaker-identity-conflict");
  }

  public async resolveSpeaker(
    householdId: string,
    channel: ChannelKind,
    jid: string,
  ): Promise<Person | undefined> {
    const fingerprint = await this.cipher.speakerFingerprint(householdId, channel, jid);
    const personId = await this.repository.findSpeaker(householdId, channel, fingerprint);
    if (!personId) return undefined;
    const entity = await this.get(personId, householdId, personId);
    return entity?.kind === "person" ? entity : undefined;
  }

  public async exportMarkdown(householdId: string, requesterPersonId?: string): Promise<string> {
    const lines = ["# MEMORY.md", "", `Household: ${householdId}`, ""];
    for (const entity of await this.list(householdId, requesterPersonId)) {
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

  private async decryptEntity(row: StoredEntityRow): Promise<HouseholdGraphEntity> {
    const plaintext = await this.cipher.decrypt(
      row.householdId,
      entityContext(row.id),
      row.payloadCiphertext,
    );
    let parsed: unknown;
    try {
      parsed = JSON.parse(plaintext) as unknown;
    } catch {
      throw new Error("memory-entity-payload-invalid");
    }
    const entity = parseGraphEntity(parsed);
    if (
      entity.id !== row.id ||
      entity.householdId !== row.householdId ||
      entity.kind !== row.kind ||
      entity.version !== row.version
    )
      throw new Error("memory-entity-row-mismatch");
    return entity;
  }
}

function validateNoSecrets(entity: HouseholdGraphEntity): void {
  const values = { ...entity } as Record<string, unknown>;
  delete values.encryptionKeyRef;
  delete values.secretHandle;
  assertNoSecrets(values);
}

function sanitiseEntity(entity: HouseholdGraphEntity): HouseholdGraphEntity {
  const clone = structuredClone(entity);
  if (clone.kind === "preference")
    return { ...clone, value: maskSensitiveIdentifiers(clone.value) };
  return clone;
}

function entityContext(id: string): string {
  return `entity:${id}:payload`;
}

export function newEntityBase(
  householdId: string,
  privacy: PrivacyScope,
): Pick<MemoryEntity, "id" | "householdId" | "createdAt" | "updatedAt" | "version" | "privacy"> {
  const now = new Date().toISOString();
  return { id: randomUUID(), householdId, createdAt: now, updatedAt: now, version: 1, privacy };
}
