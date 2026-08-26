import assert from "node:assert/strict";
import test from "node:test";
import {
  HttpKakiGatewayClient,
  currentKakiGatewayClient,
  resolveTrustedPhoneFrameUrl,
} from "../app/gateway.ts";

const snapshot = {
  householdName: "Test household",
  operatorName: "Operator",
  paused: false,
  health: { state: "steady", checkedAt: "2026-08-26T00:00:00Z" },
  household: [
    {
      id: "person-1",
      initials: "OP",
      name: "Operator",
      relation: "admin",
      language: "English",
      detail: "private",
    },
  ],
  approvals: [
    {
      id: "approval-1",
      factsHash: "a".repeat(64),
      title: "Confirm",
      detail: "One step",
      amount: "S$1.00",
      evidence: "redacted",
      state: "pending",
    },
  ],
  phone: { connected: true, name: "Assistant phone", batteryPercent: 80, summary: "Ready" },
  journey: [{ id: "journey-1", time: "now", title: "Started", detail: "Visible outcome" }],
  skills: [{ id: "skill-1", source: "maintained", instructions: "Stop before send." }],
  locale: {
    active: "Singapore · en-SG",
    available: ["Singapore · en-SG"],
    preview: "Can.",
    currency: "SGD",
    timeZone: "Asia/Singapore",
  },
  cost: { month: "S$1", today: "S$0.10", localShare: "80%", budgetRemaining: "S$19" },
  traces: [{ id: "trace-1", title: "Trace", steps: [{ title: "Open", evidence: "No secrets" }] }],
  monitors: [{ id: "rain", title: "Rain", detail: "Commute", status: "clear", enabled: true }],
};

test("loads a bounded same-origin snapshot through the authenticated plugin route", async () => {
  let request: { input: string; init?: RequestInit } | undefined;
  const client = new HttpKakiGatewayClient("/api/kaki", async (input, init) => {
    request = { input: String(input), init };
    return Response.json(snapshot);
  });
  assert.equal((await client.snapshot()).householdName, "Test household");
  assert.equal(request?.input, "/api/kaki/snapshot");
  assert.equal(request?.init?.credentials, "same-origin");
  assert.equal(request?.init?.cache, "no-store");
});

test("posts typed operator actions and returns their visible outcome", async () => {
  let requestBody = "";
  const client = new HttpKakiGatewayClient("/api/kaki", async (_input, init) => {
    requestBody = String(init?.body);
    return Response.json({ ok: true, message: "Approval recorded.", snapshot });
  });
  const outcome = await client.perform({
    type: "approval.decide",
    id: "approval-1",
    decision: "denied",
    factsHash: "a".repeat(64),
  });
  assert.equal(outcome.message, "Approval recorded.");
  assert.deepEqual(JSON.parse(requestBody), {
    type: "approval.decide",
    id: "approval-1",
    decision: "denied",
    factsHash: "a".repeat(64),
  });
});

test("rejects oversized, malformed, and unauthorized Gateway responses", async () => {
  const oversized = new HttpKakiGatewayClient(
    "/api/kaki",
    async () => new Response("{}", { headers: { "content-length": "1000001" } }),
  );
  await assert.rejects(() => oversized.snapshot(), /exceeded/);
  const malformed = new HttpKakiGatewayClient("/api/kaki", async () => Response.json({}));
  await assert.rejects(() => malformed.snapshot(), /invalid-control-snapshot/);
  const unauthorized = new HttpKakiGatewayClient(
    "/api/kaki",
    async () => new Response("", { status: 401 }),
  );
  await assert.rejects(() => unauthorized.snapshot(), /authenticated Gateway/);
  for (const factsHash of ["a".repeat(63), "A".repeat(64)]) {
    const invalidFacts = structuredClone(snapshot);
    invalidFacts.approvals[0].factsHash = factsHash;
    const client = new HttpKakiGatewayClient("/api/kaki", async () => Response.json(invalidFacts));
    await assert.rejects(() => client.snapshot(), /invalid-control-snapshot/);
  }
  const streamedOversize = new HttpKakiGatewayClient(
    "/api/kaki",
    async () => new Response(JSON.stringify({ value: "x".repeat(1_000_001) })),
  );
  await assert.rejects(() => streamedOversize.snapshot(), /exceeded/);
  const serverFailure = new HttpKakiGatewayClient(
    "/api/kaki",
    async () => new Response("", { status: 500 }),
  );
  await assert.rejects(() => serverFailure.snapshot(), /Check Gateway status and retry/);
  const invalidJson = new HttpKakiGatewayClient("/api/kaki", async () => new Response("not-json"));
  await assert.rejects(() => invalidJson.snapshot(), /JSON/);
});

test("bounds request time and refuses cross-origin route bases", async () => {
  assert.throws(
    () => new HttpKakiGatewayClient("https://outside.invalid/api/kaki"),
    /authenticated origin/,
  );
  const stalled = new HttpKakiGatewayClient(
    "/api/kaki",
    async (_input, init) =>
      await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true,
        });
      }),
    1,
  );
  await assert.rejects(() => stalled.snapshot(), /timed out/);
  assert.throws(() => new HttpKakiGatewayClient("/api/kaki", fetch, 0), /invalid.*timeout/);
  assert.throws(() => new HttpKakiGatewayClient("/api/kaki", fetch, 60_001), /invalid.*timeout/);
});

test("renders phone frames only from the authenticated origin", () => {
  assert.equal(
    resolveTrustedPhoneFrameUrl("/frames/latest.png", "https://kaki.local/control"),
    "https://kaki.local/frames/latest.png",
  );
  assert.equal(
    resolveTrustedPhoneFrameUrl("https://phone.household.ts.net/frame", "https://kaki.local"),
    undefined,
  );
  assert.equal(
    resolveTrustedPhoneFrameUrl("https://outside.invalid/frame", "https://kaki.local"),
    undefined,
  );
  assert.equal(resolveTrustedPhoneFrameUrl("javascript:alert(1)", "https://kaki.local"), undefined);
  assert.equal(
    resolveTrustedPhoneFrameUrl("https://kaki.local.evil.invalid/frame", "https://kaki.local"),
    undefined,
  );
  assert.equal(resolveTrustedPhoneFrameUrl(undefined, "https://kaki.local"), undefined);
  assert.equal(resolveTrustedPhoneFrameUrl("/frame", "not-a-url"), undefined);
});

test("validates optional snapshot variants, action outcomes, and the browser singleton", async () => {
  const variants = {
    ...snapshot,
    health: { ...snapshot.health, state: "degraded" as const },
    phone: { connected: true, name: "Assistant phone", summary: "Ready" },
    approvals: snapshot.approvals.map((approval) => ({
      ...approval,
      state: "approved" as const,
    })),
    skills: [
      ...snapshot.skills,
      { id: "skill-2", source: "learned" as const, instructions: "Learned." },
      { id: "skill-3", source: "phone" as const, instructions: "Phone." },
    ],
  };
  const client = new HttpKakiGatewayClient("/api/kaki", async () => Response.json(variants));
  assert.deepEqual((await client.snapshot()).phone, {
    connected: true,
    name: "Assistant phone",
    summary: "Ready",
  });

  for (const outcome of [
    { ok: "yes", message: "bad" },
    { ok: true, message: 7 },
    { ok: true, message: "ok", snapshot: {} },
  ]) {
    const invalid = new HttpKakiGatewayClient("/api/kaki", async () => Response.json(outcome));
    await assert.rejects(() => invalid.perform({ type: "system.pause", paused: true }), /invalid-/);
  }
  const oversizedAction = new HttpKakiGatewayClient("/api/kaki", async () => {
    throw new Error("must-not-send");
  });
  await assert.rejects(
    () =>
      oversizedAction.perform({
        type: "skill.save-draft",
        id: "skill",
        instructions: "x".repeat(100_001),
      }),
    /request limit/,
  );

  assert.equal(currentKakiGatewayClient(), undefined);
  const previousWindow = globalThis.window;
  try {
    const browser = {} as Window & typeof globalThis;
    Object.assign(globalThis, { window: browser });
    const first = currentKakiGatewayClient();
    assert.ok(first instanceof HttpKakiGatewayClient);
    assert.equal(currentKakiGatewayClient(), first);
  } finally {
    if (previousWindow === undefined) delete (globalThis as { window?: unknown }).window;
    else Object.assign(globalThis, { window: previousWindow });
  }
});
