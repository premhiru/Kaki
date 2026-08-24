import { createHmac, timingSafeEqual } from "node:crypto";
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
export class TamperEvidentAudit {
  readonly #records: AuditRecord[] = [];
  constructor(private readonly key: Uint8Array) {
    if (key.byteLength < 32) throw new Error("audit-key-too-short");
  }
  append(input: AuditInput): AuditRecord {
    const previousHash = this.#records.at(-1)?.hash ?? "GENESIS";
    const safe = {
      ...input,
      ...(input.fields ? { fields: redactJson(input.fields) as JsonObject } : {}),
      previousHash,
    };
    const record = { ...safe, hash: this.hash(safe) };
    this.#records.push(record);
    return structuredClone(record);
  }
  records(): AuditRecord[] {
    return structuredClone(this.#records);
  }
  verify(records: readonly AuditRecord[] = this.#records): boolean {
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
