# Kaki progress

This ledger records acceptance-backed milestone state. A milestone is green only when its fixture checks pass; live checks remain explicitly separate in `VERIFY.md`.

| Milestone                   | State             | Evidence                                                                                             |
| --------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| `v0.1-fork`                 | green (scaffold)  | Core/config/delivery/learning/memory tests; architecture and immutable upstream pins                 |
| `v0.2-channels`             | green in fixtures | WhatsApp, Telegram, WebChat, voice, pacing/session-guard and later-channel adapter tests             |
| `v0.3-sgdata`               | green in fixtures | Typed cached/rate-limited clients, SGQR/address/monitor fixtures                                     |
| `v0.4-phone`                | green in fixtures | ADB daemon, vision loop, trace and eleven phone-skill fixture tests; Android live check pending      |
| `v0.5-approval-browser`     | green in fixtures | Approval lifecycle/policy and browser selector/vision/handoff tests; live portals pending            |
| `v0.6-skills`               | green in fixtures | 79 maintained playbooks, 11 phone playbooks, metadata and deterministic happy paths                  |
| `v0.7-locale-models`        | green in fixtures | Eight packs, 2,000 locale cases, provider routing/adapters, ASR fallback and safety tests            |
| `v0.8-sea`                  | green in fixtures | Regional profiles/QR rails, channel adapters and five starter skills per target market               |
| `v0.9-learning-ui-security` | green in fixtures | Versioned learning, household UI, capability/audit/red-team security tests                           |
| `v1.0-sg`                   | not yet green     | CI fixture acceptance is tracked by `pnpm acceptance`; real-device/account evidence remains required |

## Current acceptance snapshot

- Deterministic §20/security fixture contracts: green.
- SG and SEA locale thresholds: green (2,000 cases; all scorer groups meet the configured thresholds).
- Control UI: production Vinext build and rendered product tests are green with final social metadata and OG artwork.
- Core learning: immutable revisions, failure annotations, nightly consolidation, and fewer-step replay test green.
- Security: capability, sandbox, audit, injection-boundary and recursive-redaction tests green.
- Documentation evidence exists; commands and local links are checked by `pnpm docs:check`.
- Live evidence still required for install/deep status, WhatsApp→Grab, PayNow/bank 2FA, IRAS/Singpass, vendor outreach, and Parents Gateway.

Never convert a fixture result into a claim that a live bank, government portal, messaging account, or physical Android device was exercised.
