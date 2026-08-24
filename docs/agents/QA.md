# QA agent handoff

## Built

- A versioned fixture contract and validator in `evals/schema/fixture.schema.json` and `scripts/qa/validate-fixtures.mjs`.
- Deterministic §20 fixtures for Grab, PayNow/2FA, IRAS/Singpass, voice/locales, vendor outreach, Parents Gateway, monitors, learning, SEA starters, and six security attacks/invariants.
- A generic fixture adapter protocol in `scripts/qa/replay-fixtures.mjs`; `--strict-runtime` prevents contract-only replay from being mistaken for runtime coverage.
- A 14-row acceptance manifest and report. Release mode requires non-fixture live evidence for device/account-dependent checks.
- A locale scorer implementing 200-case minimums, SG 90%, other-market 80%, and register 85% gates.
- A repository secret scanner and native Node tests for the harness itself.
- CI jobs for formatting, lint, typechecking, unit, fixture e2e, locale evals, secret/dependency audits, and Ubuntu/macOS installer smoke tests.
- `docs/VERIFY.md` with live procedures and privacy-safe failure capture.

## Test

```sh
node scripts/qa/validate-fixtures.mjs
node scripts/qa/replay-fixtures.mjs
node --test tests/qa/*.test.mjs
node scripts/qa/secrets-scan.mjs
node scripts/qa/acceptance-report.mjs
```

The locale and release gates intentionally stay red until predictions and real live evidence exist:

```sh
pnpm evals
pnpm acceptance:release
```

## Integration contract

Each runtime owner should add an ESM adapter exporting `executeFixture(fixture)`. CI invokes:

```sh
node scripts/qa/replay-fixtures.mjs --adapter <adapter.mjs> --strict-runtime
```

The adapter must return actual execution output. It may replace external services with deterministic transports, but must exercise production parsing, policy, orchestration, and irreversible-action guards.

## Open issues

- Fixture audio/images are referenced by logical names; synthetic binary assets and runtime adapters remain to be recorded by their owning surface agents.
- Locale prediction JSONL and its 2,000-case minimum corpus are not present yet.
- Live checks require dedicated accounts/devices and user approvals; no live evidence was fabricated.
- Installer smoke remains red until `scripts/install.sh --dry-run` exists and is cross-platform safe.
