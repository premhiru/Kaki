# Learning owner contract

Kaki learning turns a redacted successful or failed browser/phone trajectory into a versioned household skill. The package owns trace validation, deterministic mining, immutable revisions, failure refinement, consolidation, and replay planning. Runtime scheduling and trace collection remain host responsibilities.

## Ingest a trace

Submit every trajectory through `LearnedSkillStore.learn(slug, value)`. The write boundary validates a closed schema, bounds all arrays and strings, rejects inherited/accessor-backed values and credential patterns, masks NRIC/FIN/passport/payment identifiers, and permits only bounded artifact, fixture, or SHA-256 screenshot references. Raw screenshot paths and inline image data are not learned.

Successful traces compact redundant waits and screenshots while retaining approval steps, stable selectors, screen fingerprints, and action timings. A failure adds a structured annotation without replacing the shortest successful plan. Every accepted trace records a SHA-256 provenance entry.

## Preserve revisions

Each accepted new trace creates immutable `revisions/vN/skill.json` and `revisions/vN/SKILL.md` files with exclusive-create semantics. The root `skill.json`, `SKILL.md`, and `CURRENT` pointer update atomically. Reprocessing a trace ID is idempotent. Loading after restart validates the complete stored schema before the skill can be replayed.

Learned skill artifacts are named product artifacts, not a runtime state sidecar. The runtime should place them under the configured `skills/learned/<slug>/` root and continue to enforce the original tool risk category and approval checkpoint.

## Run nightly consolidation

`NightlyConsolidator` groups traces by a caller-supplied slug in deterministic order. It learns the shortest successful path first and then applies failures as refinements. The scheduler must supply only redacted traces and may replay an already-seen trace safely because provenance makes the update idempotent.

`planReplay` returns the selected immutable version and expected step reduction. `repeatUsesFewerSteps` is the release gate for the prompt's repeat-task requirement: a learned success must use fewer steps than the original novel trace.

`memoryNudge` bounds the query and at most eight recalled facts before adding model-visible context. It rejects credential-shaped text and reminds the model to apply the current speaker's privacy scope.

## Verification

Run from the repository root:

```powershell
pnpm --filter @kaki/core typecheck
pnpm --filter @kaki/core test
```

Tests cover selector/screen/timing mining, immutable revisions, failure refinement, deterministic idempotent nightly consolidation, fewer-step replay, secret and accessor rejection, screenshot-reference policy, restart loading, and corrupt-file rejection.

## Required runtime and live gates

The following are not proven by the package suite:

1. Browser and phone nodes must emit redacted `LearningTrace` values after reconciled terminal outcomes. OTP, QR, receipt, medical, financial, and identifier screenshots must never reach the learner.
2. The host scheduler must run nightly consolidation and record a visible result or intentional non-outcome.
3. The skill registry must activate the new root `skill.json` on the documented deferred cache boundary; this package does not mutate an active session's prompt state.
4. A live novel browser or phone task must create `skills/learned/<slug>/`, then a second run must complete in fewer steps while preserving every approval boundary.
5. Screenshot fingerprints and artifact retention require browser/phone-node proof. Semantic grouping beyond the supplied slug requires the configured embedding/router and false-merge evaluation.
