# Kaki

Kaki is a self-hosted household agent for Southeast Asia, starting with Singapore. It is designed to receive work from WhatsApp, Telegram, or WebChat and advance browser, Android-phone, API, and human-approval workflows to the last safe step.

Kaki is integrated into the canonical OpenClaw workspace as the `@openclaw/kaki`
plugin and is launched through the root `kaki` entry point. Deterministic fixture
coverage is broad, but it is **not a claim of live WhatsApp, Grab, Singpass, bank,
or government-portal readiness**. Live release evidence is tracked separately in
[Verification](docs/VERIFY.md).

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
cp kaki/.env.example .env
./kaki/scripts/install.sh
pnpm kaki onboard
pnpm --dir kaki test:qa
pnpm --dir kaki test:e2e
pnpm --dir kaki evals
pnpm --dir kaki acceptance
```

The installer always resolves and builds the repository root, even when invoked
from another directory. `pnpm --dir kaki acceptance` reports deterministic CI
evidence and pending live checks. It is expected to list live work until real
evidence exists. `pnpm --dir kaki acceptance:release` is stricter and must not
pass without non-fixture evidence for the exact build.

For an interactive household name and locale prompt, run:

```sh
pnpm kaki onboard
```

Before OpenClaw onboarding starts, the `kaki` launcher prepares the same workspace OpenClaw resolves from `OPENCLAW_WORKSPACE_DIR` (default `~/.kaki/workspace`). It installs the Singapore `SOUL.md` and all maintained and phone skill playbooks under `workspace/skills/`. Existing destination files are preserved byte-for-byte on later runs. Pass `--workspace <dir>` to seed and configure another workspace explicitly.

## Development checks

```sh
pnpm --dir kaki format:check
pnpm --dir kaki lint
pnpm --dir kaki typecheck
pnpm --filter @openclaw/kaki typecheck
pnpm --dir kaki test
pnpm --filter @openclaw/kaki test
pnpm --dir kaki coverage
pnpm --dir kaki test:qa
pnpm --dir kaki test:e2e
pnpm --dir kaki evals
pnpm --dir kaki security:scan
pnpm --dir kaki docs:check
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
- [Master-prompt requirements ledger](docs/REQUIREMENTS.md)
- [Deployment implementation handoff](docs/agents/DEPLOYMENT.md)
- [Contributing](CONTRIBUTING.md)

## Safety defaults

Kaki keeps secrets behind opaque handles, masks government and payment identifiers, rejects untrusted document/image/vendor instructions as authority, pauses on channel bans and rate limits, and requires policy/approval at irreversible boundaries. Do not use personal primary accounts or meaningful payment amounts during development.

## License and upstream

Kaki is MIT licensed. Fork provenance and pinned upstream information are in [UPSTREAM.md](UPSTREAM.md) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
