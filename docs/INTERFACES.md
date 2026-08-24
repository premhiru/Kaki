# Kaki interface contracts

This document is normative for package integration. The compile-time source of
truth is `packages/core/src/contracts/index.ts`. Runtime boundaries must validate
the equivalent schema before accepting data; TypeScript types alone are not a
security boundary.

## Common conventions

- Identifiers are opaque non-empty strings. Do not derive authorisation from an
  ID prefix or provider identifier.
- Timestamps are UTC RFC 3339 strings. Durations are integer milliseconds.
- Currency is ISO 4217 and monetary amounts are integer minor units. Never use a
  floating-point number for money.
- Coordinates use WGS84 decimal degrees.
- Optional fields are omitted, not set to `null`, unless a provider explicitly
  distinguishes null from absence.
- Boundary payloads are JSON-compatible. Binary data is stored in a protected
  blob store and represented by `MediaRef`/`EvidenceRef`.
- Every command that may be retried carries an `idempotencyKey`. Every event and
  trace carries the originating `taskId` and `traceId`.
- `metadata` is for non-sensitive integration hints. It must never contain a
  credential, government ID, raw payment instrument, message body, or binary.
- Unknown object fields are rejected on commands and accepted-but-ignored on
  events within the same major protocol version.

## Channel

`InboundMessage` is the only message shape allowed beyond a channel adapter.
Provider-specific raw events remain inside the adapter or a short-retention,
access-controlled evidence store.

```ts
interface InboundMessage {
  id: string;
  channel: ChannelKind;
  from: { jid: string; personId?: string };
  chat: { id: string; isGroup: boolean };
  text?: string;
  audio?: MediaRef;
  image?: MediaRef;
  doc?: DocumentRef;
  location?: GeoLocation;
  replyTo?: MessageReference;
}
```

Channel adapters must deduplicate provider message IDs before invoking the core.
They must preserve reply/quote relationships, group identity and the sender JID.
Identity resolution may add `personId`; an adapter must not guess it. Unknown or
non-allowlisted inbound senders are rejected before model or media processing,
except a reply in a Kaki-originated vendor thread authorised by policy.

Outbound content supports text, markdown-lite, images, documents, emulated
buttons and reactions. Adapters degrade predictably: unsupported buttons become
a numbered reply card, and unsupported markdown becomes plain text. `Channel`
implementations report typed delivery receipts and classify retryable errors.

## Tool

A tool is a typed, named capability with a JSON Schema input and an explicit risk
category. Tool names are stable dot-separated identifiers such as
`sg.lta.bus_arrival`. A registration fails if the schema, risk or implementation
is missing.

```ts
interface Tool<TArgs, TResult> {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  riskCategory: RiskCategory;
  requiresApproval?: boolean | ApprovalRequirement<TArgs>;
  run(ctx: ToolRunContext, args: TArgs): Promise<ToolResult<TResult>>;
}
```

`ToolRunContext` is capability-limited. It provides IDs, locale, abort signal,
logger, approved grant (if one exists), and evidence/trace sinks; it does not
expose the complete household record or secret values. Tools that need a secret
request a named secret handle from the executor. `requiresApproval: false` does
not override policy—the policy service always makes the final decision.

Tools return provenance (`source`, observation time, optional freshness) with
external data. A side-effecting tool also returns a reconciliation reference so
the executor can determine whether a timed-out write actually completed.

## Surface

The four surfaces are `browser`, `phone`, `approval`, and `api`.

```ts
interface Surface {
  readonly kind: SurfaceKind;
  execute(step: SurfaceStep, ctx: SurfaceContext): Promise<SurfaceResult>;
  screenshot(ctx: SurfaceContext): Promise<ScreenRef>;
  trace(ctx: SurfaceContext): Promise<Trace>;
}
```

A `SurfaceStep` is declarative and carries an action, target, validated input,
step budget, timeout, dry-run flag, risk category and idempotency key. Nodes must
reject a step for another household/task, an unsupported protocol version, an
expired capability, or an action outside their allowlist.

`need_approval` is a normal surface result, not an exception. The evidence must
show the material facts while redacting secrets. The caller creates an approval
card and later resubmits the step with a single-use `ApprovalGrant`. `done` means
the claimed outcome was verified, not merely that a tap or click occurred.

## Approval and policy

An `ApprovalCard` is an immutable snapshot of the proposed irreversible action.
It is bound to the task, step, household, requesting person, policy decision,
material-facts hash, evidence and expiry. Display renderers may shorten copy but
may not omit or modify material facts.

Material facts by category include:

| Category                            | Required facts                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `money.transfer` / `money.purchase` | amount, currency, payee/merchant, reference/purpose, fees if known           |
| `booking`                           | provider/vendor, date/time, people/items, price, cancellation terms if known |
| `message.external`                  | recipient identity, message preview, whether this is a new contact/thread    |
| `gov.singpass`                      | agency/service, requested disclosure or transaction, handoff type            |
| `account.change`                    | account/provider, field/action being changed, consequence                    |
| `data.share`                        | recipient, fields/categories disclosed, purpose                              |

`PolicyDecision` is `auto`, `ask`, or `deny`, with a stable reason code, human
explanation, evaluated rule and facts hash. Defaults are household messages auto;
known-payee money below the configured S$30 cap auto; money at/above the cap ask;
new external contacts ask once per thread; bookings and Singpass ask; account
changes ask. A household may make policy stricter. It may not configure automatic
Singpass or account changes.

An approval decision is first-writer-wins and idempotent. An `ApprovalGrant` is
single-use, expires with the card, and is valid only for the original facts hash.
Amount, recipient, booking time, disclosure, account action or target changes
invalidate it. Approval never authorises additional steps implicitly.

## Trace

A `Trace` is a redacted task execution record with ordered steps, screen refs and
cost. Each `TraceStep` contains timing, surface/tool, redacted action/observation,
outcome, retry count and evidence refs. `TraceCost` separates model tokens,
provider fees and transaction estimates by currency.

Screen images must be redacted before persistent storage. Traces must not contain
passwords, OTPs, cookies, auth headers, NRIC/FIN/passport values, bank account or
card numbers, raw QR payment payloads, full medical results, or another person's
private message. Store sensitive evidence separately with a retention policy and
household/person access labels.

## Skill

The canonical internal `Skill` contains normalised front matter plus body and
source. On disk, `SKILL.md` uses this YAML front matter:

```yaml
id: sg.daily.bus-mrt-now
title: Bus and MRT now
when_to_use: Check live Singapore bus arrivals or train disruptions
inputs:
  type: object
  required: [origin]
surfaces: [api]
approvals: []
locales: [sg]
languages: [en, zh, ms, ta]
version: 1.0.0
```

The loader normalises `when_to_use` to the internal `when` field. It may accept
`when` as a compatibility alias, but writing uses `when_to_use`. `approvals`
contains risk categories/checkpoint names, not an instruction to bypass policy.
SemVer is required. A learned skill also records `learned_from` as sanitised
trace references and must not gain new surfaces or risk capabilities during an
automatic refinement.

Skill fixture manifests declare inputs, initial state, expected surface/tool
steps, approvals, output assertions and redaction assertions. Live credentials
or recordings with household data are forbidden in fixtures.

## Memory entities

All entities extend `MemoryEntity` with `id`, `householdId`, timestamps,
`privacy`, `version`, and optional non-sensitive tags. `privacy` specifies owner,
audience and sensitivity; it is enforced during both writes and recall.

- `Household`: locale, timezone, member IDs, important place IDs, approval policy
  reference, quiet hours and encryption-key reference.
- `Person`: relationship, channel identities, languages/register, birthday,
  dietary needs, preferences and optional commute/school/clinic references.
- `Place`: normalised address, WGS84 point, country, postal code, planning area,
  label and source; access controlled because a home address is sensitive.
- `Vendor`: trade/category, channel identities, rating source, quote summaries,
  last-contact time and consent/thread state.
- `Account`: provider, display label, owner, capability flags and secret handle.
  It records existence only—never username, password, PIN, token, full account
  number, balance or transactions.

Household membership does not imply access to every entity. For example, a
person's medical and financial facts default to owner-only, whereas dietary
needs may be household-shared. Child-safe recall excludes financial, medical,
government-ID and adult-private facts regardless of ranking score.

## Locale packs

```ts
interface LocalePackLoader {
  list(): Promise<LocalePackDescriptor[]>;
  load(locale: LocaleCode, options?: LocaleLoadOptions): Promise<LocalePack>;
  validate(pack: LocalePack): Promise<LocaleValidationResult>;
}
```

A complete pack contains persona/register guidance, lexicon, calendars, formats,
dietary data, channel/model defaults and eval cases. `sg` is complete; `my`, `id`,
`th`, `vn` and `ph` must declare whether each component is complete; `mm` and
`kh` may report `stub`. Loaders merge packaged data with household overrides
without mutating either source. They reject unknown normalisation targets,
invalid locale/currency/timezone codes, ambiguous format regexes and calendars
without source/update metadata.

Locale choice follows the speaking person and message, not merely household
country. Formatting country and response language are independent—for example,
a Mandarin reply can still use Singapore dates, addresses and dollars.

## Protocol envelope

Commands and events crossing a process boundary use `ProtocolEnvelope<T>` with
`protocolVersion`, unique `id`, `type`, `occurredAt`, `traceId`, `taskId`,
`householdId`, optional `personId`, and `payload`. Major versions must match.
Minor additions are compatible when receivers ignore unknown event fields.

Errors use stable codes and one of `validation`, `unauthorised`, `policy`,
`unavailable`, `timeout`, `rate_limited`, `external_changed`, `needs_human`, or
`internal`. Only errors explicitly marked `retryable` may be retried, and writes
also require outcome reconciliation. Public error messages are safe to display;
internal/provider diagnostics stay in redacted logs.

## Contract ownership and change process

1. Propose the semantic change here and in the TypeScript contract together.
2. Add producer and consumer fixtures, including malformed and older-version
   payloads.
3. For a breaking change, introduce a new protocol major and migration/adapter;
   do not silently reinterpret an existing field.
4. Security- or approval-relevant additions require a policy test and audit
   representation.
5. Update the corresponding ADR when the change revises an architectural choice.
