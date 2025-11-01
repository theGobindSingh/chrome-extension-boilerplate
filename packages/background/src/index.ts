// Background service worker
console.log("Background service worker initialized");

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details.reason);

  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // Set default settings or open welcome page
    void chrome.storage.sync.set({
      settings: {
        enabled: true,
        installDate: Date.now(),
      },
    });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background received message:", message);

  if (message.type === "CONTENT_SCRIPT_LOADED") {
    console.log("Content script loaded on:", message.url);
    sendResponse({ status: "acknowledged" });
  }

  // Example: Handle badge updates
  if (message.type === "UPDATE_BADGE") {
    void chrome.action.setBadgeText({ text: message.text ?? "" });
    void chrome.action.setBadgeBackgroundColor({ color: "#4CAF50" });
  }

  return true; // Keep message channel open
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    console.log("Tab updated:", tab.url);

    // Only send messages to regular web pages (not browser internal pages)
    if (tab.url.startsWith("http://") || tab.url.startsWith("https://")) {
      // Wait a bit for content script to be ready, then send message
      setTimeout(() => {
        chrome.tabs
          .sendMessage(tabId, {
            type: "PAGE_LOADED",
            url: tab.url,
          })
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
      }, 100); // 100ms delay to let content script initialize
    }
  }
});

// Example: Context menu
chrome.contextMenus.create({
  id: "chrome-ext-action",
  title: "Chrome Extension Action",
  contexts: ["all"],
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("Context menu clicked:", info);

  if (tab?.id) {
    void chrome.tabs.sendMessage(tab.id, {
      type: "CONTEXT_MENU_CLICKED",
      info,
    });
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
