/**
 * Shape of the settings object the background service worker writes to
 * chrome.storage.sync on install. Shared so readers (options page, popup,
 * etc., once they exist) agree with the writer on what's actually stored.
 */
export interface ExtensionSettings {
  enabled: boolean;
  installDate: number;
}
