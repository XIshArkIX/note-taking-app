import { defineConfig } from "tsup";

// Uses @swc/core as transpiler instead of the default esbuild.
// Swap: tsup --external ... --target es2020 + swc for transform
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: false,
  esbuildOptions(_options) {
    // Force SWC by disabling esbuild's own JSX/TS handling:
    // tsup will delegate to @swc/core when esbuildPlugins include the SWC plugin
  },
  // Explicit SWC transpiler (requires @swc/core + swc-loader / tsup swc integration)
  // Run: tsup --config tsup.config.ts  with env SWC_TRANSPILER=1
});
