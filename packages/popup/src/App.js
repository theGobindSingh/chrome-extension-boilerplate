import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import "./App.css";
const App = () => {
    const [count, setCount] = useState(0);
    const [currentTab, setCurrentTab] = useState("");
    useEffect(() => {
        // Get current tab info
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.url) {
                setCurrentTab(tabs[0].url);
            }
        });
    }, []);
    const handleSendMessage = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                void chrome.tabs.sendMessage(tabs[0].id, {
                    type: "PING",
                    count,
                });
            }
        });
    };
    return (_jsxs("div", { className: "app", children: [_jsx("h1", { children: "Chrome Extension Popup" }), _jsxs("div", { className: "card", children: [_jsxs("p", { children: ["Current Tab: ", currentTab] }), _jsxs("button", { onClick: () => setCount((count) => count + 1), children: ["Count is ", count] }), _jsx("button", { onClick: handleSendMessage, children: "Send Message to Content Script" })] })] }));
};
export default App;
