# Skills implementation evidence

## Delivered

- The canonical generator owns all 79 maintained IDs and their provider, required task input,
  provider-specific preparation, critical verification, approval category, final action, result, and
  localized handoff copy.
- Every maintained `SKILL.md` now names the real provider or owner and renders its exact declared
  `browser`, `phone`, `data`, `channel`, and `approval` sequence. Duplicate generic bodies are a test
  failure.
- Thailand, Vietnam, and the Philippines include fifth starters (`tmd-weather`, `vneid-handoff`, and
  `pagasa-weather`). All five country scopes therefore have five maintained fixtures.
- The eleven phone playbooks remain owned by `packages/phone-node/skills`; this package audits their
  IDs without copying or replacing their mobile flows.
- Fixture execution is deterministic and side-effect-free. It validates task-specific required input
  and derives its result from the generated action plan; it never reads `fixture.expect` to decide the
  outcome.
- `executeSkill` is the production contract. It calls an injected dispatcher for every declared live
  browser, phone, data, or channel action and stops at the approval action. A matching, unexpired,
  skill-scoped grant is required before the declared commit is dispatched.

## Verification

```sh
pnpm --filter @kaki/skills generate:check
pnpm --filter @kaki/skills typecheck
pnpm --filter @kaki/skills test
pnpm --filter @kaki/skills build
```

The tests cover exact catalogue membership, five starters in every country, generated-file drift,
unique playbook bodies, substantive action declarations, meaningful fixture input, expected-output
poisoning, missing required input, approval ordering, copied-grant rejection, and production dispatcher
calls.

## Evidence boundary

These checks prove deterministic playbook contracts and executor policy. They do not prove a live
booking, payment, government login, vendor message, or mobile-app run. Live execution depends on the
OpenClaw workspace seeded by `kaki onboard`, configured surface dispatchers, a dedicated assistant
phone where applicable, and the relevant household/provider credentials. Account-backed completion
must be recorded by the release live-evidence workflow; fixture results must never be labelled live.
