#!/usr/bin/env node
import path from "node:path";
import { fail, formatRelative, readJson, root, walk } from "./lib.mjs";

const allowedModes = new Set(["recorded", "synthetic", "live"]);
const allowedOps = new Set([
  "eq",
  "oneOf",
  "gte",
  "lte",
  "lengthGte",
  "matches",
  "absent",
  "notContains",
  "includes",
]);
const fixtureRoot = path.join(root, "evals", "fixtures");
const files = await walk(fixtureRoot, (file) => file.endsWith(".json"));
const ids = new Set();
let errors = 0;

for (const file of files) {
  const rel = formatRelative(file);
  let fixture;
  try {
    fixture = await readJson(file);
  } catch (error) {
    fail(`${rel}: invalid JSON: ${error.message}`);
    errors += 1;
    continue;
  }
  const required = [
    "schemaVersion",
    "id",
    "criterion",
    "mode",
    "description",
    "implementationTarget",
    "input",
    "expected",
    "assertions",
  ];
  for (const key of required) {
    if (!(key in fixture)) {
      fail(`${rel}: missing ${key}`);
      errors += 1;
    }
  }
  if (fixture.schemaVersion !== 1) {
    fail(`${rel}: schemaVersion must be 1`);
    errors += 1;
  }
  if (ids.has(fixture.id)) {
    fail(`${rel}: duplicate id ${fixture.id}`);
    errors += 1;
  }
  ids.add(fixture.id);
  if (!Number.isInteger(fixture.criterion) || fixture.criterion < 1 || fixture.criterion > 14) {
    fail(`${rel}: criterion must be an integer from 1 to 14`);
    errors += 1;
  }
  if (!allowedModes.has(fixture.mode)) {
    fail(`${rel}: mode must be recorded, synthetic, or live`);
    errors += 1;
  }
  if (!Array.isArray(fixture.assertions) || fixture.assertions.length === 0) {
    fail(`${rel}: assertions must be a non-empty array`);
    errors += 1;
  } else {
    for (const [index, assertion] of fixture.assertions.entries()) {
      if (typeof assertion.path !== "string" || !allowedOps.has(assertion.op)) {
        fail(`${rel}: assertions[${index}] has an invalid path or op`);
        errors += 1;
      }
    }
  }
  const serialized = JSON.stringify(fixture);
  for (const marker of ["sk_live_", "ghp_", "BEGIN PRIVATE KEY", "xoxb-"]) {
    if (serialized.includes(marker)) {
      fail(`${rel}: contains credential marker ${marker}`);
      errors += 1;
    }
  }
}

if (files.length === 0) {
  fail("No fixture files found under evals/fixtures");
  errors += 1;
}
if (errors === 0)
  process.stdout.write(`Validated ${files.length} fixtures (${ids.size} unique ids).\n`);
