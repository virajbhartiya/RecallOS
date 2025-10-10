/// <reference types="chrome" />

console.log('Hello from RecallOS content script');

chrome.runtime.sendMessage({ type: 'PING', from: 'content' }, (response: unknown) => {
  if (chrome.runtime.lastError) return; // ignore if background not ready
  console.log('Background responded:', response);
});

 