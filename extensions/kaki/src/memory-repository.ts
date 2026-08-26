import type {
  HouseholdMemoryRepository,
  StoredEntityRow,
  StoredJourneyRow,
  StoredMemoryRow,
  StoredVectorRow,
} from "@kaki/memory";
import type { PluginStateKeyedStore } from "openclaw/plugin-sdk/plugin-state-runtime";

type MemoryRecord = Readonly<{
  kind: "memory";
  memory?: StoredMemoryRow;
  vector?: StoredVectorRow;
}>;
type EntityRecord = Readonly<{
  kind: "entity-envelope";
  householdId: string;
  entities: readonly Readonly<{
    entity: StoredEntityRow;
    speakers: readonly Readonly<{ channel: string; jidFingerprint: string; createdAt: string }>[];
  }>[];
}>;
type JourneyRecord = Readonly<{ kind: "journey"; journey: StoredJourneyRow }>;
type RepositoryRecord = MemoryRecord | EntityRecord | JourneyRecord;

const key = (kind: string, householdId: string, id: string) => `${kind}:${householdId}:${id}`;

/**
 * Shared-SQLite memory adapter. Linked rows live in one keyed value so CAS updates and
 * owner deletes remain atomic without a schema bump or raw SQL.
 */
export class KakiPluginStateMemoryRepository implements HouseholdMemoryRepository {
  public constructor(private readonly store: PluginStateKeyedStore<RepositoryRecord>) {}

  private update(
    stateKey: string,
    update: (current: RepositoryRecord | undefined) => RepositoryRecord | undefined,
  ): Promise<boolean> {
    if (!this.store.update) throw new Error("kaki-plugin-state-cas-unavailable");
    return this.store.update(stateKey, update);
  }

  private deleteIf(
    stateKey: string,
    predicate: (current: RepositoryRecord) => boolean,
  ): Promise<boolean> {
    if (!this.store.deleteIf) throw new Error("kaki-plugin-state-conditional-delete-unavailable");
    return this.store.deleteIf(stateKey, predicate);
  }

  async insertMemory(row: StoredMemoryRow): Promise<void> {
    const stateKey = key("memory", row.householdId, row.id);
    if (
      !(await this.update(stateKey, (current) => {
        if (current && current.kind !== "memory") throw new Error("memory-row-kind-conflict");
        if (current?.memory) throw new Error("memory-row-exists");
        return {
          kind: "memory",
          memory: row,
          ...(current?.vector ? { vector: current.vector } : {}),
        };
      }))
    )
      throw new Error("memory-row-write-failed");
  }

  async findMemory(id: string, householdId: string): Promise<StoredMemoryRow | undefined> {
    const row = await this.store.lookup(key("memory", householdId, id));
    return row?.kind === "memory" ? row.memory : undefined;
  }

  async searchMemory(
    householdId: string,
    searchTokens: string,
    candidateLimit: number,
  ): Promise<readonly StoredMemoryRow[]> {
    const requested = new Set(searchTokens.split(" ").filter(Boolean));
    if (requested.size === 0) return [];
    return (await this.store.entries())
      .map((entry) => entry.value)
      .filter(
        (value): value is MemoryRecord & { memory: StoredMemoryRow } =>
          value.kind === "memory" && value.memory?.householdId === householdId,
      )
      .filter(({ memory }) => {
        const available = new Set(memory.searchTokens.split(" "));
        return [...requested].every((token) => available.has(token));
      })
      .sort((left, right) => right.memory.updatedAt.localeCompare(left.memory.updatedAt))
      .slice(0, candidateLimit)
      .map((value) => value.memory);
  }

  async deleteMemory(id: string, householdId: string): Promise<boolean> {
    const stateKey = key("memory", householdId, id);
    return this.deleteIf(
      stateKey,
      (current) => current.kind === "memory" && current.memory !== undefined,
    );
  }

  async putEntity(row: StoredEntityRow, expectedPreviousVersion: number | null): Promise<boolean> {
    const stateKey = key("entity-envelope", row.householdId, "active");
    let written = false;
    await this.update(stateKey, (current) => {
      if (current && current.kind !== "entity-envelope") return undefined;
      const entries = current?.entities ?? [];
      const index = entries.findIndex((entry) => entry.entity.id === row.id);
      const version = index < 0 ? undefined : entries[index]?.entity.version;
      if (
        (expectedPreviousVersion === null && version !== undefined) ||
        (expectedPreviousVersion !== null && version !== expectedPreviousVersion)
      )
        return undefined;
      written = true;
      const entities = [...entries];
      const next = { entity: row, speakers: index < 0 ? [] : entities[index]!.speakers };
      if (index < 0) entities.push(next);
      else entities[index] = next;
      return { kind: "entity-envelope", householdId: row.householdId, entities };
    });
    return written;
  }

  async findEntity(id: string, householdId: string): Promise<StoredEntityRow | undefined> {
    const row = await this.store.lookup(key("entity-envelope", householdId, "active"));
    return row?.kind === "entity-envelope"
      ? row.entities.find((entry) => entry.entity.id === id)?.entity
      : undefined;
  }

  async listEntities(householdId: string): Promise<readonly StoredEntityRow[]> {
    const row = await this.store.lookup(key("entity-envelope", householdId, "active"));
    return row?.kind === "entity-envelope"
      ? row.entities
          .map((entry) => entry.entity)
          .sort((left, right) => left.id.localeCompare(right.id))
      : [];
  }

  async deleteEntity(id: string, householdId: string): Promise<boolean> {
    const stateKey = key("entity-envelope", householdId, "active");
    let deleted = false;
    await this.update(stateKey, (current) => {
      if (!current || current.kind !== "entity-envelope") return undefined;
      const entities = current.entities.filter((entry) => entry.entity.id !== id);
      if (entities.length === current.entities.length) return undefined;
      deleted = true;
      return { ...current, entities };
    });
    return deleted;
  }

  async bindSpeaker(input: {
    householdId: string;
    personId: string;
    channel: string;
    jidFingerprint: string;
    createdAt: string;
  }): Promise<"created" | "same-person" | "conflict"> {
    const stateKey = key("entity-envelope", input.householdId, "active");
    let outcome: "created" | "same-person" | "conflict" | undefined;
    await this.update(stateKey, (current) => {
      if (!current || current.kind !== "entity-envelope") return undefined;
      const existing = current.entities.find((entry) =>
        entry.speakers.some(
          (speaker) =>
            speaker.channel === input.channel && speaker.jidFingerprint === input.jidFingerprint,
        ),
      );
      if (existing) {
        outcome = existing.entity.id === input.personId ? "same-person" : "conflict";
        return undefined;
      }
      const index = current.entities.findIndex((entry) => entry.entity.id === input.personId);
      if (index < 0) return undefined;
      const entities = [...current.entities];
      const person = entities[index]!;
      entities[index] = {
        ...person,
        speakers: [
          ...person.speakers,
          {
            channel: input.channel,
            jidFingerprint: input.jidFingerprint,
            createdAt: input.createdAt,
          },
        ],
      };
      outcome = "created";
      return { ...current, entities };
    });
    if (!outcome) throw new Error("speaker-person-not-found");
    return outcome;
  }

  async findSpeaker(
    householdId: string,
    channel: string,
    jidFingerprint: string,
  ): Promise<string | undefined> {
    const row = await this.store.lookup(key("entity-envelope", householdId, "active"));
    return row?.kind === "entity-envelope"
      ? row.entities.find((entry) =>
          entry.speakers.some(
            (speaker) => speaker.channel === channel && speaker.jidFingerprint === jidFingerprint,
          ),
        )?.entity.id
      : undefined;
  }

  async insertJourney(row: StoredJourneyRow): Promise<void> {
    if (
      !(await this.store.registerIfAbsent(key("journey", row.householdId, row.id), {
        kind: "journey",
        journey: row,
      }))
    ) {
      throw new Error("memory-journey-exists");
    }
  }

  async findJourney(id: string, householdId: string): Promise<StoredJourneyRow | undefined> {
    const row = await this.store.lookup(key("journey", householdId, id));
    return row?.kind === "journey" ? row.journey : undefined;
  }

  async listJourney(householdId: string, limit: number): Promise<readonly StoredJourneyRow[]> {
    return (await this.store.entries())
      .map((entry) => entry.value)
      .filter(
        (value): value is JourneyRecord =>
          value.kind === "journey" && value.journey.householdId === householdId,
      )
      .map((value) => value.journey)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  async updateJourney(
    id: string,
    householdId: string,
    payloadCiphertext: string,
    updatedAt: string,
    expectedVersion: number,
  ): Promise<boolean> {
    let written = false;
    await this.update(key("journey", householdId, id), (current) => {
      if (!current || current.kind !== "journey" || current.journey.version !== expectedVersion)
        return undefined;
      written = true;
      return {
        kind: "journey",
        journey: { ...current.journey, payloadCiphertext, updatedAt, version: expectedVersion + 1 },
      };
    });
    return written;
  }

  async deleteJourney(id: string, householdId: string): Promise<boolean> {
    const stateKey = key("journey", householdId, id);
    return this.deleteIf(stateKey, (current) => current.kind === "journey");
  }

  async putVector(row: StoredVectorRow): Promise<void> {
    const stateKey = key("memory", row.householdId, row.id);
    if (
      !(await this.update(stateKey, (current) => {
        if (current && current.kind !== "memory") return undefined;
        return {
          kind: "memory",
          ...(current?.memory ? { memory: current.memory } : {}),
          vector: row,
        };
      }))
    )
      throw new Error("memory-vector-write-failed");
  }

  async listVectors(
    householdId: string,
    limit: number,
  ): Promise<{ rows: readonly StoredVectorRow[]; truncated: boolean }> {
    const rows = (await this.store.entries())
      .map((entry) => entry.value)
      .filter(
        (value): value is MemoryRecord & { vector: StoredVectorRow } =>
          value.kind === "memory" && value.vector?.householdId === householdId,
      )
      .map((value) => value.vector)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return { rows: rows.slice(0, limit), truncated: rows.length > limit };
  }

  async deleteVector(id: string, householdId: string): Promise<boolean> {
    const stateKey = key("memory", householdId, id);
    const current = await this.store.lookup(stateKey);
    if (!current || current.kind !== "memory" || !current.vector) return false;
    if (!current.memory) {
      return this.deleteIf(
        stateKey,
        (value) =>
          value.kind === "memory" && value.memory === undefined && value.vector !== undefined,
      );
    }
    return this.update(stateKey, (value) => {
      if (!value || value.kind !== "memory" || !value.vector || !value.memory) return undefined;
      return { kind: "memory", memory: value.memory };
    });
  }
}
