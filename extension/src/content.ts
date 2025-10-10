/// <reference types="chrome" />

interface ContextData {
  source: string;
  url: string;
  title: string;
  content_snippet: string;
  timestamp: number;
}

function extractVisibleText(): string {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        const style = window.getComputedStyle(parent);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes: string[] = [];
  let node;
  
  while (node = walker.nextNode()) {
    const text = node.textContent?.trim();
    if (text && text.length > 0) {
      textNodes.push(text);
    }
  }
  
  return textNodes.join(' ');
}

function captureContext(): ContextData {
  const url = window.location.href;
  const title = document.title;
  const fullText = extractVisibleText();
  const content_snippet = fullText.substring(0, 500);
  
  return {
    source: 'extension',
    url,
    title,
    content_snippet,
    timestamp: Date.now()
  };
}

function sendContextToBackground() {
  try {
    const contextData = captureContext();
    console.log('RecallOS: Captured context:', contextData);
    
    chrome.runtime.sendMessage(
      { type: 'CAPTURE_CONTEXT', data: contextData },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('RecallOS: Error sending to background:', chrome.runtime.lastError);
          return;
        }
        console.log('RecallOS: Background response:', response);
      }
    );
  } catch (error) {
    console.error('RecallOS: Error capturing context:', error);
  }
}

// Capture context when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', sendContextToBackground);
} else {
  sendContextToBackground();
}

// Also capture on navigation changes (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(sendContextToBackground, 1000); // Delay to let content load
  }
}).observe(document, { subtree: true, childList: true });

 