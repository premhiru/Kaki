import { ApprovalEngine, MemoryApprovalLedger } from "@kaki/approval-node";
import type { PluginStateKeyedStore } from "openclaw/plugin-sdk/plugin-state-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createKakiHostModelRuntime } from "./model-runtime.js";
import { KakiRuntimeOwnerRegistry } from "./owner-registry.js";
import { readKakiSnapshot, withOwnerDeadline } from "./runtime.js";
import { KakiSkillApprovalAuthority } from "./skill-approval-authority.js";
import { createKakiSkillTool } from "./skill-tool.js";
import { createTestOwners } from "./test-support.js";

function store<T>(): PluginStateKeyedStore<T> {
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
      values.set(key, { value: next, createdAt: values.get(key)?.createdAt ?? Date.now() });
      return true;
    },
    lookup: async (key) => values.get(key)?.value,
    consume: async (key) => {
      const value = values.get(key)?.value;
      values.delete(key);
      return value;
    },
    delete: async (key) => values.delete(key),
    deleteIf: async (key, predicate) => {
      const current = values.get(key)?.value;
      if (current === undefined || !predicate(current)) return false;
      return values.delete(key);
    },
    entries: async () => [...values].map(([key, value]) => ({ key, ...value })),
    clear: async () => void values.clear(),
  };
}

afterEach(() => vi.useRealTimers());

describe("Kaki runtime owner boundaries", () => {
  it("installs one household-scoped owner graph and release is idempotent", () => {
    const registry = new KakiRuntimeOwnerRegistry();
    const owners = createTestOwners();
    expect(() => registry.install({ householdProfileId: " ", owners })).toThrow(
      "requires a household",
    );
    const installation = registry.install({ householdProfileId: "home", owners });
    expect(registry.current("home")).toBe(owners);
    expect(registry.current("other")).toBeUndefined();
    expect(() => registry.install({ householdProfileId: "home", owners })).toThrow(
      "already installed",
    );
    installation.release();
    installation.release();
    expect(registry.current("home")).toBeUndefined();
  });

  it("reads all owners concurrently and projects one allowlisted snapshot", async () => {
    const snapshot = await readKakiSnapshot(createTestOwners(), AbortSignal.timeout(1_000));
    expect(snapshot).toMatchObject({ householdName: "Tan household", phone: { connected: true } });
    expect(JSON.stringify(snapshot)).not.toContain("must-not-project");
  });

  it("aborts a hung owner at the lifecycle deadline", async () => {
    vi.useFakeTimers();
    const pending = withOwnerDeadline(async (signal) => {
      await new Promise<void>((resolve) =>
        signal.addEventListener("abort", () => resolve(), { once: true }),
      );
      return "late";
    });
    const rejection = expect(pending).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(10_000);
    await rejection;
    await expect(withOwnerDeadline(async () => "ready")).resolves.toBe("ready");
  });

  it("exposes the skill tool only to a session and preserves approval bindings", async () => {
    const execute = vi.fn(async () => ({ status: "completed", evidence: ["verified"] }));
    const owners = createTestOwners({
      skills: {
        list: async () => [],
        saveDraft: async () => ({ ok: true, message: "saved" }),
        execute,
      },
    });
    expect(createKakiSkillTool({} as never, () => owners)).toBeNull();
    const tool = createKakiSkillTool({ sessionKey: "agent:main:main" } as never, () => owners)!;
    await expect(
      tool.execute(
        "call-1",
        {
          skillId: "sg.chas-clinic-finder",
          input: { postcode_and_service: "138522 GP" },
          approvalGrantId: "grant-1",
          approvalAmount: { currency: "SGD", minorUnits: 1234 },
          knownPayee: true,
        },
        undefined as never,
      ),
    ).resolves.toMatchObject({ content: expect.any(Array) });
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionKey: "agent:main:main",
        approvalGrantId: "grant-1",
        approvalAmount: { currency: "SGD", minorUnits: 1234 },
        knownPayee: true,
      }),
      expect.any(AbortSignal),
    );
    await expect(tool.execute("call-2", [], undefined as never)).rejects.toThrow(
      "kaki-skill-input-invalid",
    );
    const unavailable = createKakiSkillTool(
      { sessionKey: "agent:main:main" } as never,
      () => undefined,
    )!;
    await expect(
      unavailable.execute("call-3", { skillId: "x", input: {} }, undefined as never),
    ).rejects.toThrow("finish `kaki onboard`");
  });

  it("binds an approval card and consumes its exact grant once", async () => {
    const ledger = new MemoryApprovalLedger();
    const engine = new ApprovalEngine(ledger, {
      id: (() => {
        let id = 0;
        return () => `id-${++id}`;
      })(),
      authorizeDecision: ({ personId }) => personId === "person-1",
    });
    const authority = new KakiSkillApprovalAuthority(engine);
    const preparation = {
      skillId: "sg.iras-noa",
      category: "gov.singpass",
      householdId: "home",
      personId: "person-1",
      approvalActionId: "approve",
      commitActionId: "commit",
      commitTarget: "IRAS",
      materialFingerprint: "f".repeat(64),
    };
    const prepared = await authority.prepare(preparation, "Open NOA");
    expect(prepared).toEqual({ status: "approval_required", approvalCardId: "id-1" });
    const card = await ledger.get("id-1");
    const approved = await engine.respond("id-1", {
      choiceId: "approve",
      personId: "person-1",
      factsHash: card!.factsHash,
    });
    const execute = vi.fn(async () => "receipt");
    await expect(
      authority.consumeAndExecute({ ...preparation, grantId: approved.grant!.id }, execute),
    ).resolves.toEqual({ status: "approved", value: "receipt" });
    expect(execute).toHaveBeenCalledOnce();
    await expect(
      authority.consumeAndExecute({ ...preparation, grantId: approved.grant!.id }, execute),
    ).resolves.toMatchObject({ status: "rejected", reason: "approval-grant-replayed" });
    expect(execute).toHaveBeenCalledOnce();
    await expect(
      authority.prepare({ ...preparation, category: "money.transfer" }, "Pay"),
    ).rejects.toThrow("amount-required");
    await expect(
      authority.prepare({ ...preparation, category: "unknown" }, "Nope"),
    ).rejects.toThrow("category-invalid");
    await expect(
      authority.prepare(
        { ...preparation, category: "money.transfer", amount: { currency: "EUR", minorUnits: 1 } },
        "Pay",
      ),
    ).rejects.toThrow("amount-invalid");
  });

  it("keeps model cache and cost events in host-owned bounded stores", async () => {
    const stores = new Map<string, PluginStateKeyedStore<unknown>>();
    const llmComplete = vi.fn(async () => ({
      text: "Can.",
      provider: "openai",
      model: "gpt-5.6-luna",
      usage: { inputTokens: 10, outputTokens: 2, costUsd: 0.01 },
    }));
    const owner = createKakiHostModelRuntime({
      runtime: {
        state: {
          openKeyedStore: ({ namespace }: { namespace: string }) => {
            const existing = stores.get(namespace);
            if (existing) return existing;
            const created = store<unknown>();
            stores.set(namespace, created);
            return created;
          },
        },
        llm: { complete: llmComplete },
      } as never,
      totalBudgetUsd: 1,
    });
    const request = {
      task: "generate",
      locale: "sg",
      messages: [{ role: "user", content: "Hello" }],
      cacheable: true,
      dataClass: "public",
    } as const;
    const first = await owner.runtime.execute(request);
    const second = await owner.runtime.execute(request);
    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(llmComplete).toHaveBeenCalledOnce();
    await expect(owner.ledger.events()).resolves.toHaveLength(2);
  });
});
