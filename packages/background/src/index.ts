import type {
  ContextMenuClickedMessage,
  ExtensionMessage,
  ExtensionSettings,
  PageLoadedMessage,
} from "@chrome-ext/shared-types";

// Background service worker
console.log("Background service worker initialized");

// Tabs whose content script has announced itself via CONTENT_SCRIPT_LOADED
const readyTabs = new Set<number>();
// Tabs that finished loading before their content script announced itself,
// keyed by tabId, holding the URL to notify once the content script is ready
const pendingPageLoads = new Map<number, string>();

const sendPageLoaded = (tabId: number, url: string): void => {
  const message: PageLoadedMessage = { type: "PAGE_LOADED", url };
  chrome.tabs
    .sendMessage(tabId, message)
    .then((response) => {
      console.log("Content script acknowledged page load:", response);
    })
    .catch((error: unknown) => {
      // Only log if it's an actual error (not just "receiving end does not exist")
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        !errorMessage.includes("Receiving end does not exist") &&
        !errorMessage.includes("message channel closed")
      ) {
        console.warn("Error sending message to tab:", tabId, error);
      }
    });
};

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details.reason);

  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // Set default settings or open welcome page
    const settings: ExtensionSettings = {
      enabled: true,
      installDate: Date.now(),
    };
    void chrome.storage.sync.set({ settings });
  }

  // Context menu items persist across service worker restarts, so registering
  // this on every worker startup (rather than only on install/update) would
  // throw "duplicate id" once the item already exists. removeAll() first keeps
  // this idempotent.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "chrome-ext-action",
      title: "Chrome Extension Action",
      contexts: ["all"],
    });
  });
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    console.log("Background received message:", message);

    if (message.type === "CONTENT_SCRIPT_LOADED") {
      console.log("Content script loaded on:", message.url);

      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        readyTabs.add(tabId);

        const pendingUrl = pendingPageLoads.get(tabId);
        if (pendingUrl !== undefined) {
          pendingPageLoads.delete(tabId);
          sendPageLoaded(tabId, pendingUrl);
        }
      }

      sendResponse({ status: "acknowledged" });
    }

    // Example: Handle badge updates
    if (message.type === "UPDATE_BADGE") {
      void chrome.action.setBadgeText({ text: message.text ?? "" });
      void chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
    }

    return true; // Keep message channel open
  },
);

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    console.log("Tab updated:", tab.url);

    // Only send messages to regular web pages (not browser internal pages)
    if (tab.url.startsWith("http://") || tab.url.startsWith("https://")) {
      if (readyTabs.has(tabId)) {
        sendPageLoaded(tabId, tab.url);
      } else {
        // Content script hasn't announced itself yet; notify as soon as it does
        pendingPageLoads.set(tabId, tab.url);
      }
    }
  }
});

// Clean up tracking state when a tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  readyTabs.delete(tabId);
  pendingPageLoads.delete(tabId);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Context menu clicked:", info);

  if (tab?.id) {
    const message: ContextMenuClickedMessage = {
      type: "CONTEXT_MENU_CLICKED",
      info,
    };
    void chrome.tabs.sendMessage(tab.id, message);
  }
});

// Example: Alarm for periodic tasks
void chrome.alarms.create("periodic-task", {
  periodInMinutes: 1,
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "periodic-task") {
    console.log("Periodic task executed");
  }
});

export {};
