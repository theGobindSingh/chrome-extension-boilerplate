import { fileURLToPath } from "url";
import path from "path";
import chokidar from "chokidar";
import { spawn, ChildProcess } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to watch
const watchPaths = [
  path.resolve(__dirname, "../src"),
  path.resolve(__dirname, "../node_modules/@chrome-ext/background"),
  path.resolve(__dirname, "../node_modules/@chrome-ext/content-script"),
  path.resolve(__dirname, "../node_modules/@chrome-ext/popup"),
];

let child: ChildProcess | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
const DEBOUNCE_MS = 200;

function runBuild() {
  if (child) {
    child.kill();
  }
  child = spawn("tsx", ["./src/index.ts"], { stdio: "inherit" });
}

// A single logical change (e.g. a `tsc -w` recompile) can touch several files
// in quick succession, each firing its own chokidar event. Debounce so those
// collapse into a single rebuild instead of respawning the assembler once per
// file and producing interleaved/partial output.
function scheduleBuild() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(runBuild, DEBOUNCE_MS);
}

const watcher = chokidar.watch(watchPaths, {
  ignoreInitial: true,
});

watcher.on("all", (event: string, filePath: string) => {
  console.log(`[watcher] ${event} detected in ${filePath}. Rebuilding...`);
  scheduleBuild();
});

console.log("[watcher] Watching for changes...");
runBuild();
