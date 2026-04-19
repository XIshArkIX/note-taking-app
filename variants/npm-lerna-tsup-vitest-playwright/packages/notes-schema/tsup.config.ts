import { defineConfig } from "tsup";

// CJS-only output: maximum compatibility with Jest-era consumers and
// Node.js scripts that use require().  Consumers on modern tooling should
// add an ESM wrapper themselves or migrate the package to dual format.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  dts: true,
  clean: true,
  sourcemap: false,
  splitting: false,
});
