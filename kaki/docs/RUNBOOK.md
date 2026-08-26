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
- For logout/session corruption, create a verified canonical backup, stop the live listener, and relink through the official channel owner:

```sh
kaki backup create --output <encrypted-offline-directory> --verify
kaki channels login --channel whatsapp --account assistant
```

The running WhatsApp plugin produces the actual QR. Show it only in the trusted local terminal or authenticated UI, scan with the dedicated assistant phone, confirm the allowlisted family group, send one test message, and verify reactions plus Telegram alert delivery.

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

## Backup and restore

Kaki delegates backup to OpenClaw's canonical online-backup owner. It snapshots committed SQLite state, writes a manifest, rejects self-inclusion, and can verify the archive before returning success:

```sh
umask 077
kaki backup create --output <encrypted-offline-directory> --verify
```

Never use `cp -r`, filesystem snapshots without SQLite coordination, or a Git commit of the live Kaki state directory. A raw copy of live `.sqlite`, `-wal`, `-shm`, or `-journal` files can be torn. Archives include credentials, sessions, private household memory, and channel state; encrypt the destination, restrict access, and keep it outside the source checkout.

Verify the exact archive again before recovery:

```sh
kaki backup verify <archive.tar.gz>
kaki backup restore <archive.tar.gz> --target <fresh-staging-directory>
```

Restore never overwrites live state. It validates the manifest, archive paths, links, payload hashes, and SQLite databases, then extracts to an empty staging directory. Use `manifest.json` to locate the extracted state asset; do not infer its path from the filename.

Activate only while the Gateway and node hosts are stopped:

1. Create a new verified backup of current state, then stop Kaki.
2. Move the current state directory aside on the same protected filesystem; do not delete it.
3. Move the manifest-identified restored state asset into the configured `KAKI_HOME`, or point `KAKI_HOME` at that asset.
4. Run `kaki database preflight`, `kaki doctor --fix`, and `kaki plugins update <id>` for installed downloadable plugins.
5. Start the Gateway with outbound automation paused. Run `kaki gateway status`, `kaki status --deep`, audit/integrity checks, and read-only channel/node probes.
6. Reconcile approvals and delivery/dedupe state before resuming side effects. Relink WhatsApp and other ratcheting channel credentials if the rollback desynchronized them.

For scheduled protection, use a dedicated private Git backup repository through `kaki backup git init` and `kaki backup enable`. Pushed schedules redact credential-bearing tables by default. Do not turn on `--include-secrets` without an explicit encrypted/private remote and recovery need; Git history retains leaked secrets permanently.

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
