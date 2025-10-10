/// <reference types="chrome" />

chrome.runtime.onInstalled.addListener(() => {
  console.log('RecallOS Extension installed.');
});

chrome.runtime.onMessage.addListener(
  (
    message: { type?: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    if (message?.type === 'PING') {
      sendResponse({ type: 'PONG', from: 'background' });
    }
  }
);


