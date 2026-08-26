import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  LearnedSkillStore,
  memoryNudge,
  NightlyConsolidator,
  planReplay,
  repeatUsesFewerSteps,
  type LearningTrace,
} from "../src/learning/index.js";

test("successful novel trace mines stable selectors, screens, timings and replays fewer steps", () => {
  const root = mkdtempSync(join(tmpdir(), "kaki-learned-"));
  const store = new LearnedSkillStore(root, () => new Date("2026-08-24T00:00:00Z"));
  const trace: LearningTrace = {
    id: "trace-1",
    goal: "download utility bill",
    locale: "sg",
    outcome: "success",
    source: "browser",
    steps: [
      { surface: "browser", action: "open", target: "portal", durationMs: 900 },
      { surface: "browser", action: "wait", durationMs: 500 },
      { surface: "browser", action: "wait", durationMs: 700 },
      {
        surface: "browser",
        action: "click",
        target: "Bills",
        selector: { kind: "role", value: "link:Bills", confidence: 0.98 },
        screenFingerprint: "sha256:screen-bills",
        durationMs: 150,
      },
      { surface: "browser", action: "screenshot" },
      { surface: "browser", action: "screenshot" },
      {
        surface: "browser",
        action: "click",
        target: "Download",
        selector: { kind: "test-id", value: "download-bill" },
        durationMs: 120,
      },
    ],
  };
  const skill = store.learn("download-utility-bill", trace);
  const replay = planReplay(skill, trace.steps.length);
  assert.equal(repeatUsesFewerSteps(trace, skill), true);
  assert.ok(replay.expectedStepReduction >= 2);
  assert.equal(skill.selectorHints.length, 2);
  assert.deepEqual(skill.screenFingerprints, ["sha256:screen-bills"]);
  assert.ok(skill.timings.length >= 3);
  assert.equal(readFileSync(join(root, "download-utility-bill", "CURRENT"), "utf8").trim(), "1");
  assert.equal(
    existsSync(join(root, "download-utility-bill", "revisions", "v1", "SKILL.md")),
    true,
  );
});

test("failure annotation preserves the last screen and nightly consolidation is idempotent", () => {
  const root = mkdtempSync(join(tmpdir(), "kaki-consolidate-"));
  const store = new LearnedSkillStore(root);
  const consolidator = new NightlyConsolidator(store);
  const traces: LearningTrace[] = [
    {
      id: "ok",
      goal: "book court",
      locale: "sg",
      outcome: "success",
      steps: [
        { surface: "browser", action: "open" },
        { surface: "browser", action: "click", target: "slot" },
      ],
    },
    {
      id: "bad",
      goal: "book court",
      locale: "sg",
      outcome: "failure",
      failure: "date picker moved",
      steps: [
        {
          surface: "browser",
          action: "click",
          target: "old-date",
          screenshot: "fixture://changed.png",
        },
      ],
    },
  ];
  let slugCalls = 0;
  const slugFor = (): string => {
    slugCalls += 1;
    return "book-court";
  };
  const first = consolidator.run(traces, slugFor).skills[0]!;
  assert.equal(slugCalls, traces.length);
  assert.equal(first.failureAnnotations[0]?.screenshot, "fixture://changed.png");
  assert.equal(first.version, 2);
  const second = consolidator.run(traces, slugFor).skills[0]!;
  assert.equal(second.version, 2);
  assert.equal(second.provenance.length, 2);
});

test("learning writes reject secrets, arbitrary screenshot paths and accessor-backed traces", () => {
  const root = mkdtempSync(join(tmpdir(), "kaki-learning-schema-"));
  const store = new LearnedSkillStore(root);
  assert.throws(
    () =>
      store.learn("unsafe", {
        id: "unsafe",
        goal: "login password=hunter2",
        locale: "sg",
        outcome: "success",
        steps: [],
      }),
    /secret-rejected/u,
  );
  assert.throws(
    () =>
      store.learn("unsafe-screen", {
        id: "unsafe-screen",
        goal: "open portal",
        locale: "sg",
        outcome: "failure",
        failure: "changed",
        steps: [
          { surface: "browser", action: "click", screenshot: "C:\\Users\\person\\secret.png" },
        ],
      }),
    /screenshot-reference/u,
  );
  const trace = Object.defineProperty(
    { id: "getter", goal: "open portal", locale: "sg", outcome: "success" },
    "steps",
    { enumerable: true, get: () => [] },
  );
  assert.throws(() => store.learn("getter", trace), /learning-trace-invalid/u);
});

test("restart validates persisted learned-skill schema before replay", () => {
  const root = mkdtempSync(join(tmpdir(), "kaki-learning-restart-"));
  const store = new LearnedSkillStore(root);
  store.learn("restart-safe", {
    id: "restart-safe",
    goal: "download bill",
    locale: "sg",
    outcome: "success",
    steps: [{ surface: "browser", action: "open", target: "portal" }],
  });
  assert.equal(new LearnedSkillStore(root).load("restart-safe")?.version, 1);
  const file = join(root, "restart-safe", "skill.json");
  const corrupted = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  corrupted.version = "one";
  writeFileSync(file, JSON.stringify(corrupted), "utf8");
  assert.throws(() => new LearnedSkillStore(root).load("restart-safe"), /version-invalid/u);
});

test("memory nudge bounds model-visible recall and rejects credential-shaped text", () => {
  const nudge = memoryNudge(
    "x".repeat(500),
    Array.from({ length: 20 }, (_, index) => `fact-${index}-${"y".repeat(500)}`),
  );
  assert.ok(nudge.length < 1_200);
  assert.match(nudge, /fact-7/u);
  assert.doesNotMatch(nudge, /fact-8/u);
  assert.throws(() => memoryNudge("login", ["password=hunter2"]), /secret-rejected/u);
});
