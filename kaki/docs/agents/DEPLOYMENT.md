# Deployment agent handoff

## Built

- Source installer for Ubuntu/Linux and macOS with host/version checks, frozen install, full build, managed launcher, dry-run, and refusal to overwrite unrelated binaries.
- One canonical CLI owner: the nested package entrypoint forwards to the repository-root `kaki.mjs` launcher and writes no config or state.
- Production Compose topology with a long-running Kaki Gateway, authenticated private Chromium, persistent state/auth/browser volumes, and optional digest-pinned Speaches ASR, Ollama, or vLLM profiles.
- First-boot Compose onboarding service that writes `gateway.mode=local` before the production Gateway starts; no permanent `--allow-unconfigured` bypass.
- Hardened systemd Gateway unit plus five-minute phone-node timer. The phone check calls canonical `nodes status --connected --json` and fails unless the configured node is paired and connected.
- Canonical OpenClaw archive, SQLite, and Git backup/restore runbook. No custom recursive state copier and no advice to put secrets in Git.
- Complete §22 onboarding collection contract, including optional Gmail Pub/Sub through the existing `gog` flow with an untrusted-content reader boundary.
- Static deployment contract verifier and exact host/Compose/systemd validation commands.

## Validate

```sh
node kaki/scripts/verify-deployment.mjs
bash -n kaki/scripts/install.sh
KAKI_BROWSER_TOKEN=fixture-browser-token \
OPENCLAW_GATEWAY_TOKEN=fixture-gateway-token \
  docker compose -f kaki/docker-compose.yml --profile local-asr --profile local-ollama --profile local-vllm config --quiet
```

On Ubuntu 24.04:

```sh
systemd-analyze verify \
  kaki/scripts/systemd/kaki.service \
  kaki/scripts/systemd/kaki-phone-health.service \
  kaki/scripts/systemd/kaki-phone-health.timer
```

## Live gates

- Clean Ubuntu 24.04 build/onboarding, Compose startup, systemd restart, and backup/restore rehearsal.
- Clean macOS install, launchd Gateway, and backup/restore rehearsal.
- Dedicated WhatsApp and Telegram account probes, physical Android phone health, Chrome session, configured model, and real ASR transcription.
- Gmail OAuth, Pub/Sub delivery, renewal after restart, and inert prompt-injection test with a dedicated Google account/GCP project.
- vLLM health on a compatible NVIDIA host; the default developer machine has no such proof.

Static checks or fixture accounts do not close these gates. Record redacted, exact-build evidence through `kaki/docs/VERIFY.md`.
