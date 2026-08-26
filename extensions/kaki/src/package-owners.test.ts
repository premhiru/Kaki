import { fileURLToPath } from "node:url";
import { ApprovalEngine } from "@kaki/approval-node";
import type { LocaleCode } from "@kaki/locale";
import { CostLedger } from "@kaki/models";
import { SingaporeMonitorRegistry } from "@kaki/sg-data";
import type { PluginStateKeyedStore } from "openclaw/plugin-sdk/plugin-state-runtime";
import { describe, expect, it } from "vitest";
import { KakiPluginStateApprovalLedger } from "./approval-ledger.js";
import {
  createKakiApprovalOwner,
  createKakiCostOwner,
  createKakiLocaleOwner,
  createKakiMonitorOwner,
} from "./package-owners.js";

function testStore<T>(): PluginStateKeyedStore<T> {
  const values = new Map<string, { value: T; createdAt: number }>();
  return {
    register: async (key, value) => void values.set(key, { value, createdAt: Date.now() }),
    registerIfAbsent: async (key, value) => {
      if (values.has(key)) return false;
      values.set(key, { value, createdAt: Date.now() });
      return true;
    },
    update: async (key, update) => {
      const next = update(values.get(key)?.value);
      if (next === undefined) return false;
      values.set(key, {
        value: next,
        createdAt: values.get(key)?.createdAt ?? Date.now(),
      });
      return true;
    },
    lookup: async (key) => values.get(key)?.value,
    consume: async (key) => {
      const value = values.get(key)?.value;
      values.delete(key);
      return value;
    },
    delete: async (key) => values.delete(key),
    entries: async () => [...values.entries()].map(([key, value]) => ({ key, ...value })),
    clear: async () => void values.clear(),
  };
}

async function pendingApproval() {
  const ledger = new KakiPluginStateApprovalLedger(testStore());
  const engine = new ApprovalEngine(ledger, { id: () => crypto.randomUUID() });
  const card = await engine.create({
    taskId: "task-1",
    householdId: "household-1",
    title: "Book appointment",
    summary: "Book the selected appointment slot.",
    category: "booking",
    requestedByPersonId: "person-1",
    materialFacts: { slot: "2026-08-27T10:00:00+08:00" },
  });
  const owner = createKakiApprovalOwner({
    ledger,
    householdId: "household-1",
    authorizeDecision: ({ personId }) => personId === "person-1",
  });
  return { card, owner };
}

describe("Kaki package-backed owners", () => {
  it("delegates an actor-bound facts-hash CAS decision to ApprovalEngine", async () => {
    const { card, owner } = await pendingApproval();
    await expect(
      owner.decide(
        {
          id: card.id,
          decision: "approved",
          actorPersonId: "person-1",
          factsHash: card.factsHash,
        },
        AbortSignal.timeout(1_000),
      ),
    ).resolves.toMatchObject({ ok: true, approvalGrantId: expect.any(String) });
    await expect(owner.list(AbortSignal.timeout(1_000))).resolves.toEqual([]);
  });

  it("rejects the wrong actor and stale material facts without changing the pending card", async () => {
    const { card, owner } = await pendingApproval();
    await expect(
      owner.decide(
        {
          id: card.id,
          decision: "denied",
          actorPersonId: "person-2",
          factsHash: card.factsHash,
        },
        AbortSignal.timeout(1_000),
      ),
    ).rejects.toThrow("approval-actor-unauthorized");
    await expect(
      owner.decide(
        {
          id: card.id,
          decision: "denied",
          actorPersonId: "person-1",
          factsHash: "0".repeat(64),
        },
        AbortSignal.timeout(1_000),
      ),
    ).rejects.toThrow("approval-material-facts-changed");
    await expect(owner.list(AbortSignal.timeout(1_000))).resolves.toHaveLength(1);
  });

  it("loads and validates real locale packs before delegating durable selection", async () => {
    let active = "sg" as const | "my";
    const owner = createKakiLocaleOwner({
      getActive: async () => active,
      setActive: async (locale) => {
        active = locale as typeof active;
      },
    });
    await expect(owner.snapshot(AbortSignal.timeout(1_000))).resolves.toMatchObject({
      active: "sg",
      currency: "SGD",
      timeZone: "Asia/Singapore",
    });
    await owner.set("my", AbortSignal.timeout(1_000));
    await expect(owner.snapshot(AbortSignal.timeout(1_000))).resolves.toMatchObject({
      active: "my",
    });
    await expect(owner.set("xx", AbortSignal.timeout(1_000))).rejects.toThrow("locale-unsupported");
  });

  it("loads every locale from the plugin-owned production asset root", async () => {
    let active: LocaleCode = "sg";
    const owner = createKakiLocaleOwner({
      getActive: async () => active,
      setActive: async (locale) => {
        active = locale;
      },
      packagesRoot: fileURLToPath(new URL("../assets/locale/", import.meta.url)),
    });
    for (const locale of ["sg", "my", "id", "th", "vn", "ph", "mm", "kh"] as const) {
      await owner.set(locale, AbortSignal.timeout(1_000));
      await expect(owner.snapshot(AbortSignal.timeout(1_000))).resolves.toMatchObject({
        active: locale,
      });
    }
  });

  it("summarizes current durable model spend without exceeding the configured budget", async () => {
    const ledger = new CostLedger();
    ledger.record({
      timestamp: new Date("2026-08-26T01:00:00.000Z"),
      task: "generate",
      provider: "openclaw",
      model: "configured",
      usage: { inputTokens: 10, outputTokens: 2 },
      costUsd: 0.4,
      cacheHit: false,
    });
    ledger.record({
      timestamp: new Date("2026-08-26T02:00:00.000Z"),
      task: "normalise",
      provider: "ollama",
      model: "qwen",
      usage: { inputTokens: 10, outputTokens: 2 },
      costUsd: 0,
      cacheHit: false,
    });
    ledger.record({
      timestamp: new Date("2026-07-01T00:00:00.000Z"),
      task: "generate",
      provider: "openclaw",
      model: "configured",
      usage: { inputTokens: 1, outputTokens: 1 },
      costUsd: 9,
      cacheHit: false,
    });
    const owner = createKakiCostOwner({
      ledger,
      monthlyBudgetUsd: 1,
      now: () => new Date("2026-08-26T12:00:00.000Z"),
    });
    await expect(owner.snapshot(AbortSignal.timeout(1_000))).resolves.toEqual({
      month: "0.40 USD",
      today: "0.40 USD",
      localShare: "50%",
      budgetRemaining: "0.60 USD",
    });
    const unlimited = createKakiCostOwner({
      ledger: new CostLedger(),
      now: () => new Date("2026-08-26T12:00:00.000Z"),
    });
    await expect(unlimited.snapshot(AbortSignal.timeout(1_000))).resolves.toMatchObject({
      localShare: "0%",
      budgetRemaining: "Not configured",
    });
  });

  it("validates monitor identity before persisting enablement", async () => {
    const registry = new SingaporeMonitorRegistry();
    registry.register({
      id: "rain",
      kind: "rain-before-commute",
      intervalMs: 60_000,
      collect: async () => ({}),
    });
    const enabled = new Map<string, boolean>();
    const owner = createKakiMonitorOwner({
      registry,
      isEnabled: async (id) => enabled.get(id) ?? false,
      setEnabled: async (id, value) => void enabled.set(id, value),
    });
    await expect(owner.list(AbortSignal.timeout(1_000))).resolves.toEqual([
      {
        id: "rain",
        title: "rain-before-commute",
        detail: "Every 60000 ms",
        status: "configured",
        enabled: false,
      },
    ]);
    await expect(owner.set("rain", true, AbortSignal.timeout(1_000))).resolves.toEqual({
      ok: true,
      message: "rain is enabled.",
    });
    await expect(owner.list(AbortSignal.timeout(1_000))).resolves.toMatchObject([
      { enabled: true },
    ]);
    await expect(owner.set("missing", true, AbortSignal.timeout(1_000))).rejects.toThrow(
      "monitor-not-found",
    );
  });
});
