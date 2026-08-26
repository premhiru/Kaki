#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { evaluateAssertion, fail, parseArgs, readJson, root, walk } from "./lib.mjs";
import { readLiveEvidenceDirectory } from "./live-evidence.mjs";

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

let adapter;
if (args.adapter) {
  const imported = await import(pathToFileUrl(path.resolve(root, args.adapter)));
  if (typeof imported.executeFixture !== "function")
    throw new Error("Runtime adapter must export executeFixture(fixture)");
  adapter = imported.executeFixture;
}

const globalErrors = [];
if (release && !adapter)
  globalErrors.push("release acceptance requires --adapter <runtime-module>");
const liveCriteria = manifest.criteria.filter((criterion) => criterion.liveRequired);
const liveIds = liveCriteria.map((criterion) => criterion.liveId);
if (new Set(liveIds).size !== liveIds.length)
  globalErrors.push("acceptance manifest contains duplicate liveId values");
const expectedBuild = resolveBuild(args.build);
if (!/^[0-9a-f]{40}$/u.test(expectedBuild))
  globalErrors.push("checked build must be a full lowercase 40-character Git SHA");
const maxAgeHours = Number(manifest.liveEvidenceMaxAgeHours);
if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0)
  globalErrors.push("acceptance manifest liveEvidenceMaxAgeHours must be positive");
const liveEvidence = await readLiveEvidenceDirectory(path.join(root, "artifacts", "live"), {
  expectedLiveIds: liveIds,
  expectedBuild,
  maxAgeHours,
});
globalErrors.push(...liveEvidence.errors);

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
    if (release && !adapter) {
      ci = "fail";
      notes.push(`${id}: runtime adapter required`);
      continue;
    }
    let actual;
    try {
      actual = adapter ? await adapter(structuredClone(fixture)) : fixture.expected;
    } catch (error) {
      ci = "fail";
      notes.push(`${id}: runtime adapter failed: ${formatError(error)}`);
      continue;
    }
    const failed = fixture.assertions.filter((assertion) => !evaluateAssertion(actual, assertion));
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
    const evidence = liveEvidence.evidenceById.get(criterion.liveId);
    if (evidence) {
      live = evidence.passed ? "pass" : "fail";
      if (!evidence.passed) notes.push("live evidence records a failed run");
    } else notes.push("live verification pending or invalid");
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
for (const error of globalErrors) fail(`Acceptance evidence error: ${error}`);
if (globalErrors.length || ciFailures.length || (release && liveFailures.length)) {
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

function resolveBuild(configured) {
  const build = configured ?? process.env.KAKI_BUILD_SHA;
  if (build) return build;
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

function pathToFileUrl(file) {
  return new URL(`file:///${file.replaceAll("\\", "/")}`).href;
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
