# Kaki

Kaki now runs on the complete OpenClaw runtime. The fork includes its Gateway,
model providers, Baileys WhatsApp channel, Telegram and other channels, Gmail
Pub/Sub webhooks, managed browser, schedules and heartbeats, skills, plugin SDK,
MCP surfaces, Control UI, and companion apps. Kaki's existing Southeast Asian
product work is preserved in `kaki/` for integration through those runtime seams.

## Local source test

Prerequisites: Node.js 24.15+ (or another supported OpenClaw version) and pnpm.

```powershell
pnpm install
pnpm build
node .\kaki.mjs --version
node .\kaki.mjs onboard
node .\kaki.mjs gateway
```

The `kaki` launcher maps OpenClaw's state and config contracts to:

- state: `%USERPROFILE%\.kaki`
- config: `%USERPROFILE%\.kaki\kaki.json`
- override: `KAKI_HOME`

The upstream-compatible `openclaw` launcher remains available for diagnostics
and future upstream merges.

## Connect WhatsApp

After building and onboarding:

```powershell
node .\kaki.mjs plugins install clawhub:@openclaw/whatsapp
node .\kaki.mjs channels login --channel whatsapp
node .\kaki.mjs gateway
```

Scan the displayed QR in WhatsApp's **Linked devices** screen. A dedicated
WhatsApp number is recommended. Unknown senders use pairing by default; approve
requests in the Control UI or with `kaki pairing approve whatsapp <CODE>`.

## Connect Gmail

Gmail is event-driven through OpenClaw's authenticated Google integration and
Pub/Sub webhook surface. Complete `kaki onboard`, configure the Google account,
then follow the runtime's Gmail Pub/Sub setup under the scheduled-tasks/webhooks
documentation. Gmail account authorization and Google Cloud Pub/Sub resources
must be created by the operator; they are not embedded in this repository.

## What is live today

The existing Kaki Sites dashboard remains a private UI preview. It is not the
Gateway. To test real WhatsApp, Gmail, browser, schedules, tools, or approvals,
run the Gateway locally (or on a private always-on host) and open the upstream
Control UI it serves. Do not expose the Gateway directly to the public internet;
use its documented authentication and private-network deployment options.

## Integration boundary

The `kaki/` directory contains the earlier household UI and regional packages.
They are preserved without pretending they are already wired into every OpenClaw
runtime path. The integration sequence is: use the real OpenClaw runtime first,
then port Kaki modules into plugins and skills with boundary tests. See
`UPSTREAM.md` for the immutable upstream pin.

## Import validation

Validated on Windows with Node.js 24.15.0:

- `pnpm install`: passed for all 171 workspace projects; all 1,531 lockfile
  entries passed upstream supply-chain checks.
- Production compilation: the AI packages, shared packages, unified runtime,
  61 external plugins, 147 public plugin SDK exports, 48 plugin control-plane
  modules, and Control UI all built successfully.
- Kaki launcher: version, root help, `KAKI_HOME` config mapping, plugin discovery,
  and Gmail webhook help passed.
- WhatsApp discovery: the real `extensions/whatsapp` plugin loads without a
  plugin error and exposes the Baileys onboarding/login surface.
- WhatsApp tests: 1,300 passed, 11 skipped, and 35 failed on this Windows host.
  Failures include unavailable symlink privileges, `/tmp` assumptions, SQLite
  cleanup locks, one Windows shell-quoting assertion, and two upstream redaction
  assertions. These were not hidden or patched around.

The aggregate `pnpm build` command reaches its final metadata phase, then the
source-mode browser-help renderer exceeds its fixed 120-second timeout in this
OneDrive checkout. Direct dist-backed CLI help succeeds. This is recorded as a
validation gap until reproduced on a faster non-synced path or resolved upstream.
