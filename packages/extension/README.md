# Chrome Extension Assembler

This package assembles the final Chrome extension by copying already-built output from the other workspace packages (`@chrome-ext/background`, `@chrome-ext/content-script`, `@chrome-ext/options`, `@chrome-ext/page-bridge`, `@chrome-ext/popup`, `@chrome-ext/styles`) into `packages/extension/dist/`, and generating `manifest.json`.

It does **not** build the other packages itself — Turbo builds them first (see `turbo.json`), and this package only assembles the resulting files.

## Build Structure

The assembler produces the following structure in `dist/`:

```
dist/
├── manifest.json          # Chrome Extension Manifest V3
├── background.js          # from @chrome-ext/background (dist/index.mjs or dist/index.cjs)
├── content-script.js      # from @chrome-ext/content-script (dist/content-script.js)
├── content-script.css     # from @chrome-ext/styles (SCSS + PostCSS -> dist/content-script.css)
├── page-bridge.js          # from @chrome-ext/page-bridge (dist/page-bridge.js), listed in web_accessible_resources
├── popup.html              # from @chrome-ext/popup (dist/index.html, renamed)
├── options.html            # from @chrome-ext/options (dist/index.html, renamed), the manifest's options_page
├── assets/                 # CSS/JS bundles referenced by popup.html and options.html
└── icons/                  # copied as-is from packages/extension/static/icons/
```

There is no automatic icon generation — icons must be provided in `static/icons/` (see below).

## Usage

### Build the extension

From the root of the monorepo:

```bash
pnpm build
```

Or from this package directory (assumes dependencies are already built):

```bash
pnpm run build
```

### Development mode

```bash
pnpm run dev
```

This runs `scripts/watcher.ts`, which watches this package's `src/` plus the built output of `background`, `content-script`, and `popup` in `node_modules/@chrome-ext/*`, and re-runs the assembler whenever any of them change. It does **not** start the other packages' own watch builds — run those separately (see the root `README.md` / `docs/development.md` for the recommended multi-terminal setup).

### Load in Chrome

After building:

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `packages/extension/dist` folder

## Configuration

### Extension metadata

- `name` in the generated manifest comes from `packages/extension/package.json`'s `displayName`, falling back to `name`.
- `version` comes from the **root** `package.json`.
- `description` is currently a hardcoded string in `createManifest()` — edit `src/index.ts` directly to change it.

### Manifest customization

The manifest is generated in `src/index.ts` inside `createManifest()`. You can customize there:

- Permissions (`permissions` array — defaults to `storage`, `activeTab`, `tabs`, `cookies`, `alarms`, `contextMenus`)
- Content script match patterns (`content_scripts[0].matches` — defaults to `<all_urls>`)
- Content script CSS (`content_scripts[0].css` — `content-script.css`, built by `@chrome-ext/styles`)
- `web_accessible_resources` (`page-bridge.js`, built by `@chrome-ext/page-bridge`)
- Background service worker configuration
- Popup/action settings
- `options_page` (`options.html`, built by `@chrome-ext/options`)
- Icon paths

### Icons

Place PNG icons in `static/icons/`:

- `icon16.png`
- `icon48.png`
- `icon128.png`

These are copied as-is into `dist/icons/`. There is no fallback/auto-generated icon — the build will simply omit missing files (Chrome will show a default icon, or the manifest reference will point to a missing file).

### Static assets

Any other files placed in `packages/extension/static/` alongside `icons/` are **not** currently copied by the assembler — only the `icons/` subdirectory and the popup/options build output are handled in `copyStaticFiles()`. Extend `src/index.ts` if you need to copy additional static assets.

## How it works

`src/index.ts` runs these steps in order:

1. `discoverChromeExtPackages()` — resolves `@chrome-ext/background`, `@chrome-ext/content-script`, `@chrome-ext/options`, `@chrome-ext/page-bridge`, and `@chrome-ext/popup` via pnpm's `node_modules` workspace symlinks, and locates each package's built main file. (`@chrome-ext/styles` is handled separately in `copyStaticFiles()` since its output isn't a single `.js` main file.)
2. `copyPackageFiles()` — copies each package's main file into `dist/` as `<name>.js` (e.g. `background.js`, `page-bridge.js`, `options.js`).
3. `createManifest()` — writes `dist/manifest.json`.
4. `copyStaticFiles()` — copies `static/icons/*` into `dist/icons/`; `popup`'s and `options`' built `index.html`/`assets/*` via a shared `copyHtmlAppPackage()` helper (renamed to `dist/popup.html`/`dist/options.html`); and `@chrome-ext/styles`' compiled CSS into `dist/content-script.css`.

## Troubleshooting

### Build fails

- Ensure all dependencies are installed: `pnpm install`
- Check that other packages build successfully individually
- Clear Turbo cache: `pnpm turbo clean` (or `pnpm clean`)

### Extension won't load in Chrome

- Check that `manifest.json` is valid JSON
- Ensure all referenced files exist in `dist/`
- Check the Chrome extensions page / DevTools console for errors

### Missing files

- Check that source packages (`background`, `content-script`, `popup`) built successfully to their own `dist/`
- Verify `node_modules/@chrome-ext/*` symlinks resolve correctly (reinstall with `pnpm install` if not)
- The assembler logs a warning (not an error) for any package it can't find a main file for — check the build output

## Development

To modify the assembly logic itself, edit `src/index.ts` — it's a set of standalone functions (`discoverChromeExtPackages`, `copyPackageFiles`, `createManifest`, `copyStaticFiles`, `assembleExtension`), not a class.
