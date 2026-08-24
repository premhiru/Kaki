#!/usr/bin/env node
import path from "node:path";
import {
  evaluateAssertion,
  fail,
  formatRelative,
  parseArgs,
  readJson,
  root,
  walk,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const fixtureRoot = path.resolve(root, args.dir ?? "evals/fixtures");
const files = await walk(fixtureRoot, (file) => file.endsWith(".json"));
let adapter;
if (args.adapter) {
  const imported = await import(pathToFileUrl(path.resolve(root, args.adapter)));
  if (typeof imported.executeFixture !== "function")
    throw new Error("Fixture adapter must export executeFixture(fixture)");
  adapter = imported.executeFixture;
}
if (args["strict-runtime"] && !adapter)
  throw new Error("--strict-runtime requires --adapter <module>");

let passed = 0;
let failed = 0;
for (const file of files) {
  const fixture = await readJson(file);
  if (args.tag && !fixture.tags?.includes(args.tag)) continue;
  const actual = adapter ? await adapter(structuredClone(fixture)) : fixture.expected;
  const failures = fixture.assertions.filter((assertion) => !evaluateAssertion(actual, assertion));
  if (failures.length) {
    failed += 1;
    fail(
      `FAIL ${fixture.id} (${formatRelative(file)}): ${failures.map((item) => `${item.path} ${item.op}`).join(", ")}`,
    );
  } else {
    passed += 1;
    process.stdout.write(`PASS ${fixture.id}\n`);
  }
}
process.stdout.write(
  `Fixture replay: ${passed} passed, ${failed} failed${adapter ? " against runtime adapter" : " as recorded contracts"}.\n`,
);

function pathToFileUrl(file) {
  return new URL(`file:///${file.replaceAll("\\", "/")}`).href;
}
