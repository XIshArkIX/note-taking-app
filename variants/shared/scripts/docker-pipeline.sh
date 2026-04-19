#!/usr/bin/env bash
# Run install → lint → typecheck → build with wall-clock timings, then emit
# bundle + pipeline artifacts under PIPELINE_ARTIFACTS_DIR (default /pipeline-artifacts).
set -euo pipefail

cd /app

# Variant lockfiles omit babel-plugin-react-compiler; disable the flag for CI/Docker builds.
disable_react_compiler() {
	local f="$1"
	[[ -f "$f" ]] || return 0
	if command -v node >/dev/null 2>&1; then
		node -e "
    const fs = require('fs');
    const p = process.argv[1];
    let s = fs.readFileSync(p, 'utf8');
    s = s.replace(/reactCompiler:\\s*true/g, 'reactCompiler: false');
    fs.writeFileSync(p, s);
  " "$f"
	else
		NEXTCFG_PATH="$f" bun -e "
    const fs = require('fs');
    const p = process.env.NEXTCFG_PATH;
    let s = fs.readFileSync(p, 'utf8');
    s = s.replace(/reactCompiler:\\s*true/g, 'reactCompiler: false');
    fs.writeFileSync(p, s);
  "
	fi
}
disable_react_compiler next.config.ts
disable_react_compiler apps/notes-app/next.config.ts

ART="${PIPELINE_ARTIFACTS_DIR:-/pipeline-artifacts}"
mkdir -p "$ART"

now_ms() {
	if command -v node >/dev/null 2>&1; then
		node -p "Date.now()"
	else
		bun -e "process.stdout.write(String(Date.now()))"
	fi
}

elapsed() {
	local start="$1"
	local end
	end="$(now_ms)"
	echo $((end - start))
}

# Biome is configured with VCS ignore integration; Docker build context has no .git.
patch_biome_no_vcs() {
	local f="$1"
	[[ -f "$f" ]] || return 0
	if command -v node >/dev/null 2>&1; then
		node -e "
    const fs = require('fs');
    const p = process.argv[1];
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    j.vcs = { enabled: false, clientKind: 'git', useIgnoreFile: false };
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  " "$f"
	else
		BIOME_JSON_PATH="$f" bun -e "
    const fs = require('fs');
    const p = process.env.BIOME_JSON_PATH;
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    j.vcs = { enabled: false, clientKind: 'git', useIgnoreFile: false };
    fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\\n');
  "
	fi
}

find_biome_bin() {
	if [[ -x node_modules/.bin/biome ]]; then
		echo "node_modules/.bin/biome"
		return 0
	fi
	if [[ -x apps/notes-app/node_modules/.bin/biome ]]; then
		echo "apps/notes-app/node_modules/.bin/biome"
		return 0
	fi
	return 1
}

format_biome_file() {
	local f="$1"
	[[ -f "$f" ]] || return 0
	local biome_bin=""
	biome_bin="$(find_biome_bin || true)"
	if [[ -n "$biome_bin" ]]; then
		"$biome_bin" format --write "$f"
	elif [[ -f bun.lock ]]; then
		bun x biome format --write "$f"
	elif [[ -f pnpm-lock.yaml ]]; then
		pnpm exec biome format --write "$f"
	elif [[ -f yarn.lock ]]; then
		yarn exec biome format --write "$f"
	else
		npx --yes @biomejs/biome format --write "$f"
	fi
}

install_deps() {
	if [[ -f bun.lock ]]; then
		bun install --frozen-lockfile
	elif [[ -f pnpm-lock.yaml ]]; then
		pnpm install --frozen-lockfile
	elif [[ -f yarn.lock ]]; then
		yarn install --immutable
	else
		npm ci
	fi
}

run_script() {
	local name="$1"
	if [[ -f bun.lock ]]; then
		bun run "$name"
	elif [[ -f pnpm-lock.yaml ]]; then
		pnpm run "$name"
	elif [[ -f yarn.lock ]]; then
		yarn run "$name"
	else
		npm run "$name"
	fi
}

infer_build_dir() {
	if [[ -n "${PIPELINE_BUILD_DIR:-}" ]]; then
		export BUILD_DIR="$PIPELINE_BUILD_DIR"
		return
	fi
	case "${VARIANT:-}" in
	*lerna* | *nx-rollup* | *turborepo*)
		export BUILD_DIR="apps/notes-app/.next"
		;;
	*none-vite-* | *vite-nodetest*)
		export BUILD_DIR="dist"
		;;
	*)
		unset BUILD_DIR
		;;
	esac
}

run_stats() {
	infer_build_dir
	local stats="/usr/local/lib/bundle-stats.mjs"
	if [[ ! -f "$stats" ]]; then
		stats="./scripts/bundle-stats.mjs"
	fi
	if command -v node >/dev/null 2>&1; then
		node "$stats"
	else
		bun "$stats"
	fi
}

export VARIANT="${VARIANT:-unknown}"
export CI=true
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:-1}"

t0="$(now_ms)"
install_deps
patch_biome_no_vcs biome.json
patch_biome_no_vcs apps/notes-app/biome.json
format_biome_file biome.json
format_biome_file apps/notes-app/biome.json
INSTALL_TIME="$(elapsed "$t0")"

t0="$(now_ms)"
run_script lint
LINT_TIME="$(elapsed "$t0")"

t0="$(now_ms)"
run_script typecheck
TC_TIME="$(elapsed "$t0")"

t0="$(now_ms)"
run_script build
BUILD_TIME="$(elapsed "$t0")"

export INSTALL_TIME LINT_TIME TC_TIME BUILD_TIME
export STATS_OUT="${STATS_OUT:-$ART/pipeline-report.json}"
export METRICS_OUT="${METRICS_OUT:-$ART/bundle-metrics.txt}"
export SUMMARY_OUT="${SUMMARY_OUT:-$ART/pipeline-summary.txt}"

run_stats

echo "Pipeline artifacts written to $ART"
