#!/usr/bin/env node
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const kakiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = path.resolve(kakiRoot, "..");
export const nodeCoverageTargets = [
  { name: "core", root: path.join(kakiRoot, "packages/core"), include: "src/**/*.ts" },
  { name: "memory", root: path.join(kakiRoot, "packages/memory"), include: "src/**/*.ts" },
  {
    name: "control-ui-client",
    root: path.join(kakiRoot, "apps/control-ui"),
    include: "app/gateway.ts",
    tests: ["tests/gateway-client.test.ts"],
  },
];

async function run(command, args, options = {}) {
  await new Promise((resolvePromise, reject) => {
    const output = [];
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? process.env,
      shell: false,
      stdio: options.logFile ? ["inherit", "pipe", "inherit"] : "inherit",
    });
    child.stdout?.on("data", (chunk) => {
      output.push(chunk);
      process.stdout.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      void (async () => {
        if (options.logFile) {
          await fs.mkdir(path.dirname(options.logFile), { recursive: true });
          await fs.writeFile(options.logFile, Buffer.concat(output));
        }
        if (code === 0) resolvePromise();
        else reject(new Error(`${command} exited ${code ?? signal ?? "without status"}`));
      })().catch(reject);
    });
  });
}

async function main() {
  await fs.rm(path.join(repoRoot, ".artifacts/kaki-coverage"), { recursive: true, force: true });

  await run(
    process.execPath,
    ["scripts/run-vitest.mjs", "run", "--config", "kaki/vitest.coverage.config.ts", "--coverage"],
    {
      // The aggregate instruments every Kaki package plus plugin/UI source and can
      // legitimately spend more than two minutes transforming on Windows CI hosts.
      env: {
        ...process.env,
        OPENCLAW_VITEST_MAX_WORKERS: "1",
        OPENCLAW_VITEST_NO_OUTPUT_TIMEOUT_MS: "300000",
      },
    },
  );

  for (const target of nodeCoverageTargets) {
    const testFiles =
      target.tests ??
      (await fs.readdir(path.join(target.root, "test"), { recursive: true }))
        .filter((entry) => entry.endsWith(".test.ts"))
        .map((entry) => path.join("test", entry).replaceAll(path.sep, "/"))
        .sort();
    if (testFiles.length === 0) throw new Error(`No TypeScript tests found for ${target.name}`);
    await run(
      process.execPath,
      [
        "--import",
        "tsx",
        "--experimental-test-coverage",
        `--test-coverage-include=${target.include}`,
        "--test-coverage-exclude=src/**/*.d.ts",
        "--test-coverage-lines=80",
        "--test-coverage-branches=80",
        "--test-coverage-functions=80",
        "--test",
        ...testFiles,
      ],
      {
        cwd: target.root,
        logFile: path.join(repoRoot, ".artifacts/kaki-coverage", `${target.name}.txt`),
      },
    );
  }

  process.stdout.write(
    "Kaki TypeScript coverage passed at >=80% lines, statements, functions, and branches for Vitest packages/plugin/RSC UI and >=80% lines, functions, and branches for node:test core, memory, and the Control UI Gateway client. UI build/render/package checks remain mandatory supplementary boundary proof.\n",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
