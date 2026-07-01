import { fileURLToPath } from "url";
import path from "path";
import chokidar from "chokidar";
import { spawn, ChildProcess } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const watchPath = path.resolve(__dirname, "../src");

let child: ChildProcess | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
const DEBOUNCE_MS = 200;

function runBuild(): void {
  if (child) {
    child.kill();
  }
  child = spawn("tsx", ["./scripts/build.ts"], { stdio: "inherit" });
}

function scheduleBuild(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(runBuild, DEBOUNCE_MS);
}

const watcher = chokidar.watch(watchPath, { ignoreInitial: true });

watcher.on("all", (event: string, filePath: string) => {
  console.log(`[styles watcher] ${event} detected in ${filePath}. Rebuilding...`);
  scheduleBuild();
});

console.log("[styles watcher] Watching for changes...");
runBuild();
