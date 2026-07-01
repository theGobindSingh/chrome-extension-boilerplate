import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

// Only mjs/cjs are emitted (no IIFE). The assembler loads dist/index.mjs as
// the manifest's content_scripts.js, which Chrome always runs as a classic
// (non-module) script - that only works because this file has no real
// top-level import/export left after bundling (all cross-package imports
// here are `import type`, erased by tsc). If this package ever needs a real
// runtime import/export, switch the assembler back to an IIFE build instead.
/** @type {import('rollup').RollupOptions} */
export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.cjs",
      format: "cjs",
      sourcemap: true
    },
    {
      file: "dist/index.mjs",
      format: "esm",
      sourcemap: true
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: true
    })
  ]
};
