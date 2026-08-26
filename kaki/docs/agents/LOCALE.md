# Locale agent handoff

## Built

- Eight loadable locale packs under `packages/locale`: complete SG/MY/ID/TH/VN/PH fixture packs and conservative MM/KH stubs.
- SG has 768 lexicon entries, including compositional kopitiam orders and local housing, finance, health, school, transport, food, family, and culture vocabulary.
- MY/ID/TH/VN/PH each have 210 local lexicon entries.
- Every pack includes persona, calendar, formats, dietary, channel, and eval-manifest files.
- `@kaki/locale` provides a validated async loader plus longest-first lexicon, language, intent, register, and code-switch normalisation.
- `evals/locales` contains 2,000 deterministic cases: 200 each for SG English/Singlish/Mandarin/Malay/Tamil and MY Malay, ID Indonesian, TH Thai, VN Vietnamese, and PH Filipino.
- The generator computes actual labels independently; package tests replay all rows through production TypeScript rules.

## Test

```sh
node scripts/locale/generate.mjs
pnpm --filter @kaki/locale lint
pnpm --filter @kaki/locale test
node scripts/qa/locale-score.mjs --dir evals/locales --out evals/results/locale-summary.json
```

Expected fixture score is 100% for intent, language, and register in every group. This is contract coverage, not a claim of 100% open-world language quality.

## Open issues

- Native-speaker review is still required, especially for Thai, Vietnamese, Filipino, Tamil, Burmese, and Khmer honorific/register nuance.
- Calendar files encode refresh rules rather than unstable future dates; production refreshers must use authoritative sources.
- Expand corpora with natural voice-note transcripts, ASR noise, mixed scripts, and ambiguous family context before a production quality claim.
