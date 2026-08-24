# Kaki architecture

## Purpose and constraints

Kaki is a self-hosted, always-on household agent for Southeast Asia, with
Singapore as the first complete market. It receives work in the channels a
household already uses, plans against household-scoped context, and advances
work to the final irreversible step on one of four execution surfaces:
`browser`, `phone`, `approval`, or a typed `api` tool. The user should normally
see one concise approval rather than a set of instructions.

The architecture is built around five non-negotiable constraints:

1. A household is the tenancy and encryption boundary; a person is not.
2. Every side effect is policy-checked, attributable, idempotent where possible,
   and captured in an append-only audit trail.
3. Credentials and government IDs never enter model context, memory, or traces.
4. Browser and phone automation must stop safely at money, booking, identity,
   disclosure, or account-change boundaries.
5. Live integrations have deterministic fixture paths without replacing their
   production implementations.

## System context

```text
 WhatsApp / Telegram / WebChat / later-market channels
                         |
                  channel adapters
                         |
              Gateway + session router
                         |
       normalise -> recall -> plan -> policy
                         |
        +----------------+----------------+
        |                |                |
   typed APIs       browser node      phone node
        |                |                |
 public/local data   portals/web      Android apps
        +----------------+----------------+
                         |
              approval / human handoff
                         |
         channel card + Control UI inbox
```

The gateway owns task state, delivery, and orchestration. Nodes own execution
mechanics, not policy. The approval service owns the authoritative transition
from `awaiting_approval` to `approved`, `denied`, or `expired`. Memory supplies
scoped facts but cannot grant authority. Model providers propose plans and
actions but never bypass deterministic policy checks.

## Repository boundaries

| Area                      | Responsibility                                                                               | May depend on                              |
| ------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `packages/core`           | Gateway, task/session routing, contracts, scheduler, delivery ledger, learning orchestration | contracts and package public APIs          |
| `packages/channels-extra` | Viber, Messenger, and additional channel adapters                                            | channel contracts, core SDK                |
| `packages/phone-node`     | ADB/companion transport, a11y-first action loop, phone skills                                | surface, trace, approval contracts         |
| `packages/browser-node`   | Playwright runtime, persistent profiles, selector/vision fallback                            | surface, trace, approval contracts         |
| `packages/approval-node`  | Card lifecycle and channel renderers                                                         | approval and policy contracts              |
| `packages/sg-data`        | Singapore sources, SG address and SGQR codecs, monitors                                      | tool contracts, cache/HTTP utilities       |
| `packages/sea-data`       | Regional data and QR rails                                                                   | tool contracts, cache/HTTP utilities       |
| `packages/models`         | Routing, normalisation, ASR/TTS, safety and embeddings                                       | locale contracts; no business side effects |
| `packages/memory`         | Household graph, FTS/vector recall, journey and privacy filters                              | memory contracts, encrypted storage        |
| `packages/locale`         | Locale packs and loaders                                                                     | locale contracts only                      |
| `packages/skills`         | Declarative playbooks, scripts and fixtures                                                  | public tool/surface APIs only              |
| `packages/security`       | Policy, secrets, pacing, session guards, audit and red-team controls                         | contracts; no UI concerns                  |
| `apps/control-ui`         | Household, approvals, phone, journey, skills, locale, cost and trace views                   | gateway API only                           |
| `apps/companion-android`  | A11y tree, gesture injection and notifications over paired local transport                   | versioned node protocol                    |

Cross-package imports use public entry points. Packages must not read another
package's database or internal files. `packages/core/src/contracts` is the
canonical compile-time contract; `docs/INTERFACES.md` defines its semantics.

## Runtime planes

### Conversation plane

Channel adapters preserve raw provider identifiers in their private metadata
but emit a normalised `InboundMessage`. Identity resolution maps a provider JID
to a `Person` inside a `Household`; unresolved senders do not receive household
context. The allowlist/session guard runs before media transcription or model
invocation. Replies are rendered from a channel-neutral outbound message into
each channel's supported subset.

### Task plane

A durable task is the unit of orchestration. Its state machine is:

```text
received -> normalising -> planning -> executing
                                  |       |
                                  |       +-> awaiting_approval -> executing
                                  |                    |              |
                                  |                    +-> denied     +-> completed
                                  |                    +-> expired
                                  +-> blocked <-----------------------+
                                              \-> failed / cancelled
```

Each transition is persisted before user-visible delivery. Every retried step
keeps the same idempotency key. A gateway restart reconstructs runnable tasks
and unsent results from the ledger. `blocked` means a human handoff is possible;
`failed` means the task has exhausted its declared recovery policy.

### Execution plane

The planner produces small typed steps. The executor resolves each step to a
registered tool or surface and passes a capability-limited context. API tools
are preferred for stable public data. Browser automation is preferred for web
portals. Phone automation is reserved for mobile-only flows and operates on the
assistant's device/accounts. Approval is a first-class surface for Singpass,
OTP, digital-token, wallet confirmation, captcha, and other human-only actions.

Browser and phone nodes return observations, evidence references, costs, and a
redacted trace. A node may report `need_approval`; it cannot mark its own action
approved. Screenshot blobs are stored outside event payloads and referenced by
opaque IDs with retention and access controls.

### Data and intelligence plane

Locale normalisation runs before planning and returns intent text, language,
code-switch spans, register, and entities. The model router selects a provider
by task class, locale, privacy policy, health, and budget. Public-data tools use
bounded caches and explicit source timestamps. Memory recall applies speaker,
household, privacy-scope, and purpose filters before ranking FTS/vector results.

Successful trajectories may be proposed as learned skills. Promotion requires
sanitisation, replay against fixtures, risk classification, and human review
for skills that add permissions or approvals. Learning can narrow selectors or
reduce steps; it cannot broaden capability or weaken policy.

### Control plane

Telegram and the Control UI expose status, approvals, trace replay, phone manual
control, journey edits, skills, locale, cost and monitors. Administrative calls
are authenticated, household-scoped and audited. Remote access should be over a
private overlay such as Tailscale; the UI is not publicly exposed by default.

## End-to-end flows

### Ordinary household request

1. Adapter validates sender/channel session and writes the inbound envelope.
2. Identity maps the sender to a household person and loads locale preferences.
3. Media is scanned and transcribed/decoded; untrusted content is labelled.
4. Normaliser produces intent, language, register and entities.
5. Privacy-filtered memory and current public data are supplied to the planner.
6. Policy evaluates every proposed side effect using explicit facts only.
7. Tools/nodes execute until completion or an approval/handoff boundary.
8. Result is written to the delivery ledger, rendered in the sender's register,
   safety-checked, delivered, and acknowledged.
9. Redacted trace and journey entries are stored; eligible traces enter the
   learning pipeline.

### Approval-bound operation

1. Executor prepares the action up to, but excluding, the irreversible step.
2. Policy returns `ask` with a stable reason code and required evidence.
3. Approval service snapshots material facts (amount/currency/payee, vendor,
   booking time, data recipients, or identity handoff) and creates an expiring
   card bound to task, step, household and actor.
4. Cards are mirrored to configured channels. The first valid decision wins;
   later responses are harmless replays.
5. Approval service re-checks expiry and policy drift, then emits a single-use
   approval grant. Material changes invalidate the grant and create a new card.
6. Executor commits, verifies the outcome, and attaches a receipt/evidence.

### QR payment

Image bytes are scanned before decoding. The country-specific EMV codec returns
a typed payload and validation warnings. The user-facing card is generated from
decoded fields, not OCR. Approval binds the canonical payload hash. The bank
flow pauses for digital-token/2FA; Kaki never requests or stores a banking
credential. When automation is unavailable, a regenerated QR is the safe
fallback.

### Proactive monitor

The scheduler evaluates a household's configured monitor with cached, sourced
data and a cheap model only when interpretation is necessary. Deduplication,
quiet hours, urgency, cooldown, and relevance are deterministic. A monitor
creates the same task envelope as an inbound message, so policy and audit are
not bypassed.

## Trust boundaries and security controls

| Boundary                        | Controls                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Public/channel input -> gateway | allowlist, size/type limits, malware scan hook, prompt-injection labelling, quoted-content isolation |
| Model output -> tool execution  | schema validation, tool allowlist, capability context, deterministic policy, step/cost budgets       |
| Gateway -> node                 | mutual pairing, short-lived node token, household/task binding, protocol version, command allowlist  |
| Node -> portal/app              | dedicated profiles/accounts, wallet cap, rate pacing, approval checkpoints, captcha/OTP handoff      |
| Memory -> model                 | field classification, purpose and audience filters, identifier masking, secret rejection             |
| Trace/evidence -> UI/channel    | redaction, opaque blob refs, signed/authorised fetch, retention policy                               |
| Household -> household          | distinct encryption keys, scoped queries, no cross-tenant cache keys or vector search                |

Credentials are fetched from the OS keychain or encrypted secret store by a
capability broker. Secret values are never serialised into tool arguments,
events, logs, traces or model prompts. The audit log records secret references,
not values.

## Reliability and recovery

- Inbox and delivery-ledger writes use at-least-once processing; consumer and
  provider message IDs provide deduplication.
- Tool steps declare timeouts, retryability and idempotency. Reads may retry with
  bounded exponential backoff; writes retry only with a stable idempotency key
  or after outcome reconciliation.
- Channel outages queue results and alert through Telegram/control UI. WhatsApp
  logout/ban/429 pauses outbound traffic until explicit recovery.
- Browser layout drift moves from semantic selector to guarded vision fallback,
  captures evidence, and annotates the learning queue. Captchas always hand off.
- Phone stalls are detected by screenshot/a11y-tree progress, then use bounded
  BACK/relaunch recovery within a 40-step budget.
- Health checks distinguish `healthy`, `degraded`, `blocked`, and `offline` so a
  partial outage does not silently report green.

## Observability and privacy

Every inbound request, task, policy decision, approval, tool call, node step and
delivery carries `traceId`, `taskId`, `householdId` and timestamps. Metrics use
low-cardinality labels and never person IDs, message text, addresses or payment
details. Structured logs pass through the common redactor. Audit records are
append-only and contain hashes for evidence integrity. Journey entries are
user-editable views over redacted task events; deleting a journey item removes
its user-memory projection while retaining the minimum security audit required
by configured policy.

## Deployment topology

The default single-household deployment runs gateway, UI, Chrome, local model,
ASR and SQLite volumes on one trusted Ubuntu/macOS host. A physical Android
device pairs over USB or trusted LAN. SQLite uses WAL mode, encrypted backups
and per-household application-layer keys. Heavy model services may run on a
separate trusted host, but receive only the minimum redacted context. Exposing
the gateway, Chrome debugging port, ADB, companion WebSocket, model endpoints,
or database directly to the internet is unsupported.

## Integration rules

1. Contract additions are backward compatible within a protocol major version;
   removals require a migration and fixture update.
2. All external data includes source and observation time. Stale data must be
   labelled at the point of use.
3. All new tools declare risk, approval behaviour, input schema and fixture.
4. Every surface implementation supports dry-run or fixture mode and emits the
   same trace shape as production.
5. Every skill names its locales, surfaces, approvals and failure handoff.
6. No adapter-specific object crosses into planning or memory; use normalised
   contracts and opaque metadata references.
7. The policy engine is authoritative. UI, channels, skills and nodes may request
   a decision but cannot substitute their own.

## Definition-of-done architecture gates

- TypeScript contracts compile under strict mode and package boundaries are
  checked by lint/build.
- Contract fixtures cover version compatibility and reject malformed input.
- Each required product scenario has a deterministic end-to-end fixture plus a
  documented live verification path.
- Security tests prove unknown-sender rejection, approval enforcement, pacing,
  household isolation, redaction and hostile-content containment.
- Recovery tests cover gateway restart, duplicated approval replies, channel
  relink, browser layout drift, phone disconnect and delivery replay.
