# APPROVAL-NODE handoff

## Work completed

- Integrated `packages/security` and `packages/approval-node` with canonical `@kaki/core` risk, policy, money, evidence, approval-card and approval-grant contracts.
- Changed policy money evaluation to integer minor units. Non-SGD payment amounts do not auto-approve under the SGD cap.
- Added deterministic canonical JSON serialisation and SHA-256 material-facts hashing. Policy decisions now contain stable reason codes, facts hash and evaluation timestamp.
- Hardened approval creation so policy is always recalculated; denied actions cannot create cards and automatic actions cannot be unnecessarily converted into approvals.
- Bound cards to household, task, trace, step, requester, category, material facts, evidence, policy, expiry and facts hash. Runtime creation rejects actorless, floating-major-unit, or string-choice legacy inputs.
- Added first-writer-wins compare-and-swap decisions, mutation detection, decision replay rejection, expiry, one-time reping and append-only audit events.
- Added single-use grants bound to card, household, task, step, approver, facts hash and expiry. Grant consumption rehashes current facts, rechecks policy drift and atomically rejects replay.
- Added an injected household decision authorizer, unauthorized-attempt audit events, WhatsApp numbered-reply resolution, Telegram callback resolution, and Control UI models from the same immutable card. Provider callback text never supplies material facts; the engine reloads the card and uses its complete server-side hash.
- Added Singpass, OTP, bank digital-token/2FA, PayNow/SGQR and captcha detection/handoff models. Handoff copy explicitly avoids requesting secrets and keeps bank confirmation separate from Kaki approval.
- Added the same approval, bank-confirmation, receipt, and regenerated-QR fallback contract for PayNow, DuitNow, PromptPay, QRIS, VietQR, and QR Ph.
- Kept one canonical constructor and decision contract; no unshipped legacy approval path can bypass actor authorization or facts hashing.

## Verification

- `pnpm --filter @kaki/security lint` — passed.
- `pnpm --filter @kaki/approval-node lint` — passed.
- `pnpm --filter @kaki/security test` — passed: 12 tests.
- `pnpm --filter @kaki/approval-node test` — passed: 8 tests covering canonical cards, actor authorization, rejection of actorless legacy decisions, native replies/callbacks, all six QR rails, handoffs, single-use grants, mutation/replay, audit, reping, expiry and render models.
- Changed source/tests/package manifests formatted with Prettier.

## Open issues and live verification

- `MemoryApprovalLedger` demonstrates the atomic contract but is not durable. Production must implement compare-and-swap, grant consumption and audit append in one SQLite transaction so two gateway processes cannot both win.
- Production must inject an authorizer backed by the current household directory and authenticated channel session. The default only permits the card's requested person; it does not infer delegated approvers.
- New tools and UI must provide integer `Money.minorUnits`; floating major units are rejected at the approval boundary.
- Evidence references are accepted as canonical trusted inputs. Runtime schemas, blob access checks, screenshot redaction and expiry enforcement must run at the gateway/evidence-store boundary.
- Handoff detection and render models are wired, but live portal polling/resume, QR screenshot delivery, bank receipt reconciliation and channel fan-out belong to browser/channel executors and require recorded fixtures.
- Approval grants intentionally authorise exactly one step. Multi-step bookings/payments must prepare all material facts in one final step or request a new approval after any material change.
