/**
 * Styles build script
 *
 * Compiles src/content-script.scss with Sass, then runs the result through
 * PostCSS (autoprefixer) to produce a single dist/content-script.css.
 * Consumed by the extension assembler, which copies it into the final
 * extension's dist/ folder.
 */
import autoprefixer from "autoprefixer";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import postcss from "postcss";
import { compile } from "sass";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT_DIR = resolve(__dirname, "..");
const SRC_FILE = resolve(ROOT_DIR, "src/index.scss");
const OUT_DIR = resolve(ROOT_DIR, "dist");
const OUT_FILE = resolve(OUT_DIR, "content-script.css");

const build = async (): Promise<void> => {
  const compiled = compile(SRC_FILE, { style: "compressed" });

  const result = await postcss([autoprefixer]).process(compiled.css, {
    from: SRC_FILE,
    to: OUT_FILE,
  });

  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }
  writeFileSync(OUT_FILE, result.css);

  console.log(`[styles] Compiled ${SRC_FILE} -> ${OUT_FILE}`);
};

build().catch((error: unknown) => {
  console.error("[styles] Build failed:", error);
  process.exit(1);
});
