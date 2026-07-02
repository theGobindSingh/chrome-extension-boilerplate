# Chrome Extension Monorepo Template

A batteries-included template for building a Chrome Extension (MV3) with TypeScript, React, Rollup, Vite, pnpm, and Turborepo.

## What you get

- Monorepo managed by pnpm + Turborepo
- TypeScript across all packages
- React popup built with Vite
- Background service worker + content script built with Rollup
- Extension assembler that generates `manifest.json` and copies built assets into a single `dist` folder

## Repository layout

- `packages/popup` — React popup UI (Vite)
- `packages/options` — React options page (Vite), for settings that need to persist across opens (`chrome.storage.sync`) rather than the popup's quick-action pattern
- `packages/content-script` — Content script injected into pages (Rollup)
- `packages/page-bridge` — Script injected into the page's own JS context ("MAIN world"), loaded by the content script as a `web_accessible_resource` (Rollup)
- `packages/styles` — SCSS + PostCSS pipeline that compiles `content-script.css`
- `packages/background` — Background service worker (Rollup)
- `packages/extension` — Assembler that creates the final Chrome extension `dist/`

## Requirements

- Node.js 24.x (as defined in `engines`)
- pnpm 9.x
- Google Chrome (Manifest V3)

## Quick start

Install dependencies:

```bash
pnpm install
```

Build everything (production):

```bash
pnpm build
```

Load in Chrome:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click “Load unpacked”
4. Select `packages/extension/dist`

The assembled extension contains:

```text
packages/extension/dist/
├─ manifest.json
├─ background.js          # from @chrome-ext/background
├─ content-script.js      # from @chrome-ext/content-script
├─ content-script.css     # from @chrome-ext/styles (SCSS + PostCSS)
├─ page-bridge.js         # from @chrome-ext/page-bridge (web_accessible_resources)
├─ popup.html             # from @chrome-ext/popup build
├─ options.html           # from @chrome-ext/options build
├─ assets/*               # popup + options static assets
└─ icons/*                # your icons from packages/extension/static/icons
```

## Development

Because the assembler reads built outputs from each package (via pnpm’s workspace symlinks in `node_modules`), development is most reliable when using “watch builds.”

Recommended multi-terminal setup:

- Terminal A — background (watch):
	- `pnpm --filter @chrome-ext/background dev`
- Terminal B — content script (watch):
	- `pnpm --filter @chrome-ext/content-script dev`
- Terminal C — popup (watch build):
	- `pnpm --filter @chrome-ext/popup build -- --watch`
	- Tip: add a script `"build:watch": "vite build --watch"` for convenience.
- Terminal D — assembler (watch):
	- `pnpm --filter @chrome-ext/extension dev`

Notes:

- The default `pnpm dev` runs each package’s `dev` script via Turbo. The popup’s default `dev` starts a Vite dev server (HMR) but does not emit files to `dist/`. The assembler expects built files in `dist/`, so prefer `vite build --watch` during extension testing.
- After each rebuild, refresh the extension page or the popup tab to see changes.

## Scripts (root)

- `pnpm build` — `turbo run build` across packages
- `pnpm dev` — `turbo run dev` (see note above about popup dev vs build)
- `pnpm type-check` — TypeScript across packages
- `pnpm clean` — Clean all build artifacts
- `pnpm lint` / `pnpm lint:fix` — Lint all packages

## Customize

- Manifest: edit `packages/extension/src/index.ts` (permissions, matches, background, action)
- Icons: drop PNGs into `packages/extension/static/icons/` (16/48/128). A `.gitkeep` is included so the folder exists.
- Popup: edit `packages/popup/src/*` and `index.html`. Build outputs are copied into the assembled extension.
- Options page: edit `packages/options/src/*` and `index.html`, same pattern as popup.
- Background/content script: edit `packages/background/src/index.ts` and `packages/content-script/src/index.ts`.

## Docs

- Getting started: `docs/getting-started.md`
- Development guide: `docs/development.md`
- Architecture: `docs/architecture.md`
- Publishing: `docs/publishing.md`
- Troubleshooting: `docs/troubleshooting.md`

## License

MIT — use this template freely for your own extensions.
