import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

/** @type {import('rollup').RollupOptions} */
export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.mjs",
      format: "esm",       // ESM-only output
      sourcemap: false,
    },
  ],
  external: ["zod"],
  plugins: [
    resolve(),
    typescript({ tsconfig: "./tsconfig.json", declaration: true, declarationDir: "dist" }),
  ],
  treeshake: true,
};
