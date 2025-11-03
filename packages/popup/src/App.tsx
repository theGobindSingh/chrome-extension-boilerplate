import { useState, useEffect } from "react";
import "./App.css";

const App = () => {
  const [count, setCount] = useState(0);
  const [currentTab, setCurrentTab] = useState<string>("");

  useEffect(() => {
    // Get current tab info
    chrome?.tabs?.query?.({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        setCurrentTab(tabs[0].url);
      }
    });
  }, []);

  const handleSendMessage = () => {
    chrome?.tabs?.query?.({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        void chrome.tabs.sendMessage(tabs[0].id, {
          type: "PING",
          count,
        });
      }
    });
  };

  return (
    <div className="app">
      <h1>Chrome Extension Popup New</h1>
      <div className="card">
        <p>Current Tab: {currentTab}</p>
        <button onClick={() => setCount((count) => count + 1)}>
          Count is {count}
        </button>
        <button onClick={handleSendMessage}>
          Send Message to Content Script
        </button>
      </div>
    </div>
  );
};

export default App;
