# Copilot Instructions — Chrome Extension Monorepo

This repo is a pnpm + Turborepo monorepo that builds a Chrome Extension (Manifest V3) from four packages: popup (Vite), content script (Rollup), background service worker (Rollup), and an assembler that generates `manifest.json` and copies outputs into `packages/extension/dist`.

## Big picture
- Packages
  - `packages/popup` — React UI built with Vite → outputs `dist/index.html`, `dist/popup.js`, `dist/assets/*`.
  - `packages/content-script` — injected script → outputs `dist/content-script.js` (IIFE) plus `index.{mjs,cjs}`.
  - `packages/background` — service worker → outputs `dist/index.{mjs,cjs}` (assembled as `background.js`).
  - `packages/extension` — assembler (`src/index.ts`) that:
    - copies built files from workspace packages (via `node_modules/@chrome-ext/*/dist` symlinks),
    - writes `manifest.json`,
    - copies popup HTML/assets and `static/icons/*` into `dist/`.
- Message flow: content script, background, and popup communicate with `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`. Examples live in:
  - `packages/content-script/src/index.ts` (handles `PING`, sends `CONTENT_SCRIPT_LOADED`),
  - `packages/background/src/index.ts` (acknowledges, updates badge, context menu, alarms),
  - `packages/popup/src/App.tsx` (sends `PING` to the active tab).

## Daily workflows
- Install: `pnpm install`
- Build all: `pnpm build` (Turbo orchestrates package builds; assembler runs last).
- Type check / lint / clean: `pnpm type-check` · `pnpm lint` · `pnpm clean`.
- Load in Chrome: `chrome://extensions` → Developer mode → Load unpacked → `packages/extension/dist`.

### Fast iteration (important)
The assembler reads already-built artifacts; prefer watch builds:
- Background: `pnpm --filter @chrome-ext/background dev` (Rollup watch)
- Content script: `pnpm --filter @chrome-ext/content-script dev`
- Popup: use a build watch so files are emitted: `pnpm --filter @chrome-ext/popup build -- --watch`
- Assembler: `pnpm --filter @chrome-ext/extension dev` (tsx watch)
Then refresh the extension or popup to see changes. Note: `pnpm dev` runs Vite HMR for the popup (no files emitted), so the assembled popup won’t update until you use `vite build --watch`.

## Conventions and integration points
- Manifest is generated in `packages/extension/src/index.ts` (`createManifest()`):
  - MV3, `action.default_popup: popup.html`, `background.service_worker: background.js`, content script `content-script.js`, default permissions: `storage, activeTab, tabs, cookies, alarms, contextMenus`, matches: `<all_urls>`.
  - Change permissions/matches or add sections by editing `createManifest()`.
- Filenames that the assembler expects to copy:
  - popup: `dist/index.html` → `popup.html` and `dist/assets/*` → `dist/assets/*`.
  - content script: `dist/content-script.js`.
  - background: `dist/index.{mjs|cjs}` → copied as `background.js`.
- Icons: add PNGs to `packages/extension/static/icons/` (16/48/128). These are copied as-is.

## Useful examples
- Quick message test from any DevTools console: `chrome.runtime.sendMessage({ type: 'PING', count: 1 }, console.log)`.
- Content script shows a green toast when it receives `PING`; background updates the badge on `UPDATE_BADGE`.

## What to modify where
- Popup UI: `packages/popup/src/*` (+ `index.html`, `vite.config.ts` sets `popup.js`).
- Content script: `packages/content-script/src/index.ts` (IIFE bundle name fixed in `rollup.config.js`).
- Background: `packages/background/src/index.ts`.
- Manifest, permissions, and copy rules: `packages/extension/src/index.ts`.
- Icons/extra static: `packages/extension/static/*`.

## Gotchas
- If changes don’t show up, ensure watch builds are running and reload the extension. The assembler does not start other builds; see `turbo.json` where the extension build declares dependencies on the background, content-script, and popup builds.
- Vite dev server doesn’t emit files; for assembled testing use `vite build --watch`.
