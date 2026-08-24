import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { resolveKakiHome } from "../src/config/index.js";
import { DeliveryLedger } from "../src/delivery/index.js";
import { delegateTasks, LearnedSkillStore, memoryNudge } from "../src/learning/index.js";

test("KAKI_HOME is the only runtime root override", () => {
  const root = join(tmpdir(), "kaki-config-test");
  assert.equal(resolveKakiHome({ KAKI_HOME: root, OPENCLAW_HOME: "should-not-win" }), root);
});

test("delivery results survive constructing a new ledger", () => {
  const root = mkdtempSync(join(tmpdir(), "kaki-ledger-"));
  const file = join(root, "ledger.jsonl");
  const ledger = new DeliveryLedger(file);
  const record = ledger.create({ taskId: "task-1", channel: "telegram", recipient: "chat-1" });
  ledger.transition(record.id, "running");
  ledger.transition(record.id, "completed", { payload: { answer: 42 } });

  const restored = new DeliveryLedger(file);
  assert.equal(restored.undelivered().length, 1);
  assert.partialDeepStrictEqual(restored.get(record.id), {
    status: "completed",
    payload: { answer: 42 },
  });
  restored.transition(record.id, "acknowledged");
  assert.equal(restored.undelivered().length, 0);
});

test("learning produces a compatible SKILL.md and refines it after failure", () => {
  const root = mkdtempSync(join(tmpdir(), "kaki-skills-"));
  const store = new LearnedSkillStore(root);
  const learned = store.learn("book-court", {
    id: "trace-ok",
    goal: "Book a badminton court",
    locale: "sg",
    outcome: "success",
    steps: [
      { surface: "browser", action: "open", target: "ActiveSG" },
      { surface: "browser", action: "wait" },
      { surface: "browser", action: "wait" },
      { surface: "approval", action: "ask", target: "booking" },
    ],
  });
  assert.equal(learned.successfulSteps.length, 3);
  const refined = store.learn("book-court", {
    id: "trace-fail",
    goal: "Book a badminton court",
    locale: "sg",
    outcome: "failure",
    failure: "The date picker moved after a layout update.",
    steps: [],
  });
  assert.equal(refined.version, 2);
  assert.match(readFileSync(join(root, "book-court", "SKILL.md"), "utf8"), /learned\.book-court/u);
  assert.deepEqual(refined.failureNotes, ["The date picker moved after a layout update."]);
});

test("delegateTasks isolates failures while preserving task order", async () => {
  const result = await delegateTasks(
    [
      { name: "one", run: async () => 1 },
      { name: "bad", run: async () => Promise.reject(new Error("nope")) },
      { name: "three", run: async () => 3 },
    ],
    { concurrency: 2 },
  );
  assert.deepEqual(result, [
    { name: "one", ok: true, value: 1 },
    { name: "bad", ok: false, error: "nope" },
    { name: "three", ok: true, value: 3 },
  ]);
});

test("memory nudge warns when recall is empty", () => {
  assert.match(memoryNudge("mum's appointment", []), /Do not invent/u);
});
