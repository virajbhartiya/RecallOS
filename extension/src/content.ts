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

// Activity-based monitoring system variables
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
    .slice(0, 30); // Limit to first 30 links

  const images = Array.from(document.querySelectorAll('img[src]'))
    .map(img => {
      const src = (img as HTMLImageElement).src;
      const alt = (img as HTMLImageElement).alt;
      return alt ? `${alt} (${src})` : src;
    })
    .filter(img => img.length > 0)
    .slice(0, 20); // Limit to first 20 images

  const forms = Array.from(document.querySelectorAll('form'))
    .map(form => {
      const inputs = Array.from(form.querySelectorAll('input, textarea, select'))
        .map(input => (input as HTMLInputElement).name || (input as HTMLInputElement).type || 'input')
        .join(', ');
      return inputs ? `Form with: ${inputs}` : 'Form';
    })
    .slice(0, 10); // Limit to first 10 forms

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
    timestamp: Date.now()
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
    hasUserActivity = true; // Mark initial load as activity
    sendContextToBackground();
  });
} else {
  hasUserActivity = true; // Mark initial load as activity
  sendContextToBackground();
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    console.log('RecallOS: Page became visible, marking activity');
    hasUserActivity = true;
    lastActivityTime = Date.now();
  }
});

window.addEventListener('focus', () => {
  console.log('RecallOS: Window focused, marking activity');
  hasUserActivity = true;
  lastActivityTime = Date.now();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!chrome.runtime?.id) {
    console.log('RecallOS: Extension context invalidated, ignoring message');
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
    console.log('RecallOS: Manual context capture triggered');
    hasUserActivity = true; // Mark manual trigger as activity
    sendContextToBackground();
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'START_MONITORING') {
    console.log('RecallOS: Starting monitoring via message');
    startContinuousMonitoring();
    sendResponse({ success: true, activityLevel });
    return true;
  }
  
  if (message.type === 'STOP_MONITORING') {
    console.log('RecallOS: Stopping monitoring via message');
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

// Listen for wallet address updates from frontend
window.addEventListener('message', (event) => {
  if (event.data.type === 'WALLET_ADDRESS' && event.data.walletAddress) {
    // Store wallet address in chrome.storage.sync for background script access
    chrome.storage.sync.set({ wallet_address: event.data.walletAddress }, () => {
      console.log('RecallOS: Wallet address received and stored from frontend');
    });
  }
});

// Periodically check for wallet address in localStorage (fallback)
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
}, 2000); // Check every 2 seconds

// Also check chrome.storage.sync for wallet address
chrome.storage.sync.get(['wallet_address'], (result) => {
  if (result.wallet_address) {
    console.log('RecallOS: Found wallet address in storage:', result.wallet_address);
  } else {
    console.log('RecallOS: No wallet address found in storage');
  }
});

// Activity-based monitoring system

// Function to check if content has changed significantly
function hasContentChanged(): boolean {
  const currentUrl = location.href;
  const currentTitle = document.title;
  const currentContent = extractVisibleText();
  
  const urlChanged = currentUrl !== lastUrl;
  const titleChanged = currentTitle !== lastTitle;
  
  // More strict content change detection
  const contentChanged = currentContent !== lastContent && 
    (Math.abs(currentContent.length - lastContent.length) > 100 || // Significant length change
     currentContent.substring(0, 200) !== lastContent.substring(0, 200)); // First 200 chars changed
  
  return urlChanged || titleChanged || contentChanged;
}

// Function to check if we should capture based on user activity
function shouldCaptureBasedOnActivity(): boolean {
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivityTime;
  const timeSinceLastCapture = now - lastCaptureTime;
  
  // Only capture if:
  // 1. There was user activity AND
  // 2. Enough time has passed since last capture AND
  // 3. Either content changed OR enough inactivity time has passed
  return hasUserActivity && 
         timeSinceLastCapture >= MIN_CAPTURE_INTERVAL &&
         (hasContentChanged() || timeSinceLastActivity >= ACTIVITY_TIMEOUT);
}

function getMonitoringInterval(): number {
  // Check less frequently since we're now activity-driven
  switch (activityLevel) {
    case 'high': return 10000; // 10 seconds
    case 'normal': return 20000; // 20 seconds
    case 'low': return 60000; // 1 minute
    default: return 20000;
  }
}

function updateActivityLevel() {
  const now = Date.now();
  const timeSinceLastActivity = now - lastActivityTime;
  
  if (timeSinceLastActivity < 15000) { // 15 seconds
    activityLevel = 'high';
  } else if (timeSinceLastActivity < 120000) { // 2 minutes
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
  console.log(`RecallOS: Starting continuous monitoring (${activityLevel} activity, ${interval}ms interval)`);
  
  captureInterval = setInterval(() => {
    if (!chrome.runtime?.id) {
      console.log('RecallOS: Extension context invalidated, stopping monitoring');
      stopContinuousMonitoring();
      return;
    }

    if (isActive) {
      updateActivityLevel();
      
      // Only capture if there's been user activity and conditions are met
      if (shouldCaptureBasedOnActivity()) {
        console.log(`RecallOS: User activity detected (${activityLevel} activity), capturing context`);
        sendContextToBackground();
        
        // Reset activity flag and update tracking variables
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

// Function to stop continuous monitoring
function stopContinuousMonitoring() {
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
    console.log('RecallOS: Stopped continuous monitoring');
  }
}

// Start continuous monitoring
startContinuousMonitoring();

// Also capture on navigation changes (for SPAs)
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('RecallOS: URL changed, capturing context');
    setTimeout(sendContextToBackground, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// Pause monitoring when tab is not visible
document.addEventListener('visibilitychange', () => {
  isActive = !document.hidden;
  if (isActive) {
    console.log('RecallOS: Tab became active, resuming monitoring');
    startContinuousMonitoring();
  } else {
    console.log('RecallOS: Tab became inactive, pausing monitoring');
    stopContinuousMonitoring();
  }
});

// Pause monitoring when window loses focus
window.addEventListener('blur', () => {
  isActive = false;
  stopContinuousMonitoring();
});

window.addEventListener('focus', () => {
  isActive = true;
  startContinuousMonitoring();
});

// Detect user interactions to trigger activity-based capture
document.addEventListener('click', () => {
  lastActivityTime = Date.now();
  hasUserActivity = true;
  activityLevel = 'high';
  console.log('RecallOS: User clicked, marking activity');
});

document.addEventListener('scroll', () => {
  lastActivityTime = Date.now();
  hasUserActivity = true;
  if (activityLevel === 'low') {
    activityLevel = 'normal';
  }
  console.log('RecallOS: User scrolled, marking activity');
});

document.addEventListener('keydown', () => {
  lastActivityTime = Date.now();
  hasUserActivity = true;
  activityLevel = 'high';
  console.log('RecallOS: User typed, marking activity');
});

// Also capture on mouse movement (throttled)
let mouseMoveTimeout: number | null = null;
document.addEventListener('mousemove', () => {
  if (mouseMoveTimeout) return;
  
  mouseMoveTimeout = setTimeout(() => {
    lastActivityTime = Date.now();
    hasUserActivity = true;
    if (activityLevel === 'low') {
      activityLevel = 'normal';
    }
    console.log('RecallOS: Mouse movement detected, marking activity');
    mouseMoveTimeout = null;
  }, 3000); // Throttle to every 3 seconds
});

 