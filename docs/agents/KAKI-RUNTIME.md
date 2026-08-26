---
summary: "Kaki runtime owner, authenticated HTTP, command, and onboarding integration contract"
read_when:
  - Wiring Kaki onboarding into the canonical OpenClaw launcher
  - Connecting the Kaki Control UI or Telegram control commands to live owners
  - Auditing which Kaki surfaces are implemented versus externally gated
title: "Kaki runtime integration"
---

The opt-in `kaki` plugin owns Kaki's authenticated control-plane boundary. It does not duplicate OpenClaw channels, provider credentials, approval authority, or persistence. A production adapter installs those authoritative owners in the Gateway process, and the plugin projects their bounded, redacted results to the Control UI and Telegram.

## Activate the plugin during onboarding

`kaki onboard` must commit one canonical OpenClaw configuration update after every required setup step succeeds. Set `plugins.entries.kaki.enabled` to `true` and write this non-secret reference object under `plugins.entries.kaki.config`:

```json5
{
  householdProfileId: "household-main",
  operatorPersonId: "person-owner",
  addressBookProfileId: "addresses-main",
  approvalPolicyProfileId: "approval-policy-main",
  dataProfileId: "sg-data-main",
  phoneNodeId: "android-household",
  whatsappAccountId: "assistant",
  telegramAccountId: "control",
  modelProfileId: "household-models",
  asrProfileId: "household-asr",
  locale: "sg",
}
```

`operatorPersonId` is the authoritative address-book person allowed to issue Control UI decisions. It is never inferred from a session, approval ID, or display name.

Do not put model keys, Telegram tokens, LTA or OneMap credentials, WhatsApp link material, addresses, dietary information, phone pairing secrets, or household private data in this object. Onboarding writes those values through their authoritative OpenClaw channel/provider/SecretRef or Kaki owner stores, then records only the IDs above. Partial setup leaves the plugin disabled; its schema requires the complete reference set.

Before the Gateway accepts Kaki requests, the runtime adapter must call `installKakiRuntimeOwners({ householdProfileId, owners })` from `extensions/kaki/runtime-api.ts`, or create the plugin with an `ownerFactory`, which installs and releases the binding through a Gateway service lifecycle. The binding ID must equal `plugins.entries.kaki.config.householdProfileId`. Missing or mismatched owners fail with `503` and a concrete onboarding/restart instruction; the plugin never substitutes demo data.

The public runtime API includes adapters for the real `@kaki/approval-node`, `@kaki/locale`, `@kaki/skills`, `@kaki/models`, and `@kaki/sg-data` contracts. The default lifecycle opens bounded, non-evicting `kaki-approvals` and `kaki-locale` namespaces through `api.runtime.state.openKeyedStore`, which stores them in the host's shared SQLite database without a schema-version bump. Approval decisions use the store's atomic `update` operation for status and grant CAS, plus the configured operator identity as the `ApprovalEngine` authorization input. `MemoryApprovalLedger` is test-only. Skill drafts, monitor enablement, and any cost ledger lifecycle are likewise injected owner state, not plugin-local files.

The root `kaki` launcher is the only supported CLI owner. Remove or route around the nested `kaki/scripts/kaki.ts` configuration path; it must not create a second config. The root launcher should make these operations additive OpenClaw workflows:

- `kaki onboard`: collect the §22 values, configure OpenClaw channels/providers and Kaki owner stores, write the plugin reference block atomically, seed the workspace, and restart the Gateway.
- `kaki status --deep`: probe Gateway auth, both Kaki HTTP routes, every installed owner, WhatsApp, Telegram, the phone node, Chrome, configured models, and ASR. Configuration presence is not live health.
- `kaki backup` and `kaki restore`: use the canonical OpenClaw backup path plus every Kaki owner store named by the reference block. Never create a plugin-local database or sidecar.

Outbound delivery must delegate to OpenClaw's durable channel/task delivery owners through the public runtime. Do not instantiate `kaki/packages/core/src/delivery/ledger.ts`: its JSONL store violates the database-first rule and duplicates the host's mature queue and delivery receipt lifecycle. If an owner needs a delivery operation the public SDK does not expose, record that exact missing host seam and fail visibly until it exists.

## HTTP boundary

The plugin registers two exact Gateway-authenticated, trusted-operator routes:

- `GET /api/kaki/snapshot`
- `POST /api/kaki/action`

Action requests require `Content-Type: application/json` and `x-kaki-intent: operator-action`. Bodies are limited to 100 KB and five seconds. Owner work is limited to ten seconds, responses to 1 MB, and concurrent control requests to eight. Actions use closed schemas, delegate once to the relevant owner, then return a fresh snapshot in the same response. `approval.decide` additionally requires the card's current `factsHash`; the plugin binds the configured `operatorPersonId` and the supplied hash to the owner decision. Wrong actors and stale hashes fail without changing the card.

The projection allowlists every response field. Extra owner fields such as raw QR payloads, cookies, tokens, passwords, and private adapter state are discarded. Root-relative phone frame URLs are accepted; arbitrary origins and inline data images are rejected. Owners must still redact evidence before returning it.

## Telegram controls

Kaki registers owner-only commands on Telegram. OpenClaw checks the channel allowlist, the household-owner fact, and the required operator scope before delegation.

| Command                            | Canonical owner         | Behavior                                                                                               |
| ---------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `/status`                          | OpenClaw host           | Existing Gateway status; Kaki must not shadow this reserved command.                                   |
| `/approve`                         | OpenClaw approval owner | Existing authoritative approval syntax; Kaki approval adapters bind their pending cards to that owner. |
| `/deny <approval-id> <facts-hash>` | Kaki approval owner     | Deny one pending card with actor authorization and material-facts CAS.                                 |
| `/relink-wa`                       | Kaki channel owner      | Start the trusted local WhatsApp relink flow without returning raw QR data in chat.                    |
| `/journey`                         | Kaki journey owner      | List the bounded journey timeline.                                                                     |
| `/household`                       | Kaki household owner    | List bounded household display records.                                                                |
| `/phone screenshot`                | Kaki phone owner        | Capture through the trusted phone evidence surface.                                                    |
| `/phone tap <visible-target>`      | Kaki phone owner        | Tap a bounded visible target.                                                                          |
| `/skills`                          | Kaki skill owner        | List maintained, learned, and phone skills.                                                            |
| `/cron`                            | Kaki automation owner   | List background schedules.                                                                             |
| `/locale [code]`                   | Kaki locale owner       | Show or set the locale.                                                                                |
| `/pause` and `/resume`             | Kaki system owner       | Pause or resume household automation.                                                                  |
| `/cost`                            | Kaki cost owner         | Show bounded cost totals.                                                                              |

The `kaki` plugin cannot register `/status`: the public SDK reserves it, and reserved ownership requires a bundled plugin whose ID is exactly `status`. It also must not intercept `/approve`, because doing so would bypass OpenClaw's authoritative exec/plugin approval flow.

## Control UI integration gate

`kaki/apps/control-ui` has a real same-origin HTTP client for these routes, but it is currently a standalone Vinext application. The public SDK can register a sandboxed Control UI tab backed by a Gateway-authenticated plugin path; the app does not yet ship a plugin-owned static bundle that such a route can serve.

Package the Vinext output inside the Kaki plugin, serve those immutable assets from an exact or prefix Gateway-authenticated plugin route, then register a `tab` descriptor with that path. Until that packaging and an authenticated Gateway browser replay pass, §19 is not live and the standalone `chatgpt.site` deployment is not proof of Gateway integration.

## External proof gates

Focused tests prove route declaration, request guards, closed schemas, redacted projection, owner delegation, command inventory, and owner authorization. Release proof still requires:

- a dedicated WhatsApp assistant account relink without QR leakage;
- a live Telegram owner and rejected non-owner command;
- a physical paired Android device for screenshot and tap;
- configured model, ASR, LTA, and OneMap credentials;
- the packaged Control UI loaded from the authenticated Gateway;
- clean Ubuntu 24.04 and macOS onboarding, deep status, backup, and restore.

The remaining owner gaps are exact: no production adapter currently supplies the Kaki household/address-book repository, journey repository, cost-event producer, trace repository, populated skill catalogue, monitor registry, or automation schedule projection. The phone package requires a configured physical transport and the channel relink owner requires live account authority. These surfaces therefore stay unavailable until the root launcher supplies lifecycle-bound implementations; the plugin does not replace them with process memory or JSON/JSONL state.

Never replace these gates with fixture or standalone-site evidence.
