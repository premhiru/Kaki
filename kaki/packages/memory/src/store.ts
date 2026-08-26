import { randomUUID } from "node:crypto";
import type { PrivacyScope } from "@kaki/core";
import type { HouseholdFieldCipher } from "./field-cipher.js";
import type {
  HouseholdMemoryRepository,
  StoredJourneyRow,
  StoredMemoryRow,
} from "./persistence.js";
import {
  assertNoSecrets,
  canAccess,
  householdPrivacy,
  maskSensitiveIdentifiers,
} from "./privacy.js";
import { parsePrivacyScope } from "./validation.js";

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

export interface MemoryWriteInput {
  readonly householdId: string;
  readonly kind: string;
  readonly text: string;
  readonly scopePersonId?: string;
  readonly privacy?: PrivacyScope;
  readonly id?: string;
}

export class HouseholdMemoryStore {
  public constructor(
    private readonly repository: HouseholdMemoryRepository,
    private readonly cipher: HouseholdFieldCipher,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async addMemory(input: unknown): Promise<MemoryEntry> {
    const parsed = parseMemoryInput(input);
    assertNoSecrets(parsed.text);
    const text = maskSensitiveIdentifiers(parsed.text);
    const privacy =
      parsed.privacy ??
      (parsed.scopePersonId
        ? ({
            ownerPersonId: parsed.scopePersonId,
            audience: { kind: "owner", personId: parsed.scopePersonId },
            sensitivity:
              parsed.kind === "medical"
                ? "medical"
                : parsed.kind === "financial"
                  ? "financial"
                  : "private",
          } satisfies PrivacyScope)
        : householdPrivacy);
    const id = parsed.id ?? randomUUID();
    const now = this.clock().toISOString();
    const payloadCiphertext = await this.cipher.encrypt(
      parsed.householdId,
      memoryContext(id),
      JSON.stringify({ text, privacy }),
    );
    const searchTokens = await this.cipher.searchTokens(parsed.householdId, text);
    const row: StoredMemoryRow = {
      id,
      householdId: parsed.householdId,
      kind: parsed.kind,
      ...(parsed.scopePersonId ? { scopePersonId: parsed.scopePersonId } : {}),
      payloadCiphertext,
      searchTokens,
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.insertMemory(row);
    return entryFromPayload(row, { text, privacy });
  }

  /** FTS recall constrained to the requesting household and speaker privacy wall. */
  public async recall(
    query: string,
    householdId: string,
    requesterPersonId?: string,
    limit = 10,
    options: { purpose?: string; childSafe?: boolean } = {},
  ): Promise<MemoryEntry[]> {
    const searchTokens = await this.cipher.searchTokens(householdId, query);
    if (!searchTokens) return [];
    const requested = boundedLimit(limit, 100);
    const rows = await this.repository.searchMemory(
      householdId,
      searchTokens,
      Math.min(1000, requested * 10),
    );
    const entries = await Promise.all(rows.map((row) => this.decryptMemory(row)));
    return entries
      .filter((entry) =>
        canAccess(entry.privacy, requesterPersonId, options.purpose, options.childSafe),
      )
      .slice(0, requested);
  }

  public async getMemory(
    id: string,
    householdId: string,
    requesterPersonId?: string,
    options: { purpose?: string; childSafe?: boolean } = {},
  ): Promise<MemoryEntry | undefined> {
    const row = await this.repository.findMemory(id, householdId);
    if (!row) return undefined;
    const entry = await this.decryptMemory(row);
    return canAccess(entry.privacy, requesterPersonId, options.purpose, options.childSafe)
      ? entry
      : undefined;
  }

  public deleteMemory(id: string, householdId: string): Promise<boolean> {
    return this.repository.deleteMemory(id, householdId);
  }

  public async addJourney(input: unknown): Promise<JourneyEvent> {
    const parsed = parseJourneyInput(input);
    assertNoSecrets(parsed.title);
    assertNoSecrets(parsed.detail);
    const id = parsed.id ?? randomUUID();
    const now = this.clock().toISOString();
    const title = maskSensitiveIdentifiers(parsed.title);
    const detail = maskSensitiveIdentifiers(parsed.detail);
    const row: StoredJourneyRow = {
      id,
      householdId: parsed.householdId,
      taskId: parsed.taskId,
      version: 1,
      payloadCiphertext: await this.cipher.encrypt(
        parsed.householdId,
        journeyContext(id),
        JSON.stringify({ title, detail }),
      ),
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.insertJourney(row);
    return {
      id,
      householdId: parsed.householdId,
      taskId: parsed.taskId,
      title,
      detail,
      createdAt: now,
      updatedAt: now,
    };
  }

  public async journey(householdId: string, limit = 100): Promise<JourneyEvent[]> {
    const rows = await this.repository.listJourney(householdId, boundedLimit(limit, 1000));
    return Promise.all(rows.map((row) => this.decryptJourney(row)));
  }

  public async editJourney(id: string, householdId: string, patch: unknown): Promise<boolean> {
    const parsed = parseJourneyPatch(patch);
    const currentRow = await this.repository.findJourney(id, householdId);
    if (!currentRow) return false;
    const current = await this.decryptJourney(currentRow);
    if (parsed.title !== undefined) assertNoSecrets(parsed.title);
    if (parsed.detail !== undefined) assertNoSecrets(parsed.detail);
    const title = maskSensitiveIdentifiers(parsed.title ?? current.title);
    const detail = maskSensitiveIdentifiers(parsed.detail ?? current.detail);
    const updatedAt = this.clock().toISOString();
    const payload = await this.cipher.encrypt(
      householdId,
      journeyContext(id),
      JSON.stringify({ title, detail }),
    );
    return this.repository.updateJourney(id, householdId, payload, updatedAt, currentRow.version);
  }

  public deleteJourney(id: string, householdId: string): Promise<boolean> {
    return this.repository.deleteJourney(id, householdId);
  }

  public async exportJourneyMarkdown(householdId: string, limit = 1000): Promise<string> {
    const lines = ["# Journey", ""];
    for (const event of await this.journey(householdId, Math.min(1000, limit)))
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

  private async decryptMemory(row: StoredMemoryRow): Promise<MemoryEntry> {
    const plaintext = await this.cipher.decrypt(
      row.householdId,
      memoryContext(row.id),
      row.payloadCiphertext,
    );
    return entryFromPayload(row, parseMemoryPayload(plaintext));
  }

  private async decryptJourney(row: StoredJourneyRow): Promise<JourneyEvent> {
    const plaintext = await this.cipher.decrypt(
      row.householdId,
      journeyContext(row.id),
      row.payloadCiphertext,
    );
    const payload = parseJsonRecord(plaintext, "memory-journey-payload-invalid");
    if (Object.keys(payload).some((key) => key !== "title" && key !== "detail"))
      throw new Error("memory-journey-payload-invalid");
    return {
      id: row.id,
      householdId: row.householdId,
      taskId: row.taskId,
      title: requiredText(payload.title, "memory-journey-title-invalid", 512),
      detail: requiredText(payload.detail, "memory-journey-detail-invalid", 16_384),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

function entryFromPayload(
  row: StoredMemoryRow,
  payload: { text: string; privacy: PrivacyScope },
): MemoryEntry {
  return {
    id: row.id,
    householdId: row.householdId,
    kind: row.kind,
    text: payload.text,
    ...(row.scopePersonId ? { scopePersonId: row.scopePersonId } : {}),
    privacy: payload.privacy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseMemoryInput(value: unknown): MemoryWriteInput {
  const record = inputRecord(value, "memory-input-invalid", [
    "householdId",
    "kind",
    "text",
    "scopePersonId",
    "privacy",
    "id",
  ]);
  return {
    householdId: requiredText(record.householdId, "memory-household-invalid", 128),
    kind: requiredText(record.kind, "memory-kind-invalid", 128),
    text: requiredText(record.text, "memory-text-invalid", 16_384),
    ...(record.scopePersonId === undefined
      ? {}
      : { scopePersonId: requiredText(record.scopePersonId, "memory-person-invalid", 128) }),
    ...(record.privacy === undefined ? {} : { privacy: parsePrivacyScope(record.privacy) }),
    ...(record.id === undefined ? {} : { id: requiredText(record.id, "memory-id-invalid", 128) }),
  };
}

function parseMemoryPayload(plaintext: string): { text: string; privacy: PrivacyScope } {
  const record = parseJsonRecord(plaintext, "memory-payload-invalid");
  if (Object.keys(record).some((key) => key !== "text" && key !== "privacy"))
    throw new Error("memory-payload-invalid");
  return {
    text: requiredText(record.text, "memory-text-invalid", 16_384),
    privacy: parsePrivacyScope(record.privacy),
  };
}

function parseJourneyInput(value: unknown): {
  householdId: string;
  taskId: string;
  title: string;
  detail: string;
  id?: string;
} {
  const record = inputRecord(value, "memory-journey-input-invalid", [
    "householdId",
    "taskId",
    "title",
    "detail",
    "id",
  ]);
  return {
    householdId: requiredText(record.householdId, "memory-household-invalid", 128),
    taskId: requiredText(record.taskId, "memory-task-invalid", 128),
    title: requiredText(record.title, "memory-journey-title-invalid", 512),
    detail: requiredText(record.detail, "memory-journey-detail-invalid", 16_384),
    ...(record.id === undefined ? {} : { id: requiredText(record.id, "memory-id-invalid", 128) }),
  };
}

function parseJourneyPatch(value: unknown): { title?: string; detail?: string } {
  const record = inputRecord(value, "memory-journey-patch-invalid", ["title", "detail"]);
  if (record.title === undefined && record.detail === undefined)
    throw new Error("memory-journey-patch-empty");
  return {
    ...(record.title === undefined
      ? {}
      : { title: requiredText(record.title, "memory-journey-title-invalid", 512) }),
    ...(record.detail === undefined
      ? {}
      : { detail: requiredText(record.detail, "memory-journey-detail-invalid", 16_384) }),
  };
}

function inputRecord(
  value: unknown,
  code: string,
  allowed: readonly string[],
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(code);
  const prototype = Object.getPrototypeOf(value) as unknown;
  if (prototype !== Object.prototype && prototype !== null) throw new Error(code);
  const result: Record<string, unknown> = {};
  for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
    if (!("value" in descriptor) || !descriptor.enumerable || !allowed.includes(key))
      throw new Error(`${code}:${key}`);
    result[key] = descriptor.value;
  }
  return result;
}

function parseJsonRecord(json: string, code: string): Record<string, unknown> {
  try {
    return inputRecord(JSON.parse(json) as unknown, code, ["text", "privacy", "title", "detail"]);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(code)) throw error;
    throw new Error(code);
  }
}

function requiredText(value: unknown, code: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(code);
  return value;
}

function boundedLimit(limit: number, max: number): number {
  return Math.max(1, Math.min(max, Math.floor(Number.isFinite(limit) ? limit : 1)));
}

function memoryContext(id: string): string {
  return `memory:${id}:payload`;
}

function journeyContext(id: string): string {
  return `journey:${id}:payload`;
}
