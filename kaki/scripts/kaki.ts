#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

type KakiConfig = {
  locale: string;
  timezone: string;
  householdName: string;
  moneyAutoCapSgd: number;
  walletCapSgd: number;
  whatsapp: { enabled: boolean; authDir: string };
  telegram: { enabled: boolean };
  phone: { enabled: boolean; endpoint?: string };
  chrome: { enabled: boolean; profileDir: string };
  models: { provider: string; asr: string };
};

const root = process.env.KAKI_HOME ?? join(homedir(), ".kaki");
const configPath = join(root, "config.json");

function loadConfig(): KakiConfig | undefined {
  if (!existsSync(configPath)) return undefined;
  return JSON.parse(readFileSync(configPath, "utf8")) as KakiConfig;
}

async function onboard(nonInteractive: boolean) {
  mkdirSync(root, { recursive: true });
  mkdirSync(join(root, "wa"), { recursive: true });
  mkdirSync(join(root, "chrome"), { recursive: true });
  mkdirSync(join(root, "traces"), { recursive: true });
  let householdName = process.env.KAKI_HOUSEHOLD_NAME ?? "My household";
  let locale = process.env.KAKI_LOCALE ?? "sg";
  if (!nonInteractive && stdin.isTTY) {
    const prompt = createInterface({ input: stdin, output: stdout });
    householdName = (await prompt.question(`Household name [${householdName}]: `)) || householdName;
    locale = (await prompt.question(`Locale [${locale}]: `)) || locale;
    prompt.close();
  }
  const config: KakiConfig = {
    locale,
    timezone: locale === "sg" ? "Asia/Singapore" : "Asia/Singapore",
    householdName,
    moneyAutoCapSgd: Number(process.env.KAKI_MONEY_AUTO_CAP_SGD ?? 30),
    walletCapSgd: Number(process.env.KAKI_WALLET_CAP_SGD ?? 200),
    whatsapp: { enabled: true, authDir: join(root, "wa") },
    telegram: { enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN) },
    phone: {
      enabled: Boolean(process.env.KAKI_PHONE_ENDPOINT),
      ...(process.env.KAKI_PHONE_ENDPOINT ? { endpoint: process.env.KAKI_PHONE_ENDPOINT } : {}),
    },
    chrome: { enabled: true, profileDir: join(root, "chrome") },
    models: {
      provider: process.env.KAKI_MODEL_PROVIDER ?? "openai",
      asr: process.env.KAKI_ASR_PROVIDER ?? "whisper-fallback",
    },
  };
  writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
  console.log(`Kaki configured at ${configPath}`);
  console.log("Next: run `kaki wa link`, pair the phone node, then `kaki status --deep`.");
}

function status(deep: boolean) {
  const config = loadConfig();
  if (!config) {
    console.error("Kaki is not onboarded. Run `kaki onboard`.");
    process.exitCode = 2;
    return;
  }
  const checks = [
    ["config", true, configPath],
    ["WhatsApp auth", existsSync(config.whatsapp.authDir), config.whatsapp.authDir],
    ["Telegram", config.telegram.enabled, config.telegram.enabled ? "configured" : "token missing"],
    ["Phone node", config.phone.enabled, config.phone.endpoint ?? "not paired"],
    ["Chrome", existsSync(config.chrome.profileDir), config.chrome.profileDir],
    ["Models", Boolean(config.models.provider), config.models.provider],
    ["ASR", Boolean(config.models.asr), config.models.asr],
  ] as const;
  for (const [name, ok, detail] of checks) console.log(`${ok ? "✓" : "!"} ${name}: ${detail}`);
  if (deep && checks.some(([, ok]) => !ok)) process.exitCode = 1;
}

function usage() {
  console.log(
    "kaki onboard [--non-interactive] | status [--deep] | backup <dir> | restore <dir> | wa relink",
  );
}

function backup(destination: string | undefined) {
  if (!destination) throw new Error("backup-destination-required");
  if (!existsSync(root)) throw new Error("kaki-not-onboarded");
  const target = join(destination, `kaki-backup-${new Date().toISOString().slice(0, 10)}`);
  mkdirSync(target, { recursive: true });
  cpSync(root, target, { recursive: true, errorOnExist: true });
  console.log(
    `Configuration and household state backed up to ${target}. Protect this directory as sensitive.`,
  );
}

function restore(source: string | undefined) {
  if (!source || !existsSync(source)) throw new Error("restore-source-not-found");
  const resolvedSource = realpathSync(source);
  const resolvedRoot = resolve(root);
  const resolvedRootParent = resolve(root, "..");
  if (
    resolvedSource === resolvedRoot ||
    resolvedSource.startsWith(`${resolvedRoot}${sep}`) ||
    resolvedRootParent.startsWith(`${resolvedSource}${sep}`)
  )
    throw new Error("unsafe-restore-path");
  mkdirSync(root, { recursive: true });
  cpSync(resolvedSource, root, { recursive: true, force: false, errorOnExist: true });
  console.log(`Kaki state restored from ${resolvedSource}. Existing files were not overwritten.`);
}

const [command, subcommand, ...rest] = process.argv.slice(2);
if (command === "onboard") await onboard([subcommand, ...rest].includes("--non-interactive"));
else if (command === "status") status([subcommand, ...rest].includes("--deep"));
else if (command === "backup") backup(subcommand);
else if (command === "restore") restore(subcommand);
else if (command === "wa" && [subcommand, ...rest].includes("relink"))
  console.log(`WhatsApp relink requested. Auth directory: ${join(root, "wa")}`);
else usage();
