#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { defaultConfig, kakiPaths, type KakiConfig } from "./config/index.js";

const [command = "help", ...args] = process.argv.slice(2);

try {
  switch (command) {
    case "onboard":
      onboard(args);
      break;
    case "status":
      status(args);
      break;
    case "config":
      config(args);
      break;
    case "help":
    case "--help":
    case "-h":
      help();
      break;
    case "--version":
    case "-v":
      console.log("kaki 0.1.0");
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(`kaki: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

function onboard(args: readonly string[]): void {
  const paths = kakiPaths();
  const config: KakiConfig = {
    ...defaultConfig(),
    locale: readOption(args, "--locale") ?? "sg",
    extraChannels: args.includes("--enable-extra-channels"),
  };
  mkdirSync(dirname(paths.config), { recursive: true });
  mkdirSync(paths.delivery, { recursive: true });
  mkdirSync(paths.skills, { recursive: true });
  mkdirSync(paths.traces, { recursive: true });
  if (existsSync(paths.config) && !args.includes("--force")) {
    throw new Error(`${paths.config} already exists; pass --force to replace it`);
  }
  const temporary = `${paths.config}.${String(process.pid)}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  renameSync(temporary, paths.config);
  console.log(`Kaki is initialised at ${paths.home}`);
}

function status(args: readonly string[]): void {
  const paths = kakiPaths();
  const configured = existsSync(paths.config);
  let config: KakiConfig | undefined;
  if (configured) config = JSON.parse(readFileSync(paths.config, "utf8")) as KakiConfig;
  const report = {
    ok: configured,
    home: paths.home,
    config: configured ? "ready" : "missing",
    locale: config?.locale ?? null,
    deep: args.includes("--deep"),
    checks: args.includes("--deep")
      ? {
          gateway: "not-configured",
          whatsapp: "not-configured",
          telegram: "not-configured",
          phone: "not-configured",
          browser: "not-configured",
          models: "not-configured",
          asr: "not-configured",
        }
      : undefined,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

function config(args: readonly string[]): void {
  if (args[0] !== "path") throw new Error("Usage: kaki config path");
  console.log(kakiPaths().config);
}

function readOption(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("-")) throw new Error(`${name} requires a value`);
  return value;
}

function help(): void {
  console.log(`Kaki household agent

Usage:
  kaki onboard [--locale sg] [--enable-extra-channels] [--force]
  kaki status [--deep]
  kaki config path

Environment:
  KAKI_HOME  Runtime state directory (default: ~/.kaki)`);
}
