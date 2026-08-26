# Final QA integration handoff

Date: 2026-08-26 (Asia/Singapore)

This is an exact evidence inventory for the current candidate, not a live release
attestation. Fixture, focused local, hosted CI, and live evidence are separate.

## Current focused evidence

| Surface             | Command or artifact                                          | Last observed result                                                                                                                                                                   | Evidence class                                             |
| ------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Master prompt       | `node kaki/scripts/qa/requirements-ledger.mjs --check`       | 308/308 lines; 199 normative, 109 context; 971 atomic rows: 280 verified, 382 fixture, 138 partial, 171 blocked-live                                                                   | static/generated contract                                  |
| Locale              | `pnpm --dir kaki evals`                                      | 3,600 deterministic cases across 18 language groups                                                                                                                                    | fixture evaluation                                         |
| Models              | package typecheck plus focused test                          | strict typecheck; 17/17 tests, including optional transport injection and audio/safety response boundaries                                                                             | local unit/contract                                        |
| Approval            | package typecheck plus focused test                          | 9/9 tests                                                                                                                                                                              | local unit/security contract                               |
| Core delivery       | `pnpm --filter @kaki/core test`                              | focused delivery-ledger tests pass                                                                                                                                                     | local owner contract                                       |
| Channels            | focused package tests                                        | base channels 22/22; regional channels 13/13                                                                                                                                           | fixture/injected transport                                 |
| Browser             | `pnpm --filter @kaki/browser-node test`                      | 24/24 tests across runtime, managed adapters, artifacts, and surface conversion                                                                                                        | fixture/local owner contract                               |
| Singapore data      | focused package tests                                        | 27/27 tests                                                                                                                                                                            | fixture/local contract; not exact-head live-provider proof |
| SEA data            | focused package tests                                        | 50/50 tests; recorded credential-free probes remain non-release evidence                                                                                                               | fixture/local contract plus earlier recorded probes        |
| Skills              | `pnpm --filter @kaki/skills test`                            | 176/176 tests for maintained playbooks, fixture integrity, runtime dispatch, hostile-input rejection, and approval closure                                                             | fixture/owner contract                                     |
| Security            | focused package tests                                        | 23/23 tests                                                                                                                                                                            | local security contract                                    |
| QA harness          | `pnpm --dir kaki test:qa`                                    | 9/9 tests                                                                                                                                                                              | local harness contract                                     |
| TypeScript coverage | `pnpm --dir kaki coverage`                                   | Vitest: 87.30% statements, 80.42% branches, 91.45% functions, 90.65% lines; core: 95.22/85.25/90.65 lines/branches/functions; memory: 93.02/86.20/96.49; Gateway client: 100/89.87/100 | exact-head local coverage gate                             |
| Phone vision        | locked `uv` pytest/ruff/audit commands                       | 13/13 tests; 97.53% branch-aware coverage; Ruff clean; no known PyPI vulnerabilities                                                                                                   | exact-head local Python gate                               |
| Deployment          | `node kaki/scripts/verify-deployment.mjs` and Compose config | static deployment and all-profile Compose rendering pass                                                                                                                               | static/fixture deployment                                  |

The TypeScript coverage gate is green on this exact local tree. The broad root
frozen install, full Kaki verification matrix, Docker build, clean Ubuntu/macOS
onboarding, and exact-head hosted CI still require their final run. This table does
not convert local or focused results into a hosted or live release pass.

## Mandatory final commands

```sh
pnpm install --frozen-lockfile
pnpm --dir kaki format:check
pnpm --dir kaki lint
pnpm --dir kaki typecheck
pnpm --filter @openclaw/kaki typecheck
pnpm --dir kaki test
pnpm --filter @openclaw/kaki test
pnpm --dir kaki coverage
pnpm --dir kaki test:qa
pnpm --dir kaki test:e2e
pnpm --dir kaki evals
pnpm --dir kaki security:scan
pnpm --dir kaki docs:check
pnpm audit --audit-level high
pnpm --dir kaki acceptance
```

Release acceptance additionally requires `pnpm --dir kaki acceptance:release`
against the exact candidate SHA and current, non-fixture evidence.

The percentage gate covers hand-authored package/plugin TypeScript, the evaluation
adapter, launcher, RSC UI source, and the Control UI Gateway client. A separate QA
contract rejects threshold weakening and broad source exclusions. The UI also
keeps production build, rendered HTML, and packaged-asset gates as supplementary
black-box proof.

## Remaining release blockers

- Clean Ubuntu 24.04 and macOS install, onboarding, backup/restore, and deep status.
- Linked WhatsApp and Telegram accounts with real inbound/outbound delivery.
- A physical assistant-owned Android with the required app accounts.
- Live Grab, PayNow/bank 2FA, IRAS/Singpass, Parents Gateway, and consenting-vendor flows.
- Configured model, ASR, optional TTS, and credentialed data-provider probes.
- Real authenticated Control UI browser evidence.
- Exact-head green hosted CI and security review.
- Required milestone tags. `v1.0-sg` remains forbidden until every §20 gate is green.

Use [Verification](../VERIFY.md) for the redacted live-evidence schema. Never
relabel a fixture, mock transport, rendered static page, or earlier-head result as
live proof.
