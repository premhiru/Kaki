# Locale packs

Kaki locale packs live in `packages/locale/<cc>/`. Singapore (`sg`) is the default; Malaysia, Indonesia, Thailand, Vietnam, and the Philippines are fixture-complete starters. Myanmar and Cambodia are conservative stubs that require local review before external messaging.

Each pack contains:

- `persona.md`: register, honorific, and audience rules
- `lexicon.json`: local vocabulary and canonical meanings
- `calendar.json`: public, school, religious, cultural, and deadline routing rules
- `formats.json`: date, currency, phone, address, and identity masking
- `dietary.json`: explicit dietary flags and local terms; dietary needs are never inferred
- `channels.json`: channel priority, languages, and default data tools
- `eval/manifest.json`: pointers to the deterministic evaluation corpus

## Loading and normalisation

`@kaki/locale` exports `loadLocalePack(code)` and `normaliseLocaleMessage(text, pack)`. Lexicon matching is longest-first so a complete order such as `kopi-C siew dai peng` wins over `kopi`. The normaliser returns intent, language, register, canonical text, and code-switch terms.

## Corpus and thresholds

`evals/locales/` contains 200 cases for each required locale/language group: SG English, Singlish, Mandarin, Malay, Tamil, and the primary language of MY, ID, TH, VN, and PH. Cases cover ten intents and four registers. `actual` is produced by independent generator rules, then package tests replay every row through the TypeScript normaliser to prevent generator/runtime drift.

```sh
node scripts/locale/generate.mjs
pnpm --filter @kaki/locale test
pnpm evals
```

The deterministic corpus is a fixture-contract test, not a substitute for human-reviewed natural-language evaluation. Add adversarial, paraphrase, ASR-error, and code-switch samples without replacing these baseline cases.

## Updating a pack

Edit curated seeds or rules in `scripts/locale/generate.mjs`, regenerate, inspect the diff, and run both package tests and `pnpm evals`. Never hard-code future holiday dates: refresh them from the authoritative country source and retain the calendar rule for later years.
