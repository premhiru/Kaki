# Deployment

## Supported shape

Run the gateway on a household-controlled Linux or macOS host with persistent encrypted storage. Keep Chrome and the Android node on a trusted local network or Tailscale tailnet. Do not expose the gateway, browser debugging port, ADB, or control UI directly to the public internet.

## Compose scaffold

```sh
cp .env.example .env
docker compose up -d
docker compose ps
```

The checked-in Compose file is a **development scaffold**. Its ASR service is a Python HTTP placeholder, not MERaLiON; the gateway status command is not the always-on production daemon; and provider images are not pinned for a release. Replace these with built, pinned Kaki images and health checks before deployment.

Persist and back up `~/.kaki` securely. Chrome profiles, WhatsApp auth, databases, traces, and evidence have different privacy/retention requirements; do not put them in a public Git repository or unencrypted cloud folder.

## Service manager

For production, wrap the installed gateway in launchd or systemd with:

- a dedicated unprivileged user;
- `KAKI_HOME` set to a dedicated absolute directory;
- restart-on-failure with bounded backoff;
- restrictive file permissions (`0700` directories, `0600` secrets/config);
- network access only to configured providers and local nodes;
- logs sent through structured redaction;
- no unrestricted shell or host filesystem mount.

Systemd unit files are not yet included, so systemd deployment remains a documented target rather than verified release evidence.

## Remote access

Prefer Tailscale with device approval and ACLs. Bind the control UI to localhost or the tailnet address, require authentication, and deny subnet-wide access to phone/browser control endpoints.

## Upgrade

1. Run an encrypted backup and verify its manifest.
2. Read `docs/PROGRESS.md` and migration notes.
3. Stop outbound tasks and drain the delivery ledger.
4. Install with the lockfile, run migrations, then run fixture checks.
5. Start services and run live read-only health probes before re-enabling side effects.
