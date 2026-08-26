# Kaki household control centre

The local control centre for a self-hosted Kaki household. It brings together approvals, household privacy, the dedicated Android phone, journey history, reviewed skills, locale settings, model cost, trace replay, and proactive monitors.

## Local use

```bash
pnpm install --frozen-lockfile
pnpm --filter @kaki/control-ui dev
```

The site uses Vinext and the Sites Vite integration, but Kaki is deployed as part of the household's own stack. By default it reads `GET /api/kaki/snapshot` and sends typed actions to `POST /api/kaki/action` on the authenticated same origin. An OpenClaw host can instead inject an existing authenticated client as `window.__KAKI_GATEWAY__`.

## Checks

```bash
pnpm --filter @kaki/control-ui lint
pnpm --filter @kaki/control-ui test
```

The package test builds the application, verifies the server-rendered surfaces, and exercises bounded snapshot/action requests, validation, timeouts, authentication failures, and visible outcomes. The UI contains no demo household records; without the authenticated plugin routes it reports the connection failure and disables actions.
