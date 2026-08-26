# Architecture decision records

This is the decision log for Kaki. Decisions explicitly required by the product
brief are marked **mandated**; implementation choices made without user input are
marked **accepted**. New entries are appended and existing entries are not
silently rewritten after code depends on them.

## ADR-001 — Household is the tenant boundary

- Status: mandated
- Date: 2026-08-24

### Context

Kaki serves multiple people in a family group while preserving privacy walls.
Treating a channel account or a person as the tenant either fragments shared
routines or risks data leakage.

### Decision

Use `Household` as the tenancy, storage, encryption, task and policy boundary.
Resolve a channel sender to a `Person` within that household. Apply an additional
entity-level privacy audience so membership does not imply access to medical,
financial or other owner-only facts.

### Consequences

Every durable record and process-boundary envelope carries `householdId`.
Cross-household queries and cache keys are forbidden. Backup/restore and key
rotation operate per household. Household-shared experiences remain possible,
but retrieval must enforce both tenant and person/audience filters.

## ADR-002 — Fork OpenClaw and port selected Hermes patterns

- Status: mandated
- Date: 2026-08-24

### Context

The product requires a mature gateway, channel SDK, managed browser, skills,
scheduling, node protocol and Control UI, while also requiring durable delivery,
cross-session recall and trace-derived learning.

### Decision

Hard-fork the pinned MIT OpenClaw revision into `packages/core`, retain licence
and upstream attribution, and rename user-facing surfaces/config to Kaki. Port
the specified Hermes architectural patterns rather than embedding Hermes as a
second agent runtime. Disable telemetry and third-party auto-install behaviour.

### Consequences

Kaki owns rebasing and security maintenance of the fork. `UPSTREAM.md` records
the exact revision and local divergence. Ported learning/memory behaviour uses
Kaki's TypeScript contracts and policy boundary; Python remains appropriate for
ASR/vision/ML helpers, not a parallel orchestration authority.

## ADR-003 — Canonical compile-time contracts live in core

- Status: accepted
- Date: 2026-08-24

### Context

Channel, node, data, memory, security and UI work proceeds in parallel. Private
type copies would drift and obscure security assumptions.

### Decision

Keep dependency-light public TypeScript contracts in
`packages/core/src/contracts/index.ts`, with semantics in
`docs/INTERFACES.md`. Packages import only public contract entry points. Runtime
process boundaries validate an equivalent strict schema maintained adjacent to
the receiving adapter.

### Consequences

Core contracts must avoid package-specific implementation dependencies. A type
change and its semantic documentation land together. TypeScript prevents local
shape drift, while runtime validation still handles untrusted JSON and version
skew.

## ADR-004 — Durable state machine with at-least-once delivery

- Status: accepted
- Date: 2026-08-24

### Context

Tasks can span channel outages, approvals, portal sessions and gateway restarts.
Exactly-once side effects cannot be guaranteed across third-party systems.

### Decision

Persist task state transitions and outgoing delivery records before performing
or announcing them. Process inbox and outbox at least once, deduplicate by stable
message/command IDs, and require an idempotency key plus reconciliation strategy
for retryable writes.

### Consequences

Consumers must be idempotent. Some provider writes cannot be blindly retried;
they enter reconciliation or human handoff. Results survive gateway crashes and
approval replies can be safely duplicated.

## ADR-005 — Deterministic policy is the only approval authority

- Status: mandated
- Date: 2026-08-24

### Context

Models, skills, channel renderers and execution nodes all observe partial task
state. Letting any of them grant approval would create inconsistent and unsafe
paths.

### Decision

Centralise `auto | ask | deny` evaluation in the policy service. Bind approval
cards and single-use grants to household, task, step, actor, expiry and a hash of
material facts. Re-evaluate policy after approval and invalidate grants on any
material change.

### Consequences

Nodes may stop with `need_approval` but cannot resume themselves. Channel/UI
buttons are presentation and transport only. Policy calls and approval lifecycle
events are append-only audit records. Singpass and account changes cannot be
configured for automatic approval.

## ADR-006 — Use API, browser, phone, then human handoff by capability

- Status: accepted
- Date: 2026-08-24

### Context

The same outcome may be reachable through public data, a portal or a mobile-only
app. Each surface has different fragility and privilege.

### Decision

Prefer a typed API for supported public/read operations, browser automation for
web portals, and the dedicated Android phone node for mobile-only apps. Use the
approval surface for identity, OTP, wallet/bank confirmation, captcha or other
human-only boundaries. Surface selection remains explicit in a plan/skill and is
not inferred from untrusted page content.

### Consequences

Stable APIs reduce automation brittleness and cost. Browser/phone implementations
must expose the same trace and approval result semantics. The phone uses Kaki's
dedicated accounts and capped wallet rather than impersonating a household
member's device context.

## ADR-007 — A11y and semantic selectors precede vision coordinates

- Status: mandated
- Date: 2026-08-24

### Context

Coordinate-only automation is fragile and can tap an unintended destructive
control after a layout change.

### Decision

Use accessibility IDs/text/descriptions first on Android and semantic/test/role
selectors first in the browser. Use guarded vision as fallback, with confidence,
fresh screenshot, progress detection, action budget and approval checkpoint.
Absolute coordinates are the final phone fallback only.

### Consequences

Fixtures must exercise selector fallback and layout drift. Low-confidence or
ambiguous destructive targets stop safely. Traces retain target strategy so the
learning system can propose better selectors.

## ADR-008 — Secrets are handles; sensitive evidence is out of band

- Status: mandated
- Date: 2026-08-24

### Context

Credentials, OTPs, government identifiers, financial details and private health
data can leak through model prompts, tool arguments, logs, memory or screenshots.

### Decision

Store secrets in an OS keychain or encrypted secret store and pass opaque,
capability-scoped handles to trusted executors. Reject secrets from memory.
Represent binary/sensitive evidence by opaque references, redact before normal
trace persistence, and enforce audience plus retention on the evidence store.

### Consequences

Tools cannot read arbitrary secrets or emit secret values. Debugging uses safe
provider metadata and hashes rather than raw payloads. Screenshots and document
processing require a redaction pipeline before learning or long-lived storage.

## ADR-009 — SQLite is the default durable local store

- Status: mandated
- Date: 2026-08-24

### Context

Kaki is self-hosted for a household and needs relational entities, durable task
state, full-text recall, vectors, journey data and simple backup.

### Decision

Use SQLite with WAL mode as the default store, FTS5 for textual recall and a
vector extension/side table behind a repository abstraction. Encrypt backups and
sensitive fields with per-household application keys. Keep evidence blobs out of
row/event JSON.

### Consequences

The default deployment has no external database dependency. Write concurrency is
bounded and repository code must use transactions for state/outbox changes.
Storage adapters may be added later without changing public memory/task contracts.

## ADR-010 — Fixtures mirror real code paths

- Status: mandated
- Date: 2026-08-24

### Context

CI cannot depend on live WhatsApp sessions, bank portals, Singpass, physical
phones or rate-limited government services, but mocks that bypass production
parsers/policy/executors give false confidence.

### Decision

Record sanitised boundary fixtures and inject transport, clock and device drivers
below the production adapter. Fixture and live modes use the same normalisation,
policy, state machine, tool/surface and rendering code. Each live integration also
has a manual verification procedure in `docs/VERIFY.md`.

### Consequences

Fixtures require review for personal data and staleness. Tests are deterministic
and can assert exact approval, pacing, trace and recovery behaviour. Live support
cannot be claimed from a synthetic handler alone.

## ADR-011 — Locale normalisation is separate from generation

- Status: accepted
- Date: 2026-08-24

### Context

SEA household messages often code-switch and use local shorthand. A single model
choice for both understanding and response style makes intent, locale and cost
hard to audit.

### Decision

Run a small locale-aware normaliser first to produce intent text, language,
code-switch spans, register and entities using the active lexicon. Route planning
and generation independently by task, locale, privacy, provider health and budget.
Keep formatting country separate from response language.

### Consequences

Normaliser fixtures become a stable evaluation surface. Kaki can reply in
Mandarin while using Singapore dates/currency, or mirror Singlish without
caricature. Router/provider changes do not alter downstream intent contracts.

## ADR-012 — Learning is a gated proposal pipeline

- Status: accepted
- Date: 2026-08-24

### Context

Trace mining should reduce steps on repeat tasks, but unreviewed trajectories can
contain secrets, hostile instructions, accidental approvals or overly broad
selectors.

### Decision

Sanitise and annotate successful/failed traces, generate learned-skill proposals,
replay them against fixtures and promote only within the original capability and
risk envelope. Automatic refinement may improve selectors/checks/timings but may
not add surfaces, contacts, domains, permissions or reduce approvals. Broader
changes require review.

### Consequences

The learning loop is useful without becoming an implicit plugin installer or
policy editor. Provenance is retained as safe trace references. Security and
regression checks gate promotion.

## ADR-013 — Versioned envelopes for all process boundaries

- Status: accepted
- Date: 2026-08-24

### Context

Gateway, Android companion, phone/browser workers and optional model services may
be upgraded independently or reconnect after downtime.

### Decision

Wrap cross-process commands/events in `ProtocolEnvelope<T>` with semantic
protocol version, IDs, type, time, task/trace/household context and payload.
Require matching major versions; allow additive minor event fields. Reject stale,
mis-scoped or expired commands.

### Consequences

Rolling upgrades within a major version are possible. Breaking changes require a
new major and adapter/migration. Envelope correlation enables reliable audit and
trace reconstruction.

## ADR-014 — WhatsApp is primary; Telegram is the independent control plane

- Status: mandated
- Date: 2026-08-24

### Context

Singapore households commonly coordinate in WhatsApp, while operational alerts
and inline approvals need a path that survives a WhatsApp logout or ban.

### Decision

Use a dedicated linked-device WhatsApp number as the primary household surface
and Telegram as the cross-market control plane. Mirror approvals to configured
control surfaces and alert Telegram when WhatsApp is paused, logged out, banned
or rate-limited. Later-market channels remain behind explicit feature flags until
their live verification is complete.

### Consequences

Onboarding requires a dedicated number recommendation and Telegram setup for
resilience. Channel rendering remains neutral so approvals and results degrade to
numbered replies where native buttons are absent.

## ADR-015 — Conservative defaults for proactive notifications

- Status: mandated
- Date: 2026-08-24

### Context

Rain, train, haze and deadline monitors create value only when timely and
relevant; repeated low-value alerts cause users to mute the agent.

### Decision

Apply deterministic relevance, cooldown, deduplication and quiet hours before
generating a proactive message. Default quiet hours are 23:00–07:00 household
local time, with explicit urgency exceptions. One material state change yields
one nudge; unchanged state does not reping.

### Consequences

Monitor code must retain last-evaluated and last-notified state. Tests use an
injected clock and cover threshold flapping, quiet-hour deferral and urgent
overrides.

## ADR-016 — Preserve private runtime types behind canonical boundary adapters

- Status: accepted
- Date: 2026-08-24

### Context

Channel providers, browser automation and phone vision need implementation-level
types such as inline provider media, selector traces and vision decisions. Making
those types the cross-package contract would leak binary data, omit tenant/task
bindings and let model/page prose define approval facts.

### Decision

Keep runtime-private types inside their packages and require explicit adapters at
the core boundary. Channel adapters persist/materialise blobs around canonical
messages. Browser and phone adapters convert terminal results to `SurfaceResult`
using the planned step's risk and material facts. Evidence persistence receives
the canonical household/task/trace context. Runtime completion defaults to
unverified until an outcome-specific reconciler asserts success.

### Consequences

Existing provider/runtime code remains stable while the gateway gets one
security-reviewed contract. Raw media cannot enter core messages through the
adapter. A hostile page or vision model cannot change the approval category,
amount, recipient or booking facts. New surfaces must supply equivalent adapters
and tests rather than exporting their internal result directly.

## ADR-017 — Outbound vendor threads are household-bound capabilities

- Status: accepted
- Date: 2026-08-24

### Context

The WhatsApp allowlist permits replies from a contact Kaki messaged first. A
global set of outbound JIDs accepted the reply but did not retain which household
authorised the thread, creating an ambiguous tenant boundary.

### Decision

Store each outbound thread as `jid -> householdId`. Creating a new vendor thread
requires `sendForHousehold(householdId, jid, message)`; ordinary channel `send`
does not silently grant inbound access. Resolution returns the bound household
with the outbound-thread reason.

### Consequences

Vendor replies can be routed and audited without guessing a tenant. Callers must
provide household context when initiating an external thread, and revocation
removes the capability. Existing family/group sends continue through the normal
channel method.
