import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { evaluateAssertion, readJson, root, walk } from "../../scripts/qa/lib.mjs";

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
