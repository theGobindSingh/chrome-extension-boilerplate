// Content script that runs on web pages
console.log("Content script loaded");

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);

  if (message.type === "PING") {
    console.log("Received PING with count:", message.count);

    // Create a visual indicator on the page
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
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
});

// Example: Modify page content
const injectCustomStyles = () => {
  const style = document.createElement("style");
  style.textContent = `
    /* Custom styles injected by extension */
    .chrome-ext-highlight {
      background-color: yellow !important;
    }
  `;
  document.head.appendChild(style);
};

injectCustomStyles();

// Send message to background script
void chrome.runtime.sendMessage({
  type: "CONTENT_SCRIPT_LOADED",
  url: window.location.href,
});

export {};
