# FORK-SURGEON

## Delivered

- Established the strict Node 22/pnpm workspace and `@kaki/core` package.
- Added the `kaki` executable namespace, `KAKI_HOME`/`~/.kaki` path convention, atomic onboarding config creation, extra-channel feature flag, and honest deep-status output.
- Pinned OpenClaw and Hermes Agent revisions in `UPSTREAM.md`; retained MIT attribution in `THIRD_PARTY_NOTICES.md`.
- Ported the useful Hermes patterns as native TypeScript primitives: append-only durable delivery, bounded delegated-task fan-out, memory nudges, successful-trajectory skill creation, and failure-driven skill refinement.
- Added `@kaki/memory`: SQLite FTS5 recall with household/person privacy constraints and editable/deletable journey events.

## Test

```sh
corepack pnpm install
corepack pnpm check
KAKI_HOME=/tmp/kaki-test corepack pnpm --filter @kaki/core exec tsx src/cli.ts onboard --locale sg
KAKI_HOME=/tmp/kaki-test corepack pnpm --filter @kaki/core exec tsx src/cli.ts status --deep
```

On PowerShell, use `$env:KAKI_HOME = "$env:TEMP\\kaki-test"` before the CLI commands.

## Open issues

- The supplied repository was empty and had no OpenClaw Git objects. `UPSTREAM.md` records the immutable import boundary, but full upstream history still needs to be fetched and integrated by release engineering. This is stated explicitly so Kaki does not make a false provenance claim.
- Deep status has the real config probe but reports services as `not-configured` until channel/node/model owners register their health adapters.
- The learning store intentionally writes only under its injected root. Production wiring should point it at `packages/skills/learned` for source-controlled fixtures or `~/.kaki/skills/learned` for household-local skills.
