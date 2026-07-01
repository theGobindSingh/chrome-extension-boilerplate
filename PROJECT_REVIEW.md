# Project Review — Problems & Areas for Improvement

Full audit of `chrome-extension-boilerplate` (docs + source + config), as of 2026-07-02.

---

## 🔴 Critical

1. **`chrome.contextMenus.create` fires unconditionally on every service-worker start and will throw.**
   `packages/background/src/index.ts:71-75` calls `chrome.contextMenus.create({ id: "chrome-ext-action", ... })` at the top level with no guard. MV3 service workers are ephemeral and restart frequently (on wake, on new events, etc.). The second time this runs, Chrome throws `Cannot create item with duplicate id "chrome-ext-action"` (surfaces via `chrome.runtime.lastError`, silently swallowed but polluting logs and leaving menu state undefined). Needs `chrome.contextMenus.removeAll()` first, or move creation into `onInstalled` only.

2. **Package/tooling versions pinned to releases that don't exist yet.**
   `react@19.2.7`, `typescript@6.0.3`, `eslint@10.6.0`, `vite@8.1.2`, `@types/chrome@0.2.1`, `pnpm@11.9.0`, `chokidar@5.0.0`, `glob@13.0.6`, `@rollup/plugin-node-resolve@16.0.3` etc. are all ahead of any version that has shipped. `pnpm install` / `corepack` will fail to resolve these, making the template unusable out of the box. This looks like an accidental "bump everything to a future major" edit (visible in the working-tree diff). Needs to be pinned back to versions that actually exist on the npm registry.

3. **No tests anywhere in the repo.** There is no test runner (Jest/Vitest/etc.), no `test` script in any `package.json`, no `test` task in `turbo.json`. For a "batteries-included" template this is a significant gap — nothing verifies message-passing, manifest generation, or the assembler logic.

4. **Race-condition hack for content-script readiness.** `packages/background/src/index.ts:44-65` waits an arbitrary `100ms` `setTimeout` after `tabs.onUpdated` fires before messaging the tab, assuming the content script will be ready by then. This is fragile — slow-loading pages or heavy content scripts can still miss the window, and the magic number isn't documented or configurable. Should use an explicit readiness handshake (content script signals "ready", background waits for that message) instead of a timer.

5. **Overly broad default permissions/matches for a "boilerplate."** The generated manifest (`packages/extension/src/index.ts`) requests `storage, activeTab, tabs, cookies, alarms, contextMenus` and injects the content script on `<all_urls>` by default — including `cookies` (very sensitive) purely to demonstrate unused functionality. Anyone shipping this template without pruning permissions will over-request scope in the Chrome Web Store review and expose more attack surface than needed. The template should ship with a minimal permission set and call out in docs which permissions are demo-only vs. required.

6. **`packages/extension/README.md` describes an entirely different, non-existent architecture.** It documents a class-based `ExtensionBuilder` with static methods (`build()`, `buildDependencies()`, `copyBuiltAssets()`, `generateManifest()`, `createDefaultIcons()`), automatic SVG icon generation with "TS" text, and an `icon32.png` output — none of which exist in the actual `src/index.ts` (which is a set of standalone functions, no icon generation, no `icon32`). This will actively mislead anyone reading it before the code.

---

## 🟠 Moderate

7. **No CI pipeline.** `.github/` only contains `copilot-instructions.md` — there is no GitHub Actions workflow to run `pnpm build`, `pnpm type-check`, or `pnpm lint` on push/PR. Broken builds (like item #2) would only be caught locally.

8. **Redundant/conflicting workspace declarations.** Root `package.json` has a `"workspaces": ["packages/*"]` field (npm/Yarn convention) *and* `pnpm-workspace.yaml` defines the same thing. Since the project uses pnpm exclusively, the `workspaces` field in `package.json` is dead weight and can confuse contributors about which mechanism is authoritative.

9. **Manifest generation has inconsistent sources of truth.** `createManifest()` in `packages/extension/src/index.ts` pulls `version` from the **root** `package.json` but `name`/`displayName` from the **extension package's** `package.json`, while `description` is hardcoded to the literal string `"A Chrome extension"` and never read from any package.json at all. This is inconsistent and surprising; description should be configurable the same way name/version are.

10. **Duplicated/wasteful build step in `background` and `content-script`.** Their `build` script is `"tsc && rollup -c"`, where `tsc` (no `noEmit`) emits full JS + `.d.ts` to `dist/`, and then Rollup's own `@rollup/plugin-typescript` (with `declaration: true`) recompiles from `src/` again and overwrites the JS output. The first `tsc` compile is only useful for type-checking + declaration files, but does redundant JS emission work that's immediately thrown away. Should use `tsc --emitDeclarationOnly` (or drop the separate tsc step and let Rollup's plugin handle both) to avoid double compilation.

11. **`vite-plugin-dts` is declared as a dependency in `packages/popup/package.json` but never used in `vite.config.ts`.** Dead dependency — either wire it up (the popup's `tsconfig.json` already does `emitDeclarationOnly` to `dist/types`, suggesting the intent was there) or remove it.

12. **Popup's `exports` field points to declaration files that won't exist at that path.** `packages/popup/package.json` declares `"types": "./dist/index.d.ts"`, but `packages/popup/tsconfig.json` emits declarations to `declarationDir: "dist/types"` with `emitDeclarationOnly: true` — there is no `dist/index.d.ts` ever produced. Any consumer resolving types via `exports` will fail.

13. **`docs/` and root `README.md` never mention Node version realities.** They require Node `24.x` (a very recent major) with no fallback guidance, no `.nvmrc`/`.node-version` file committed, and no mention of what happens on older Node — first-time users following "Quick start" verbatim on an LTS Node version will hit `engines` warnings/failures with no troubleshooting entry for it in `docs/troubleshooting.md`.

14. **Assembler has no error/exit-code handling.** `assembleExtension()` (`packages/extension/src/index.ts`) only logs `"warn"` when a package's main file or dist folder is missing — it never exits non-zero. A CI build with a broken/missing sub-package would report "✓ Assembly complete!" even though the extension is incomplete, giving false confidence.

15. **Icon set is incomplete relative to the assembler's own icon-copy logic and Chrome's guidance.** Only `icon16.png`, `icon48.png`, `icon128.png` exist (plus an unused `icon.svg`); no `icon32.png`, which Windows uses and which `packages/extension/README.md` explicitly lists as expected output. Minor inconsistency between docs and assets.

16. **No `LICENSE` file despite the root README claiming "MIT — use this template freely."** Without an actual `LICENSE` file in the repo, that claim isn't legally actionable/clear for downstream users forking the template.

17. **Watcher script (`packages/extension/scripts/watcher.ts`) has no debounce.** `chokidar.watch(..., { ignoreInitial: true })` triggers `runBuild()` (which kills and respawns a child process) on *every* individual file event. A single `tsc -w` recompilation touching multiple files in `dist/` will trigger multiple rapid respawns of the assembler, which is wasteful and can produce interleaved/partial output under load.

18. **`turbo.json` global dependency `**/.env.*local` is declared but no package in the repo actually reads `.env` files or documents an intended use** — dead config that will confuse contributors into thinking env-based configuration is supported.

19. **No `options_page`, no `web_accessible_resources`, no CSP entry in the generated manifest** — reasonable for a minimal template, but worth a one-line mention in `docs/architecture.md` so users know these are consciously omitted rather than forgotten.

20. **Content script mutates the page's DOM/styles using inline `style.cssText` and injected `<style>` tags without any consideration of the host page's CSP.** Pages with a strict `style-src` CSP can block the injected toast styling silently; this isn't mentioned anywhere in the docs as a known limitation.

---

## 🟢 Negligible

21. **Popup title text is oddly named**: `packages/popup/src/App.tsx:30` renders `"Chrome Extension Popup New"` — the trailing "New" looks like a leftover from iterative editing/testing rather than intentional copy.

22. **Formatting inconsistency in ESLint configs.** `packages/popup/eslint.config.mjs` uses double quotes with no semicolon variance, while `packages/background/eslint.config.mjs`/`content-script` use a different indentation style (4-space inside the array literal vs. 2-space elsewhere) — cosmetic only, but a Prettier config with `.prettierrc` + `format` script would remove this drift entirely (none exists in the repo).

23. **`ch-ext.code-workspace` references folder names (`apps/frontend`, `apps/storybook`, `apps/backend`, `packages/ui`, `packages/eslint-config`) under `settings.eslint.workingDirectories` that don't exist in this repo at all** — leftover copy-paste from a different/template workspace file, should be replaced with the actual four `packages/*` used here (already correctly listed in `.vscode/settings.json`, so this file is redundant *and* wrong).

24. **`.gitignore` lists `*.cache` on its own line at the end, separated by a blank line from the rest** — harmless, but suggests an appended entry rather than an organized ignore file; could be merged into the "TypeScript"/build-output sections for readability.

25. **Background script logs verbosely (`console.log` on every message, every tab update, every alarm tick) with no debug/production flag.** Fine for a template demonstrating features, but worth a comment noting these should be stripped or gated behind a `DEBUG` flag in real projects — currently unstated anywhere.

26. **`packages/extension/static/icons/.gitkeep` contains actual comment text** (`# Place your extension icons here` / `# Required sizes: ...`) rather than being an empty placeholder file — functionally fine (git only cares that the file exists), but the filename convention implies emptiness, which is mildly misleading to contributors scanning the tree.

27. **Manifest permissions array and content-script `matches` are hardcoded inline in `createManifest()`** rather than being pulled from a small config object/constant at the top of the file — no functional issue, but makes the "customize permissions here" guidance harder to follow at a glance since it's buried inside a large object literal.

28. **No `CONTRIBUTING.md` or issue/PR templates** — negligible for a personal boilerplate, but worth adding if this is meant to be shared/forked by others per the README's "use this template freely" framing.
