# Troubleshooting

## Popup not showing / blank

- Ensure the popup has been built to `node_modules/@chrome-ext/popup/dist/`
- In dev, prefer `vite build --watch` over `vite dev` so files are emitted
- Reload the extension in `chrome://extensions`

## Changes not reflected

- Make sure watch builds are running (see `docs/development.md`)
- The assembler watches its own file; re-run `pnpm --filter @chrome-ext/extension build` to force a fresh copy if needed
- Try `pnpm clean && pnpm build`

## Content script not running

- Check the matches in the generated `manifest.json`
- Ensure the target page is not a Chrome internal page (e.g., `chrome://`)
- Open DevTools on the target tab and check the console

## Background not receiving messages

- Verify the service worker is active via `chrome://extensions` → click the service worker link
- Check for errors in the service worker console

## Build errors

- Ensure dependencies are installed: `pnpm install`
- Type errors: run `pnpm type-check`
- Lint issues: `pnpm lint:fix`
- Clear caches and rebuild: `pnpm clean && pnpm build`
