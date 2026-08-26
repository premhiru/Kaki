#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { loadLocalePack, normaliseLocaleMessage } from "../../packages/locale/src/index.js";
import { fail, parseArgs, root, walk } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const inputRoot = path.resolve(root, args.dir ?? "evals/locales");
const localeRoot = path.join(root, "packages", "locale");
const files = await walk(inputRoot, (file) => file.endsWith(".jsonl"));
const rows = [];
const seenIds = new Set();
for (const file of files) {
  const lines = (await fs.readFile(file, "utf8")).split(/\r?\n/u).filter((line) => line.trim());
  for (const [index, line] of lines.entries()) {
    try {
      const row = JSON.parse(line);
      if (!row.id || !row.locale || !row.language || !row.utterance || !row.expected)
        throw new Error("missing id, locale, language, utterance, or expected");
      if (seenIds.has(row.id)) throw new Error(`duplicate id ${row.id}`);
      seenIds.add(row.id);
      rows.push(row);
    } catch (error) {
      throw new Error(`${path.relative(root, file)}:${index + 1}: ${error.message}`);
    }
  }
}

const groups = new Map();
const packs = new Map();
for (const row of rows) {
  let pack = packs.get(row.locale);
  if (!pack) {
    pack = await loadLocalePack(row.locale, localeRoot);
    packs.set(row.locale, pack);
  }
  const actual = normaliseLocaleMessage(row.utterance, pack);
  const key = `${row.locale}/${row.language}`;
  const group = groups.get(key) ?? {
    locale: row.locale,
    language: row.language,
    total: 0,
    intent: 0,
    languageCorrect: 0,
    register: 0,
  };
  group.total += 1;
  group.intent += Number(row.expected.intent === actual.intent);
  group.languageCorrect += Number(row.expected.language === actual.language);
  group.register += Number(row.expected.register === actual.register);
  groups.set(key, group);
}

const required = await loadRequiredLocaleLanguages(localeRoot);
const summary = {
  generatedAt: new Date().toISOString(),
  minimumCasesPerLanguage: 200,
  groups: [],
  passed: true,
};
for (const [locale, languages] of Object.entries(required)) {
  for (const language of languages) {
    const group = groups.get(`${locale}/${language}`) ?? {
      locale,
      language,
      total: 0,
      intent: 0,
      languageCorrect: 0,
      register: 0,
    };
    const scored = {
      locale,
      language,
      total: group.total,
      intentAccuracy: ratio(group.intent, group.total),
      languageAccuracy: ratio(group.languageCorrect, group.total),
      registerAccuracy: ratio(group.register, group.total),
      requiredIntentAccuracy: locale === "sg" ? 0.9 : 0.8,
      requiredRegisterAccuracy: 0.85,
    };
    scored.passed =
      scored.total >= 200 &&
      scored.intentAccuracy >= scored.requiredIntentAccuracy &&
      scored.languageAccuracy >= scored.requiredIntentAccuracy &&
      scored.registerAccuracy >= scored.requiredRegisterAccuracy;
    if (!scored.passed) summary.passed = false;
    summary.groups.push(scored);
  }
}

process.stdout.write("Locale/language | Cases | Intent | Language | Register | Result\n");
process.stdout.write("--- | ---: | ---: | ---: | ---: | ---\n");
for (const group of summary.groups)
  process.stdout.write(
    `${group.locale}/${group.language} | ${group.total} | ${pct(group.intentAccuracy)} | ${pct(group.languageAccuracy)} | ${pct(group.registerAccuracy)} | ${group.passed ? "pass" : "fail"}\n`,
  );

if (args.out) {
  const output = path.resolve(root, args.out);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}
if (!summary.passed) fail("Locale evaluation thresholds were not met.");

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}
function pct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

async function loadRequiredLocaleLanguages(directory) {
  const required = {};
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries.toSorted((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory()) continue;
    try {
      const channels = JSON.parse(
        await fs.readFile(path.join(directory, entry.name, "channels.json"), "utf8"),
      );
      const manifest = JSON.parse(
        await fs.readFile(path.join(directory, entry.name, "eval", "manifest.json"), "utf8"),
      );
      if (!Array.isArray(channels.languages) || !Array.isArray(manifest.datasets)) continue;
      const languages = channels.languages.filter((language) =>
        manifest.datasets.includes(`../../../evals/locales/${entry.name}-${language}.jsonl`),
      );
      if (languages.length) required[entry.name] = languages;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return required;
}
