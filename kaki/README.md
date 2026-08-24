# Kaki

Kaki is a self-hosted household agent for Southeast Asia, starting with Singapore. It is designed to receive work from WhatsApp, Telegram, or WebChat and advance browser, Android-phone, API, and human-approval workflows to the last safe step.

This repository is an early implementation with broad deterministic fixture coverage. It is **not yet a claim of live WhatsApp, Grab, Singpass, bank, or government-portal readiness**. Live release evidence is tracked separately in [Verification](docs/VERIFY.md).

## Requirements

- Node.js 22 or newer
- Corepack and pnpm 11.7
- Git
- Docker with Compose for the development service scaffold
- For live phone workflows: a dedicated Android device, ADB, and assistant-owned accounts with a capped wallet

Ubuntu 24.04 and macOS are the intended installation targets. Windows is supported for development but is not part of the §20 installer acceptance claim.

## Quickstart

```sh
git clone <your-kaki-repository> kaki
cd kaki
cp .env.example .env
./scripts/install.sh
pnpm kaki onboard --non-interactive
pnpm test:qa
pnpm test:e2e
pnpm evals
pnpm acceptance
```

`pnpm acceptance` reports deterministic CI evidence and pending live checks. It is expected to list live work until real evidence exists. `pnpm acceptance:release` is stricter and must not pass without non-fixture evidence.

For an interactive household name and locale prompt, run:

```sh
pnpm kaki onboard
```

The current alpha onboarding command creates `~/.kaki/config.json`, WhatsApp auth, Chrome profile, and trace directories. It reads provider/channel settings from environment variables. Channel linking, Android pairing, household-person mapping, addresses, dietary preferences, and provider secrets still require the production transports and setup described in [Onboarding](docs/ONBOARDING.md).

## Development checks

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:qa
pnpm test:e2e
pnpm evals
pnpm security:scan
pnpm audit --audit-level high
```

Fixture replay checks recorded contracts unless a runtime adapter is explicitly supplied. See [Evaluation architecture](evals/README.md) before interpreting a green result.

## Repository guide

- [Architecture](docs/ARCHITECTURE.md)
- [Interfaces](docs/INTERFACES.md)
- [Decisions](docs/DECISIONS.md)
- [Personas](docs/PERSONAS.md)
- [Onboarding](docs/ONBOARDING.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Runbook](docs/RUNBOOK.md)
- [Verification](docs/VERIFY.md)
- [Skill catalogue](docs/SKILLS.md)
- [Locale guide](docs/LOCALE.md)
- [Progress](docs/PROGRESS.md)
- [Contributing](CONTRIBUTING.md)

## Safety defaults

Kaki keeps secrets behind opaque handles, masks government and payment identifiers, rejects untrusted document/image/vendor instructions as authority, pauses on channel bans and rate limits, and requires policy/approval at irreversible boundaries. Do not use personal primary accounts or meaningful payment amounts during development.

## License and upstream

Kaki is MIT licensed. Fork provenance and pinned upstream information are in [UPSTREAM.md](UPSTREAM.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
