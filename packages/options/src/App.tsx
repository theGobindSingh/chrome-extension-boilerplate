import type { ExtensionSettings } from "@chrome-ext/shared-types";
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  installDate: Date.now(),
};

const App = () => {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Options pages read/write chrome.storage directly, rather than
    // messaging a background/content script - unlike the popup's
    // quick-action pattern, settings need to persist across opens.
    chrome?.storage?.sync?.get?.(["settings"], (result) => {
      if (result.settings) {
        setSettings(result.settings as ExtensionSettings);
      }
    });
  }, []);

  const handleToggleEnabled = () => {
    const next: ExtensionSettings = {
      ...settings,
      enabled: !settings.enabled,
    };
    setSettings(next);
    void chrome?.storage?.sync?.set?.({ settings: next }).then(() => {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
      }, 1500);
    });
  };

  const installedAt = useMemo(() => {
    return new Date(settings.installDate).toLocaleString();
  }, [settings.installDate]);

  return (
    <div className="app">
      <h1>Chrome Extension Options</h1>
      <div className="card">
        <label>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={handleToggleEnabled}
          />
          Enabled
        </label>
        <p>Installed: {installedAt}</p>
        {saved && <p className="saved">Saved!</p>}
      </div>
    </div>
  );
};

export default App;
