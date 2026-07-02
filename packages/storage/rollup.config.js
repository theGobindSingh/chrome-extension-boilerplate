import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

// mjs/cjs only - this package is consumed as a library by other packages'
// bundlers (Rollup/Vite), never loaded directly as a manifest entry, so
// there's no need for an IIFE build (see content-script/rollup.config.js
// for why that distinction matters).
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
