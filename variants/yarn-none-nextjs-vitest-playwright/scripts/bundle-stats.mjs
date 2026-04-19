#!/usr/bin/env node
/**
 * variants/shared/scripts/bundle-stats.mjs
 *
 * Walks the build output directory, totals JS and CSS sizes, and writes
 * pipeline-report.json (+ optional GitLab metrics .txt).
 *
 * Environment variables:
 *   VARIANT      – variant folder name (used as label in report)
 *   BUILD_DIR    – override output directory (auto-detected if unset)
 *   BUILD_TIME   – build wall-clock time in ms (injected by CI step)
 *   INSTALL_TIME – install wall-clock time in ms
 *   LINT_TIME    – lint wall-clock time in ms
 *   TC_TIME      – typecheck wall-clock time in ms
 *   STATS_OUT    – output path (default: pipeline-report.json)
 */
import { readdir, stat, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

async function walk(dir) {
  let results = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      results = results.concat(await walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

async function dirExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

// ── detect output dir ──────────────────────────────────────────────────────
let outputDir = process.env.BUILD_DIR ?? null;
if (!outputDir) {
  for (const candidate of [".next", "dist", "out", "build"]) {
    if (await dirExists(candidate)) {
      outputDir = candidate;
      break;
    }
  }
}

let jsBytes = 0;
let cssBytes = 0;
let totalBytes = 0;

if (outputDir) {
  const files = await walk(outputDir);
  for (const f of files) {
    if (f.endsWith(".map")) continue;
    const s = await stat(f);
    totalBytes += s.size;
    const ext = extname(f);
    if (ext === ".js" || ext === ".mjs" || ext === ".cjs") jsBytes += s.size;
    if (ext === ".css") cssBytes += s.size;
  }
}

// ── build report ───────────────────────────────────────────────────────────
const report = {
  variant: process.env.VARIANT ?? "unknown",
  measuredAt: new Date().toISOString(),
  timings: {
    installMs: Number(process.env.INSTALL_TIME ?? 0),
    lintMs: Number(process.env.LINT_TIME ?? 0),
    typecheckMs: Number(process.env.TC_TIME ?? 0),
    buildMs: Number(process.env.BUILD_TIME ?? 0),
    totalMs:
      Number(process.env.INSTALL_TIME ?? 0) +
      Number(process.env.LINT_TIME ?? 0) +
      Number(process.env.TC_TIME ?? 0) +
      Number(process.env.BUILD_TIME ?? 0),
  },
  bundle: {
    outputDir: outputDir ?? "(not found)",
    jsBundleKb: Math.round(jsBytes / 1024),
    cssBundleKb: Math.round(cssBytes / 1024),
    totalArtifactKb: Math.round(totalBytes / 1024),
  },
};

const outPath = process.env.STATS_OUT ?? "pipeline-report.json";
await writeFile(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

// ── GitLab metrics format (optional) ─────────────────────────────────────
// Produces a file usable with artifacts:reports:metrics in GitLab CI.
const metricsPath = process.env.METRICS_OUT ?? null;
if (metricsPath) {
  const lines = [
    `js_bundle_kb ${report.bundle.jsBundleKb}`,
    `css_bundle_kb ${report.bundle.cssBundleKb}`,
    `total_artifact_kb ${report.bundle.totalArtifactKb}`,
    `install_ms ${report.timings.installMs}`,
    `lint_ms ${report.timings.lintMs}`,
    `typecheck_ms ${report.timings.typecheckMs}`,
    `build_ms ${report.timings.buildMs}`,
    `total_pipeline_ms ${report.timings.totalMs}`,
  ];
  await writeFile(metricsPath, lines.join("\n") + "\n");
}
