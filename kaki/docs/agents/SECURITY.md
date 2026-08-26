# Secure a Kaki household runtime

Kaki keeps irreversible actions behind policy and approval, treats extracted content as untrusted, and stores credentials outside ordinary config and logs. The security package supplies production owners for secrets and audit records while preserving injectable in-memory owners for isolated tests.

## Configure secret storage

Use the host keychain on macOS or Linux. `OsKeychainSecretBackend` invokes the macOS `security` command or freedesktop `secret-tool` directly, without a shell, and never writes command output to logs.

For Windows, headless Linux, or another host without a supported keychain command, set a 32-byte key in the Gateway service environment and use `EncryptedEnvSecretBackend`. The backend stores an AES-256-GCM envelope in the configured `.env.enc` path, writes through a mode-`0600` temporary file, and atomically replaces the previous envelope. The key must not be stored beside that file.

```ts
import { createProductionSecretBackend, SecretBroker } from "@kaki/security";

const backend = createProductionSecretBackend({
  encryptedFile: "/var/lib/kaki/credentials/secrets.env.enc",
  encryptionKey: process.env.KAKI_SECRET_ENCRYPTION_KEY,
});
const secrets = new SecretBroker(backend);
```

`createProductionSecretBackend` uses the encrypted backend when a key is supplied and otherwise selects the supported OS keychain command. Tools receive only task-, scope-, and expiry-bound `SecretHandle` values. They do not receive a general secret store.

## Persist audit records

Inject the Gateway's Kysely-backed implementation of `AuditRecordStore` into `TamperEvidentAudit`. The security package owns canonical HMAC chaining and recursive field redaction; the host owns synchronous transaction, retention, and lifecycle policy in the existing shared state database.

```ts
import { TamperEvidentAudit } from "@kaki/security";

const audit = new TamperEvidentAudit(auditKey, gatewayKyselyAuditStore);
```

Keep the audit HMAC key in the configured secret backend. Close the audit owner during Gateway shutdown. Every tool call records the attempted action after policy evaluation and then its terminal allowed, denied, or failed outcome. Never put raw channel-link QR data, OTPs, credentials, cookies, document text, or screenshots in audit fields.

`StandaloneSqliteAuditRecordStore` exists only for isolated local deployments and restart tests. It uses a separate `STRICT` database with WAL and a synchronous `BEGIN IMMEDIATE` append. Do not select that owner for an OpenClaw Gateway without explicit review of the dedicated-database lifecycle; canonical integration uses the shared Kysely store and does not bump the root schema autonomously.

## Enforce money and wallet caps

Construct `PolicyEngine` with integer minor-unit limits. `moneyAutoCapMinor` controls the known-payee automatic threshold, `denyMoneyAboveMinor` is the household-wide hard limit, and `walletCapMinor` denies wallet purchases or transfers above the dedicated stored-value-wallet cap. Callers must set `paymentRail: "wallet"` for wallet operations.

## Keep channel-link QR data local

Treat a WhatsApp or other channel-link QR as a credential. Before rendering it, call `assertTrustedLocalQrSurface`. Only an authenticated operator control surface or terminal reached over loopback or the household Tailnet is eligible. Do not place raw QR data in alerts, chat, traces, audit fields, browser notifications, or remote support output.

The security owner now exposes this guard. The WhatsApp channel adapter must also stop forwarding its raw QR field to the general alert sink before release.

## Apply trust boundaries

- Tag WhatsApp text, image OCR, PDF text, vendor replies, and web content with `assessUntrustedContent`.
- Allow summarization, but require independent trusted user intent and normal approval for any side effect.
- Call `redactJson` before logs and traces.
- Call `assertMemorySafe` before memory writes.
- Use `WorkspacePolicy`, `ShellPolicy`, capabilities, pacing, and `OutboundSessionGuard` at their owning executor boundaries.
- Never auto-install a third-party skill.

## Verify

```sh
pnpm --dir kaki --filter @kaki/security lint
pnpm --dir kaki --filter @kaki/security test
pnpm --dir kaki security:scan
```

The tests cover encrypted-at-rest storage, wrong-key rejection, scoped one-use handles, durable audit reopening and tamper detection, wallet caps, workspace and shell confinement, session guards, QR locality, and prompt injection delivered through images, PDFs, and vendor replies.

## Review before release

Security and persistent-state owners require explicit review. Confirm the production audit path, retention and backup policy, HMAC-key rotation procedure, service-environment key injection, and platform keychain availability. Physical device, live WhatsApp, and live provider verification still require operator credentials and must never print or retain them.
