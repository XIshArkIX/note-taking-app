# TypeScript Versioning Axes `*`

> Items in this document are tagged `*` in the variant catalog
> (see `toolchain/variants/catalog.ts`, dimensions `tsPolicy`).
> Two independent axes are tracked: **maintaining contracts through versioning**
> and **supporting older TypeScript versions**.  They interact but are distinct
> problems.

---

## Axis 1 `*` — Maintaining Contracts Through Versioning

### Problem statement

When an internal package (e.g. `packages/notes-schema`) is published — even
only to a private registry or consumed as a workspace dep — its public API
surface must be stable within a semver range.  TypeScript types *are* the
API contract for library consumers: a type rename is a breaking change even if
the runtime behaviour is unchanged.

### Tooling

| Tool | Role | Config file |
|---|---|---|
| `@microsoft/api-extractor` | Generates a single-file `.d.ts` rollup and detects surface-level API changes | `api-extractor.json` |
| `tsup --dts` | Bundles `.d.ts` alongside the JS output; required input for api-extractor | `tsup.config.ts` |
| `publint` | Checks `package.json` exports/types fields are valid before publish | run as `npx publint` |
| `are-the-types-wrong` (attw) | Verifies the package resolves correctly under all module conditions | run as `npx attw --pack .` |

### `package.json` exports contract

For a dual ESM+CJS package the `exports` block must look like:

```json
{
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.mts",
        "default": "./dist/index.mjs"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  }
}
```

Omitting the `types` condition causes TypeScript to fall back to `typings`/`types`
at the root, which breaks CJS-consumer resolution when the package also exports
ESM types.

### Dual package hazard

When both `import()` and `require()` resolve to different module instances,
mutable state (e.g. Zod's schema registry) can be duplicated.  Mitigations:

- Keep the library **stateless** (pure validation schemas, pure utility
  functions).  The notes-schema package qualifies.
- Alternatively publish **ESM-only** (axis 2 below) and accept the older
  consumer friction instead of maintaining two code paths.

### API change detection in CI

Add an api-extractor step to the library build pipeline:

```bash
# In the library package's package.json scripts:
"build": "tsup && api-extractor run --local",
"build:ci": "tsup && api-extractor run"
```

`api-extractor run` (without `--local`) exits non-zero if the public API
surface changes relative to the committed `<package>.api.md` file.
Commit `<package>.api.md` and treat API surface diffs as mandatory PR review
items.  Bump minor for additions, major for removals or signature changes.

### Variant IDs that exercise this axis

- `v17-*-ts-compat` — ESM+CJS dual output + `downlevel-dts`
- `v18-*-semver` — ESM+CJS dual output + api-extractor

---

## Axis 2 `*` — Support for Older TypeScript Versions

### Problem statement

An app that consumes a library may be on an older TypeScript compiler.
Publishing types that use language features unavailable in the consumer's
compiler produces `ts(2xxx)` errors that are not the consumer's fault.

This matters when:
- The library uses `const` type parameters (TS 5.0+)
- The library uses `satisfies` (TS 4.9+)
- The library uses template-literal types, `infer ... extends` (TS 4.7+)
- The library imports Zod 4 types (verify minimum required TS version)

### Determining the minimum TS version

1. Run `npx tsc --version` in the library to confirm what the *build* uses.
2. Open a scratch consumer project at the target minimum TS version and run
   `npx tsc --noEmit` against the library's `.d.ts` output.
3. Alternatively, use a matrix test in CI (see below).

### tsconfig settings that affect consumer compatibility

| tsconfig field | Relevance |
|---|---|
| `target` | Does **not** affect emitted `.d.ts`; only affects JS output |
| `lib` | Affects which globals appear in types; set `"lib": ["ES2020"]` to avoid pulling in types absent in older envs |
| `strict` / `exactOptionalPropertyTypes` | Strict flags in the library `.d.ts` can make consumers fail if they use `strict: false` |
| `moduleResolution: bundler` | New in TS 5.0; consumers on TS 4.x cannot use this setting |
| `verbatimModuleSyntax` | New in TS 5.0 |

### `downlevel-dts`

`downlevel-dts` rewrites `.d.ts` files to remove syntax unavailable in older
TS versions.  Run it as a post-build step:

```bash
npx downlevel-dts dist dist/ts4.9 --to=4.9
```

Then add a `typesVersions` entry in `package.json` so TS 4.x consumers pick
up the downlevelled types automatically:

```json
{
  "typesVersions": {
    "<5.0": {
      "*": ["./dist/ts4.9/*"]
    }
  }
}
```

### `skipLibCheck` tradeoffs

Setting `skipLibCheck: true` in a consumer project silences type errors in
`.d.ts` files.  It is a blunt instrument: it hides genuine type bugs in the
library and can allow incompatible types to slip through.

**Recommendation**: never rely on `skipLibCheck: true` to ship a library.
Use it only as a temporary workaround while debugging a specific upstream
dependency.

### CI matrix test for TS compat

```yaml
# Example GitLab CI snippet
test:ts-compat:
  stage: test
  parallel:
    matrix:
      - TS_VERSION: ["4.9", "5.0", "5.4", "5.8"]
  script:
    - npm install --save-dev typescript@$TS_VERSION
    # Consumer project imports the library's built .d.ts
    - npx tsc -p tsconfig.consumer.json --noEmit
```

`tsconfig.consumer.json` imports from `./packages/notes-schema/dist/index.d.ts`
and uses the exact options a real consumer would.

### Variant IDs that exercise this axis

- `v17-*-ts-compat` — `min-ts-4.9` policy: builds downlevelled `.d.ts`,
  CI matrix tests against TS 4.9 and 5.x
- `v18-*-semver` — `versioned-api` policy: api-extractor, full exports map,
  no downlevel needed because it targets TS ≥ 5.0

---

## Summary table

| Variant       | tsPolicy         | Dual output | downlevel-dts | api-extractor | TS matrix test |
|---------------|------------------|:-----------:|:-------------:|:-------------:|:--------------:|
| v01–v04       | latest-only      | —           | —             | —             | —              |
| v05, v09, v10 | versioned-api    | dual        | —             | yes           | TS 5.x only    |
| v06           | versioned-api    | ESM-only    | —             | yes           | TS 5.x only    |
| v07           | min-ts-5.0       | dual        | —             | —             | TS 5.0+        |
| v17 `*`       | min-ts-4.9       | dual        | yes           | —             | TS 4.9, 5.x    |
| v18 `*`       | versioned-api    | dual        | —             | yes           | TS 5.x, api.md |
