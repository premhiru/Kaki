import type { HouseholdKeyBroker } from "@kaki/memory";
import type { PluginStateKeyedStore } from "openclaw/plugin-sdk/plugin-state-runtime";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { KakiPluginConfig } from "./config.js";
import { createHostBackedKakiOwners } from "./host-owners.js";
import {
  KAKI_BOOTSTRAP_KEY,
  KAKI_BOOTSTRAP_NAMESPACE,
  createKakiBootstrapRecord,
  type KakiBootstrapRecord,
  type KakiOnboardingInput,
} from "./onboarding-state.js";

function keyedStore<T>(): PluginStateKeyedStore<T> {
  const values = new Map<string, { value: T; createdAt: number }>();
  let clock = 0;
  return {
    register: async (key, value) => void values.set(key, { value, createdAt: ++clock }),
    registerIfAbsent: async (key, value) => {
      if (values.has(key)) return false;
      values.set(key, { value, createdAt: ++clock });
      return true;
    },
    update: async (key, update) => {
      const next = update(values.get(key)?.value);
      if (next === undefined) return false;
      values.set(key, { value: next, createdAt: values.get(key)?.createdAt ?? ++clock });
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

const config: KakiPluginConfig = {
  householdProfileId: "household-1",
  operatorPersonId: "person-1",
  addressBookProfileId: "address-1",
  approvalPolicyProfileId: "approval-1",
  dataProfileId: "data-1",
  phoneNodeId: "phone-1",
  whatsappAccountId: "assistant",
  telegramAccountId: "control",
  modelProfileId: "model-1",
  asrProfileId: "asr-1",
  locale: "sg",
};

const refs = {
  householdMemoryKey: { source: "env", provider: "default", id: "KAKI_TEST_MEMORY_KEY" },
  model: { source: "env", provider: "default", id: "KAKI_TEST_MODEL_KEY" },
  ltaDataMall: { source: "env", provider: "default", id: "KAKI_TEST_LTA_KEY" },
  oneMap: { source: "env", provider: "default", id: "KAKI_TEST_ONEMAP_KEY" },
  phonePairing: { source: "env", provider: "default", id: "KAKI_TEST_PHONE_KEY" },
} as const;

const input: KakiOnboardingInput = {
  config,
  householdName: "Tan household",
  operatorName: "Mei",
  members: [
    {
      id: "person-1",
      name: "Mei Tan",
      relation: "self",
      languages: ["English", "Mandarin"],
      register: "casual",
      dietary: ["halal"],
      commute: ["MRT"],
    },
  ],
  addresses: [
    {
      id: "home",
      label: "home",
      oneMapSearchValue: "1 Fusionopolis Place",
      postalCode: "138522",
      latitude: 1.2996,
      longitude: 103.7874,
    },
  ],
  approvalAutoCap: 30,
  approvalCurrency: "SGD",
  monthlyModelBudgetUsd: 1,
  monitorSessionKey: "agent:main:main",
  secretRefs: refs,
};

type TestRuntime = ReturnType<typeof runtimeFixture>;

function runtimeFixture() {
  const stores = new Map<string, PluginStateKeyedStore<unknown>>();
  let healthy = true;
  let phone:
    | { nodeId: string; connected: boolean; displayName: string; invocableCommands: string[] }
    | undefined = {
    nodeId: "phone-1",
    connected: true,
    displayName: "Pixel",
    invocableCommands: ["mobile.ui.observe", "mobile.ui.act"],
  };
  let observation: unknown = { snapshotId: "snapshot-1", nodes: [{ ref: "pay-button" }] };
  let whatsappConnected = false;
  const gatewayRequest = vi.fn(async (method: string) => {
    if (method === "health") {
      if (!healthy) throw new Error("offline");
      return { ok: true };
    }
    if (method === "skills.status")
      return {
        skills: [
          { name: "maintained", source: "bundled", description: "Maintained skill" },
          { skillKey: "learned", source: "learned", description: "Learned skill" },
          { name: "phone", source: "phone", description: "Phone skill" },
        ],
      };
    if (method === "skills.proposals.update") return { ok: true };
    if (method === "web.login.start") return { connected: whatsappConnected };
    if (method === "cron.list")
      return {
        jobs: [
          {
            id: "enabled",
            name: "Morning",
            enabled: true,
            state: { nextRunAtMs: Date.parse("2026-08-27T00:00:00.000Z") },
          },
          { id: "disabled", enabled: false },
          "invalid",
        ],
      };
    throw new Error(`unexpected gateway method: ${method}`);
  });
  const nodeInvocations: Array<{ command: string; params: unknown }> = [];
  const runtime = {
    config: { current: () => ({ secrets: { providers: { default: { source: "env" } } } }) },
    state: {
      openKeyedStore: <T>({ namespace }: { namespace: string }) => {
        let value = stores.get(namespace);
        if (!value) {
          value = keyedStore<unknown>();
          stores.set(namespace, value);
        }
        return value as PluginStateKeyedStore<T>;
      },
    },
    gateway: { request: gatewayRequest },
    nodes: {
      list: vi.fn(async () => ({ nodes: phone ? [phone] : [] })),
      invoke: vi.fn(async ({ command, params }: { command: string; params: unknown }) => {
        nodeInvocations.push({ command, params });
        return { payload: command === "mobile.ui.observe" ? observation : { ok: true } };
      }),
    },
    llm: {
      complete: vi.fn(async () => ({
        text: "Can.",
        provider: "openai",
        model: "gpt",
        usage: { inputTokens: 1, outputTokens: 1, costUsd: 0.01 },
      })),
    },
    subagent: {
      run: vi.fn(async () => ({ runId: crypto.randomUUID() })),
      waitForRun: vi.fn(async () => ({
        status: "ok",
        terminalReply: {
          disposition: "visible",
          text: JSON.stringify({ ok: true, evidence: "verified", summary: "done" }),
        },
      })),
    },
  };
  return {
    runtime,
    stores,
    gatewayRequest,
    nodeInvocations,
    setHealthy: (value: boolean) => {
      healthy = value;
    },
    setPhone: (value: typeof phone) => {
      phone = value;
    },
    setObservation: (value: unknown) => {
      observation = value;
    },
    setWhatsappConnected: (value: boolean) => {
      whatsappConnected = value;
    },
  };
}

async function provision(fixture: TestRuntime, record?: KakiBootstrapRecord) {
  const key = Buffer.alloc(32, 7);
  vi.stubEnv(refs.householdMemoryKey.id, key.toString("base64url"));
  for (const ref of [refs.model, refs.ltaDataMall, refs.oneMap, refs.phonePairing])
    vi.stubEnv(ref.id, "configured");
  const broker: HouseholdKeyBroker = { getHouseholdKey: async () => new Uint8Array(key) };
  const bootstrap = record ?? (await createKakiBootstrapRecord(input, broker));
  await fixture.runtime.state
    .openKeyedStore<KakiBootstrapRecord>({ namespace: KAKI_BOOTSTRAP_NAMESPACE })
    .register(KAKI_BOOTSTRAP_KEY, bootstrap);
}

afterEach(() => vi.unstubAllEnvs());

describe("Kaki host-backed owner graph", () => {
  it("refuses to start without the exact current encrypted onboarding record", async () => {
    const fixture = runtimeFixture();
    await expect(createHostBackedKakiOwners(fixture.runtime as never, config)).rejects.toThrow(
      "onboarding-state-missing-or-stale",
    );
    await provision(fixture);
    await expect(
      createHostBackedKakiOwners(fixture.runtime as never, { ...config, locale: "my" }),
    ).rejects.toThrow("onboarding-state-missing-or-stale");
  });

  it("delegates household, phone, journey, skill, monitor, channel, and cron operations to host owners", async () => {
    const fixture = runtimeFixture();
    await provision(fixture);
    const workflow = {
      unscheduleSessionTurnsByTag: vi.fn(async () => 1),
      scheduleSessionTurn: vi.fn(async () => ({ id: "scheduled" })),
    };
    const owners = await createHostBackedKakiOwners(
      fixture.runtime as never,
      config,
      workflow as never,
    );
    const signal = AbortSignal.timeout(5_000);

    await expect(owners.system.snapshot(signal)).resolves.toMatchObject({
      householdName: "Tan household",
      health: { state: "steady" },
    });
    fixture.setHealthy(false);
    await expect(owners.system.snapshot(signal)).resolves.toMatchObject({
      health: { state: "degraded" },
    });
    await expect(owners.system.setPaused(true, signal)).resolves.toMatchObject({
      ok: true,
      message: expect.stringContaining("paused"),
    });
    await expect(owners.system.snapshot(signal)).resolves.toMatchObject({ paused: true });

    await expect(owners.household.list(signal)).resolves.toEqual([
      expect.objectContaining({
        id: "person-1",
        initials: "MT",
        language: "English, Mandarin",
        detail: "casual · halal · MRT",
      }),
    ]);
    await expect(
      owners.household.edit("person-1", { name: "Mei Lim", dietary: [] }, signal),
    ).resolves.toMatchObject({ ok: true });
    await expect(owners.household.list(signal)).resolves.toEqual([
      expect.objectContaining({ name: "Mei Lim", initials: "ML" }),
    ]);
    await expect(owners.household.edit("missing", { name: "Nobody" }, signal)).rejects.toThrow(
      "member-not-found",
    );

    await expect(owners.phone.snapshot(signal)).resolves.toMatchObject({
      connected: true,
      name: "Pixel",
    });
    await expect(owners.phone.command({ command: "screenshot" }, signal)).resolves.toMatchObject({
      ok: true,
    });
    await expect(owners.phone.command({ command: "back" }, signal)).resolves.toMatchObject({
      ok: true,
    });
    await expect(owners.phone.command({ command: "home" }, signal)).resolves.toMatchObject({
      ok: true,
    });
    await expect(owners.phone.command({ command: "relaunch" }, signal)).resolves.toMatchObject({
      ok: false,
    });
    await expect(owners.phone.command({ command: "tap-target" }, signal)).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining("Select"),
    });
    await expect(
      owners.phone.command({ command: "tap-target", target: "stale" }, signal),
    ).resolves.toMatchObject({ ok: false, message: expect.stringContaining("stale") });
    await expect(
      owners.phone.command({ command: "tap-target", target: "pay-button" }, signal),
    ).resolves.toMatchObject({ ok: true });
    expect(fixture.nodeInvocations.some((entry) => entry.command === "mobile.ui.act")).toBe(true);
    fixture.setPhone(undefined);
    await expect(owners.phone.snapshot(signal)).resolves.toMatchObject({
      connected: false,
      name: "phone-1",
    });
    await expect(owners.phone.command({ command: "screenshot" }, signal)).resolves.toMatchObject({
      ok: false,
    });

    await expect(
      owners.journeys.create({ taskId: "task-1", title: "Trip", detail: "Town" }, signal),
    ).resolves.toMatchObject({ ok: true });
    const journey = (await owners.journeys.list(signal))[0] as { id: string };
    await expect(
      owners.journeys.edit(journey.id, { detail: "City" }, signal),
    ).resolves.toMatchObject({ ok: true });
    await expect(
      owners.journeys.edit("missing", { detail: "Nope" }, signal),
    ).resolves.toMatchObject({ ok: false });
    await expect(owners.journeys.delete(journey.id, signal)).resolves.toMatchObject({ ok: true });
    await expect(owners.journeys.delete("missing", signal)).resolves.toMatchObject({ ok: false });

    await expect(owners.skills.list(signal)).resolves.toEqual([
      expect.objectContaining({ id: "maintained", source: "maintained" }),
      expect.objectContaining({ id: "learned", source: "learned" }),
      expect.objectContaining({ id: "phone", source: "phone" }),
    ]);
    await expect(owners.skills.list(signal)).resolves.toHaveLength(3);
    expect(
      fixture.gatewayRequest.mock.calls.filter(([method]) => method === "skills.status"),
    ).toHaveLength(1);
    await expect(owners.skills.saveDraft("draft", "instructions", signal)).resolves.toMatchObject({
      ok: true,
    });
    const skill = (await owners.skills.execute(
      {
        skillId: "sg.chas-clinic-finder",
        values: { postcode_and_service: "138522 GP" },
        sessionKey: "agent:main:main",
      },
      signal,
    )) as { status: string; traceId: string };
    expect(skill).toMatchObject({ status: "completed", traceId: expect.any(String) });
    await expect(owners.traces.list(signal)).resolves.toEqual([
      expect.objectContaining({ id: skill.traceId }),
    ]);
    await expect(owners.traces.position(skill.traceId, 1, signal)).resolves.toMatchObject({
      ok: true,
    });
    await expect(owners.traces.position(skill.traceId, 100, signal)).resolves.toMatchObject({
      ok: false,
    });
    await expect(owners.traces.position("missing", 0, signal)).resolves.toMatchObject({
      ok: false,
    });

    await expect(owners.locale.snapshot(signal)).resolves.toMatchObject({ active: "sg" });
    await expect(owners.locale.set("my", signal)).resolves.toMatchObject({ ok: true });
    await expect(owners.costs.snapshot(signal)).resolves.toMatchObject({
      budgetRemaining: "1.00 USD",
    });
    await expect(owners.monitors.list(signal)).resolves.toHaveLength(10);
    await expect(owners.monitors.set("rain-commute", true, signal)).resolves.toMatchObject({
      ok: true,
    });
    await expect(owners.monitors.set("rain-commute", false, signal)).resolves.toMatchObject({
      ok: true,
    });
    await expect(owners.monitors.set("missing", true, signal)).rejects.toThrow("monitor-not-found");
    expect(workflow.scheduleSessionTurn).toHaveBeenCalledOnce();

    await expect(owners.channels.relinkWhatsApp(signal)).resolves.toMatchObject({
      ok: true,
      message: expect.stringContaining("relink started"),
    });
    fixture.setWhatsappConnected(true);
    await expect(owners.channels.relinkWhatsApp(signal)).resolves.toMatchObject({
      message: "WhatsApp is linked.",
    });
    await expect(owners.automation.list(signal)).resolves.toEqual([
      { id: "enabled", title: "Morning", status: "enabled", nextRun: "2026-08-27T00:00:00.000Z" },
      { id: "disabled", title: "Scheduled task", status: "disabled", nextRun: "Not scheduled" },
    ]);
  });

  it("reports paired-but-unavailable phone and missing monitor scheduling as visible outcomes", async () => {
    const fixture = runtimeFixture();
    await provision(fixture);
    fixture.setPhone({
      nodeId: "phone-1",
      connected: false,
      displayName: "Pixel",
      invocableCommands: ["mobile.ui.observe"],
    });
    const owners = await createHostBackedKakiOwners(fixture.runtime as never, config);
    await expect(owners.phone.snapshot(AbortSignal.timeout(1_000))).resolves.toMatchObject({
      connected: false,
      summary: expect.stringContaining("disconnected"),
    });
    await expect(
      owners.monitors.set("rain-commute", true, AbortSignal.timeout(1_000)),
    ).resolves.toMatchObject({ ok: false, message: expect.stringContaining("unavailable") });
  });
});
