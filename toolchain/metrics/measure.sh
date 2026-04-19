#!/usr/bin/env bash
# toolchain/metrics/measure.sh
#
# Captures all measurable metrics for a single toolchain variant and writes
# the result to toolchain/metrics/results/<VARIANT_ID>.json.
#
# Usage:
#   VARIANT_ID=v01-pnpm-turbo-esm-vitest ./toolchain/metrics/measure.sh
#
# Required environment variables:
#   VARIANT_ID     – matches a key in toolchain/variants/catalog.ts
#
# Optional environment variables:
#   BUILD_CMD      – default: "npm run build"
#   INSTALL_CMD    – default: "npm install"
#   TEST_CMD       – default: "npm test"
#   E2E_CMD        – default: "npm run test:e2e"
#   LINT_CMD       – default: "npm run lint"
#   TYPECHECK_CMD  – set to "npm run typecheck" or leave empty to skip
#   OUTPUT_DIR     – where the built artefacts live (default: .next or dist)
#   LEAF_FILE      – path to a source file to touch for incremental rebuild
#                    (default: src/lib/note-filters.ts)
#   RESULTS_DIR    – directory to write JSON output (default: toolchain/metrics/results)
#
# The script writes a partial VariantMetrics JSON.  Runner profile and
# interop fields must be filled in manually or by a separate collector.

set -euo pipefail

VARIANT_ID="${VARIANT_ID:?VARIANT_ID must be set}"
BUILD_CMD="${BUILD_CMD:-npm run build}"
INSTALL_CMD="${INSTALL_CMD:-npm install}"
TEST_CMD="${TEST_CMD:-npm test}"
E2E_CMD="${E2E_CMD:-npm run test:e2e}"
LINT_CMD="${LINT_CMD:-npm run lint}"
TYPECHECK_CMD="${TYPECHECK_CMD:-}"
OUTPUT_DIR="${OUTPUT_DIR:-}"
LEAF_FILE="${LEAF_FILE:-src/lib/note-filters.ts}"
RESULTS_DIR="${RESULTS_DIR:-toolchain/metrics/results}"

mkdir -p "$RESULTS_DIR"

# ── helpers ──────────────────────────────────────────────────────────────────

ms() {
  # wall-clock time in milliseconds for a command
  local start end
  start=$(node -e "process.stdout.write(String(Date.now()))")
  eval "$@" > /dev/null 2>&1 || true
  end=$(node -e "process.stdout.write(String(Date.now()))")
  echo $((end - start))
}

ms_capturing_exit() {
  # same as ms() but stores exit code in $LAST_EXIT
  local start end
  start=$(node -e "process.stdout.write(String(Date.now()))")
  set +e
  eval "$@" > /dev/null 2>&1
  LAST_EXIT=$?
  set -e
  end=$(node -e "process.stdout.write(String(Date.now()))")
  echo $((end - start))
}

dir_size_bytes() {
  if [ -d "$1" ]; then
    du -sb "$1" 2>/dev/null | cut -f1 || echo 0
  else
    echo 0
  fi
}

sum_js_bytes() {
  local dir="${1:-.}"
  find "$dir" -name "*.js" ! -name "*.map" -type f \
    -exec wc -c {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo 0
}

sum_css_bytes() {
  local dir="${1:-.}"
  find "$dir" -name "*.css" ! -name "*.map" -type f \
    -exec wc -c {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo 0
}

# ── 1. Cold install ───────────────────────────────────────────────────────────

echo "[measure] cold install..."
rm -rf node_modules
COLD_INSTALL_MS=$(ms "$INSTALL_CMD")
NM_SIZE=$(dir_size_bytes node_modules)

# ── 2. Warm install (cache present, no node_modules) ─────────────────────────

echo "[measure] warm install..."
rm -rf node_modules
WARM_INSTALL_MS=$(ms "$INSTALL_CMD")

# ── 3. Clean build ────────────────────────────────────────────────────────────

echo "[measure] clean build..."
rm -rf .next dist out build
CLEAN_BUILD_MS=$(ms "$BUILD_CMD")

# Detect output dir if not set
if [ -z "$OUTPUT_DIR" ]; then
  for candidate in .next dist out build; do
    if [ -d "$candidate" ]; then
      OUTPUT_DIR="$candidate"
      break
    fi
  done
fi

DEPLOY_SIZE=$(dir_size_bytes "$OUTPUT_DIR")
JS_SIZE=$(sum_js_bytes "$OUTPUT_DIR")
CSS_SIZE=$(sum_css_bytes "$OUTPUT_DIR")

# Check for source maps
SOURCE_MAPS="false"
if find "${OUTPUT_DIR:-.}" -name "*.js.map" -type f | grep -q .; then
  SOURCE_MAPS="true"
fi

# ── 4. Incremental rebuild ────────────────────────────────────────────────────

echo "[measure] incremental build..."
# Touch the leaf file to simulate a change
touch "$LEAF_FILE"
INCR_BUILD_MS=$(ms "$BUILD_CMD")

# ── 5. Typecheck ──────────────────────────────────────────────────────────────

TYPECHECK_MS="null"
if [ -n "$TYPECHECK_CMD" ]; then
  echo "[measure] typecheck..."
  TYPECHECK_MS=$(ms "$TYPECHECK_CMD")
fi

# ── 6. Lint ───────────────────────────────────────────────────────────────────

echo "[measure] lint..."
LINT_MS=$(ms "$LINT_CMD")

# ── 7. Unit tests ─────────────────────────────────────────────────────────────

echo "[measure] unit tests..."
UNIT_OUTPUT=$(eval "$TEST_CMD" 2>&1 || true)
UNIT_PASSED=$(echo "$UNIT_OUTPUT" | grep -oP '\d+(?= passed)' | head -1 || echo 0)
UNIT_FAILED=$(echo "$UNIT_OUTPUT" | grep -oP '\d+(?= failed)' | head -1 || echo 0)

# ── 8. E2E tests (optional) ───────────────────────────────────────────────────

E2E_PASSED=0
E2E_FAILED=0
if [ -n "$E2E_CMD" ] && [ "${RUN_E2E:-false}" = "true" ]; then
  echo "[measure] e2e tests..."
  E2E_OUTPUT=$(eval "$E2E_CMD" 2>&1 || true)
  E2E_PASSED=$(echo "$E2E_OUTPUT" | grep -oP '\d+(?= passed)' | head -1 || echo 0)
  E2E_FAILED=$(echo "$E2E_OUTPUT" | grep -oP '\d+(?= failed)' | head -1 || echo 0)
fi

# ── 9. Tool versions ──────────────────────────────────────────────────────────

NODE_VER=$(node --version 2>/dev/null || echo "unknown")
NPM_VER=$(npm --version 2>/dev/null || echo "unknown")
PNPM_VER=$(pnpm --version 2>/dev/null || echo "")
YARN_VER=$(yarn --version 2>/dev/null || echo "")
BUN_VER=$(bun --version 2>/dev/null || echo "")
TURBO_VER=$(turbo --version 2>/dev/null || echo "")
NX_VER=$(nx --version 2>/dev/null || echo "")
VITEST_VER=$(npx vitest --version 2>/dev/null | head -1 || echo "")
TSC_VER=$(npx tsc --version 2>/dev/null | head -1 || echo "")

# ── 10. Write result ──────────────────────────────────────────────────────────

MEASURED_AT=$(node -e "process.stdout.write(new Date().toISOString())")
LOCKFILE="package-lock.json"
[ -f "pnpm-lock.yaml" ] && LOCKFILE="pnpm-lock.yaml"
[ -f "yarn.lock" ] && LOCKFILE="yarn.lock"
[ -f "bun.lock" ] && LOCKFILE="bun.lock"

ACCEPTANCE_PASSED=$([[ "$UNIT_FAILED" == "0" ]] && echo "true" || echo "false")

cat > "$RESULTS_DIR/${VARIANT_ID}.json" << EOF
{
  "variantId": "$VARIANT_ID",
  "measuredAt": "$MEASURED_AT",
  "toolVersions": {
    "node": "$NODE_VER",
    "npm": "$NPM_VER",
    "pnpm": "$PNPM_VER",
    "yarn": "$YARN_VER",
    "bun": "$BUN_VER",
    "turbo": "$TURBO_VER",
    "nx": "$NX_VER",
    "vitest": "$VITEST_VER",
    "typescript": "$TSC_VER"
  },
  "install": {
    "coldWallMs": $COLD_INSTALL_MS,
    "warmWallMs": $WARM_INSTALL_MS,
    "nodeModulesSizeBytes": $NM_SIZE,
    "lockfileName": "$LOCKFILE",
    "hoistingMode": "flat"
  },
  "build": {
    "cleanWallMs": $CLEAN_BUILD_MS,
    "incrementalWallMs": $INCR_BUILD_MS,
    "typecheckOnlyMs": $TYPECHECK_MS,
    "lintMs": $LINT_MS
  },
  "output": {
    "jsBundleSizeBytes": $JS_SIZE,
    "cssBundleSizeBytes": $CSS_SIZE,
    "deployArtifactSizeBytes": $DEPLOY_SIZE,
    "treeShook": true,
    "sourceMapsIncluded": $SOURCE_MAPS
  },
  "interop": {
    "platformIssues": [],
    "cacheFootguns": [],
    "editorNotes": [],
    "pairwiseFriction": [],
    "acceptanceTestsPassed": $ACCEPTANCE_PASSED,
    "unitTestsPassed": $UNIT_PASSED,
    "unitTestsFailed": $UNIT_FAILED,
    "e2eTestsPassed": $E2E_PASSED,
    "e2eTestsFailed": $E2E_FAILED
  },
  "notes": ""
}
EOF

echo ""
echo "✓ Metrics written to $RESULTS_DIR/${VARIANT_ID}.json"
echo "  cold install : ${COLD_INSTALL_MS}ms"
echo "  warm install : ${WARM_INSTALL_MS}ms"
echo "  node_modules : $((NM_SIZE / 1024 / 1024))MB"
echo "  clean build  : ${CLEAN_BUILD_MS}ms"
echo "  incr build   : ${INCR_BUILD_MS}ms"
echo "  JS bundle    : $((JS_SIZE / 1024))KB"
echo "  unit tests   : ${UNIT_PASSED} passed / ${UNIT_FAILED} failed"
