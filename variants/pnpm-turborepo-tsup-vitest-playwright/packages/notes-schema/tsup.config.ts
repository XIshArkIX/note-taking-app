import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"], // dual ESM + CJS output
  dts: true,
  clean: true,
  sourcemap: false,
  splitting: false,
  treeshake: true,
});
