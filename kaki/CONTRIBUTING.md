# Contributing to Kaki

## Setup

Use Node.js 22 and the pnpm version declared in `package.json`.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

## Changes

- Keep TypeScript strict and use canonical interfaces from `@kaki/core`.
- Add a deterministic fixture and an acceptance assertion for every skill or integration behavior.
- Keep production transports wired even when CI uses an injected fixture transport.
- Preserve policy and approval boundaries; model output and learned skills never grant authority.
- Use conventional commit messages and the `codex/` branch prefix when creating a branch.
- Update relevant docs, `docs/PROGRESS.md`, and an agent handoff for substantial subsystem work.

## Security and privacy

Never commit real names, JIDs, phone numbers, addresses, account balances, cookies, QR payloads, government IDs, credentials, auth state, or unredacted screenshots. Use synthetic `.test` domains and clearly fake identifiers. Run:

```sh
pnpm security:scan
pnpm audit --audit-level high
pnpm --filter @kaki/security test
```

Report vulnerabilities privately to the repository owner; do not open a public issue containing exploit details or household data.

## Tests

Before requesting review:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:qa
pnpm test:e2e
pnpm evals
pnpm acceptance
```

`pnpm acceptance` may report live checks pending. Do not fabricate `artifacts/live` evidence or describe fixture success as live success.

## Fixtures

Fixtures conform to `evals/schema/fixture.schema.json`. Redact source recordings before reducing them to the smallest deterministic reproduction. A runtime replay adapter must return actual product output; `expected` is the contract, not execution proof.

## Pull requests

Explain the user-visible outcome, risk boundary, tests run, fixture/live status, migrations, and rollback. Keep unrelated edits out of the change. Changes to money, identity, approval, secrets, or privacy require a focused security review.
