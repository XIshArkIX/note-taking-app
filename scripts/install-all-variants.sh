#!/usr/bin/env bash
# Run a clean install for every variant under variants/ (skips shared/).
# After each install the variant's node_modules is symlinked to the repo root
# so tooling can be verified immediately if needed.
#
# Usage:
#   scripts/install-all-variants.sh
#   scripts/install-all-variants.sh [variant-glob]   # e.g. "bun-*" "pnpm-none-*"
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$REPO_ROOT/scripts/use-variant.sh"

FILTER="${1:-*}"

ok=()
failed=()

for dir in "$REPO_ROOT/variants/"$FILTER/; do
  [[ -d "$dir" ]] || continue
  variant="$(basename "$dir")"
  [[ "$variant" == "shared" ]] && continue

  echo ""
  echo "========================================"
  echo " Installing: $variant"
  echo "========================================"

  # Remove existing node_modules so we always do a truly clean install
  if [[ -d "$dir/node_modules" ]]; then
    echo "    Removing existing node_modules..."
    rm -rf "$dir/node_modules"
  fi

  if bash "$SCRIPT" "$variant"; then
    ok+=("$variant")
  else
    echo "ERROR: install failed for $variant" >&2
    failed+=("$variant")
  fi
done

echo ""
echo "========================================"
echo " Summary"
echo "========================================"
echo "  OK    (${#ok[@]}): ${ok[*]:-none}"
echo "  FAILED (${#failed[@]}): ${failed[*]:-none}"
echo ""

if [[ ${#failed[@]} -gt 0 ]]; then
  exit 1
fi
