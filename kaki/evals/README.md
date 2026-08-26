# Kaki evaluation and fixture architecture

Kaki has two deliberately separate acceptance gates:

1. **CI contracts** replay deterministic inputs, validate schemas and redaction, score locale predictions, and run package tests. They must not need network access, credentials, real phone taps, or a linked messaging account.
2. **Live verification** exercises real WhatsApp/Telegram sessions, Android/Grab, Singpass, and bank handoffs. Live evidence belongs in the ignored `artifacts/live/` directory and is required by `node scripts/qa/acceptance-report.mjs --release`.

Fixtures under `evals/fixtures/` are versioned contracts, not proof that product code passed. `replay-fixtures.mjs` checks recorded contracts by default; supply `--adapter path/to/adapter.mjs --strict-runtime` to invoke product code. An adapter exports `async executeFixture(fixture)` and returns the actual object addressed by the fixture assertions.

Commands:

```sh
node scripts/qa/validate-fixtures.mjs
node scripts/qa/replay-fixtures.mjs
node --test tests/qa/*.test.mjs
node scripts/qa/locale-score.mjs --dir evals/locales --out evals/results/locale-summary.json
node scripts/qa/acceptance-report.mjs
node scripts/qa/acceptance-report.mjs --release
```

Locale JSONL rows use this shape:

```json
{
  "id": "sg-en-0001",
  "locale": "sg",
  "language": "en",
  "utterance": "...",
  "expected": { "intent": "weather.commute", "language": "en", "register": "peer" },
  "actual": { "intent": "weather.commute", "language": "en", "register": "peer" }
}
```

The scorer requires 200 cases for SG English, Singlish, Mandarin, Malay, and Tamil, plus 200 for the primary language of MY, ID, TH, VN, and PH. It applies the §20 thresholds exactly.
