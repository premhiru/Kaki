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

  it("replays every generated eval through the implemented normaliser", async () => {
    const evalDirectory = path.join(repositoryRoot, "evals", "locales");
    const files = (await fs.readdir(evalDirectory)).filter((file) => file.endsWith(".jsonl"));
    let count = 0;
    for (const file of files) {
      const rows = (await fs.readFile(path.join(evalDirectory, file), "utf8"))
        .split(/\r?\n/u)
        .filter(Boolean)
        .map(
          (line) =>
            JSON.parse(line) as {
              locale: LocaleCode;
              utterance: string;
              actual: { intent: string; language: string; register: string };
            },
        );
      const pack = await loadLocalePack(rows[0]!.locale, packageRoot);
      for (const row of rows) {
        const actual = normaliseLocaleMessage(row.utterance, pack);
        expect({
          intent: actual.intent,
          language: actual.language,
          register: actual.register,
        }).toEqual(row.actual);
        count += 1;
      }
    }
    expect(count).toBe(2_000);
  });
});
