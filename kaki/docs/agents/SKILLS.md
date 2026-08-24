# SKILLS

## Delivered

- Created the required maintained scopes under `packages/skills`: `sg`, `sea`, `my`, `id`, `th`, `vn`, `ph`, and `learned`.
- Added 79 maintained playbooks covering every §16 skill. Thailand, Vietnam, and the Philippines each receive a fifth starter (`tmd-weather`, `vneid-handoff`, and `pagasa-weather`) so all five country packs have at least five fixtures.
- Every maintained skill has agentskills-compatible front matter, safe steps, checks, failure modes, local-language handoff copy, an independently runnable `run.ts`, and a deterministic `fixtures/happy.json`.
- Added a shared effect-free fixture runner. It validates identity and fixture mode, returns the expected policy boundary/evidence, and performs zero external calls or state changes.
- Added a deterministic generator with drift-check mode and generated `docs/SKILLS.md`.
- Catalogued all eleven phone-node skills at their existing owning paths rather than duplicating them.

## Test

```sh
corepack pnpm --filter @kaki/skills generate:check
corepack pnpm --filter @kaki/skills typecheck
corepack pnpm --filter @kaki/skills test
corepack pnpm --filter @kaki/skills test:e2e
corepack pnpm --filter @kaki/skills exec tsx sg/iras-noa/run.ts
```

## Live integration boundary

The runner is deliberately fixture-only. Production orchestration reads the `surfaces` and `approvals` metadata, dispatches the plan through browser/phone/API/approval nodes, and supplies the resulting redacted trace. This prevents a standalone playbook test from accidentally sending messages, placing bookings, or moving money.

## Open issues

- Live portal fixtures must be recorded and reviewed by their owning surface/data agents before release; the deterministic fixtures currently test policy and delivery contracts.
- Calendar dates, government requirements, fees, phone numbers, and vendor endpoints are live data and must never be copied into static playbook text without an expiry/update owner.
- Learned skills remain quarantined until they gain a reviewed fixture and pass the same catalogue validation.
