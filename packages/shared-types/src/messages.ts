/**
 * Message contracts exchanged between the background service worker,
 * content script, and popup via chrome.runtime.sendMessage /
 * chrome.tabs.sendMessage. Import these instead of typing `message.type`
 * as a bare string, so a typo or payload-shape drift between senders and
 * listeners is caught by tsc instead of failing silently at runtime.
 */

// popup -> content script (chrome.tabs.sendMessage)
export interface PingMessage {
  type: "PING";
  count: number;
}

// content script -> background (chrome.runtime.sendMessage)
export interface ContentScriptLoadedMessage {
  type: "CONTENT_SCRIPT_LOADED";
  url: string;
}

// background -> content script, once a tab finishes loading
export interface PageLoadedMessage {
  type: "PAGE_LOADED";
  url: string;
}

// -> background, to update the toolbar badge
export interface UpdateBadgeMessage {
  type: "UPDATE_BADGE";
  text?: string;
}

// background -> content script, forwarding a context menu click
export interface ContextMenuClickedMessage {
  type: "CONTEXT_MENU_CLICKED";
  info: chrome.contextMenus.OnClickData;
}

export type ExtensionMessage =
  | PingMessage
  | ContentScriptLoadedMessage
  | PageLoadedMessage
  | UpdateBadgeMessage
  | ContextMenuClickedMessage;

export interface AcknowledgedResponse {
  status: "acknowledged";
}

export interface SuccessResponse {
  status: "success";
}

export interface OkResponse {
  status: "ok";
}

export type ExtensionResponse =
  AcknowledgedResponse | SuccessResponse | OkResponse;
