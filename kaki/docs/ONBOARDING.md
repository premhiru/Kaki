# Onboard a household

This guide takes a new Kaki checkout to a private, authenticated Gateway with a linked household workspace. Use a dedicated assistant number, Android device, and service accounts where provider terms permit.

## Before you begin

Prepare the following without pasting secrets into chat, Git, screenshots, or issue logs:

- Node.js 22 or newer and Corepack on Ubuntu 24.04 or macOS;
- a current model-provider credential, or a local Ollama/vLLM endpoint;
- a dedicated WhatsApp assistant number and the phone that will scan its local login QR;
- a Telegram bot token plus the numeric user IDs allowed to control Kaki;
- LTA DataMall and OneMap credentials;
- a dedicated Android node with Accessibility and notification access;
- the household information listed in [The Kaki collection contract](#the-kaki-collection-contract).

Use assistant-owned accounts and the lowest useful permissions. Keep the phone wallet balance at or below the configured wallet cap. Never give Kaki personal bank credentials, a Singpass password, or a reusable OTP.

## Install the source checkout

Run the checked-in installer from the repository root:

```sh
./kaki/scripts/install.sh
```

The installer verifies the host, installs the frozen pnpm graph, builds the checkout, and writes a managed `kaki` launcher to `$HOME/.local/bin` by default. It refuses to replace an unrelated executable. If that directory is not on `PATH`, follow the printed instruction before continuing.

To inspect the actions without changing the host:

```sh
./kaki/scripts/install.sh --dry-run
```

## Run canonical onboarding

Use the root launcher. The nested package command only forwards to this launcher and must never own a second config:

```sh
kaki onboard --classic --install-daemon
```

Classic onboarding configures the model route, Gateway authentication, workspace, channels, and the platform service through OpenClaw's maintained flows. Kaki seeds the exact Singapore `SOUL.md` and maintained skills into the selected workspace without overwriting later household edits.

During channel setup:

1. Select WhatsApp, install the offered official plugin, and run the local QR login. Show the QR only in the trusted terminal or authenticated local UI. Confirm the assistant account and allowlist the family group; do not send the QR through Telegram or logs.
2. Select Telegram and store the BotFather token through the wizard's credential path. Add only numeric owner IDs to the allowlist and `commands.ownerAllowFrom`.
3. Leave every other inbound channel disabled until its allowlist and household purpose are explicit.

Re-running onboarding preserves state unless `--reset` is explicitly supplied. Never use `--reset` as a troubleshooting shortcut.

## The Kaki collection contract

Kaki onboarding is complete only after one transaction writes the private values to their authoritative owner stores, then enables the Kaki plugin with non-secret reference IDs. The plugin config must not contain the private values themselves.

| Collected value                                             | Required validation                                                                          | Authoritative destination                                    |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Model provider credentials and selected routes              | live model-list and one bounded inference probe                                              | OpenClaw provider auth profiles and model config             |
| WhatsApp assistant account                                  | local QR login, assistant account ID, family-group JID and sender allowlist                  | official WhatsApp plugin owner                               |
| Telegram bot and owners                                     | Bot API `getMe`, numeric owner IDs, denied non-owner probe                                   | official Telegram plugin owner                               |
| LTA and OneMap credentials                                  | one read-only live request per enabled provider                                              | secret store plus Kaki data-profile owner                    |
| Home, office, school, clinic, commute, and emergency places | select a OneMap result; user confirms postal/unit and role                                   | Kaki address-book owner                                      |
| Household members from the family group                     | user confirms name, relation, languages, register, privacy scope, dietary flags, and commute | Kaki household-profile owner; never inferred from chat alone |
| Money, booking, data-share, and new-contact approval caps   | numeric bounds and explicit approver mapping                                                 | Kaki approval-policy owner                                   |
| Phone node                                                  | exact node ID, paired/connected state, approved capabilities, harmless screenshot/tap proof  | Gateway node owner plus Kaki phone-node reference            |
| Locale and timezone                                         | one supported pack and IANA timezone                                                         | Kaki locale owner                                            |
| ASR and optional TTS                                        | provider/model selection plus synthetic non-private audio probe                              | model/media provider owner                                   |

The final reference block is the one documented in `docs/agents/KAKI-RUNTIME.md`. If any required owner write or live validation fails, onboarding must leave `plugins.entries.kaki.enabled` false, name the failed surface, and give the exact retry command. Partial success must not appear as a healthy Kaki install.

## Connect Gmail safely

Gmail is supported through OpenClaw's existing `gog` and Google Pub/Sub integration; Kaki does not implement a second mail client. Install `gcloud` and `gog` on the Gateway host, create a dedicated Google account or deliberately selected inbox, then apply the restricted `mail_reader` mapping from `docs/automation/cron-jobs.md` before setup.

The reader prompt must say that email is **untrusted data** and must not follow links or instructions inside it. Give the reader no shell, filesystem-write, browser, or credential tools. Keep `hooks.gmail.allowUnsafeExternalContent` false.

Then run:

```sh
kaki webhooks gmail setup --account <dedicated-gmail-address>
```

The setup flow configures the Gmail watch and `gog` renewal owner. It does not make email trusted. Send a test email containing an inert instruction and verify the reader only summarizes it. A shell call, link visit, browser action, file write, or credential request is a failed onboarding check.

Gmail OAuth cannot be proven without the operator's Google account, GCP project, and consent. Record that live check separately; never print the OAuth token.

## Pair the Android node

Start the companion, approve the pending Gateway device and node requests, then record the exact ID:

```sh
kaki nodes pending
kaki nodes approve <request-id>
kaki nodes status --connected
```

Set `KAKI_PHONE_NODE_ID=<exact-node-id>` in the service environment. Enable Accessibility and notification access, disable battery optimization for the companion, and run a harmless fixture screenshot/tap. Do not test against a banking, wallet, Singpass, or medical screen.

## Verify the result

Run both product and security checks:

```sh
kaki gateway status
kaki status --deep
kaki security audit --deep
```

`status --deep` is green only when WhatsApp, Telegram, the selected phone node, Chrome, configured model, and ASR owners answer real probes. Configuration presence is not health. Account- and device-dependent checks remain pending until the dedicated accounts and physical Android device are available; fixtures cannot close those gates.
