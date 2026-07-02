# Missing Scopes — Packages Not Yet Covered

Current packages in this monorepo: `background`, `content-script`, `options`, `page-bridge`, `popup`, `shared-types`, `storage`, `styles`, `extension` (assembler). This document tracks additional scopes a "batteries-included" Chrome extension template would typically cover, but this repo doesn't yet — so future work has a starting point instead of starting from a blank page.

Ordered roughly by value delivered relative to effort. Items 1, 2, and 4 have since been built; kept below (marked ✅ Done) for the original rationale, since that's still useful context for anyone touching those packages.

---

## 1. ✅ Done — `@chrome-ext/shared-types`: typed message contracts

**The gap (as originally written):** message `type` strings (`"PING"`, `"PAGE_LOADED"`, `"CONTENT_SCRIPT_LOADED"`, `"UPDATE_BADGE"`, `"CONTEXT_MENU_CLICKED"`) were hand-typed as string literals independently in `background`, `content-script`, and `popup`, with no shared definition — a typo or payload-shape drift was invisible to `tsc` and only surfaced at runtime.

**What was built:** `packages/shared-types` — a discriminated `ExtensionMessage` union, an `ExtensionResponse` union, and an `ExtensionSettings` interface. No build step: `types`/`main` point straight at `src/index.ts` since every consumer uses `import type` (erased at compile time). Adopted in `background`, `content-script`, and `popup`.

---

## 2. ✅ Done — `@chrome-ext/options`: options page (`options_page`)

**The gap (as originally written):** MV3 supports a full-page settings surface distinct from the popup — `options_page` (opens in a new tab) or `options_ui` (embedded in `chrome://extensions`). Neither existed; the popup was the only UI surface.

**What was built:** `packages/options` — structurally almost identical to `packages/popup` (same Vite/React/TS setup; duplication accepted per the tradeoff below), wired into the manifest's `options_page: "options.html"`. Its content is deliberately different from popup's: it demonstrates the settings/persistence pattern via `@chrome-ext/storage` (see #4) rather than repeating popup's message-passing demo.

**Tradeoff (as originally written, still relevant):** the main design decision was whether to extract shared React/Vite/tsconfig/ESLint setup into something reusable, or accept duplication for template clarity. Given this repo's existing convention (every package self-contained rather than sharing build config), duplication was the right call — confirmed once options existed, since the two packages' `vite.config.ts`/`tsconfig.json` are nearly line-for-line identical and that's fine.

---

## 3. Side panel (`side_panel` API)

**The gap:** Chrome's `side_panel` API (the modern, larger-surface alternative to popups, pinned open alongside the page) isn't demonstrated. It's newer and less documented than popups/options pages, so a template that shows the wiring is disproportionately useful relative to how simple the manifest change is.

**Why it matters:** for anything more than a quick action (chat UI, persistent tool panel, multi-step flow), a side panel is a much better fit than a popup, which closes on any outside click. Increasingly the default recommendation for "extension has a real UI" use cases.

**What it would contain:** could genuinely reuse the same React/Vite setup pattern as popup and options (a third near-identical frontend package, or — if options page also exists — a case for a genuinely shared `@chrome-ext/ui-shared` React/Vite base). Manifest addition:
```json
"side_panel": { "default_path": "sidepanel.html" },
"permissions": ["sidePanel"]
```
Also typically wired up via `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` in the background service worker.

**Tradeoff:** low implementation cost once the options-page pattern exists (same shape), but if built before an options page, it's the second near-duplicate frontend package and increases the case for extracting shared Vite/React config sooner rather than later.

---

## 4. ✅ Done — `@chrome-ext/storage`: typed `chrome.storage.sync` wrapper

**The gap (as originally written):** `packages/background/src/index.ts` called `chrome.storage.sync.set({...})` directly with an inline, untyped settings object. There was no shared schema for what's actually stored, no read-side helper, and nothing preventing background/options from disagreeing on the shape of stored data over time. `chrome.storage` is asynchronous, has no runtime schema validation, and silently returns `undefined` for missing/renamed keys.

**What was built:** `packages/storage` — `getSettings()` (merges the stored value over `DEFAULT_SETTINGS`, so a missing/renamed key never comes back as `undefined`), `setSettings(partial)` (merges over current settings and persists), and `onSettingsChanged(callback)` (wraps `chrome.storage.onChanged` so e.g. options open in two tabs, or open alongside background writing a fresh `installDate`, stay in sync). Keyed to the shared `ExtensionSettings` type from `@chrome-ext/shared-types`.

Unlike `shared-types`, this package has real runtime code (bundled via Rollup, mjs/cjs, no IIFE — it's a library dependency, never a manifest entry, consumed by `background` and `options`). Its `package.json` `exports` deliberately separates `"types"` (points straight at `src/index.ts`, always resolvable) from `"import"`/`"require"` (the compiled `dist/*.js`, which only needs to exist by the time a consumer's *bundler* runs, not its independent `tsc --noEmit`) — otherwise a fresh `pnpm clean` breaks consumers' type-checking until `storage` is rebuilt.

**Tradeoff (as originally written) — revisited:** the original note suggested folding this into `@chrome-ext/shared-types` rather than a standalone package, since it's small. It was built as its own package instead (per explicit direction), which turned out to matter: `shared-types` being 100% type-only (no build step, no `dist/`) is precisely what makes it safe to reference directly from `src/`. Mixing in real runtime code would have forced `shared-types` to grow a build step too, coupling every consumer's type-checking to whether `shared-types` had been *built*, not just whether it type-checks — the exact bug this package hit and had to work around. Keeping them separate keeps that invariant intact.

---

## 5. Internationalization (`_locales`)

**The gap:** Chrome's built-in i18n system (`_locales/<lang>/messages.json`, referenced via `__MSG_extensionName__` in the manifest and `chrome.i18n.getMessage()` in code) isn't scaffolded anywhere. The manifest's `name`/`description` are hardcoded English strings.

**Why it matters:** it's a real Chrome Web Store feature (the store listing itself can localize based on `_locales`), and a template claiming to be "batteries-included" arguably should at least scaffold an `en` locale so users see the pattern rather than discovering it exists only when they need to internationalize.

**What it would contain:** not really a "package" — more a `packages/extension/static/_locales/en/messages.json` file, a manifest change to reference `__MSG_appName__`/`__MSG_appDescription__`, and a one-paragraph doc note. Lowest implementation cost of everything on this list.

**Tradeoff:** genuinely low-value for a lot of use cases (many extensions ship English-only forever), so this is more "cheap to add, easy to skip" than "important gap."

---

## 6. DevTools panel (`devtools_page`)

**The gap:** no `devtools_page` demonstrating a custom DevTools panel (`chrome.devtools.panels.create(...)`), which is its own distinct extension surface with its own lifecycle (loads only when DevTools is open, runs in yet another isolated context).

**Why it matters:** niche — most extensions never need a DevTools panel. Including it mainly rounds out "template demonstrates every major manifest surface," which has diminishing returns past the popup/options/side-panel/content-script surfaces above.

**What it would contain:** a `devtools.html` entry point that calls `chrome.devtools.panels.create()` to register a panel, which itself loads a second page (the actual panel UI) — effectively two small new files/packages for one relatively rare use case.

**Tradeoff:** the most speculative item here; recommend treating as "document as a known gap" rather than implementing unless there's a specific use case driving it.

---

## Non-package gaps (already surfaced in `PROJECT_REVIEW.md`, listed here only for completeness)

These aren't missing *packages/scopes* so much as missing *process/tooling*, and were explicitly out of scope for the work done so far in this repo:

- No CI pipeline (GitHub Actions or equivalent) running build/type-check/lint on push/PR.
- No test runner/test packages at all.
- No `options_page`/CSP doc note (options page itself is covered above; the doc note was about explicitly stating the omission).

---

## Suggested order if picking this up

1. ~~`@chrome-ext/shared-types` (message types)~~ — done.
2. ~~Options page~~ — done.
3. ~~`@chrome-ext/storage` (typed settings wrapper)~~ — done.
4. Side panel — same shape as options page (structurally could copy `packages/options`), now that pattern exists.
5. i18n scaffold — cheap, do opportunistically.
6. DevTools panel — only if a concrete need shows up; otherwise leave as a documented gap.
