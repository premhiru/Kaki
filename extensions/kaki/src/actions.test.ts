import { describe, expect, it, vi } from "vitest";
import { parseControlAction, performControlAction } from "./actions.js";
import type { KakiControlAction } from "./contracts.js";
import { createTestOwners } from "./test-support.js";

const hash = "a".repeat(64);

const validActions: readonly KakiControlAction[] = [
  { type: "system.pause", paused: true },
  { type: "approval.decide", id: "approval-1", decision: "approved", factsHash: hash },
  { type: "household.edit", id: "person-1", patch: { name: "Mei", languages: ["English"] } },
  { type: "phone.command", command: "screenshot" },
  { type: "phone.command", command: "tap-target", target: "pay-button" },
  { type: "journey.create", input: { taskId: "task-1", title: "Trip", detail: "Town" } },
  { type: "journey.edit", id: "journey-1", patch: { detail: "Updated" } },
  { type: "journey.delete", id: "journey-1" },
  { type: "skill.save-draft", id: "skill-1", instructions: "Check first." },
  { type: "locale.set", locale: "sg" },
  { type: "trace.position", id: "trace-1", step: 2 },
  { type: "monitor.set", id: "rain", enabled: true },
];

describe("Kaki control action boundary", () => {
  it.each(validActions)("accepts the closed $type contract", (action) => {
    expect(parseControlAction(action)).toEqual(action);
  });

  it.each([
    null,
    {},
    { type: "unknown" },
    { type: "system.pause", paused: "yes" },
    { type: "system.pause", paused: true, extra: true },
    { type: "approval.decide", id: "", decision: "approved", factsHash: hash },
    { type: "approval.decide", id: "a", decision: "maybe", factsHash: hash },
    { type: "approval.decide", id: "a", decision: "approved", factsHash: "bad" },
    { type: "household.edit", id: "person-1", patch: {} },
    { type: "household.edit", id: "person-1", patch: { languages: Array(13).fill("x") } },
    { type: "household.edit", id: "person-1", patch: { commute: [" padded "] } },
    { type: "phone.command", command: "tap-target", target: "" },
    { type: "phone.command", command: "launch" },
    { type: "journey.create", input: { taskId: "task", title: "Trip" } },
    { type: "journey.edit", id: "journey-1", patch: { title: "" } },
    { type: "journey.delete", id: "" },
    { type: "skill.save-draft", id: "skill", instructions: "x".repeat(64_001) },
    { type: "locale.set", locale: "" },
    { type: "trace.position", id: "trace", step: -1 },
    { type: "trace.position", id: "trace", step: 10_001 },
    { type: "monitor.set", id: "rain", enabled: "yes" },
  ])("rejects malformed or widened input %# before delegation", (value) => {
    expect(parseControlAction(value)).toBeUndefined();
  });

  it("routes every accepted action to exactly one authoritative owner", async () => {
    const calls: string[] = [];
    const result = async (name: string) => {
      calls.push(name);
      return { ok: true, message: name };
    };
    const owners = createTestOwners({
      system: {
        snapshot: createTestOwners().system.snapshot,
        setPaused: vi.fn(() => result("pause")),
      },
      approvals: { list: async () => [], decide: vi.fn(() => result("approval")) },
      household: { list: async () => [], edit: vi.fn(() => result("household")) },
      phone: { snapshot: async () => ({}), command: vi.fn(() => result("phone")) },
      journeys: {
        list: async () => [],
        create: vi.fn(() => result("journey-create")),
        edit: vi.fn(() => result("journey-edit")),
        delete: vi.fn(() => result("journey-delete")),
      },
      skills: {
        list: async () => [],
        saveDraft: vi.fn(() => result("skill")),
        execute: async () => ({}),
      },
      locale: { snapshot: async () => ({}), set: vi.fn(() => result("locale")) },
      traces: { list: async () => [], position: vi.fn(() => result("trace")) },
      monitors: { list: async () => [], set: vi.fn(() => result("monitor")) },
    });
    const signal = AbortSignal.timeout(1_000);
    for (const action of validActions.filter(
      (entry, index) => entry.type !== "phone.command" || index === 3,
    )) {
      await expect(performControlAction(owners, action, signal, "person-1")).resolves.toMatchObject(
        { ok: true },
      );
    }
    expect(calls).toEqual([
      "pause",
      "approval",
      "household",
      "phone",
      "journey-create",
      "journey-edit",
      "journey-delete",
      "skill",
      "locale",
      "trace",
      "monitor",
    ]);
  });
});
