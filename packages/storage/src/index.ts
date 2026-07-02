import type { ExtensionSettings } from "@chrome-ext/shared-types";

/**
 * chrome.storage is async, has no runtime schema validation, and silently
 * returns undefined for missing/renamed keys - this wrapper is the single
 * place that knows the storage key and the default shape, so background,
 * options, and anything else reading/writing settings can't drift out of
 * sync with each other over time.
 */
const STORAGE_KEY = "settings";

export const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  installDate: Date.now(),
};

/**
 * Reads the current settings from chrome.storage.sync, merged over
 * DEFAULT_SETTINGS so a missing key (first run) or a partially-written
 * value (e.g. after adding a new field in a later version) never comes
 * back as undefined.
 */
export const getSettings = (): Promise<ExtensionSettings> => {
  return new Promise((resolvePromise) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      const stored = result[STORAGE_KEY] as
        Partial<ExtensionSettings> | undefined;
      resolvePromise({ ...DEFAULT_SETTINGS, ...stored });
    });
  });
};

/**
 * Merges `partial` over the current settings and persists the result.
 * Returns the full, merged settings object that was written.
 */
export const setSettings = async (
  partial: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> => {
  const current = await getSettings();
  const next: ExtensionSettings = { ...current, ...partial };
  await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  return next;
};

/**
 * Subscribes to settings changes in chrome.storage.sync (e.g. the options
 * page updating a setting while the popup or background is also open).
 * Returns an unsubscribe function.
 */
export const onSettingsChanged = (
  callback: (settings: ExtensionSettings) => void,
): (() => void) => {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ): void => {
    if (areaName !== "sync") {
      return;
    }
    const change = changes[STORAGE_KEY];
    if (!change) {
      return;
    }
    const newValue = change.newValue as Partial<ExtensionSettings> | undefined;
    callback({ ...DEFAULT_SETTINGS, ...newValue });
  };

  chrome.storage.onChanged.addListener(listener);
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
};
