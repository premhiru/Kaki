import { describe, expect, it } from "vitest";
import {
  projectActionResult,
  projectApproval,
  projectHousehold,
  projectPhone,
  projectSkill,
  projectSnapshot,
} from "./projection.js";
import { createTestOwners } from "./test-support.js";

describe("Kaki owner projection boundary", () => {
  it("accepts each closed public variant without leaking optional internal fields", async () => {
    for (const state of ["pending", "approved", "denied"] as const) {
      expect(
        projectApproval({
          id: "a",
          factsHash: "a".repeat(64),
          title: "Title",
          detail: "Detail",
          amount: "",
          evidence: "none",
          state,
        }),
      ).toMatchObject({ state });
    }
    for (const source of ["maintained", "learned", "phone"] as const) {
      expect(
        projectSkill({ id: "skill", source, instructions: "Do it", internal: "hidden" }),
      ).toEqual({ id: "skill", source, instructions: "Do it" });
    }
    expect(projectPhone({ connected: false, name: "Phone", summary: "Offline" })).toEqual({
      connected: false,
      name: "Phone",
      summary: "Offline",
    });
    expect(
      projectActionResult({
        ok: true,
        message: "Done",
        approvalGrantId: "grant-1",
        secret: "hidden",
      }),
    ).toEqual({ ok: true, message: "Done", approvalGrantId: "grant-1" });

    const owners = createTestOwners();
    const snapshot = projectSnapshot({
      system: {
        ...(await owners.system.snapshot(AbortSignal.timeout(1_000))),
        health: { state: "degraded", checkedAt: "now" },
      },
      household: await owners.household.list(AbortSignal.timeout(1_000)),
      approvals: await owners.approvals.list(AbortSignal.timeout(1_000)),
      phone: await owners.phone.snapshot(AbortSignal.timeout(1_000)),
      journey: await owners.journeys.list(AbortSignal.timeout(1_000)),
      skills: await owners.skills.list(AbortSignal.timeout(1_000)),
      locale: await owners.locale.snapshot(AbortSignal.timeout(1_000)),
      cost: await owners.costs.snapshot(AbortSignal.timeout(1_000)),
      traces: await owners.traces.list(AbortSignal.timeout(1_000)),
      monitors: await owners.monitors.list(AbortSignal.timeout(1_000)),
    });
    expect(snapshot.health.state).toBe("degraded");
  });

  it.each([
    ["non-record", () => projectHousehold(null)],
    [
      "oversized field",
      () =>
        projectHousehold({
          id: "x".repeat(257),
          initials: "X",
          name: "X",
          relation: "self",
          language: "English",
          detail: "ok",
        }),
    ],
    [
      "embedded secret",
      () =>
        projectHousehold({
          id: "x",
          initials: "X",
          name: "X",
          relation: "self",
          language: "English",
          detail: "password=secret",
        }),
    ],
    [
      "image data",
      () =>
        projectHousehold({
          id: "x",
          initials: "X",
          name: "data:image/png;base64,abc",
          relation: "self",
          language: "English",
          detail: "ok",
        }),
    ],
    [
      "approval state",
      () =>
        projectApproval({
          id: "a",
          factsHash: "a".repeat(64),
          title: "T",
          detail: "D",
          amount: "",
          evidence: "",
          state: "expired",
        }),
    ],
    [
      "approval hash",
      () =>
        projectApproval({
          id: "a",
          factsHash: "bad",
          title: "T",
          detail: "D",
          amount: "",
          evidence: "",
          state: "pending",
        }),
    ],
    [
      "battery type",
      () => projectPhone({ connected: true, name: "Phone", batteryPercent: "50", summary: "ok" }),
    ],
    [
      "battery finite",
      () =>
        projectPhone({ connected: true, name: "Phone", batteryPercent: Number.NaN, summary: "ok" }),
    ],
    [
      "battery minimum",
      () => projectPhone({ connected: true, name: "Phone", batteryPercent: -1, summary: "ok" }),
    ],
    [
      "battery maximum",
      () => projectPhone({ connected: true, name: "Phone", batteryPercent: 101, summary: "ok" }),
    ],
    [
      "frame origin",
      () =>
        projectPhone({
          connected: true,
          name: "Phone",
          frameUrl: "https://example.com/frame",
          summary: "ok",
        }),
    ],
    [
      "frame protocol-relative",
      () =>
        projectPhone({
          connected: true,
          name: "Phone",
          frameUrl: "//example.com/frame",
          summary: "ok",
        }),
    ],
    ["skill source", () => projectSkill({ id: "skill", source: "remote", instructions: "Do it" })],
    ["action boolean", () => projectActionResult({ ok: "yes", message: "Done" })],
    [
      "system health",
      () =>
        projectSnapshot({
          system: {
            householdName: "H",
            operatorName: "O",
            paused: false,
            health: { state: "unknown", checkedAt: "now" },
          },
          household: [],
          approvals: [],
          phone: { connected: false, name: "P", summary: "S" },
          journey: [],
          skills: [],
          locale: {
            active: "sg",
            available: [],
            preview: "",
            currency: "SGD",
            timeZone: "Asia/Singapore",
          },
          cost: { month: "0", today: "0", localShare: "0", budgetRemaining: "0" },
          traces: [],
          monitors: [],
        }),
    ],
  ])("rejects %s from an untrusted owner response", (_name, run) => {
    expect(run).toThrow();
  });
});
