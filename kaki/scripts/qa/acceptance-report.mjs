#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { evaluateAssertion, fail, parseArgs, readJson, root, walk } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const release = Boolean(args.release);
const manifest = await readJson(path.join(root, "evals", "acceptance-manifest.json"));
const fixtureFiles = await walk(path.join(root, "evals", "fixtures"), (file) =>
  file.endsWith(".json"),
);
const fixtures = new Map();
for (const file of fixtureFiles) {
  const fixture = await readJson(file);
  fixtures.set(fixture.id, fixture);
}

const rows = [];
for (const criterion of manifest.criteria) {
  const notes = [];
  let ci = "pass";
  for (const id of criterion.fixtures) {
    const fixture = fixtures.get(id);
    if (!fixture) {
      ci = "fail";
      notes.push(`missing fixture ${id}`);
      continue;
    }
    const failed = fixture.assertions.filter(
      (assertion) => !evaluateAssertion(fixture.expected, assertion),
    );
    if (failed.length) {
      ci = "fail";
      notes.push(`${id}: ${failed.length} contract assertion(s) fail`);
    }
  }
  for (const evidence of criterion.evidence ?? []) {
    try {
      await fs.access(path.join(root, evidence));
    } catch {
      ci = "fail";
      notes.push(`missing ${evidence}`);
    }
  }
  let live = criterion.liveRequired ? "pending" : "n/a";
  if (criterion.liveRequired) {
    try {
      const evidence = await readJson(
        path.join(root, "artifacts", "live", `${criterion.liveId}.json`),
      );
      live = evidence.passed === true && evidence.fixtureMode !== true ? "pass" : "fail";
      if (live === "fail") notes.push("live evidence did not record a real passing run");
    } catch {
      notes.push("live verification pending");
    }
  }
  rows.push({ id: criterion.id, name: criterion.name, ci, live, notes });
}

process.stdout.write("DoD | CI | Live | Acceptance criterion\n");
process.stdout.write("--- | --- | --- | ---\n");
for (const row of rows)
  process.stdout.write(
    `${row.id} | ${row.ci} | ${row.live} | ${row.name}${row.notes.length ? ` — ${row.notes.join("; ")}` : ""}\n`,
  );

const ciFailures = rows.filter((row) => row.ci !== "pass");
const liveFailures = rows.filter((row) => row.live !== "pass" && row.live !== "n/a");
if (ciFailures.length || (release && liveFailures.length)) {
  fail(
    `Acceptance gate failed: ${ciFailures.length} CI criterion/criteria and ${liveFailures.length} pending/failed live criterion/criteria.`,
  );
} else {
  process.stdout.write(
    release
      ? "Release acceptance gate passed.\n"
      : `CI acceptance contracts passed; ${liveFailures.length} live criterion/criteria remain.\n`,
  );
}
