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

function runBuild() {
  if (child) {
    child.kill();
  }
  child = spawn("tsx", ["./src/index.ts"], { stdio: "inherit" });
}

const watcher = chokidar.watch(watchPaths, {
  ignoreInitial: true,
});

watcher.on("all", (event: string, filePath: string) => {
  console.log(`[watcher] ${event} detected in ${filePath}. Rebuilding...`);
  runBuild();
});

console.log("[watcher] Watching for changes...");
runBuild();
