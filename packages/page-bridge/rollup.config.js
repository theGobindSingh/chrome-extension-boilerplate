import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

/** @type {import('rollup').RollupOptions} */
export default {
  input: "src/index.ts",
  output: {
    // Single classic-script bundle. This file is loaded by the content
    // script via a <script src="chrome-extension://.../page-bridge.js">
    // tag (see packages/content-script/src/index.ts), so it must be a
    // plain IIFE with no import/export syntax.
    file: "dist/page-bridge.js",
    format: "iife",
    sourcemap: true,
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
    }),
  ],
};
