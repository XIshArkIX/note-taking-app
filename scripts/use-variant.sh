#!/usr/bin/env bash
# Switch the active package manager variant by symlinking its node_modules to
# the repo root. Optionally runs a command after the switch.
#
# Usage:
#   scripts/use-variant.sh <variant-name>
#   scripts/use-variant.sh <variant-name> <command> [args...]
#
# Examples:
#   scripts/use-variant.sh bun-none-nextjs-vitest-playwright
#   scripts/use-variant.sh bun-none-nextjs-vitest-playwright bun run build
#   scripts/use-variant.sh pnpm-none-nextjs-vitest-playwright pnpm test
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VARIANT="${1:?Usage: scripts/use-variant.sh <variant-name> [command...]}"
shift || true
VARIANT_DIR="$REPO_ROOT/variants/$VARIANT"

if [[ ! -d "$VARIANT_DIR" ]]; then
  echo "ERROR: variant '$VARIANT' not found at $VARIANT_DIR" >&2
  exit 1
fi

# ── detect package manager from the variant name prefix ───────────────────
case "$VARIANT" in
  bun-*)  PKG_MGR="bun"  ;;
  npm-*)  PKG_MGR="npm"  ;;
  yarn-*) PKG_MGR="yarn" ;;
  pnpm-*) PKG_MGR="pnpm" ;;
  *)
    echo "ERROR: cannot detect package manager for variant '$VARIANT'" >&2
    exit 1
    ;;
esac

# ── install if node_modules are missing ───────────────────────────────────
if [[ ! -d "$VARIANT_DIR/node_modules" ]]; then
  echo "==> Installing $VARIANT with $PKG_MGR..."
  case "$PKG_MGR" in
    bun)  (cd "$VARIANT_DIR" && bun install --frozen-lockfile) ;;
    npm)  (cd "$VARIANT_DIR" && npm ci) ;;
    yarn) (cd "$VARIANT_DIR" && yarn install --immutable) ;;
    pnpm) (cd "$VARIANT_DIR" && pnpm install --frozen-lockfile) ;;
  esac
fi

# ── swap node_modules at the repo root ────────────────────────────────────
NM_PATH="$REPO_ROOT/node_modules"

# Remove existing root node_modules (real dir or previous symlink)
if [[ -L "$NM_PATH" ]]; then
  rm "$NM_PATH"
elif [[ -d "$NM_PATH" ]]; then
  echo "WARNING: $NM_PATH is a real directory, not a symlink. Removing..." >&2
  rm -rf "$NM_PATH"
fi

ln -s "$VARIANT_DIR/node_modules" "$NM_PATH"
echo "==> node_modules -> variants/$VARIANT/node_modules"

# ── run command if provided ───────────────────────────────────────────────
if [[ $# -gt 0 ]]; then
  exec "$@"
fi
