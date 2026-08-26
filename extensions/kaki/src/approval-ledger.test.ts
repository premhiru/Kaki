import type { ApprovalAuditEvent, ApprovalCard, ApprovalGrant } from "@kaki/approval-node";
import type { PluginStateKeyedStore } from "openclaw/plugin-sdk/plugin-state-runtime";
import { describe, expect, it } from "vitest";
import { KakiPluginStateApprovalLedger } from "./approval-ledger.js";

function store<T>(withUpdate = true): PluginStateKeyedStore<T> {
  const values = new Map<string, { value: T; createdAt: number }>();
  return {
    register: async (key, value) => void values.set(key, { value, createdAt: Date.now() }),
    registerIfAbsent: async (key, value) => {
      if (values.has(key)) return false;
      values.set(key, { value, createdAt: Date.now() });
      return true;
    },
    ...(withUpdate
      ? {
          update: async (key: string, update: (value: T | undefined) => T | undefined) => {
            const next = update(values.get(key)?.value);
            if (next === undefined) return false;
            values.set(key, { value: next, createdAt: values.get(key)?.createdAt ?? Date.now() });
            return true;
          },
        }
      : {}),
    lookup: async (key) => values.get(key)?.value,
    consume: async (key) => {
      const value = values.get(key)?.value;
      values.delete(key);
      return value;
    },
    delete: async (key) => values.delete(key),
    entries: async () => [...values].map(([key, value]) => ({ key, ...value })),
    clear: async () => void values.clear(),
  };
}

function card(id: string, status: ApprovalCard["status"] = "pending"): ApprovalCard {
  return {
    id,
    taskId: `task-${id}`,
    traceId: `trace-${id}`,
    stepId: `step-${id}`,
    householdId: "home",
    title: id,
    summary: id,
    category: "booking",
    status,
    requestedByPersonId: "person-1",
    materialFacts: { category: "booking" },
    createdAt: `2026-08-26T00:00:0${id}.000Z`,
    expiresAt: `2026-08-27T00:00:0${id}.000Z`,
    factsHash: id.padEnd(64, "a").slice(0, 64),
    evidence: [],
    choices: [
      { id: "approve", label: "Approve", action: "approve" },
      { id: "deny", label: "Deny", action: "deny" },
    ],
    policy: { action: "ask", ruleId: "booking", reasonCode: "approval_required" },
  };
}

describe("Kaki durable approval ledger", () => {
  it("requires atomic update support at construction", () => {
    expect(() => new KakiPluginStateApprovalLedger(store(false))).toThrow(
      "atomic plugin-state update support",
    );
  });

  it("stores, orders, CAS-updates, and rejects duplicate cards", async () => {
    const ledger = new KakiPluginStateApprovalLedger(store());
    await ledger.put(card("2"));
    await ledger.put(card("1"));
    await ledger.put(card("3", "approved"));
    await expect(ledger.put(card("1"))).rejects.toThrow("approval-id-conflict");
    await expect(ledger.pending("home")).resolves.toEqual([card("1"), card("2")]);
    await expect(ledger.due("2026-08-27T00:00:01.500Z")).resolves.toEqual([card("1")]);
    await expect(ledger.compareAndSwap("1", "approved", card("1", "denied"))).resolves.toBe(false);
    await expect(
      ledger.compareAndSwap("missing", "pending", card("missing", "denied")),
    ).resolves.toBe(false);
    await expect(ledger.compareAndSwap("1", "pending", card("1", "denied"))).resolves.toBe(true);
    await expect(ledger.get("1")).resolves.toEqual(card("1", "denied"));
    await expect(ledger.get("missing")).resolves.toBeUndefined();
  });

  it("stores ordered audits and single-use grants with corruption checks", async () => {
    const backing = store<never>();
    const ledger = new KakiPluginStateApprovalLedger(backing);
    const event = (id: string): ApprovalAuditEvent => ({
      id,
      cardId: "card-1",
      taskId: "task-1",
      householdId: "home",
      occurredAt: `2026-08-26T00:00:0${id}.000Z`,
      action: "created",
      actorPersonId: "person-1",
      factsHash: "a".repeat(64),
    });
    await ledger.appendAudit(event("2"));
    await ledger.appendAudit(event("1"));
    await expect(ledger.appendAudit(event("1"))).rejects.toThrow("approval-audit-id-conflict");
    await expect(ledger.audit("card-1")).resolves.toEqual([event("1"), event("2")]);

    const grant = {
      id: "grant-1",
      approvalCardId: "card-1",
      householdId: "home",
      taskId: "task-1",
      stepId: "step-1",
      approvedByPersonId: "person-1",
      factsHash: "a".repeat(64),
      issuedAt: "2026-08-26T00:00:00.000Z",
      expiresAt: "2026-08-27T00:00:00.000Z",
      singleUse: true,
    } as ApprovalGrant;
    await ledger.putGrant({ grant });
    await expect(ledger.putGrant({ grant })).rejects.toThrow("approval-grant-id-conflict");
    await expect(ledger.getGrant(grant.id)).resolves.toEqual({ grant });
    await expect(ledger.consumeGrant(grant.id, "2026-08-26T01:00:00.000Z")).resolves.toBe(true);
    await expect(ledger.consumeGrant(grant.id, "2026-08-26T02:00:00.000Z")).resolves.toBe(false);
    await expect(ledger.consumeGrant("missing", "2026-08-26T02:00:00.000Z")).resolves.toBe(false);
    await expect(ledger.getGrant("missing")).resolves.toBeUndefined();
  });
});
