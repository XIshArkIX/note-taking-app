# Runner Profile — Fixed Reference

## Purpose

All variant measurements must be taken on a runner that matches this profile
(or a documented deviation must be noted in `VariantMetrics.notes`).  Changing
the runner mid-study invalidates comparisons.

## Reference Configuration

| Field            | Value                                       |
|------------------|---------------------------------------------|
| OS               | Ubuntu 22.04 LTS (linux/amd64)              |
| CPU              | 4-core (e.g. GitHub-hosted `ubuntu-22.04`)  |
| RAM              | 16 GB                                       |
| Node.js          | 22.x LTS (pin exact patch per variant)      |
| Package cache    | **Cold**: no local cache, no node_modules   |
|                  | **Warm**: package manager cache restored,   |
|                  |   no node_modules directory                 |
| Disk             | SSD, no network filesystem                  |
| Concurrent jobs  | Serial (no parallel tasks during timing)    |

## What Gets Measured and How

### Install
```bash
# Cold — delete everything first
rm -rf node_modules .pnpm-store
time <package-manager> install

# Warm — restore cache from previous cold run, delete node_modules
rm -rf node_modules
time <package-manager> install
```

### Build
```bash
# Clean
rm -rf .next dist out build
time npm run build    # or equivalent

# Incremental (touch one file, rebuild)
touch src/lib/note-filters.ts
time npm run build
```

### Typecheck (if split from build)
```bash
time npx tsc --noEmit
```

### Lint
```bash
time npm run lint
```

### Output sizing
```bash
# JS first-party bundle (no .map files)
find <output_dir> -name "*.js" ! -name "*.map" -exec wc -c {} + | tail -1

# CSS
find <output_dir> -name "*.css" ! -name "*.map" -exec wc -c {} + | tail -1

# Full artifact
du -sb <output_dir>
```

## Result Schema

Results are serialised using the TypeScript interfaces in `schema.ts`.
Every variant writes `toolchain/metrics/results/<variantId>.json`.
The CI pipeline archives the full `results/` directory as a build artifact.

## Notes on Fairness

- Disable turbo/nx remote cache when timing clean builds to avoid cache hits
  from other variants.
- Pin exact Node.js patch version per variant cohort to eliminate runtime
  variance (e.g. JIT warm-up differences between minor versions).
- Run each timing command three times and record the median.  The shell script
  records a single run for speed; update the loop if you need statistical
  confidence intervals.
