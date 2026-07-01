// This script is NOT a content script - it has no access to `chrome.*` APIs.
// It's injected by the content script (packages/content-script/src/index.ts)
// as a plain <script> tag pointing at chrome.runtime.getURL("page-bridge.js"),
// which runs it in the page's own JS context ("MAIN world") instead of the
// isolated world content scripts execute in. That's the standard pattern for
// reaching page-defined globals/libraries, and it's why this file must be
// declared in the manifest's `web_accessible_resources` - without that entry
// the page is not allowed to load a script from the extension's origin.
console.log("[page-bridge] running in the page's own JS context");

window.dispatchEvent(
  new CustomEvent("chrome-ext:page-bridge-ready", {
    detail: { href: window.location.href },
  }),
);

export {};
