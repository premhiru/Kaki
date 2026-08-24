# Final QA integration handoff

Date: 2026-08-24 (Asia/Singapore)

This is an evidence record for the fixture-complete `v0.9` checkpoint, not a live
release attestation. Fixture-backed checks and live checks remain separate.

## Final integration results

| Phase                    | Command                          | Result                                                                                                                                                                     |
| ------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen workspace install | `pnpm install --frozen-lockfile` | PASS — all 15 workspace projects.                                                                                                                                          |
| Formatting               | `pnpm format:check`              | PASS. Generated dependency/build output is excluded.                                                                                                                       |
| Lint                     | `pnpm lint`                      | PASS — root strict typed ESLint plus the Control UI's scoped React/accessibility lint.                                                                                     |
| Root typecheck           | `pnpm typecheck`                 | PASS.                                                                                                                                                                      |
| Root unit suite          | `pnpm test`                      | PASS — 270 tests across product packages and the production Control UI build/render suite.                                                                                 |
| QA harness               | `pnpm test:qa`                   | PASS — 3/3 harness tests.                                                                                                                                                  |
| E2E fixtures             | `pnpm test:e2e`                  | PASS — 16/16 recorded contracts plus 95 fixture-runner tests.                                                                                                              |
| Locale evaluation        | `pnpm evals`                     | PASS — 10 locale/language groups, 200 deterministic cases each, 100% fixture-contract score. This is not a claim about untested live-model quality.                        |
| Security scan            | `pnpm security:scan`             | PASS — 4,310 text files checked after the final dependency update.                                                                                                         |
| Dependency audit         | `pnpm audit --audit-level high`  | PASS — no high or critical advisories. One moderate, development-only esbuild advisory is inherited from the latest `drizzle-kit`; production dependencies are unaffected. |
| Documentation check      | `pnpm docs:check`                | PASS — 142 Markdown files and 12 required artifacts.                                                                                                                       |
| Control UI               | Included by `pnpm test`          | PASS — Vinext production build and 2/2 rendered product tests.                                                                                                             |
| Acceptance evidence      | `pnpm acceptance`                | PASS for all 14 CI/fixture criteria; six explicitly live-gated criteria remain pending.                                                                                    |

`pnpm verify` completed successfully as one uninterrupted final run after dependency
patching. React, React Server Components, Vinext, Vite, Wrangler, the Cloudflare
plugin, and the RSC plugin were upgraded to remove all high-severity audit findings;
peer dependency checks and the rebuilt UI passed afterward.

## Remaining live acceptance checks

The repository contains no committed live evidence for these checks, so `v1.0-sg`
acceptance remains pending:

1. Clean install plus deep-status verification on a supported host.
2. WhatsApp inbound request through the live Grab/browser flow.
3. A real PayNow/2FA approval and expiry exercise without exposing credentials.
4. A live IRAS/Singpass assisted workflow with the required human controls.
5. Live vendor outreach, reply ingestion, comparison, and approval.
6. Live Parents Gateway/browser-assistance verification.

Operators must capture redacted artifacts through the process in `docs/VERIFY.md`;
fixture results must never be relabelled as live results.

## Provenance caveat

The initial workspace had no OpenClaw Git objects. Immutable OpenClaw and Hermes
revisions and notices are recorded in `UPSTREAM.md` and `THIRD_PARTY_NOTICES.md`, but
importing complete upstream Git history remains release-engineering work.
