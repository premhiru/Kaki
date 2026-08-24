#!/usr/bin/env bash
set -euo pipefail

dry_run=false
case "${1:-}" in
  --dry-run) dry_run=true ;;
  "") ;;
  *)
    echo "Usage: $0 [--dry-run]" >&2
    exit 2
    ;;
esac

if ! command -v node >/dev/null || [ "$(node -p 'Number(process.versions.node.split(`.`)[0])')" -lt 22 ]; then
  echo "Node.js 22+ is required." >&2
  exit 1
fi

if $dry_run; then
  printf '%s\n' \
    "corepack enable" \
    "corepack pnpm install --frozen-lockfile" \
    "corepack pnpm build" \
    "Kaki installer dry run passed."
  exit 0
fi

corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm build
echo "Kaki installed. Run: pnpm kaki onboard"
