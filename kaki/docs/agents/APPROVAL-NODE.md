# APPROVAL-NODE handoff

## Work completed

- Integrated `packages/security` and `packages/approval-node` with canonical `@kaki/core` risk, policy, money, evidence, approval-card and approval-grant contracts.
- Changed policy money evaluation to integer minor units, retaining `amountSgd`/major-unit configuration only as compatibility inputs. Non-SGD payment amounts do not auto-approve under the SGD cap.
- Added deterministic canonical JSON serialisation and SHA-256 material-facts hashing. Policy decisions now contain stable reason codes, facts hash and evaluation timestamp.
- Hardened approval creation so policy is always recalculated; denied actions cannot create cards and automatic actions cannot be unnecessarily converted into approvals.
- Bound cards to household, task, trace, step, requester, category, material facts, evidence, policy, expiry and facts hash. Legacy card inputs are normalised into canonical cards.
- Added first-writer-wins compare-and-swap decisions, mutation detection, decision replay rejection, expiry, one-time reping and append-only audit events.
- Added single-use grants bound to card, household, task, step, approver, facts hash and expiry. Grant consumption rehashes current facts, rechecks policy drift and atomically rejects replay.
- Added WhatsApp numbered-reply rendering, Telegram inline-keyboard models and Control UI models from the same immutable card.
- Added Singpass, OTP, bank digital-token/2FA, PayNow/SGQR and captcha detection/handoff models. Handoff copy explicitly avoids requesting secrets and keeps bank confirmation separate from Kaki approval.
- Preserved the existing `ApprovalEngine(ledger, expiryMs)`, major-unit `amount.value`, string response choice and `renderWhatsApp` shapes for migration.

## Verification

- `pnpm --filter @kaki/security lint` — passed.
- `pnpm --filter @kaki/approval-node lint` — passed.
- `pnpm --filter @kaki/security test` — passed: 12 tests.
- `pnpm --filter @kaki/approval-node test` — passed: 5 tests covering canonical/legacy cards, minor units, handoffs, single-use grants, mutation/replay, audit, reping, expiry and render models.
- Changed source/tests/package manifests formatted with Prettier.

## Open issues and live verification

- `MemoryApprovalLedger` demonstrates the atomic contract but is not durable. Production must implement compare-and-swap, grant consumption and audit append in one SQLite transaction so two gateway processes cannot both win.
- The engine records the deciding person but does not itself resolve channel identity or delegated approvers. The channel/gateway must authenticate the callback/reply, map it to a household person and enforce the configured approver audience before calling `respond`.
- Telegram callback data contains a short hash discriminator to stay compact. The adapter must load the server-side card and submit its complete `factsHash`; callback text is never authoritative.
- Compatibility conversion from floating major units exists only for old callers. New tools and UI must provide `Money.minorUnits`; remove the shim after all packages migrate.
- Evidence references are accepted as canonical trusted inputs. Runtime schemas, blob access checks, screenshot redaction and expiry enforcement must run at the gateway/evidence-store boundary.
- Handoff detection and render models are wired, but live portal polling/resume, QR screenshot delivery, bank receipt reconciliation and channel fan-out belong to browser/channel executors and require recorded fixtures.
- Approval grants intentionally authorise exactly one step. Multi-step bookings/payments must prepare all material facts in one final step or request a new approval after any material change.
