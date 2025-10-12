/// <reference types="chrome" />

interface ContextData {
  source: string;
  url: string;
  title: string;
  content_snippet: string;
  timestamp: number;
  wallet_address?: string;
}

// Get API endpoint from storage or use default
async function getApiEndpoint(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get(['apiEndpoint']);
    return result.apiEndpoint || 'http://localhost:3000/api/memory/process';
  } catch (error) {
    console.error('RecallOS: Error getting API endpoint from storage:', error);
    return 'http://localhost:3000/api/memory/process';
  }
}

async function getWalletAddress(): Promise<string | null> {
  try {
    // First try to get from chrome.storage.sync
    const result = await chrome.storage.sync.get(['wallet_address']);
    if (result.wallet_address) {
      console.log('RecallOS: Found wallet address in storage:', result.wallet_address);
      return result.wallet_address;
    }

    console.log('RecallOS: No wallet address found in storage, trying content script...');

    // Fallback: try to get from localStorage via content script
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) {
      try {
        const response = await chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_WALLET_ADDRESS' });
        if (response?.walletAddress) {
          console.log('RecallOS: Found wallet address in content script:', response.walletAddress);
          // Store it in sync storage for future use
          await chrome.storage.sync.set({ wallet_address: response.walletAddress });
          return response.walletAddress;
        }
      } catch (error) {
        console.log('RecallOS: Could not get wallet address from content script:', error);
      }
    }

    console.log('RecallOS: No wallet address found anywhere');
    return null;
  } catch (error) {
    console.error('RecallOS: Error getting wallet address:', error);
    return null;
  }
}

async function sendToBackend(data: ContextData): Promise<void> {
  try {
    const apiEndpoint = await getApiEndpoint();
    const walletAddress = await getWalletAddress();
    
    // Send raw content data for backend processing
    const payload = {
      content: data.meaningful_content || data.content_snippet || data.full_content || 'No content available',
      url: data.url,
      title: data.title,
      userAddress: walletAddress || 'anonymous',
      metadata: {
        source: data.source,
        timestamp: data.timestamp,
        content_type: data.content_type || 'web_page',
        content_summary: data.content_summary
      }
    };
    
    console.log('RecallOS: Sending to backend:', payload);
    console.log('RecallOS: Using endpoint:', apiEndpoint);
    console.log('RecallOS: Wallet Address:', walletAddress || 'Anonymous');
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('RecallOS: Backend response:', result);
  } catch (error) {
    console.error('RecallOS: Error sending to backend:', error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('RecallOS Context Capture Extension installed.');
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    await chrome.tabs.sendMessage(activeInfo.tabId, { type: 'CAPTURE_CONTEXT_NOW' });
  } catch (error) {
    console.log('RecallOS: Could not send message to tab:', error);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      console.log('RecallOS: Tab updated, triggering context capture');
      await chrome.tabs.sendMessage(tabId, { type: 'CAPTURE_CONTEXT_NOW' });
    } catch (error) {
      console.log('RecallOS: Could not send message to updated tab:', error);
    }
  }
});

async function setApiEndpoint(endpoint: string): Promise<void> {
  try {
    await chrome.storage.sync.set({ apiEndpoint: endpoint });
    console.log('RecallOS: API endpoint set to:', endpoint);
  } catch (error) {
    console.error('RecallOS: Error setting API endpoint:', error);
  }
}

async function setWalletAddress(walletAddress: string): Promise<void> {
  try {
    await chrome.storage.sync.set({ wallet_address: walletAddress });
    console.log('RecallOS: Wallet address set to:', walletAddress);
  } catch (error) {
    console.error('RecallOS: Error setting wallet address:', error);
  }
}

chrome.runtime.onMessage.addListener(
  (
    message: { type?: string; data?: ContextData; endpoint?: string; walletAddress?: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    if (message?.type === 'CAPTURE_CONTEXT' && message.data) {
      sendToBackend(message.data)
        .then(() => {
          sendResponse({ success: true, message: 'Context sent to backend' });
        })
        .catch((error) => {
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
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      
      return true;
    }
    
    if (message?.type === 'GET_ENDPOINT') {
      getApiEndpoint()
        .then((endpoint) => {
          sendResponse({ success: true, endpoint });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      
      return true;
    }
    
    if (message?.type === 'SET_WALLET_ADDRESS' && message.walletAddress) {
      setWalletAddress(message.walletAddress)
        .then(() => {
          sendResponse({ success: true, message: 'Wallet address updated' });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      
      return true;
    }
    
    if (message?.type === 'GET_WALLET_ADDRESS') {
      getWalletAddress()
        .then((walletAddress) => {
          sendResponse({ success: true, walletAddress });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      
      return true;
    }
    
    if (message?.type === 'PING') {
      sendResponse({ type: 'PONG', from: 'background' });
    }
  }
);


