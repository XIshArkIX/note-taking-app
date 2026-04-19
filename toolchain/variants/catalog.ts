/**
 * Curated variant catalog.
 *
 * Every variant is a concrete, runnable combination of tools.  The list is
 * curated (not a full Cartesian product) so that:
 *   - every tool listed in the plan appears in at least one variant
 *   - no two variants differ by more than two dimensions at once
 *     (isolates causation when numbers diverge)
 *   - the "app bundler" vs "library bundler" role is explicit for each entry
 *
 * Rows are sorted so that the reference variant (closest to the current repo)
 * comes first, followed by single-axis swaps, then larger combinations.
 */

// ── Type definitions ──────────────────────────────────────────────────────

export type PackageManager = "npm" | "pnpm" | "yarn-berry" | "bun";

export type MonorepoOrchestrator =
  | "none"
  | "turborepo"
  | "nx"
  | "lerna+nx";

export type ModuleFormat = "esm-cjs-dual" | "esm-only" | "cjs-only";

/**
 * App bundler — owns production bundle for the user-facing app.
 * Library bundler — only relevant when the variant extracts an internal package.
 */
export type AppBundler =
  | "next-swc"    // Next.js built-in (uses SWC under the hood)
  | "vite"        // Vite + React plugin
  | "remix";      // Remix (uses esbuild)

export type LibBundler =
  | "none"        // no internal library package in this variant
  | "tsup"        // tsup (wraps esbuild)
  | "rollup"      // Rollup 4
  | "rolldown";   // Rolldown (Rust-based Rollup replacement, beta)

export type Transpiler =
  | "swc"         // embedded in Next.js / explicit @swc/core
  | "esbuild"     // embedded in Vite / tsup
  | "tsc";        // tsc --isolatedModules for emit

export type TestRunner = "vitest" | "jest" | "node-test";

export type E2ERunner = "playwright" | "cypress";

export type CIHost = "github-actions" | "gitlab" | "gitea" | "teamcity";

export type TSPolicy =
  | "latest-only"       // always use @latest, no backward compat
  | "min-ts-5.0"        // support TS ≥ 5.0
  | "min-ts-4.9"        // support TS ≥ 4.9
  | "versioned-api";    // exports maps + API extractor per semver

// ── Variant shape ─────────────────────────────────────────────────────────

export interface VariantDimensions {
  packageManager: PackageManager;
  monorepo: MonorepoOrchestrator;
  /** Module format of the extracted internal package, if any. */
  moduleFormat: ModuleFormat;
  appBundler: AppBundler;
  libBundler: LibBundler;
  transpiler: Transpiler;
  unitTestRunner: TestRunner;
  e2eRunner: E2ERunner;
  ciHost: CIHost;
  tsPolicy: TSPolicy;
}

export interface Variant {
  id: string;
  /** Human-readable description for the comparison report. */
  label: string;
  dimensions: VariantDimensions;
  /**
   * Notes on why this combination was chosen or any known constraints.
   * Appears verbatim in the report.
   */
  rationale: string;
  /**
   * Known interoperability friction pairs (key = "toolA+toolB", value = short note).
   * Pre-populated where the friction is documented upstream.
   */
  knownFriction: Record<string, string>;
}

// ── Catalog ───────────────────────────────────────────────────────────────

export const VARIANTS: Variant[] = [
  // ── Group 1: Reference baselines ─────────────────────────────────────────

  {
    id: "v01-npm-none-esm-next-vitest-playwright-gh",
    label: "Reference: npm · no monorepo · Next.js/SWC · Vitest · Playwright · GitHub Actions",
    dimensions: {
      packageManager: "npm",
      monorepo: "none",
      moduleFormat: "esm-only",
      appBundler: "next-swc",
      libBundler: "none",
      transpiler: "swc",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "github-actions",
      tsPolicy: "latest-only",
    },
    rationale:
      "Closest to the current repository state.  Establishes the baseline " +
      "numbers all other variants are measured against.",
    knownFriction: {},
  },

  // ── Group 2: Package manager swaps (single axis, all else = v01) ──────────

  {
    id: "v02-pnpm-none-esm-next-vitest-playwright-gh",
    label: "pnpm swap: pnpm · no monorepo · Next.js/SWC · Vitest · Playwright · GitHub Actions",
    dimensions: {
      packageManager: "pnpm",
      monorepo: "none",
      moduleFormat: "esm-only",
      appBundler: "next-swc",
      libBundler: "none",
      transpiler: "swc",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "github-actions",
      tsPolicy: "latest-only",
    },
    rationale:
      "Isolates pnpm vs npm on install speed, disk usage, and strict " +
      "hoisting behaviour with Next.js peer deps.",
    knownFriction: {
      "pnpm+next": "pnpm hoist-pattern may need adjustment for Next.js " +
        "optional peer deps; see pnpm docs §publicHoistPattern.",
    },
  },

  {
    id: "v03-yarn-none-esm-next-vitest-playwright-gh",
    label: "Yarn swap: Yarn Berry · no monorepo · Next.js/SWC · Vitest · Playwright · GitHub Actions",
    dimensions: {
      packageManager: "yarn-berry",
      monorepo: "none",
      moduleFormat: "esm-only",
      appBundler: "next-swc",
      libBundler: "none",
      transpiler: "swc",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "github-actions",
      tsPolicy: "latest-only",
    },
    rationale:
      "Measures Yarn Berry PnP overhead vs npm flat install.  " +
      "Next.js requires `.yarnrc.yml: nodeLinker: node-modules` or " +
      "explicit patchedDependencies for PnP compat.",
    knownFriction: {
      "yarn-pnp+next": "Next.js does not support Yarn PnP without " +
        "nodeLinker: node-modules or explicit patches.",
    },
  },

  {
    id: "v04-bun-none-esm-next-vitest-playwright-gh",
    label: "Bun swap: Bun · no monorepo · Next.js/SWC · Vitest · Playwright · GitHub Actions",
    dimensions: {
      packageManager: "bun",
      monorepo: "none",
      moduleFormat: "esm-only",
      appBundler: "next-swc",
      libBundler: "none",
      transpiler: "swc",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "github-actions",
      tsPolicy: "latest-only",
    },
    rationale:
      "Bun is already used in the Docker workflow.  Measures install " +
      "speed advantage and checks for sharp / unrs-resolver native addon " +
      "rebuild compat (noted in package.json trustedDependencies).",
    knownFriction: {
      "bun+native-addons": "sharp and unrs-resolver require explicit " +
        "trustedDependencies in package.json; already present in this repo.",
    },
  },

  // ── Group 3: Monorepo orchestrator swaps ──────────────────────────────────
  // These variants introduce a minimal internal package (shared zod schemas)
  // so the monorepo orchestrator has something to orchestrate.

  {
    id: "v05-pnpm-turbo-esm-next-tsup-vitest-playwright-gh",
    label: "Turborepo: pnpm · Turborepo · Next.js/SWC · tsup lib · Vitest · Playwright · GitHub Actions",
    dimensions: {
      packageManager: "pnpm",
      monorepo: "turborepo",
      moduleFormat: "esm-cjs-dual",
      appBundler: "next-swc",
      libBundler: "tsup",
      transpiler: "swc",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "github-actions",
      tsPolicy: "versioned-api",
    },
    rationale:
      "Turborepo + pnpm is the most common greenfield monorepo stack in 2026. " +
      "The internal package emits dual ESM+CJS via tsup so downstream " +
      "consumers on older toolchains work without configuration.",
    knownFriction: {
      "pnpm+turbo": "Turborepo reads pnpm workspaces from pnpm-workspace.yaml; " +
        "pipeline cache keys must include pnpm-lock.yaml.",
      "tsup+dual": "tsup dual builds double the output artifact; ensure " +
        "turbo.json includes the dist/ directory in outputs.",
    },
  },

  {
    id: "v06-pnpm-nx-esm-next-rollup-vitest-playwright-gh",
    label: "Nx: pnpm · Nx · Next.js/SWC · Rollup lib · Vitest · Playwright · GitHub Actions",
    dimensions: {
      packageManager: "pnpm",
      monorepo: "nx",
      moduleFormat: "esm-only",
      appBundler: "next-swc",
      libBundler: "rollup",
      transpiler: "swc",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "github-actions",
      tsPolicy: "versioned-api",
    },
    rationale:
      "Nx provides the most granular affected-project detection.  Rollup is " +
      "used for the internal package to compare tree-shaking output size " +
      "against tsup (v05).",
    knownFriction: {
      "nx+next": "Nx Next.js plugin wraps next build; nx.json must set " +
        "targetDefaults.build.outputs to include .next.",
      "rollup+esm": "Rollup ESM-only output requires package.json exports " +
        "condition 'import' with type: module.",
    },
  },

  {
    id: "v07-npm-lerna-nx-esm-next-tsup-vitest-playwright-gh",
    label: "Lerna+Nx: npm · Lerna+Nx · Next.js/SWC · tsup lib · Vitest · Playwright · GitHub Actions",
    dimensions: {
      packageManager: "npm",
      monorepo: "lerna+nx",
      moduleFormat: "esm-cjs-dual",
      appBundler: "next-swc",
      libBundler: "tsup",
      transpiler: "swc",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "github-actions",
      tsPolicy: "min-ts-5.0",
    },
    rationale:
      "Represents teams that inherited Lerna and adopted Nx task execution " +
      "without migrating away from Lerna's versioning/publish flow.",
    knownFriction: {
      "lerna+nx": "Lerna delegates task execution to Nx via useNx: true in " +
        "lerna.json; ensure both config files stay in sync on cache settings.",
    },
  },

  // ── Group 4: App bundler swaps ────────────────────────────────────────────

  {
    id: "v08-pnpm-none-esm-vite-vitest-playwright-gh",
    label: "Vite: pnpm · no monorepo · Vite (esbuild) · Vitest · Playwright · GitHub Actions",
    dimensions: {
      packageManager: "pnpm",
      monorepo: "none",
      moduleFormat: "esm-only",
      appBundler: "vite",
      libBundler: "none",
      transpiler: "esbuild",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "github-actions",
      tsPolicy: "latest-only",
    },
    rationale:
      "Replaces Next.js with a Vite SPA that implements the same README " +
      "feature set.  Vitest shares Vite's config which eliminates the " +
      "transform overhead seen in v01.  Measures the bundle-size cost of " +
      "removing RSC/SSR infrastructure.",
    knownFriction: {
      "vite+idb": "No known issues; idb works in any browser context.",
    },
  },

  // ── Group 5: Assembly tool swaps (library layer) ──────────────────────────

  {
    id: "v09-pnpm-turbo-esm-next-rolldown-vitest-playwright-gh",
    label: "Rolldown: pnpm · Turborepo · Next.js/SWC · Rolldown lib · Vitest · Playwright · GitHub Actions",
    dimensions: {
      packageManager: "pnpm",
      monorepo: "turborepo",
      moduleFormat: "esm-only",
      appBundler: "next-swc",
      libBundler: "rolldown",
      transpiler: "swc",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "github-actions",
      tsPolicy: "versioned-api",
    },
    rationale:
      "Rolldown is a Rust-based Rollup-compatible bundler in active " +
      "development (2024–2026).  Same variant shape as v05 but swaps tsup " +
      "for Rolldown to compare library build speed.",
    knownFriction: {
      "rolldown+beta": "Rolldown API may not be stable; pin exact version " +
        "and document any workarounds in this entry's notes field.",
    },
  },

  {
    id: "v10-pnpm-none-esm-next-tsup-swc-vitest-playwright-gh",
    label: "SWC explicit: pnpm · no monorepo · Next.js · tsup+SWC lib · Vitest · Playwright · GitHub Actions",
    dimensions: {
      packageManager: "pnpm",
      monorepo: "none",
      moduleFormat: "esm-only",
      appBundler: "next-swc",
      libBundler: "tsup",
      transpiler: "swc",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "github-actions",
      tsPolicy: "latest-only",
    },
    rationale:
      "Uses @swc/core explicitly in tsup config (transpileOnly) rather than " +
      "tsup's default esbuild transpiler.  Isolates SWC vs esbuild compile " +
      "speed for the library layer.",
    knownFriction: {
      "tsup+swc": "tsup esbuildOptions and swcOptions cannot both be set; " +
        "choose one transpiler per tsup entry point.",
    },
  },

  // ── Group 6: Test runner swaps ────────────────────────────────────────────

  {
    id: "v11-pnpm-none-esm-next-jest-playwright-gh",
    label: "Jest: pnpm · no monorepo · Next.js/SWC · Jest · Playwright · GitHub Actions",
    dimensions: {
      packageManager: "pnpm",
      monorepo: "none",
      moduleFormat: "esm-only",
      appBundler: "next-swc",
      libBundler: "none",
      transpiler: "swc",
      unitTestRunner: "jest",
      e2eRunner: "playwright",
      ciHost: "github-actions",
      tsPolicy: "latest-only",
    },
    rationale:
      "Direct Vitest vs Jest comparison on the same acceptance test pack. " +
      "Requires jest-environment-node + @swc/jest transform.  Measures the " +
      "ESM configuration overhead that Jest still requires.",
    knownFriction: {
      "jest+esm": "Jest requires --experimental-vm-modules or Babel/SWC " +
        "transform for ESM source files.",
      "jest+fake-idb": "fake-indexeddb/auto is a pure-ESM package in v4+; " +
        "requires either jest --experimental-vm-modules or jest-environment-jsdom " +
        "with moduleNameMapper stub.",
    },
  },

  {
    id: "v12-pnpm-none-esm-vite-node-test-playwright-gh",
    label: "node:test: pnpm · no monorepo · Vite · node:test · Playwright · GitHub Actions",
    dimensions: {
      packageManager: "pnpm",
      monorepo: "none",
      moduleFormat: "esm-only",
      appBundler: "vite",
      libBundler: "none",
      transpiler: "esbuild",
      unitTestRunner: "node-test",
      e2eRunner: "playwright",
      ciHost: "github-actions",
      tsPolicy: "latest-only",
    },
    rationale:
      "Built-in node:test requires zero extra deps.  Paired with tsx " +
      "for TS execution.  Measures the operational overhead of no-framework " +
      "testing for the pure-logic acceptance tests.",
    knownFriction: {
      "node-test+tsx": "tsx must be installed and tests run via `node --import tsx`.",
    },
  },

  {
    id: "v13-pnpm-none-esm-vite-vitest-cypress-gh",
    label: "Cypress: pnpm · no monorepo · Vite · Vitest · Cypress · GitHub Actions",
    dimensions: {
      packageManager: "pnpm",
      monorepo: "none",
      moduleFormat: "esm-only",
      appBundler: "vite",
      libBundler: "none",
      transpiler: "esbuild",
      unitTestRunner: "vitest",
      e2eRunner: "cypress",
      ciHost: "github-actions",
      tsPolicy: "latest-only",
    },
    rationale:
      "Playwright vs Cypress comparison on the same E2E journey set.  " +
      "Cypress Component Testing is skipped; only E2E runner is swapped.  " +
      "IndexedDB access via cy.window().then(w => w.indexedDB) is compared " +
      "against Playwright's page.evaluate() approach.",
    knownFriction: {
      "cypress+idb": "Cypress cannot directly await IDB transactions; " +
        "use cy.window + custom commands or wait for UI updates instead.",
    },
  },

  // ── Group 7: CI host swaps ────────────────────────────────────────────────

  {
    id: "v14-pnpm-turbo-esm-next-tsup-vitest-playwright-gitlab",
    label: "GitLab CI: pnpm · Turborepo · Next.js · tsup lib · Vitest · Playwright · GitLab",
    dimensions: {
      packageManager: "pnpm",
      monorepo: "turborepo",
      moduleFormat: "esm-cjs-dual",
      appBundler: "next-swc",
      libBundler: "tsup",
      transpiler: "swc",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "gitlab",
      tsPolicy: "versioned-api",
    },
    rationale:
      "Same functional variant as v05 but on GitLab CI.  Compares pipeline " +
      "authoring cost, cache hit rates, and MR widget integration.",
    knownFriction: {
      "turbo+gitlab-cache": "Turborepo remote cache requires a self-hosted " +
        "cache server or third-party API; GitLab CI cache keys must include " +
        "turbo.json hash for correctness.",
    },
  },

  {
    id: "v15-pnpm-turbo-esm-next-tsup-vitest-playwright-gitea",
    label: "Gitea Actions: pnpm · Turborepo · Next.js · tsup lib · Vitest · Playwright · Gitea",
    dimensions: {
      packageManager: "pnpm",
      monorepo: "turborepo",
      moduleFormat: "esm-cjs-dual",
      appBundler: "next-swc",
      libBundler: "tsup",
      transpiler: "swc",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "gitea",
      tsPolicy: "versioned-api",
    },
    rationale:
      "Same as v14 on Gitea Actions (act-runner).  Measures runner resource " +
      "limits typical of self-hosted instances vs GitLab shared runners.",
    knownFriction: {
      "gitea+playwright": "Playwright requires a browser binary; use the " +
        "playwright Docker image as the job container or install Chromium " +
        "via apt in the runner.",
    },
  },

  {
    id: "v16-pnpm-turbo-esm-next-tsup-vitest-playwright-teamcity",
    label: "TeamCity: pnpm · Turborepo · Next.js · tsup lib · Vitest · Playwright · TeamCity",
    dimensions: {
      packageManager: "pnpm",
      monorepo: "turborepo",
      moduleFormat: "esm-cjs-dual",
      appBundler: "next-swc",
      libBundler: "tsup",
      transpiler: "swc",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "teamcity",
      tsPolicy: "versioned-api",
    },
    rationale:
      "TeamCity (Stash VCS integration, Kotlin DSL).  Baseline for " +
      "enterprise on-premise CI.  Measures build-chain definition overhead " +
      "and artifact publishing to TeamCity artefact repository.",
    knownFriction: {
      "teamcity+pnpm-cache": "TeamCity cache must be configured via a " +
        "Cache build feature; key the pnpm store path on pnpm-lock.yaml hash.",
      "stash+teamcity-trigger": "Stash/Bitbucket Server webhook triggers " +
        "require the TeamCity Bitbucket Server plugin.",
    },
  },

  // ── Group 8: TypeScript versioning / compat variants ─────────────────────

  {
    id: "v17-pnpm-turbo-dual-next-tsup-vitest-playwright-gh-ts-compat",
    label: "TS compat*: pnpm · Turborepo · Dual ESM+CJS · Next.js · tsup · TS min-4.9 · Vitest · Playwright",
    dimensions: {
      packageManager: "pnpm",
      monorepo: "turborepo",
      moduleFormat: "esm-cjs-dual",
      appBundler: "next-swc",
      libBundler: "tsup",
      transpiler: "swc",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "github-actions",
      tsPolicy: "min-ts-4.9",
    },
    rationale:
      "* TypeScript versioning axis (marked in plan).  Publishes the internal " +
      "package with downlevel .d.ts (using `downlevel-dts`) and tests that " +
      "a consumer project using TS 4.9 can import without errors.",
    knownFriction: {
      "tsup+downlevel-dts": "downlevel-dts rewrites .d.ts for older TS; " +
        "run it as a tsup postbuild hook.",
      "zod-v4+ts-4.9": "Zod 4 may use TS 5 template literal types; " +
        "verify .d.ts compat against the minimum supported TS version.",
    },
  },

  {
    id: "v18-pnpm-turbo-dual-next-tsup-vitest-playwright-gh-semver",
    label: "Semver contracts*: pnpm · Turborepo · Dual ESM+CJS · Next.js · tsup · API extractor · Vitest",
    dimensions: {
      packageManager: "pnpm",
      monorepo: "turborepo",
      moduleFormat: "esm-cjs-dual",
      appBundler: "next-swc",
      libBundler: "tsup",
      transpiler: "swc",
      unitTestRunner: "vitest",
      e2eRunner: "playwright",
      ciHost: "github-actions",
      tsPolicy: "versioned-api",
    },
    rationale:
      "* TypeScript versioning axis (marked in plan).  Adds @microsoft/api-extractor " +
      "to the internal package build to generate a single-file .d.ts rollup " +
      "and detect public API surface changes across semver bumps.",
    knownFriction: {
      "api-extractor+tsup": "api-extractor must run after tsup's dts output; " +
        "integrate via a postbuild script in package.json.",
      "dual-pkg-hazard": "Dual ESM+CJS packages risk the dual package hazard " +
        "(two instances loaded); document the conditions block in exports carefully.",
    },
  },
];

// ── Lookup helpers ─────────────────────────────────────────────────────────

export const VARIANT_MAP = new Map(VARIANTS.map((v) => [v.id, v]));

export const getVariant = (id: string): Variant => {
  const v = VARIANT_MAP.get(id);
  if (!v) throw new Error(`Unknown variant id: ${id}`);
  return v;
};

/** Returns all variants that exercise a given tool in any role. */
export const variantsByTool = (tool: string): Variant[] =>
  VARIANTS.filter(
    (v) =>
      Object.values(v.dimensions).includes(tool as PackageManager) ||
      JSON.stringify(v.dimensions).includes(tool),
  );
