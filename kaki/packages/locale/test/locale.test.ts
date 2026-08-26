import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadLocalePack, normaliseLocaleMessage, type LocaleCode } from "../src/index.js";

const packageRoot = path.resolve(import.meta.dirname, "..");
const repositoryRoot = path.resolve(packageRoot, "../..");
const mainLocales: LocaleCode[] = ["sg", "my", "id", "th", "vn", "ph"];

describe("locale pack contract", () => {
  it("loads every main pack and the Myanmar/Cambodia stubs", async () => {
    for (const code of [...mainLocales, "mm", "kh"] as LocaleCode[]) {
      const pack = await loadLocalePack(code, packageRoot);
      expect(pack.code).toBe(code);
      expect(pack.persona.length).toBeGreaterThan(100);
      expect(pack.calendar.timezone).toBeTruthy();
      expect(pack.channels).toHaveProperty("priority");
      expect(pack.channels.defaultModels.generate?.length).toBeGreaterThan(0);
    }
  });

  it("meets lexicon volume requirements", async () => {
    expect((await loadLocalePack("sg", packageRoot)).lexicon.entries.length).toBeGreaterThanOrEqual(
      600,
    );
    for (const code of mainLocales.filter((item) => item !== "sg")) {
      expect(
        (await loadLocalePack(code, packageRoot)).lexicon.entries.length,
      ).toBeGreaterThanOrEqual(200);
    }
  });

  it("normalises Singapore code-switching without losing modifiers", async () => {
    const pack = await loadLocalePack("sg", packageRoot);
    const result = normaliseLocaleMessage("eh kopi-C siew dai peng can or not lah", pack);
    expect(result.language).toBe("singlish");
    expect(result.intent).toBe("food.order");
    expect(result.codeSwitch).toContain("kopi-C siew dai peng");
    expect(result.intentText).toContain("less sugar");
  });

  it("preserves all audience registers at the public normalisation boundary", async () => {
    const pack = await loadLocalePack("sg", packageRoot);
    const cases = [
      ["please check the weather", "peer"],
      ["Uncle, please check the weather", "elder"],
      ["Kid, please check the weather", "child"],
      ["Boss, please check the weather", "contractor"],
      ["Sir, formally check the weather", "official"],
      ["Teacher, please check the weather", "school"],
      ["Bank officer, please check the weather", "bank"],
      ["HR, please check the weather", "employer"],
    ] as const;
    for (const [utterance, register] of cases)
      expect(normaliseLocaleMessage(utterance, pack).register).toBe(register);
  });

  it("meets every advertised language corpus and replays its expected labels", async () => {
    const evalDirectory = path.join(repositoryRoot, "evals", "locales");
    const files = (await fs.readdir(evalDirectory)).filter((file) => file.endsWith(".jsonl"));
    let count = 0;
    const counts = new Map<string, number>();
    const registers = new Set<string>();
    const failures: string[] = [];
    for (const file of files) {
      const rows = (await fs.readFile(path.join(evalDirectory, file), "utf8"))
        .split(/\r?\n/u)
        .filter(Boolean)
        .map(
          (line) =>
            JSON.parse(line) as {
              locale: LocaleCode;
              utterance: string;
              language: string;
              expected: { intent: string; language: string; register: string };
              provenance: string;
              humanReviewed: boolean;
              actual?: unknown;
            },
        );
      const pack = await loadLocalePack(rows[0]!.locale, packageRoot);
      for (const [index, row] of rows.entries()) {
        const actual = normaliseLocaleMessage(row.utterance, pack);
        const labels = {
          intent: actual.intent,
          language: actual.language,
          register: actual.register,
        };
        if (JSON.stringify(labels) !== JSON.stringify(row.expected)) {
          failures.push(`${file}:${index + 1}: label mismatch`);
        }
        if (row.provenance !== "deterministic-template-v2") {
          failures.push(`${file}:${index + 1}: invalid provenance`);
        }
        if (row.humanReviewed) {
          failures.push(`${file}:${index + 1}: fixture must not claim human review`);
        }
        if (row.actual !== undefined) {
          failures.push(`${file}:${index + 1}: fixture embeds actual output`);
        }
        const key = `${row.locale}:${row.language}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        registers.add(row.expected.register);
        count += 1;
      }
    }
    expect(failures).toEqual([]);
    for (const code of mainLocales) {
      const pack = await loadLocalePack(code, packageRoot);
      const manifest = JSON.parse(
        await fs.readFile(path.join(packageRoot, code, "eval", "manifest.json"), "utf8"),
      ) as { datasets: string[] };
      expect(manifest.datasets).toHaveLength(pack.channels.languages.length);
      for (const language of pack.channels.languages) {
        expect(counts.get(`${code}:${language}`)).toBeGreaterThanOrEqual(200);
        expect(manifest.datasets).toContain(`../../../evals/locales/${code}-${language}.jsonl`);
      }
    }
    expect(registers).toEqual(
      new Set(["peer", "elder", "child", "contractor", "official", "school", "bank", "employer"]),
    );
    expect(count).toBe(3_600);
  });
});
