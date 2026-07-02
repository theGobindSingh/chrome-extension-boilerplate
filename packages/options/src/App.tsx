import type { ExtensionSettings } from "@chrome-ext/shared-types";
import {
  DEFAULT_SETTINGS,
  getSettings,
  onSettingsChanged,
  setSettings,
} from "@chrome-ext/storage";
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const App = () => {
  const [localSettings, setLocalSettings] =
    useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Options pages read/write chrome.storage directly (via
    // @chrome-ext/storage), rather than messaging a background/content
    // script - unlike the popup's quick-action pattern, settings need to
    // persist across opens.
    void getSettings().then(setLocalSettings);

    // Keep in sync if settings change elsewhere (e.g. background writing
    // a fresh installDate, or this page open in two tabs at once).
    return onSettingsChanged(setLocalSettings);
  }, []);

  const handleToggleEnabled = () => {
    const next = { ...localSettings, enabled: !localSettings.enabled };
    setLocalSettings(next);
    void setSettings(next).then(() => {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
      }, 1500);
    });
  };

  const installedAt = useMemo(() => {
    return new Date(localSettings.installDate).toLocaleString();
  }, [localSettings.installDate]);

  return (
    <div className="app">
      <h1>Chrome Extension Options</h1>
      <div className="card">
        <label>
          <input
            type="checkbox"
            checked={localSettings.enabled}
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
