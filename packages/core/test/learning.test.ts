import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  LearnedSkillStore,
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
  const first = consolidator.run(traces, () => "book-court").skills[0]!;
  assert.equal(first.failureAnnotations[0]?.screenshot, "fixture://changed.png");
  assert.equal(first.version, 2);
  const second = consolidator.run(traces, () => "book-court").skills[0]!;
  assert.equal(second.version, 2);
  assert.equal(second.provenance.length, 2);
});
