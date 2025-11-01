# Getting started

This template helps you build and ship a Chrome Extension (Manifest V3) using a pnpm + Turborepo monorepo with TypeScript and React.

## Requirements

- Node.js 24.x
- pnpm 9.x
- Google Chrome (MV3-capable)

## Install

```bash
pnpm install
```

## Build (production)

```bash
pnpm build
```

The assembled extension will be created at:

```text
packages/extension/dist/
```

## Load in Chrome

1. Open `chrome://extensions`
2. Enable Developer mode (top-right)
3. Click “Load unpacked”
4. Select `packages/extension/dist`

## Where to start editing

- Popup UI: `packages/popup/src/` (React + Vite)
- Content script: `packages/content-script/src/index.ts`
- Background service worker: `packages/background/src/index.ts`
- Manifest + assembly: `packages/extension/src/index.ts`
- Icons: `packages/extension/static/icons/`

## Verify it works

- Click the extension icon to open the popup
- Open DevTools → Console to see background/content-script logs
- Navigate to any page and observe content-script log messages

For development options and faster iteration, see `docs/development.md`.
