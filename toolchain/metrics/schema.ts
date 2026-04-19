/**
 * Metrics schema for toolchain variant comparisons.
 *
 * Every variant run serialises a VariantMetrics object to
 * toolchain/metrics/results/<variantId>.json.  The CI pipeline
 * collects all result files and publishes them as build artifacts
 * so the final comparison report can ingest a stable, typed dataset.
 */

// ── Runner profile (frozen per study) ─────────────────────────────────────

export interface RunnerProfile {
  /** Identifier that matches the CI runner label (e.g. "ubuntu-22.04-4cpu"). */
  runnerId: string;
  os: string;
  cpuModel: string;
  cpuCores: number;
  ramGb: number;
  nodeVersion: string;
  /** Package manager version used to run install commands. */
  packageManagerVersion: string;
}

// ── Install metrics ────────────────────────────────────────────────────────

export interface InstallMetrics {
  /**
   * Cold install: no node_modules, no cache.
   * Captures worst-case first-run performance.
   */
  coldWallMs: number;
  /**
   * Warm install: node_modules absent but package manager cache present.
   * Simulates a typical CI cache hit.
   */
  warmWallMs: number;
  /** Size of node_modules in bytes after install. */
  nodeModulesSizeBytes: number;
  /** Lockfile name committed by this variant. */
  lockfileName: string;
  /** Whether hoisting is strict (pnpm default) or flat (npm/yarn default). */
  hoistingMode: "strict" | "flat" | "pnp";
}

// ── Build metrics ──────────────────────────────────────────────────────────

export interface BuildMetrics {
  /** Production build with no previous output directory. */
  cleanWallMs: number;
  /**
   * Incremental rebuild after touching a single leaf file.
   * For app bundlers: one component file.
   * For library bundlers: one exported utility.
   */
  incrementalWallMs: number;
  /** TypeScript type-check only (no emit), if the variant splits it. */
  typecheckOnlyMs: number | null;
  /** Lint pass only. */
  lintMs: number | null;
}

// ── Output size metrics ────────────────────────────────────────────────────

export interface OutputMetrics {
  /** Total size in bytes of all first-party JS sent to the browser. */
  jsBundleSizeBytes: number;
  /** Total size of all first-party CSS sent to the browser. */
  cssBundleSizeBytes: number;
  /**
   * Size of the full deployable artifact (e.g. .next/ or dist/ or Docker
   * image layer diff).  Use 0 when not measured.
   */
  deployArtifactSizeBytes: number;
  /** Whether tree-shaking was applied (observable from bundle analysis). */
  treeShook: boolean;
  /** Whether source maps are included in the production artifact. */
  sourceMapsIncluded: boolean;
}

// ── Interoperability notes ─────────────────────────────────────────────────

export interface InteropEntry {
  /** Short label for the tool pair, e.g. "pnpm+Turborepo". */
  pair: string;
  /** How severe the friction is (0 = none, 1 = minor, 2 = major). */
  severity: 0 | 1 | 2;
  description: string;
  /** Link to upstream issue or workaround docs. */
  referenceUrl?: string;
}

export interface InteropMetrics {
  /** Platform parity issues observed (e.g. Windows path separator bugs). */
  platformIssues: string[];
  /** Known cache invalidation footguns. */
  cacheFootguns: string[];
  /** Editor/IDE integration notes (tsserver, ESLint plugin, etc.). */
  editorNotes: string[];
  /** Qualitative friction pairs. */
  pairwiseFriction: InteropEntry[];
  /**
   * Whether all acceptance tests passed against this variant.
   * false = the variant does not fully implement the README spec.
   */
  acceptanceTestsPassed: boolean;
  /** Count from the vitest/jest run output. */
  unitTestsPassed: number;
  unitTestsFailed: number;
  /** Count from the Playwright run output. */
  e2eTestsPassed: number;
  e2eTestsFailed: number;
}

// ── Top-level result ────────────────────────────────────────────────────────

export interface VariantMetrics {
  /** Matches a key in toolchain/variants/catalog.ts. */
  variantId: string;
  /** ISO timestamp of when this measurement was taken. */
  measuredAt: string;
  runner: RunnerProfile;
  /** Exact versions of every tool used.  Keys are tool names, values are semver. */
  toolVersions: Record<string, string>;
  install: InstallMetrics;
  build: BuildMetrics;
  output: OutputMetrics;
  interop: InteropMetrics;
  /** Any free-form notes the operator wants to attach to this run. */
  notes: string;
}

// ── Aggregate report type ──────────────────────────────────────────────────

/** Collected across all variants for the final comparison report. */
export interface ComparisonReport {
  studyVersion: string;
  generatedAt: string;
  runner: RunnerProfile;
  variants: VariantMetrics[];
}
