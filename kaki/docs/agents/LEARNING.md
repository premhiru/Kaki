# Learning agent handoff

## Built

- Successful browser/phone traces are compacted into reusable steps while preserving approval boundaries, stable selectors, screen fingerprints, and action timing profiles.
- Failure traces append structured annotations with the failed action/target and redacted screenshot reference without replacing the last successful plan.
- Every update carries SHA-256 trace provenance, locale, timestamps, and monotonically increasing versions. Reprocessing the same trace is idempotent.
- Writes are concurrency-guarded and atomic. Immutable `revisions/vN/{skill.json,SKILL.md}` files retain history; `CURRENT`, root `skill.json`, and root `SKILL.md` are atomically replaced.
- Nightly consolidation groups related traces deterministically, selects the shortest successful path, and then applies failures as refinements.
- Replay planning exposes expected step reduction and a test proves repeat execution uses fewer steps.

## Production wiring

After a reconciled success or failure, submit a redacted `LearningTrace` to `LearnedSkillStore.learn`. Never mine raw OTP, QR, receipt, medical, financial, or identifier screens. The nightly job feeds only traces not already listed in provenance. The skill runtime loads the root `skill.json`; the UI can browse immutable revisions.

Selectors should prefer role, label, text, test-id, and accessibility identifiers. Coordinates are retained only as low-confidence fallback. A learned skill never bypasses the original tool risk category or approval checkpoint.

## Test

```sh
pnpm --filter @kaki/core typecheck
pnpm --filter @kaki/core test
```

Tests cover compaction, failure refinement, selector/screen/timing mining, provenance, immutable versions, idempotent consolidation, and fewer-step replay.

## Open issues

- Screenshot fingerprints are supplied by browser/phone nodes; perceptual hashing and retention enforcement remain node responsibilities.
- Multi-process lock contention currently fails fast for the scheduler to retry instead of blocking.
- Semantic grouping beyond the supplied slug function requires the embedding/router layer and evaluation against false merges.
