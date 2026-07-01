# Missing Scopes — Packages Not Yet Covered

Current packages in this monorepo: `background`, `content-script`, `page-bridge`, `popup`, `styles`, `extension` (assembler). This document tracks additional scopes a "batteries-included" Chrome extension template would typically cover, but this repo doesn't yet — so future work has a starting point instead of starting from a blank page.

Ordered roughly by value delivered relative to effort.

---

## 1. `@chrome-ext/shared` — typed message contracts (highest priority)

**The gap:** message `type` strings (`"PING"`, `"PAGE_LOADED"`, `"CONTENT_SCRIPT_LOADED"`, `"UPDATE_BADGE"`, `"CONTEXT_MENU_CLICKED"`) are hand-typed as string literals independently in at least three places:

- `packages/background/src/index.ts` (sends/receives `CONTENT_SCRIPT_LOADED`, `UPDATE_BADGE`, `PAGE_LOADED`, `CONTEXT_MENU_CLICKED`)
- `packages/content-script/src/index.ts` (receives `PING`, `PAGE_LOADED`; sends `CONTENT_SCRIPT_LOADED`)
- `packages/popup/src/App.tsx` (sends `PING`)

None of these share a type definition. `message.type === "PING"` typechecks against `any`/untyped payloads on both sides — a typo in one package (`"Ping"`, `"UPDATED_BADGE"`) or a payload shape drift (e.g. `count: number` vs `count: string`) is invisible to `tsc` and only surfaces at runtime, in production, inside a `chrome.runtime.onMessage` callback where errors are easy to miss.

**Why it matters:** this is the one gap that's a correctness bug waiting to happen, not just a missing feature demo. Every other item below is "a surface this template doesn't showcase yet"; this one is "the existing code is not type-safe where it looks like it is."

**What it would contain:**
- A discriminated union of message types, e.g.:
  ```ts
  export type ExtensionMessage =
    | { type: "PING"; count: number }
    | { type: "PAGE_LOADED"; url: string }
    | { type: "CONTENT_SCRIPT_LOADED"; url: string }
    | { type: "UPDATE_BADGE"; text: string }
    | { type: "CONTEXT_MENU_CLICKED"; info: chrome.contextMenus.OnClickData };
  ```
- Possibly a typed wrapper around `chrome.runtime.sendMessage`/`onMessage.addListener` so callers get autocomplete and exhaustiveness checking on `message.type` instead of raw untyped objects.
- Shared constants/enums if there's a reason to avoid magic strings entirely.

**Tradeoff:** all three consuming packages (`background`, `content-script`, `popup`) need a new workspace dependency on `@chrome-ext/shared`, and existing message-handling code needs light refactoring to import the union type instead of inlining `{ type: string; ... }`. Low risk, moderate churn.

**Suggested structure:** a pure TS package, no bundler needed beyond `tsc` — this is types-only (or types + a couple of trivial runtime helpers), consumed via `workspace:*` and TS project references, not bundled into the final extension at all (it disappears at compile time unless the runtime helpers are used, in which case it'd need a build step like `background`/`content-script`).

---

## 2. Options page (`options_page` / `options_ui`)

**The gap:** MV3 supports a full-page settings surface distinct from the popup — `options_page` (opens in a new tab) or `options_ui` (embedded in `chrome://extensions`). Neither exists here; the popup is the only UI surface.

**Why it matters:** popups are constrained (small viewport, closes on blur, no persistent state across opens without `chrome.storage`) and are a poor fit for anything beyond a couple of buttons. Any extension with real configuration (API keys, feature toggles, allow/deny lists) needs an options page. Its absence means this template only demonstrates the "quick action" UI pattern, not the "settings" pattern — and the two have different lifecycle and storage-access conventions worth showing.

**What it would contain:** likely a second Vite-built React app, structurally similar to `packages/popup` (could even share components/build config), with its own `dist/index.html` → `dist/options.html`. The assembler would need a new copy step (similar to the existing popup HTML/assets copy) and the manifest would need:
```json
"options_page": "options.html"
```
or, for the embedded variant:
```json
"options_ui": { "page": "options.html", "open_in_tab": false }
```

**Tradeoff:** if it's Vite + React like popup, most of the work is copy-paste-and-adapt from `packages/popup`, so implementation cost is low; the main design decision is whether to extract shared React setup (Vite config, tsconfig, ESLint config) into something reusable, or accept duplication for template clarity. Given [[MISSING_SCOPES]] convention elsewhere in this repo (each package intentionally self-contained rather than sharing build config), duplication is probably the right call for a template.

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

## 4. Typed `chrome.storage` wrapper

**The gap:** `packages/background/src/index.ts` calls `chrome.storage.sync.set({...})` directly with an inline, untyped settings object (`{ enabled: true, installDate: Date.now() }`). There's no shared schema for what's actually stored, no read-side helper, and nothing preventing background/popup/options from disagreeing on the shape of stored data over time.

**Why it matters:** `chrome.storage` is asynchronous, has no runtime schema validation, and silently returns `undefined` for missing/renamed keys — a classic source of "worked in dev, broke after an update changed the settings shape" bugs. A small typed wrapper (get/set functions keyed to a shared interface, ideally the same one used by [[MISSING_SCOPES]] item 1's `@chrome-ext/shared`) removes an entire class of bugs cheaply.

**What it would contain:** a handful of functions like `getSettings(): Promise<Settings>` / `setSettings(partial: Partial<Settings>): Promise<void>`, backed by a `Settings` interface, plus sensible defaults merging. Small enough to live inside `@chrome-ext/shared` rather than justify its own package.

**Tradeoff:** minimal — this is a small addition once `@chrome-ext/shared` exists, and arguably not worth a standalone package on its own.

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

1. `@chrome-ext/shared` (message types + storage wrapper) — fixes a real type-safety gap in existing code, benefits every other package.
2. Options page — highest-value missing UI surface, most template value per unit of effort.
3. Side panel — same shape as options page, do together if extracting shared React/Vite config becomes worthwhile.
4. i18n scaffold — cheap, do opportunistically.
5. DevTools panel — only if a concrete need shows up; otherwise leave as a documented gap.
