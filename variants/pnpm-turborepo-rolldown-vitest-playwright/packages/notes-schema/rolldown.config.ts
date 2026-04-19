import { defineConfig } from "rolldown";

// Rolldown: Rust-based Rollup-compatible bundler (ESM-only output).
// Pin the version in package.json — Rolldown API is stabilising.
export default defineConfig({
  input: "src/index.ts",
  output: {
    dir: "dist",
    format: "esm",
    entryFileNames: "index.mjs",
  },
  external: ["zod"],
  treeshake: true,
});
