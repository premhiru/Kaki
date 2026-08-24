#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null || [ "$(node -p 'Number(process.versions.node.split(`.`)[0])')" -lt 22 ]; then
  echo "Node.js 22+ is required." >&2
  exit 1
fi
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm build
echo "Kaki installed. Run: pnpm kaki onboard"
