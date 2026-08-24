# Operations runbook

## First response

1. Pause outbound work at the gateway/control plane.
2. Record the time, build SHA, affected household/task IDs, and redacted error code.
3. Preserve append-only audit and delivery-ledger state. Do not retain raw OTP, QR, cookie, credential, or identity screenshots.
4. Prefer read-only diagnosis. Re-enable side effects only after the affected policy and session checks pass.

## WhatsApp logout, ban, or 429

Kaki must stop outbound messages and alert Telegram on logout, ban, or rate limit.

- For `429`, leave outbound paused until the provider retry time. Do not rotate numbers, parallelise senders, or bypass pacing.
- For a suspected ban, stop all reconnect loops and vendor outreach. Review message volume, new-contact count, and terms before appeal/relink.
- For logout/session corruption, preserve a protected backup of `~/.kaki/wa/`, then request relink:

```sh
pnpm kaki wa relink
```

The current CLI records the request and auth path; a running Baileys transport must produce and display the actual QR. Scan with the dedicated assistant phone, confirm the allowlisted family group, send one test message, and verify reactions plus Telegram alert delivery.

Never commit, upload, or paste WhatsApp auth files. If they are exposed, revoke the linked device from WhatsApp before cleaning up local files.

## Phone-node reset

Start with non-destructive checks:

```sh
adb devices -l
adb shell dumpsys battery
adb shell dumpsys accessibility
```

Then:

1. Pause all phone tasks and confirm no approval is in progress.
2. Reconnect USB/Wi-Fi ADB and unlock the dedicated device locally.
3. Restart the Kaki companion and re-enable accessibility/notification permissions if Android revoked them.
4. Return to home, capture a redacted screenshot, dump the accessibility tree, and run a harmless fixture action.
5. If the vision loop stalled, archive the redacted trace, restart the target app, and verify the 40-step budget/recovery path.
6. Reboot only after state is reconciled. Never clear banking, wallet, or service-app data as an automated recovery step.

## Browser reset

Pause browser tasks, close the managed browser cleanly, and preserve the profile. Restart with the same household profile and run a read-only fixture. If the profile is corrupt, quarantine it and require the user to reauthenticate; never silently create an untracked identity session.

## Backup

The alpha CLI copies Kaki state and therefore produces a sensitive, unencrypted directory:

```sh
pnpm kaki backup /secure/offline/location
```

Encrypt the destination, restrict permissions, keep it outside the workspace, and verify that the dated directory contains config/database/audit data. Treat WhatsApp auth and browser profiles as credentials. A future release should add an encrypted manifest and selective retention.

## Restore

Restore only into an empty, stopped `KAKI_HOME`:

```sh
KAKI_HOME=/empty/kaki-home pnpm kaki restore /secure/offline/location/kaki-backup-YYYY-MM-DD
```

The CLI refuses overwrite. After restore, tighten permissions, start without outbound delivery, verify audit-chain/delivery-ledger integrity, run migrations and `status --deep`, then test read-only channels/nodes. Re-link sessions rather than trusting stale credentials after a security incident.

## Disaster recovery

For host loss:

1. Provision a clean patched host and dedicated user.
2. Restore the latest verified encrypted backup into an empty Kaki home.
3. Rotate provider/API tokens and audit keys that may have been exposed.
4. Re-link WhatsApp, Telegram webhook, Chrome sessions, and Android pairing.
5. Reconcile undelivered ledger entries without replaying irreversible actions.
6. Run CI fixtures, locale/security evaluations, and live read-only checks.
7. Re-enable approvals, then low-risk outbound work, then money/bookings last.

If no trusted backup exists, rebuild household configuration manually. Never reconstruct secrets or private memory from model logs.

## Secret or personal-data exposure

Pause affected transports, revoke credentials/sessions, preserve only redacted incident evidence, rotate keys, and scan Git history plus backups. Notify affected household members according to applicable law and service terms. Do not use the learning loop on the incident trace.
