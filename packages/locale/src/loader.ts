import fs from "node:fs/promises";
import path from "node:path";
import type { CalendarEvent, LexiconFile, LocaleCode, LocalePack } from "./types.js";

export async function loadLocalePack(
  code: LocaleCode,
  packagesRoot = path.resolve(import.meta.dirname, ".."),
): Promise<LocalePack> {
  const directory = path.join(packagesRoot, code);
  const [persona, lexicon, calendar, formats, dietary, channels] = await Promise.all([
    fs.readFile(path.join(directory, "persona.md"), "utf8"),
    readJson<LexiconFile>(path.join(directory, "lexicon.json")),
    readJson<{ locale: LocaleCode; timezone: string; events: CalendarEvent[] }>(
      path.join(directory, "calendar.json"),
    ),
    readJson<Record<string, unknown>>(path.join(directory, "formats.json")),
    readJson<Record<string, unknown>>(path.join(directory, "dietary.json")),
    readJson<Record<string, unknown>>(path.join(directory, "channels.json")),
  ]);
  if (lexicon.locale !== code || calendar.locale !== code)
    throw new Error(`locale-pack-code-mismatch:${code}`);
  if (!Array.isArray(lexicon.entries)) throw new Error(`locale-pack-invalid-lexicon:${code}`);
  return { code, persona, lexicon, calendar, formats, dietary, channels };
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(file, "utf8")) as T;
}
