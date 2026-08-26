# Kaki progress

This ledger records acceptance-backed milestone state. A milestone is green only when its fixture checks pass; live checks remain explicitly separate in `VERIFY.md`.

The master-prompt line-by-line status and current integration gaps are authoritative
in `REQUIREMENTS.md`. Earlier fixture-green states below do not imply that the
corresponding Kaki package is wired into the root OpenClaw runtime.

| Milestone                   | State             | Evidence                                                                                                                      |
| --------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `v0.1-fork`                 | green (scaffold)  | Core/config/delivery/learning/memory tests; architecture and immutable upstream pins                                          |
| `v0.2-channels`             | green in fixtures | WhatsApp, Telegram, WebChat, voice, pacing/session-guard and later-channel adapter tests                                      |
| `v0.3-sgdata`               | green in fixtures | Typed cached/rate-limited clients, SGQR/address/monitor fixtures                                                              |
| `v0.4-phone`                | green in fixtures | ADB daemon, vision loop, trace and eleven phone-skill fixture tests; Android live check pending                               |
| `v0.5-approval-browser`     | green in fixtures | Approval lifecycle/policy and browser selector/vision/handoff tests; live portals pending                                     |
| `v0.6-skills`               | green in fixtures | 79 maintained playbooks, 11 phone playbooks, metadata and deterministic happy paths                                           |
| `v0.7-locale-models`        | green in fixtures | Eight packs, 3,600 locale cases across 18 language groups, real HTTP model transports, routing, ASR fallback and safety tests |
| `v0.8-sea`                  | green in fixtures | Regional profiles/QR rails, channel adapters and five starter skills per target market                                        |
| `v0.9-learning-ui-security` | green in fixtures | Versioned learning, household UI, capability/audit/red-team security tests                                                    |
| `v1.0-sg`                   | not yet green     | CI fixture acceptance is tracked by `pnpm acceptance`; real-device/account evidence remains required                          |

## Current acceptance snapshot

- Deterministic §20/security fixture contracts: green.
- SG and SEA locale thresholds: green in deterministic evaluation (3,600 cases across 18 language groups; all scorer groups meet the configured thresholds).
- Control UI: packaged for the authenticated Kaki plugin route with no demo-state fallback; an exact-head browser capture against a running Gateway remains required.
- Core learning: immutable revisions, failure annotations, nightly consolidation, and fewer-step replay test green.
- Security: capability, sandbox, audit, injection-boundary and recursive-redaction tests green.
- Models: strict transport typecheck and 17 focused tests pass, including the optional injected-transport and audio/safety response contracts.
- Documentation evidence includes all 308 source lines and 971 atomic requirements: 280 verified, 382 fixture, 138 partial, and 171 blocked-live. Commands, source integrity, owner paths, and local links are checked by `pnpm --dir kaki docs:check`.
- TypeScript coverage is green on the exact local tree: the Vitest aggregate reports 87.30% statements, 80.42% branches, 91.45% functions, and 90.65% lines; native core reports 95.22% lines, 85.25% branches, and 90.65% functions; native memory reports 93.02%, 86.20%, and 96.49%; the Gateway client reports 100%, 89.87%, and 100%. Phone-vision Python reports 97.53% total coverage across 13 tests, with Ruff and `pip-audit` green. A QA contract prevents broad source/UI exclusions or threshold weakening. UI production build/render/package checks remain mandatory supplementary boundary proof.
- Live evidence still required for install/deep status, WhatsApp→Grab, PayNow/bank 2FA, IRAS/Singpass, vendor outreach, and Parents Gateway.

Never convert a fixture result into a claim that a live bank, government portal, messaging account, or physical Android device was exercised.
