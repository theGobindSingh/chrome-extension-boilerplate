# Development

This repo assembles the final extension by copying each package's built output into `packages/extension/dist/`. For the best experience, run watch builds so the assembler can pick up changes.

## Recommended multi-terminal setup

- Terminal A — background (watch):
  - `pnpm --filter @chrome-ext/background dev`
- Terminal B — content script (watch):
  - `pnpm --filter @chrome-ext/content-script dev`
- Terminal C — popup (watch build):
  - `pnpm --filter @chrome-ext/popup build -- --watch`
  - Tip: add a script `"build:watch": "vite build --watch"` to make this easier.
- Terminal D — assembler (watch):
  - `pnpm --filter @chrome-ext/extension dev`

Then reload the unpacked extension in `chrome://extensions` to see changes.

## Using the root dev script

`pnpm dev` runs `turbo run dev` across packages. By default, popup's `dev` starts a Vite dev server (HMR) but does not emit files to `dist/`, so the assembled popup won't update. Prefer `vite build --watch` during extension testing.

If you want HMR for developing the popup in isolation, run `pnpm --filter @chrome-ext/popup dev` and open the Vite URL. When you're ready to test inside the extension, switch back to `build --watch` and reload the extension.

## Common tasks

- Type check all packages: `pnpm type-check`
- Lint all packages: `pnpm lint` (or `pnpm lint:fix`)
- Clean all build outputs: `pnpm clean`

## Chrome debugging tips

- Open the popup, right-click → Inspect to open popup DevTools
- For the background service worker, click “service worker” link in `chrome://extensions`
- Content script logs show in the inspected tab's DevTools console

## Message passing quick test

Codes are provided to demonstrate message passing:

- Content script sends `CONTENT_SCRIPT_LOADED`
- Background listens and can respond with `acknowledged`
- You can send a sample message from the popup or DevTools console:

```js
chrome.runtime.sendMessage({ type: 'PING', count: 1 }, console.log)
```
