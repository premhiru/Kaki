# Deploy Kaki

Run one long-lived Gateway on a household-controlled Ubuntu 24.04 or macOS host. Keep the Gateway, Chrome CDP endpoint, ASR, local models, and Android node on localhost, a private container network, or an approved Tailscale tailnet. Never publish CDP, ADB, model, or ASR ports to the internet.

## Choose a path

- Use Docker Compose when the Gateway, Chrome, ASR, and optional local models should be isolated together.
- Use the checked-in systemd units for an always-on Ubuntu host with host-managed Chrome/model services.
- On macOS, use `kaki onboard --classic --install-daemon` or `kaki gateway install`; OpenClaw owns the launchd service.

Both paths use the canonical root `kaki` launcher and OpenClaw's SQLite, channel, service, and backup owners. Do not run `kaki/scripts/kaki.ts` as a separate configuration system; it is only a compatibility forwarder.

## Deploy with Docker Compose

### Create private environment files

From the repository root:

```sh
umask 077
cp kaki/.env.example kaki/.env
printf 'OPENCLAW_GATEWAY_TOKEN=%s\n' "$(openssl rand -hex 32)" >> kaki/.env
printf 'KAKI_BROWSER_TOKEN=%s\n' "$(openssl rand -hex 32)" >> kaki/.env
```

Edit `kaki/.env` locally and add only the providers you enable. Keep it untracked. `OPENCLAW_GATEWAY_TOKEN` protects the host-facing Gateway; `KAKI_BROWSER_TOKEN` protects Browserless inside the private Compose network. They must be different.

### Validate and build the exact checkout

```sh
node kaki/scripts/verify-deployment.mjs
docker compose --env-file kaki/.env -f kaki/docker-compose.yml config --quiet
docker compose --env-file kaki/.env -f kaki/docker-compose.yml build gateway
```

The Gateway image is built from the current checkout with the Kaki plugin selected. Node base images are digest-pinned in the root Dockerfile. Browserless, Speaches, Ollama, and vLLM are digest-pinned in the Compose file. A digest update is a reviewed dependency change, not an automatic production pull.

### Start and onboard

Start Chrome, run onboarding against the shared persistent volumes, then start the Gateway:

```sh
docker compose --env-file kaki/.env -f kaki/docker-compose.yml up -d chrome
docker compose --env-file kaki/.env -f kaki/docker-compose.yml run --rm onboard onboard --classic
docker compose --env-file kaki/.env -f kaki/docker-compose.yml run --rm onboard \
  config set browser \
  '{"enabled":true,"defaultProfile":"browserless","profiles":{"browserless":{"cdpUrl":"ws://chrome:3000?token=${KAKI_BROWSER_TOKEN}","attachOnly":true}}}' \
  --strict-json
docker compose --env-file kaki/.env -f kaki/docker-compose.yml run --rm onboard config validate
docker compose --env-file kaki/.env -f kaki/docker-compose.yml up -d gateway
```

The separate one-shot `onboard` service lets the wizard commit `gateway.mode=local` before the long-lived Gateway starts. The `config set` command wires the private Browserless service through OpenClaw's canonical remote-CDP profile. Its single-quoted JSON stores the `${KAKI_BROWSER_TOKEN}` reference, not the token value; do not remove the single quotes or print the resolved config. The Gateway does not use `--allow-unconfigured`; a missing or malformed config fails visibly instead of running behind a permanent bypass.

The named `kaki-state` volume contains Kaki's config, workspace, credentials, and SQLite databases. `kaki-auth-secrets` keeps auth-profile encryption material outside that state volume. Browser cookies/profile state uses the separate `chrome-data` volume. Treat all three as credentials.

### Add local ASR

Speaches supplies a real OpenAI-compatible transcription service. Start it explicitly:

```sh
docker compose --env-file kaki/.env -f kaki/docker-compose.yml --profile local-asr up -d asr
```

Its container health check proves the API process is reachable, not that a selected Whisper model has downloaded or can transcribe. Download the operator-selected model through Speaches' `/v1/models/{model-id}` API, then make `kaki status --deep` transcribe a synthetic, non-private sample before calling ASR healthy. Model files persist in `asr-models`.

### Add one local model server

For Ollama:

```sh
docker compose --env-file kaki/.env -f kaki/docker-compose.yml --profile local-ollama up -d ollama
docker compose --env-file kaki/.env -f kaki/docker-compose.yml exec ollama ollama pull <reviewed-model>
```

For an NVIDIA host with vLLM, set `KAKI_VLLM_MODEL` and start the alternative profile:

```sh
docker compose --env-file kaki/.env -f kaki/docker-compose.yml --profile local-vllm up -d vllm
```

Do not start both by habit. Select the provider during onboarding and verify the exact configured model. vLLM needs a compatible NVIDIA runtime and enough VRAM; failure to reach `/health` keeps the service unhealthy.

### Inspect the running deployment

```sh
docker compose --env-file kaki/.env -f kaki/docker-compose.yml ps
docker compose --env-file kaki/.env -f kaki/docker-compose.yml logs --tail=100 gateway
docker compose --env-file kaki/.env -f kaki/docker-compose.yml run --rm cli gateway status
docker compose --env-file kaki/.env -f kaki/docker-compose.yml run --rm cli status --deep
```

The Gateway is published only on `127.0.0.1`. Chrome, ASR, Ollama, and vLLM have no host port. Use an authenticated local browser, SSH tunnel, or reviewed Tailscale Serve configuration for remote UI; never change those internal services to public `ports`.

## Deploy with systemd on Ubuntu 24.04

### Create the service identity

Install a clean reviewed release checkout at `/opt/kaki`, then create private state and environment paths:

```sh
sudo useradd --system --home-dir /var/lib/kaki --create-home --shell /usr/sbin/nologin kaki
sudo install -d -o kaki -g kaki -m 0700 /var/lib/kaki
sudo install -d -o root -g kaki -m 0750 /etc/kaki
sudo touch /etc/kaki/kaki.env
sudo chown root:kaki /etc/kaki/kaki.env
sudo chmod 0640 /etc/kaki/kaki.env
sudo chown -R kaki:kaki /opt/kaki
sudo -u kaki /opt/kaki/kaki/scripts/install.sh --bin-dir /var/lib/kaki/bin
```

Do not put `.env`, OAuth tokens, WhatsApp credentials, or browser profiles in `/opt/kaki`. Put service-only environment values in `/etc/kaki/kaki.env`, one `NAME=value` per line, and keep the file mode at `0640`.

### Onboard as the service user

The system unit uses `/var/lib/kaki` as both `HOME` and `KAKI_HOME`. Use the same values during onboarding:

```sh
sudo -u kaki env HOME=/var/lib/kaki KAKI_HOME=/var/lib/kaki \
  /usr/bin/node /opt/kaki/kaki.mjs onboard --classic
```

Complete model, WhatsApp, Telegram, data, household, approval, phone, locale, and ASR collection before starting the daemon. Put `KAKI_PHONE_NODE_ID=<exact-id>` in `/etc/kaki/kaki.env` after phone pairing.

### Install and start the units

```sh
sudo install -o root -g root -m 0644 kaki/scripts/systemd/kaki.service /etc/systemd/system/kaki.service
sudo install -o root -g root -m 0644 kaki/scripts/systemd/kaki-phone-health.service /etc/systemd/system/kaki-phone-health.service
sudo install -o root -g root -m 0644 kaki/scripts/systemd/kaki-phone-health.timer /etc/systemd/system/kaki-phone-health.timer
sudo systemd-analyze verify /etc/systemd/system/kaki.service /etc/systemd/system/kaki-phone-health.service /etc/systemd/system/kaki-phone-health.timer
sudo systemctl daemon-reload
sudo systemctl enable --now kaki.service
sudo systemctl enable --now kaki-phone-health.timer
```

`kaki.service` runs `gateway run` in the foreground and restarts real failures. Exit 78 is an intentional configuration/ingress conflict and is not restart-looped. The phone timer queries the Gateway every five minutes and exits non-zero unless the configured phone node is paired and connected; inspect it with:

```sh
sudo systemctl status kaki.service kaki-phone-health.timer
sudo journalctl -u kaki.service -u kaki-phone-health.service --since today
```

## Configure private remote access

Prefer Tailscale with device approval and narrow ACLs. Keep the Gateway bound to loopback and follow the maintained OpenClaw Tailscale Serve path. Do not use Funnel for the Control UI. The browser token, Gateway token, ADB endpoint, and phone pairing credentials remain operator secrets even on a tailnet.

## Back up before upgrades

Use the Gateway-owned online backup API; never recursively copy live `.sqlite`, `-wal`, `-shm`, or credential directories:

```sh
kaki backup create --output <encrypted-backup-directory> --verify
```

For a scheduled private Git backup, initialize a dedicated repository and use `kaki backup enable`. Remote Git backups exclude secret-bearing tables by default; do not add `--include-secrets` unless the remote is private, encrypted, access-reviewed, and the recovery need outweighs permanent credential history. See [Operations runbook](RUNBOOK.md#backup-and-restore).

## Upgrade safely

1. Create and verify a canonical backup.
2. Pause side effects and reconcile pending approvals/deliveries.
3. Fetch the reviewed release and install with the frozen lockfile.
4. Run `kaki doctor --fix`, deployment verification, fixture/QA gates, and any documented migrations.
5. Restart the Gateway and run live read-only model/channel/node/browser/ASR probes.
6. Re-enable low-risk work first; money, bookings, and consent automation resume last.

Clean Ubuntu/macOS onboarding, live account linking, physical Android proof, and Gmail OAuth require operator-controlled hosts/accounts. Until those checks are recorded against the exact build, deployment is implemented but not release-certified.
