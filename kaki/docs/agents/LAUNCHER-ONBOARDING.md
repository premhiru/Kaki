# Launcher onboarding

## Canonical owner

The repository-root `kaki.mjs` is the only Kaki command owner. It sets the Kaki state, config, and workspace paths, disables telemetry/update traffic for the Kaki executable, then delegates maintained operations to `openclaw.mjs`. The nested `kaki/scripts/kaki.ts` entrypoint only forwards to it.

`kaki wa relink [--account <id>] [--verbose]` is a narrow alias for `openclaw channels login --channel whatsapp`. The official WhatsApp plugin therefore remains responsible for plugin installation, QR display, auth state, and reconnection. The launcher never reads or relays QR payloads.

`kaki backup`, `kaki backup restore`, Gmail webhook commands, provider setup, channel setup, browser setup, nodes, and Gateway lifecycle commands continue through the canonical OpenClaw CLI unchanged. Kaki creates no second config, backup archive, credential file, or sidecar.

## Onboarding transaction

Before any wizard or provider work, the launcher applies one validated OpenClaw batch config mutation. It sets `wizard.appRecommendations=false` and `plugins.entries.kaki.enabled=false`. The Kaki executable therefore never sends installed-app labels to a model or ClawHub, recommends a third-party skill, or auto-installs one. Explicit operator-initiated installation of an official WhatsApp or Telegram plugin through the maintained channel setup remains available.

Without `--enable-extra-channels`, that same batch explicitly disables the LINE, Zalo, Matrix, IRC, Mattermost, and Microsoft Teams plugin entries. The launcher adds `--skip-channels` to the upstream wizard and then runs only the canonical WhatsApp add/login and Telegram add owner flows. This keeps unrelated channels out of default Kaki discovery while retaining each official plugin's credential and auth owner. Viber and Messenger have no canonical OpenClaw plugin entries in this checkout, so the skipped generic picker is their current default gate; no unknown plugin IDs are invented. With `kaki onboard --enable-extra-channels`, the custom flag is consumed by Kaki, the upstream channel wizard remains available, and any selected channel persists through its own canonical config. The flag never blindly enables a channel.

If the policy mutation fails, onboarding stops before the wizard and writes no workspace or Kaki references. If the base wizard or a required channel flow fails, the already-committed policy keeps the Kaki plugin disabled. After a successful base flow it seeds the exact Kaki soul and maintained skills without overwriting operator edits.

Full section 22 activation is not currently expressible through a public transactional owner API. OpenClaw owns model credentials, WhatsApp, Telegram, nodes, browser, and provider auth, but the checkout has no onboarding owner that can atomically validate and persist all of these Kaki-specific records:

- confirmed household and address-book records, including OneMap-selected places;
- approval caps and authoritative approver mapping;
- LTA and OneMap SecretRef-backed data profile bindings;
- physical phone-node capability proof;
- Kaki model and ASR profile bindings backed by live probes.

Accordingly, section 22 profile/reference collection is **unimplemented**, not an external-account-only live gate. The launcher does not collect the address, member, approval-cap, data-profile, phone-profile, model-profile, or ASR-profile reference set and cannot commit the complete `plugins.entries.kaki.config` block. Account credentials may be configured by their existing OpenClaw owners, but that partial setup is not Kaki onboarding completion.

The launcher therefore fails closed after base onboarding: the preflight already left `plugins.entries.kaki.enabled` false, no plugin reference block or household private values are written, the missing surfaces are printed, and the command exits non-zero. It does not invent IDs, store private values in plugin config, or claim fixture/config presence as validation. Retry `kaki onboard` after these owner flows exist; do not manually enable the plugin.

This is a release gate, not a completed section 22 implementation. A future implementation must perform all owner writes and live validations, then commit the complete non-secret reference block from `docs/agents/KAKI-RUNTIME.md` in one validated OpenClaw config mutation. Any failure must leave the plugin disabled and identify the exact retry.

## Deep status

`kaki status --deep` first runs the maintained OpenClaw deep status, which owns Gateway and channel probes. It then requests a short-lived dashboard connection description and probes both Gateway-authenticated Kaki routes:

- `GET /api/kaki/snapshot` must return `200`; building the snapshot calls every installed Kaki owner, so any unavailable owner makes the probe red.
- `GET /api/kaki/action` must return `405`; this proves the authenticated action boundary is present without performing a mutation.

The launcher uses the shared Gateway credential only as an HTTP bearer header and never prints it. SecretRef-managed auth that cannot be resolved by the public dashboard handoff, TLS trust failures, missing routes, unavailable owners, and malformed responses remain red. `--json` returns one object with separate `openclaw` and `kaki` results. Deep status exits non-zero unless both are green.

The current proof boundary is explicit. Upstream deep status performs real WhatsApp and Telegram channel probes. The Kaki snapshot performs a real phone-owner call together with every other installed snapshot owner. There is not yet a launcher-accessible, owner-scoped aggregate for Chrome, selected text-model inference, or ASR inference, so those section 20.1 checks are not reported green by this wrapper. Configuration presence is never substituted for those live probes.

## Focused proof

```sh
pnpm exec vitest run --config test/vitest/vitest.unit.config.ts test/kaki-workspace-seed.test.ts
pnpm exec oxfmt --check kaki.mjs test/kaki-workspace-seed.test.ts kaki/docs/agents/LAUNCHER-ONBOARDING.md
```

Credential-dependent proof still requires a dedicated linked WhatsApp account, Telegram bot and denied non-owner check, real provider credentials, a physical Android node, configured Chrome/model/ASR owners, and clean Ubuntu 24.04 and macOS hosts.
