/* eslint-disable camelcase -- chrome syntax */

/**
 * Chrome Extension Assembler
 *
 * This script assembles the final Chrome extension by:
 * 1. Discovering all packages in the monorepo
 * 2. Copying their built outputs to the extension dist folder
 * 3. Generating the manifest.json
 * 4. Copying static assets (icons, popup HTML, etc.)
 *
 * NOTE: This script does NOT build packages - Turbo handles that!
 * It only assembles already-built files into the final extension structure.
 */

import {
  copyFileSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  readdirSync,
} from "fs";
import { resolve, join, dirname } from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";

// Convert import.meta.url to __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Directory structure:
// packages/extension/src/index.ts <- we are here
const ROOT_DIR = resolve(__dirname, "../../../"); // Monorepo root (for version in manifest)
const EXTENSION_DIR = resolve(__dirname, ".."); // packages/extension
const DIST_DIR = join(EXTENSION_DIR, "dist"); // Final extension output
const NODE_MODULES_DIR = join(EXTENSION_DIR, "node_modules"); // Workspace packages resolved here

// Type definition for package.json files
interface PackageJson {
  name?: string;
  version?: string;
  displayName?: string; // Custom field for extension display name
  main?: string; // Main entry point
  dependencies?: Record<string, string>; // Package dependencies
  exports?: {
    // Modern exports field for ESM/CJS
    [key: string]: {
      import?: string;
      require?: string;
      types?: string;
    };
  };
}

// Represents a discovered Chrome extension package in the monorepo
interface ChromeExtPackage {
  name: string; // Package simple name (e.g., "popup", "background")
  path: string; // Absolute path to package in node_modules
  distPath: string; // Path to package's dist folder
  packageJson: PackageJson; // Parsed package.json
  mainFile?: string; // Resolved path to the built JS file to copy
  extensionFile?: string; // Reserved for future use
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Logs a message with a consistent prefix and color
 */
function log(
  message: string,
  type: "info" | "success" | "warn" = "info",
): void {
  const prefix = chalk.blue("[Extension Builder]");
  let coloredMsg = message;
  switch (type) {
    case "success":
      coloredMsg = chalk.green(message);
      break;
    case "warn":
      coloredMsg = chalk.yellow(message);
      break;
    default:
      coloredMsg = chalk.white(message);
  }
  console.log(`${prefix} ${coloredMsg}`);
}

/**
 * Creates a directory if it doesn't exist (recursive)
 * Similar to `mkdir -p` in bash
 */
function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Reads and parses a package.json file
 * @throws Error if package.json doesn't exist
 */
function getPackageJson(packagePath: string): PackageJson {
  const pkgJsonPath = join(packagePath, "package.json");
  if (!existsSync(pkgJsonPath)) {
    throw new Error(`package.json not found at ${pkgJsonPath}`);
  }
  return JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as PackageJson;
}

/**
 * Resolves a package from node_modules using Node.js resolution
 * This works with pnpm workspace dependencies that are symlinked
 *
 * @param packageName - The package name (e.g., "@chrome-ext/background")
 * @returns Absolute path to the package directory in node_modules
 */
function resolvePackageDir(packageName: string): string | undefined {
  const packagePath = join(NODE_MODULES_DIR, packageName);
  if (existsSync(packagePath)) {
    return packagePath;
  }
  return undefined;
}

/**
 * Finds the main built JavaScript file for a package
 * Checks in order:
 * 1. package.json exports["."].import (modern ESM)
 * 2. package.json exports["."].require (CommonJS)
 * 3. package.json main field
 * 4. Common build output locations
 *
 * @returns Absolute path to the main file, or undefined if not found
 */
function findMainFile(pkg: ChromeExtPackage): string | undefined {
  const { packageJson } = pkg;

  // Strategy 1: Check modern exports field first (ESM preferred)
  if (packageJson.exports) {
    const { exports } = packageJson;
    if (exports["."]?.import) {
      return resolve(pkg.path, exports["."].import);
    }
    if (exports["."]?.require) {
      return resolve(pkg.path, exports["."].require);
    }
  }

  // Strategy 2: Check traditional main field
  if (packageJson.main) {
    return resolve(pkg.path, packageJson.main);
  }

  // Strategy 3: Check common build output locations as fallback
  const commonPaths = [
    join(pkg.path, "dist", "index.js"),
    join(pkg.path, "dist", "index.mjs"),
    join(pkg.path, "build", "index.js"),
  ];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return undefined;
}

/**
 * Discovers Chrome extension packages from dependencies in package.json
 * Resolves them from node_modules where pnpm symlinks them
 *
 * @returns Array of discovered packages with their metadata
 */
function discoverChromeExtPackages(): ChromeExtPackage[] {
  const packages: ChromeExtPackage[] = [];

  // Read this package's dependencies to find workspace packages
  const extensionPackageJson = getPackageJson(EXTENSION_DIR);
  const dependencies = extensionPackageJson.dependencies ?? {};

  // List of expected Chrome extension packages
  const expectedPackages = [
    "@chrome-ext/background",
    "@chrome-ext/content-script",
    "@chrome-ext/popup",
  ];

  for (const packageName of expectedPackages) {
    // Skip if not listed as a dependency
    if (!dependencies[packageName]) {
      log(
        `Package ${packageName} not found in dependencies, skipping...`,
        "warn",
      );
      continue;
    }

    // Resolve package from node_modules
    const packagePath = resolvePackageDir(packageName);
    if (!packagePath) {
      log(`Warning: Could not resolve ${packageName} in node_modules`, "warn");
      continue;
    }

    const packageJson = getPackageJson(packagePath);
    const distPath = join(packagePath, "dist");

    // Extract simple name (e.g., "background" from "@chrome-ext/background")
    const simpleName = packageName.split("/").pop() ?? packageName;

    // Create package metadata object
    const pkg: ChromeExtPackage = {
      name: simpleName,
      path: packagePath,
      distPath,
      packageJson,
    };

    // Try to locate the main built file for this package
    pkg.mainFile = findMainFile(pkg);
    packages.push(pkg);
  }

  return packages;
}

// ============================================================================
// ASSEMBLY FUNCTIONS
// ============================================================================

/**
 * Copies built JavaScript files from each package to the extension dist folder
 * Each package's main file is renamed to match the package name (e.g., background.js)
 *
 * Example:
 *   packages/background/dist/index.js → packages/extension/dist/background.js
 *   packages/popup/dist/popup.js      → packages/extension/dist/popup.js
 */
function copyPackageFiles(packages: ChromeExtPackage[]): void {
  ensureDir(DIST_DIR);

  for (const pkg of packages) {
    log(`Processing package: ${pkg.name}`);

    // Skip packages without a main file (might be utility packages)
    if (!pkg.mainFile) {
      log(`  Warning: No main file found for ${pkg.name}, skipping...`, "warn");
      continue;
    }

    // Verify the file actually exists
    if (!existsSync(pkg.mainFile)) {
      log(
        `  Warning: Main file does not exist: ${pkg.mainFile}, skipping...`,
        "warn",
      );
      continue;
    }

    // Copy to dist with package name (e.g., background.js, content-script.js)
    const targetPath = join(DIST_DIR, `${pkg.name}.js`);
    copyFileSync(pkg.mainFile, targetPath);
    log(`  ✓ Copied: ${pkg.mainFile} -> ${targetPath}`, "success");
  }
}

/**
 * Generates the Chrome extension manifest.json file
 *
 * The manifest configures:
 * - Extension metadata (name, version, description)
 * - Browser action (popup UI)
 * - Background service worker
 * - Content scripts and where they run
 * - Required permissions
 * - Icon paths
 *
 * Uses Chrome Manifest V3 format
 */
function createManifest(): void {
  // Read version from root package.json and name from extension package.json
  const rootPackageJson = getPackageJson(ROOT_DIR);
  const extensionPackageJson = getPackageJson(EXTENSION_DIR);

  const manifest = {
    manifest_version: 3, // Chrome Manifest V3 (required for modern extensions)

    // Extension identity - customize displayName in extension/package.json
    name:
      extensionPackageJson.displayName ??
      extensionPackageJson.name ??
      "Chrome Extension",
    version: rootPackageJson.version ?? "1.0.0",
    description: "A Chrome extension",

    // Browser action - the popup that appears when clicking the extension icon
    action: {
      default_popup: "popup.html", // Built from packages/popup
      default_icon: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
    },

    // Background service worker - runs in the background
    background: {
      service_worker: "background.js", // Built from packages/background
      type: "module", // ES module support
    },

    // Content scripts - injected into web pages
    content_scripts: [
      {
        matches: ["<all_urls>"], // Run on all URLs (change as needed)
        js: ["content-script.js"], // Built from packages/content-script
      },
    ],

    // Permissions - what APIs the extension can access
    permissions: [
      "storage", // Chrome storage API
      "activeTab", // Access current tab
      "tabs", // Access all tabs
      "cookies", // Cookie access
      "alarms", // Scheduled tasks
      "contextMenus", // Context menu API
    ],

    // Extension icons (shown in Chrome's extension management)
    icons: {
      16: "icons/icon16.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
  };

  const manifestPath = join(DIST_DIR, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  log(`✓ Created manifest at: ${manifestPath}`, "success");
}

/**
 * Copies static assets to the extension dist folder
 * Includes:
 * - Extension icons from packages/extension/static/icons/
 * - Popup HTML from packages/popup/dist/index.html
 * - Popup assets (CSS, JS bundles) from packages/popup/dist/assets/
 */
function copyStaticFiles(): void {
  const staticDir = join(EXTENSION_DIR, "static");

  if (!existsSync(staticDir)) {
    log("No static directory found, skipping static files...", "warn");
    return;
  }

  // === COPY EXTENSION ICONS ===
  // Icons are stored in packages/extension/static/icons/
  const iconsSourceDir = join(staticDir, "icons");
  const iconsTargetDir = join(DIST_DIR, "icons");

  if (existsSync(iconsSourceDir)) {
    ensureDir(iconsTargetDir);
    const iconFiles = readdirSync(iconsSourceDir);

    for (const file of iconFiles) {
      // Skip .gitkeep and other non-image files
      if (file.startsWith(".")) continue;

      const sourcePath = join(iconsSourceDir, file);
      const targetPath = join(iconsTargetDir, file);
      copyFileSync(sourcePath, targetPath);
      log(`  ✓ Copied icon: ${file}`, "success");
    }
  }

  // === COPY POPUP HTML ===
  // Vite builds the popup to node_modules/@chrome-ext/popup/dist/index.html
  // We rename it to popup.html for the manifest
  const popupPackagePath = resolvePackageDir("@chrome-ext/popup");
  if (popupPackagePath) {
    const popupHtmlSource = join(popupPackagePath, "dist", "index.html");
    if (existsSync(popupHtmlSource)) {
      const popupHtmlTarget = join(DIST_DIR, "popup.html");
      copyFileSync(popupHtmlSource, popupHtmlTarget);
      log(`  ✓ Copied popup.html`, "success");
    }

    // === COPY POPUP ASSETS ===
    // Vite bundles CSS and JS into node_modules/@chrome-ext/popup/dist/assets/
    // These are referenced by the HTML file
    const popupAssetsSource = join(popupPackagePath, "dist", "assets");
    if (existsSync(popupAssetsSource)) {
      const popupAssetsTarget = join(DIST_DIR, "assets");
      ensureDir(popupAssetsTarget);

      const assetFiles = readdirSync(popupAssetsSource);
      for (const file of assetFiles) {
        const sourcePath = join(popupAssetsSource, file);
        const targetPath = join(popupAssetsTarget, file);
        copyFileSync(sourcePath, targetPath);
        log(`  ✓ Copied asset: ${file}`, "success");
      }
    }
  }
}

// ============================================================================
// MAIN ORCHESTRATION
// ============================================================================

/**
 * Main assembly function that orchestrates the entire build process
 *
 * Steps:
 * 1. Discover workspace packages from node_modules (pnpm workspace dependencies)
 * 2. Copy their built outputs (JS files) to extension/dist
 * 3. Generate manifest.json with proper configuration
 * 4. Copy static assets (icons, popup HTML, CSS/JS bundles)
 *
 * Result: A complete Chrome extension in packages/extension/dist/
 */
function assembleExtension(): void {
  log("");
  log(chalk.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  log(chalk.bold("Assembling Chrome Extension..."));
  log(chalk.bold("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  log("");

  // Step 1: Resolve workspace packages from node_modules
  const packages = discoverChromeExtPackages();
  log("");
  log(chalk.cyan(`Discovered ${packages.length} packages from node_modules`));
  log("");

  // Step 2: Copy built JS files (background.js, content-script.js, etc.)
  copyPackageFiles(packages);

  // Step 3: Generate the manifest.json configuration file
  createManifest();

  // Step 4: Copy icons, popup HTML, and other static assets
  copyStaticFiles();

  log("");
  log(chalk.green.bold("✓ Assembly complete!"));
  log("");
  const now = new Date();
  const formatted = now.toLocaleString();
  log(chalk.cyan(`Extension ready at: ${DIST_DIR}`));
  log("");
  log(chalk.bold.magenta(`Build finished at:`));
  log(chalk.bold.magenta(formatted));
  log("");
  log(
    chalk.yellowBright(
      `Load it in Chrome: chrome://extensions/ → "Load unpacked" → select dist folder`,
    ),
  );
  log("");
}

/**
 * Entry point
 *
 * This script is called by:
 * - `pnpm build` → tsx scripts/build.ts (one-time build)
 * - `pnpm dev` → tsx scripts/build.ts --watch (watch mode)
 *
 * Turbo ensures other packages (popup, background, content-script)
 * are built BEFORE this runs, so we just assemble the pieces.
 */
function main(): void {
  assembleExtension();
}

// Run the assembler
main();
