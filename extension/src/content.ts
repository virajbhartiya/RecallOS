/// <reference types="chrome" />

interface ContextData {
  source: string;
  url: string;
  title: string;
  content_snippet: string;
  timestamp: number;
  full_content?: string;
  page_metadata?: {
    description?: string;
    keywords?: string;
    author?: string;
    viewport?: string;
    language?: string;
  };
  page_structure?: {
    headings: string[];
    links: string[];
    images: string[];
    forms: string[];
  };
  user_activity?: {
    scroll_position: number;
    window_size: { width: number; height: number };
    focused_element?: string;
  };
}

let lastUrl = location.href;
let lastContent = '';
let lastTitle = '';
let captureInterval: number | null = null;
let isActive = true;
let activityLevel = 'normal';
let lastActivityTime = Date.now();
let lastCaptureTime = 0;
let hasUserActivity = false;
const MIN_CAPTURE_INTERVAL = 10000; // Minimum 10 seconds between captures
const ACTIVITY_TIMEOUT = 30000; // 30 seconds of inactivity before capturing

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

function extractFullContent(): string {
  // Get all visible text content (up to 5000 characters)
  const fullText = extractVisibleText();
  return fullText.length > 5000 ? fullText.substring(0, 5000) + '...' : fullText;
}

function extractPageMetadata() {
  const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
  const keywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
  const author = document.querySelector('meta[name="author"]') as HTMLMetaElement;
  const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
  
  return {
    description: meta?.content || '',
    keywords: keywords?.content || '',
    author: author?.content || '',
    viewport: viewport?.content || '',
    language: document.documentElement.lang || ''
  };
}

function extractPageStructure() {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .map(h => h.textContent?.trim())
    .filter(text => text && text.length > 0)
    .slice(0, 20); // Limit to first 20 headings

  const links = Array.from(document.querySelectorAll('a[href]'))
    .map(a => {
      const href = (a as HTMLAnchorElement).href;
      const text = a.textContent?.trim();
      return text ? `${text} (${href})` : href;
    })
    .filter(link => link.length > 0)
    .slice(0, 30);

  const images = Array.from(document.querySelectorAll('img[src]'))
    .map(img => {
      const src = (img as HTMLImageElement).src;
      const alt = (img as HTMLImageElement).alt;
      return alt ? `${alt} (${src})` : src;
    })
    .filter(img => img.length > 0)
    .slice(0, 20);

  const forms = Array.from(document.querySelectorAll('form'))
    .map(form => {
      const inputs = Array.from(form.querySelectorAll('input, textarea, select'))
        .map(input => (input as HTMLInputElement).name || (input as HTMLInputElement).type || 'input')
        .join(', ');
      return inputs ? `Form with: ${inputs}` : 'Form';
    })
    .slice(0, 10);

  return { headings, links, images, forms };
}

function extractUserActivity() {
  return {
    scroll_position: window.pageYOffset || document.documentElement.scrollTop,
    window_size: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    focused_element: document.activeElement?.tagName || ''
  };
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
    timestamp: Date.now(),
    full_content: extractFullContent(),
    page_metadata: extractPageMetadata(),
    page_structure: extractPageStructure(),
    user_activity: extractUserActivity()
  };
}

function sendContextToBackground() {
  try {
    if (!chrome.runtime?.id) {
      console.log('RecallOS: Extension context invalidated, skipping capture');
      return;
    }

    const now = Date.now();
    if ((now - lastCaptureTime) < MIN_CAPTURE_INTERVAL) {
      console.log('RecallOS: Skipping capture - too soon since last capture');
      return;
    }

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
    
    lastCaptureTime = now;
  } catch (error) {
    console.error('RecallOS: Error capturing context:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    hasUserActivity = true;
    sendContextToBackground();
  });
} else {
  hasUserActivity = true;
  sendContextToBackground();
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    hasUserActivity = true;
    lastActivityTime = Date.now();
  }
});

window.addEventListener('focus', () => {
  hasUserActivity = true;
  lastActivityTime = Date.now();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!chrome.runtime?.id) {
    return false;
  }

  if (message.type === 'GET_WALLET_ADDRESS') {
    try {
      const walletAddress = localStorage.getItem('wallet_address');
      sendResponse({ walletAddress });
    } catch (error) {
      console.error('RecallOS: Error getting wallet address from localStorage:', error);
      sendResponse({ walletAddress: null });
    }
    return true;
  }
  
  if (message.type === 'CAPTURE_CONTEXT_NOW') {
    hasUserActivity = true;
    sendContextToBackground();
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'START_MONITORING') {
    startContinuousMonitoring();
    sendResponse({ success: true, activityLevel });
    return true;
  }
  
  if (message.type === 'STOP_MONITORING') {
    stopContinuousMonitoring();
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'GET_MONITORING_STATUS') {
    sendResponse({ 
      success: true, 
      isActive, 
      activityLevel, 
      isMonitoring: !!captureInterval 
    });
    return true;
  }
});

window.addEventListener('message', (event) => {
  if (event.data.type === 'WALLET_ADDRESS' && event.data.walletAddress) {
    chrome.storage.sync.set({ wallet_address: event.data.walletAddress }, () => {
      console.log('RecallOS: Wallet address received and stored from frontend');
    });
  }
});

setInterval(() => {
  try {
    const walletAddress = localStorage.getItem('wallet_address');
    if (walletAddress) {
      chrome.storage.sync.set({ wallet_address: walletAddress }, () => {
        console.log('RecallOS: Wallet address synced from localStorage:', walletAddress);
      });
    }
  } catch (error) {
    // Ignore errors if localStorage is not accessible
  }
}, 2000);

chrome.storage.sync.get(['wallet_address'], (result) => {
  if (result.wallet_address) {
  } else {
    console.log('RecallOS: No wallet address found in storage');
  }
});

function hasContentChanged(): boolean {
  const currentUrl = location.href;
  const currentTitle = document.title;
  const currentContent = extractVisibleText();
  
  const urlChanged = currentUrl !== lastUrl;
  const titleChanged = currentTitle !== lastTitle;
  
  const contentChanged = currentContent !== lastContent && 
    (Math.abs(currentContent.length - lastContent.length) > 100 ||
     currentContent.substring(0, 200) !== lastContent.substring(0, 200));
  
  return urlChanged || titleChanged || contentChanged;
}

function shouldCaptureBasedOnActivity(): boolean {
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivityTime;
  const timeSinceLastCapture = now - lastCaptureTime;

  return hasUserActivity && 
         timeSinceLastCapture >= MIN_CAPTURE_INTERVAL &&
         (hasContentChanged() || timeSinceLastActivity >= ACTIVITY_TIMEOUT);
}

function getMonitoringInterval(): number {
  switch (activityLevel) {
    case 'high': return 10000;
    case 'normal': return 20000;
    case 'low': return 60000;
    default: return 20000;
  }
}

function updateActivityLevel() {
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivityTime;
  
  if (timeSinceLastActivity < 15000) {
    activityLevel = 'high';
  } else if (timeSinceLastActivity < 120000) {
    activityLevel = 'normal';
  } else {
    activityLevel = 'low';
  }
}

function startContinuousMonitoring() {
  if (captureInterval) {
    clearInterval(captureInterval);
  }
  
  updateActivityLevel();
  const interval = getMonitoringInterval();
  
  captureInterval = setInterval(() => {
    if (!chrome.runtime?.id) {
      stopContinuousMonitoring();
      return;
    }

    if (isActive) {
      updateActivityLevel();
      
      if (shouldCaptureBasedOnActivity()) {
        sendContextToBackground();
        
        hasUserActivity = false;
        if (Date.now() - lastCaptureTime < 1000) {
          lastUrl = location.href;
          lastTitle = document.title;
          lastContent = extractVisibleText();
        }
      }
      
      const newInterval = getMonitoringInterval();
      if (newInterval !== interval) {
        startContinuousMonitoring();
      }
    }
  }, interval);
}

function stopContinuousMonitoring() {
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }
}

startContinuousMonitoring();

new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(sendContextToBackground, 1000);
  }
}).observe(document, { subtree: true, childList: true });

document.addEventListener('visibilitychange', () => {
  isActive = !document.hidden;
  if (isActive) {
    startContinuousMonitoring();
  } else {
    stopContinuousMonitoring();
  }
});

window.addEventListener('blur', () => {
  isActive = false;
  stopContinuousMonitoring();
});

window.addEventListener('focus', () => {
  isActive = true;
  startContinuousMonitoring();
});

document.addEventListener('click', () => {
  lastActivityTime = Date.now();
  hasUserActivity = true;
  activityLevel = 'high';
});

document.addEventListener('scroll', () => {
  lastActivityTime = Date.now();
  hasUserActivity = true;
  if (activityLevel === 'low') {
    activityLevel = 'normal';
  }
});

document.addEventListener('keydown', () => {
  lastActivityTime = Date.now();
  hasUserActivity = true;
  activityLevel = 'high';
});

let mouseMoveTimeout: number | null = null;
document.addEventListener('mousemove', () => {
  if (mouseMoveTimeout) return;
  
  mouseMoveTimeout = setTimeout(() => {
    lastActivityTime = Date.now();
    hasUserActivity = true;
    if (activityLevel === 'low') {
      activityLevel = 'normal';
    }
    mouseMoveTimeout = null;
  }, 3000);
});

 