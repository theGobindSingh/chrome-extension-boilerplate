import type {
  ContentScriptLoadedMessage,
  ExtensionMessage,
} from "@chrome-ext/shared-types";

// Content script that runs on web pages
console.log("Content script loaded");

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    console.log("Content script received message:", message);

    if (message.type === "PING") {
      console.log("Received PING with count:", message.count);

      // Create a visual indicator on the page. Styling comes from
      // content-script.css (compiled by @chrome-ext/styles, declared in the
      // manifest), not inline styles, so it isn't silently dropped by a page
      // with a strict style-src CSP.
      const notification = document.createElement("div");
      notification.className = "chrome-ext-notification";
      notification.textContent = `Message received! Count: ${message.count}`;
      document.body.appendChild(notification);

      // Remove after 3 seconds
      setTimeout(() => {
        notification.remove();
      }, 3000);

      sendResponse({ status: "success" });
      return true; // Keep message channel open for async response
    }

    if (message.type === "PAGE_LOADED") {
      console.log("Page loaded notification received from background");
      sendResponse({ status: "acknowledged" });
      return true;
    }

    // For any other message types, acknowledge immediately
    sendResponse({ status: "ok" });
    return false; // No async response needed for unknown messages
  },
);

// Example: Modify page content
// .chrome-ext-highlight is defined in content-script.css (manifest-declared),
// so elements can be highlighted with `element.classList.add("chrome-ext-highlight")`.

// Example: Run code in the page's own JS context ("MAIN world"). Content
// scripts execute in an isolated world with no access to page-defined
// globals, so reaching them requires injecting a <script> tag pointing at a
// web_accessible_resource (see packages/page-bridge and the manifest's
// web_accessible_resources entry).
const bridgeScript = document.createElement("script");
bridgeScript.src = chrome.runtime.getURL("page-bridge.js");
bridgeScript.addEventListener("load", () => bridgeScript.remove());
document.documentElement.appendChild(bridgeScript);

window.addEventListener("chrome-ext:page-bridge-ready", ((
  event: CustomEvent<{ href: string }>,
) => {
  console.log("Content script observed page-bridge ready:", event.detail);
}) as EventListener);

// Send message to background script
const loadedMessage: ContentScriptLoadedMessage = {
  type: "CONTENT_SCRIPT_LOADED",
  url: window.location.href,
};
void chrome.runtime.sendMessage(loadedMessage);

export {};
