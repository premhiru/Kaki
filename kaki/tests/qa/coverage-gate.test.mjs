import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { nodeCoverageTargets } from "../../scripts/qa/coverage.mjs";
import coverageConfig from "../../vitest.coverage.config.ts";

const kakiRoot = path.resolve(import.meta.dirname, "../..");

test("the TypeScript coverage gate cannot silently narrow its runtime scope", () => {
  const coverage = coverageConfig.test?.coverage;
  assert.deepEqual(coverage?.thresholds, {
    lines: 80,
    statements: 80,
    functions: 80,
    branches: 80,
  });
  assert.deepEqual(coverage?.reporter, ["text", "json-summary"]);

  const testIncludes = new Set(coverageConfig.test?.include ?? []);
  for (const required of [
    "kaki/apps/control-ui/tests/**/*.ui.test.tsx",
    "kaki/evals/**/*.test.ts",
    "kaki/scripts/**/*.test.ts",
  ]) {
    assert.ok(testIncludes.has(required), `missing coverage test discovery: ${required}`);
  }

  const includes = new Set(coverage?.include ?? []);
  for (const required of [
    "extensions/kaki/**/*.ts",
    "kaki/apps/control-ui/app/**/*.{ts,tsx}",
    "kaki/evals/**/*.ts",
    "kaki/scripts/**/*.ts",
  ]) {
    assert.ok(includes.has(required), `missing coverage scope: ${required}`);
  }

  for (const packageName of fs.readdirSync(path.join(kakiRoot, "packages"))) {
    const source = path.join(kakiRoot, "packages", packageName, "src");
    if (!fs.existsSync(source)) continue;
    const pattern = `kaki/packages/${packageName}/src/**/*.ts`;
    const nativeTarget = nodeCoverageTargets.find(
      (target) => target.name === packageName && target.include === "src/**/*.ts",
    );
    assert.ok(
      includes.has(pattern) || nativeTarget,
      `package source is outside coverage: ${packageName}`,
    );
  }

  const excludes = coverage?.exclude ?? [];
  assert.ok(excludes.includes("kaki/apps/control-ui/app/gateway.ts"));
  assert.ok(!excludes.some((entry) => /control-ui\/app\/\*|page\.tsx|layout\.tsx/u.test(entry)));
  assert.ok(!excludes.some((entry) => /extensions\/kaki/u.test(entry)));
  assert.ok(!excludes.some((entry) => /packages\/[^/]+\/src/u.test(entry)));

  assert.deepEqual(
    nodeCoverageTargets.map(({ name, include }) => ({ name, include })),
    [
      { name: "core", include: "src/**/*.ts" },
      { name: "memory", include: "src/**/*.ts" },
      { name: "control-ui-client", include: "app/gateway.ts" },
    ],
  );
});
