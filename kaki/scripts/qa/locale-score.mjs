#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fail, parseArgs, root, walk } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const inputRoot = path.resolve(root, args.dir ?? "evals/locales");
const files = await walk(inputRoot, (file) => file.endsWith(".jsonl"));
const rows = [];
for (const file of files) {
  const lines = (await fs.readFile(file, "utf8")).split(/\r?\n/u).filter((line) => line.trim());
  for (const [index, line] of lines.entries()) {
    try {
      const row = JSON.parse(line);
      if (!row.id || !row.locale || !row.language || !row.expected || !row.actual)
        throw new Error("missing id, locale, language, expected, or actual");
      rows.push(row);
    } catch (error) {
      throw new Error(`${path.relative(root, file)}:${index + 1}: ${error.message}`);
    }
  }
}

const groups = new Map();
for (const row of rows) {
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
  group.intent += Number(row.expected.intent === row.actual.intent);
  group.languageCorrect += Number(row.expected.language === row.actual.language);
  group.register += Number(row.expected.register === row.actual.register);
  groups.set(key, group);
}

const required = {
  sg: ["en", "singlish", "zh", "ms", "ta"],
  my: ["ms"],
  id: ["id"],
  th: ["th"],
  vn: ["vi"],
  ph: ["fil"],
};
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
