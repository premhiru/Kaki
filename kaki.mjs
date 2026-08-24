#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const UPSTREAM_COMMIT = "ccc10bf0983219b63c09078987cb02222147e0a1";

const configuredHome = process.env.KAKI_HOME?.trim();
const kakiHome = path.resolve(configuredHome || path.join(os.homedir(), ".kaki"));

process.env.OPENCLAW_STATE_DIR ||= kakiHome;
process.env.OPENCLAW_CONFIG_PATH ||= path.join(kakiHome, "kaki.json");

const versionArg = process.argv.length === 3 && ["-v", "-V", "--version"].includes(process.argv[2]);
if (versionArg) {
  const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
  process.stdout.write(`Kaki ${packageJson.version} (OpenClaw ${UPSTREAM_COMMIT.slice(0, 7)})\n`);
} else {
  const launcherPath = fileURLToPath(new URL("./openclaw.mjs", import.meta.url));
  const child = spawn(process.execPath, [launcherPath, ...process.argv.slice(2)], {
    env: process.env,
    stdio: "inherit",
  });
  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  if (result.signal) {
    process.kill(process.pid, result.signal);
  } else {
    process.exitCode = result.code ?? 1;
  }
}
