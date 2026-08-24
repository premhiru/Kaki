# Kaki household control centre

The local control centre for a self-hosted Kaki household. It brings together approvals, household privacy, the dedicated Android phone, journey history, reviewed skills, locale settings, model cost, trace replay, and proactive monitors.

## Local use

```bash
pnpm install --frozen-lockfile
pnpm --filter @kaki/control-ui dev
```

The site uses Vinext and the Sites Vite integration, but Kaki is deployed as part of the household's own stack. No hosted database or object bucket is required for the representative UI.

## Checks

```bash
pnpm --filter @kaki/control-ui lint
pnpm --filter @kaki/control-ui test
```

The package test builds the application and verifies its server-rendered product surfaces. The controls currently demonstrate the interaction and accessibility contracts; gateway-backed persistence is wired by the self-hosted Kaki runtime.
