import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { evaluateAssertion, readJson, root, walk } from "../../scripts/qa/lib.mjs";
import {
  readLiveEvidenceDirectory,
  validateLiveEvidence,
} from "../../scripts/qa/live-evidence.mjs";

const build = "0123456789abcdef0123456789abcdef01234567";
const now = new Date("2026-08-26T12:00:00Z");

function validLiveEvidence(overrides = {}) {
  return {
    schemaVersion: 1,
    liveId: "grab-ride",
    passed: true,
    fixtureMode: false,
    checkedAt: "2026-08-26T10:00:00Z",
    operator: "QA operator",
    build,
    notes: "Approval stopped before the irreversible step.",
    ...overrides,
  };
}

test("fixture assertion operators are deterministic", () => {
  const actual = { count: 5, list: ["rain"], nested: { value: "SBA1234A" }, missing: null };
  assert.equal(evaluateAssertion(actual, { path: "count", op: "gte", value: 5 }), true);
  assert.equal(evaluateAssertion(actual, { path: "list", op: "includes", value: "rain" }), true);
  assert.equal(
    evaluateAssertion(actual, { path: "nested.value", op: "matches", value: "^SBA" }),
    true,
  );
  assert.equal(evaluateAssertion(actual, { path: "missing", op: "absent" }), true);
  assert.equal(evaluateAssertion({ value: [] }, { path: "value", op: "eq", value: [] }), true);
});

test("all recorded fixture contracts satisfy their assertions", async () => {
  const files = await walk(path.join(root, "evals", "fixtures"), (file) => file.endsWith(".json"));
  assert.ok(files.length >= 10, "expected the section 20 fixture corpus");
  for (const file of files) {
    const fixture = await readJson(file);
    for (const assertion of fixture.assertions) {
      assert.equal(
        evaluateAssertion(fixture.expected, assertion),
        true,
        `${fixture.id}: ${assertion.path} ${assertion.op}`,
      );
    }
  }
});

test("acceptance manifest maps every section 20 criterion exactly once", async () => {
  const manifest = JSON.parse(
    await fs.readFile(path.join(root, "evals", "acceptance-manifest.json"), "utf8"),
  );
  assert.deepEqual(
    manifest.criteria.map((criterion) => criterion.id),
    Array.from({ length: 14 }, (_, index) => index + 1),
  );
});

test("live evidence rejects the permissive passed-only shape and head or freshness drift", () => {
  const cases = [
    [{ passed: true }, "schemaVersion must be 1"],
    [validLiveEvidence({ liveId: "paynow-2fa" }), "does not match grab-ride"],
    [validLiveEvidence({ passed: "yes" }), "passed must be a boolean"],
    [validLiveEvidence({ fixtureMode: true }), "fixtureMode must be false"],
    [validLiveEvidence({ checkedAt: "2026-08-26" }), "valid RFC 3339"],
    [validLiveEvidence({ checkedAt: "2026-08-01T10:00:00Z" }), "older than 168 hours"],
    [validLiveEvidence({ checkedAt: "2026-08-26T12:06:00Z" }), "five minutes in the future"],
    [validLiveEvidence({ operator: "" }), "operator must be a non-empty printable string"],
    [validLiveEvidence({ build: "0123456" }), "full lowercase 40-character Git SHA"],
    [
      validLiveEvidence({ build: "ffffffffffffffffffffffffffffffffffffffff" }),
      "does not match checked head",
    ],
  ];
  for (const [evidence, expected] of cases) {
    const errors = validateLiveEvidence(evidence, {
      expectedLiveId: "grab-ride",
      expectedBuild: build,
      now,
      maxAgeHours: 168,
    });
    assert.match(errors.join("\n"), new RegExp(expected));
  }
  for (const passed of [true, false])
    assert.deepEqual(
      validateLiveEvidence(validLiveEvidence({ passed }), {
        expectedLiveId: "grab-ride",
        expectedBuild: build,
        now,
        maxAgeHours: 168,
      }),
      [],
    );
});

test("live evidence directory rejects malformed, misnamed, and duplicate records", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "kaki-live-evidence-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(path.join(directory, "grab-ride.json"), JSON.stringify(validLiveEvidence()));
  await fs.writeFile(path.join(directory, "duplicate.json"), JSON.stringify(validLiveEvidence()));
  await fs.writeFile(path.join(directory, "paynow-2fa.json"), "{");

  const result = await readLiveEvidenceDirectory(directory, {
    expectedLiveIds: ["grab-ride", "paynow-2fa"],
    expectedBuild: build,
    now,
    maxAgeHours: 168,
  });
  assert.equal(result.evidenceById.size, 1);
  assert.match(result.errors.join("\n"), /filename must be grab-ride\.json/u);
  assert.match(result.errors.join("\n"), /duplicate evidence for grab-ride/u);
  assert.match(result.errors.join("\n"), /paynow-2fa\.json: invalid JSON/u);
});

test("release acceptance refuses recorded expected output without a runtime adapter", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/qa/acceptance-report.mjs", "--release", "--build", build],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /release acceptance requires --adapter <runtime-module>/u);
});

test("strict replay executes every fixture through the production runtime adapter", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "scripts/qa/replay-fixtures.mjs",
      "--adapter",
      "evals/runtime-adapter.ts",
      "--strict-runtime",
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Fixture replay: 16 passed, 0 failed against runtime adapter\./u);
  assert.doesNotMatch(result.stdout, /as recorded contracts/u);
});

test("locale scoring executes the normaliser and ignores recorded actual labels", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "kaki-locale-score-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.cp(path.join(root, "evals", "locales"), directory, { recursive: true });
  const sample = path.join(directory, "sg-en.jsonl");
  const lines = (await fs.readFile(sample, "utf8")).trimEnd().split(/\r?\n/u);
  const first = JSON.parse(lines[0]);
  first.actual = { intent: "fabricated", language: "fabricated", register: "fabricated" };
  lines[0] = JSON.stringify(first);
  await fs.writeFile(sample, `${lines.join("\n")}\n`, "utf8");

  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/qa/locale-score.mjs", "--dir", directory],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /sg\/en \| 200 \| 100\.0%/u);
  assert.match(result.stdout, /vn\/en \| 200 \| 100\.0%/u);
});
