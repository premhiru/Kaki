#!/usr/bin/env bash
set -euo pipefail

dry_run=false
bin_dir="${KAKI_INSTALL_BIN_DIR:-$HOME/.local/bin}"

usage() {
  echo "Usage: $0 [--dry-run] [--bin-dir <absolute-directory>]" >&2
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run)
      dry_run=true
      shift
      ;;
    --bin-dir)
      if [ "$#" -lt 2 ]; then
        usage
        exit 2
      fi
      bin_dir="$2"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      usage
      exit 2
      ;;
  esac
done

case "$(uname -s)" in
  Linux | Darwin) ;;
  *)
    echo "Kaki source installation supports Ubuntu/Linux and macOS; use Docker on this host." >&2
    exit 1
    ;;
esac

case "$bin_dir" in
  /*) ;;
  *)
    echo "--bin-dir must be an absolute path: $bin_dir" >&2
    exit 2
    ;;
esac

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 22 or newer is required. Install Node, then rerun this installer." >&2
  exit 1
fi

node_major="$(node -p 'Number(process.versions.node.split(`.`)[0])')"
if [ "$node_major" -lt 22 ]; then
  echo "Node.js 22 or newer is required; found $(node --version)." >&2
  exit 1
fi

if ! command -v corepack >/dev/null 2>&1; then
  echo "Corepack is required. Install the Corepack package for your Node distribution." >&2
  exit 1
fi

script_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(CDPATH= cd -- "$script_dir/../.." && pwd -P)"
if [ ! -f "$repo_root/package.json" ] || [ ! -f "$repo_root/kaki.mjs" ]; then
  echo "Could not locate the Kaki repository root from $script_dir." >&2
  exit 1
fi

launcher="$bin_dir/kaki"
if $dry_run; then
  printf '%s\n' \
    "Repository root: $repo_root" \
    "Launcher: $launcher" \
    "corepack pnpm install --frozen-lockfile" \
    "corepack pnpm build" \
    "Kaki installer dry run passed."
  exit 0
fi

cd "$repo_root"
corepack pnpm install --frozen-lockfile
corepack pnpm build

mkdir -p "$bin_dir"

if [ -e "$launcher" ] && ! grep -Fq "# Kaki managed launcher" "$launcher" 2>/dev/null; then
  echo "Refusing to replace unmanaged launcher: $launcher" >&2
  exit 1
fi

launcher_tmp="$launcher.tmp.$$"
cleanup() {
  rm -f -- "$launcher_tmp"
}
trap cleanup EXIT HUP INT TERM
{
  echo '#!/bin/sh'
  echo '# Kaki managed launcher'
  printf 'exec node %s "$@"\n' "$(printf "'%s'" "$(printf '%s' "$repo_root/kaki.mjs" | sed "s/'/'\\\\''/g")")"
} >"$launcher_tmp"
chmod 700 "$launcher_tmp"
mv -f -- "$launcher_tmp" "$launcher"
trap - EXIT HUP INT TERM

echo "Kaki installed at $launcher."
case ":$PATH:" in
  *":$bin_dir:"*)
    echo "Next: run 'kaki onboard --classic --install-daemon'."
    ;;
  *)
    echo "Add $bin_dir to PATH, then run 'kaki onboard --classic --install-daemon'."
    ;;
esac
