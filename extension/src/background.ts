import { getOrCreateUserId, getAuthToken, getOrCreateAuthToken } from '@/lib/userId'
/// <reference types="chrome" />

interface ContextData {
  source: string;
  url: string;
  title: string;
  content_snippet: string;
  timestamp: number;
  wallet_address?: string;
  full_content?: string;
  meaningful_content?: string;
  content_summary?: string;
  content_type?: string;
}

async function getApiEndpoint(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get(['apiEndpoint']);
    return result.apiEndpoint || 'http://localhost:3000/api/memory/process';
  } catch (error) {
    console.error('RecallOS: Error getting API endpoint from storage:', error);
    return 'http://localhost:3000/api/memory/process';
  }
}

async function isExtensionEnabled(): Promise<boolean> {
  try {
    const result = await chrome.storage.sync.get(['extensionEnabled']);
    return result.extensionEnabled !== false;
  } catch (error) {
    console.error('RecallOS: Error getting extension enabled state:', error);
    return true;
  }
}

async function setExtensionEnabled(enabled: boolean): Promise<void> {
  try {
    await chrome.storage.sync.set({ extensionEnabled: enabled });
  } catch (error) {
    console.error('RecallOS: Error setting extension enabled state:', error);
  }
}

async function getWalletAddress(): Promise<string | null> { return null; }

async function sendToBackend(data: ContextData): Promise<void> {
  try {
    // Check if extension is enabled
    const enabled = await isExtensionEnabled();
    if (!enabled) {
      console.log('RecallOS: Extension is disabled, skipping context capture');
      return;
    }

    const apiEndpoint = await getApiEndpoint();
    const walletAddress = null;

    const privacyInfo = (data as any).privacy_extension_info;
    const hasPrivacyConflicts = privacyInfo?.detected || false;

    // Validate content before sending
    const content = data.meaningful_content || data.content_snippet || data.full_content || '';
    const isValidContent = content && 
                          content.length > 50 && 
                          !content.includes('Content extraction failed') &&
                          !content.includes('No content available');

    // Don't send if content is invalid or privacy extensions are blocking
    if (!isValidContent) {
      return;
    }

    const payload = {
      content: content,
      url: data.url,
      title: data.title,
      userId: getOrCreateUserId(),
      metadata: {
        source: data.source,
        timestamp: data.timestamp,
        content_type: data.content_type || 'web_page',
        content_summary: data.content_summary,
        privacy_extension_conflicts: hasPrivacyConflicts,
        privacy_extension_type: privacyInfo?.type || 'none',
        compatibility_mode: privacyInfo?.compatibility_mode || false,
      },
    };


    // Get or create auth token
    const authToken = await getOrCreateAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ ...payload, userId: getOrCreateUserId() }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
  } catch (error) {
    console.error('RecallOS: Error sending to backend:', error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
});

chrome.tabs.onActivated.addListener(async activeInfo => {
  try {
    await chrome.tabs.sendMessage(activeInfo.tabId, {
      type: 'CAPTURE_CONTEXT_NOW',
    });
  } catch (error) {
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'CAPTURE_CONTEXT_NOW' });
    } catch (error) {
    }
  }
});

async function setApiEndpoint(endpoint: string): Promise<void> {
  try {
    await chrome.storage.sync.set({ apiEndpoint: endpoint });
  } catch (error) {
    console.error('RecallOS: Error setting API endpoint:', error);
  }
}

async function setWalletAddress(walletAddress: string): Promise<void> {
  try {
    await chrome.storage.sync.set({ wallet_address: walletAddress });
  } catch (error) {
    console.error('RecallOS: Error setting wallet address:', error);
  }
}

chrome.runtime.onMessage.addListener(
  (
    message: {
      type?: string;
      data?: ContextData;
      endpoint?: string;
      walletAddress?: string;
      enabled?: boolean;
    },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    if (message?.type === 'CAPTURE_CONTEXT' && message.data) {
      sendToBackend(message.data)
        .then(() => {
          sendResponse({ success: true, message: 'Context sent to backend' });
        })
        .catch(error => {
          console.error('RecallOS: Failed to send context:', error);
          sendResponse({ success: false, error: error.message });
        });

      return true; // Keep message channel open for async response
    }

    if (message?.type === 'SET_ENDPOINT' && message.endpoint) {
      setApiEndpoint(message.endpoint)
        .then(() => {
          sendResponse({ success: true, message: 'API endpoint updated' });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message?.type === 'GET_ENDPOINT') {
      getApiEndpoint()
        .then(endpoint => {
          sendResponse({ success: true, endpoint });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }
    

    if (message?.type === 'GET_EXTENSION_ENABLED') {
      isExtensionEnabled()
        .then(enabled => {
          sendResponse({ success: true, enabled });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message?.type === 'SET_EXTENSION_ENABLED' && typeof message.enabled === 'boolean') {
      setExtensionEnabled(message.enabled)
        .then(() => {
          sendResponse({ success: true, message: 'Extension state updated' });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message?.type === 'PING') {
      sendResponse({ type: 'PONG', from: 'background' });
    }
  }
);
