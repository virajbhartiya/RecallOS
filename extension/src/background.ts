/// <reference types="chrome" />

interface ContextData {
  source: string;
  url: string;
  title: string;
  content_snippet: string;
  timestamp: number;
}

// Get API endpoint from storage or use default
async function getApiEndpoint(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get(['apiEndpoint']);
    return result.apiEndpoint || 'http://localhost:3000/api/memory';
  } catch (error) {
    console.error('RecallOS: Error getting API endpoint from storage:', error);
    return 'http://localhost:3000/api/memory';
  }
}

async function sendToBackend(data: ContextData): Promise<void> {
  try {
    const apiEndpoint = await getApiEndpoint();
    console.log('RecallOS: Sending to backend:', data);
    console.log('RecallOS: Using endpoint:', apiEndpoint);
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
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

// Function to set API endpoint
async function setApiEndpoint(endpoint: string): Promise<void> {
  try {
    await chrome.storage.sync.set({ apiEndpoint: endpoint });
    console.log('RecallOS: API endpoint set to:', endpoint);
  } catch (error) {
    console.error('RecallOS: Error setting API endpoint:', error);
  }
}

chrome.runtime.onMessage.addListener(
  (
    message: { type?: string; data?: ContextData; endpoint?: string },
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
    
    if (message?.type === 'PING') {
      sendResponse({ type: 'PONG', from: 'background' });
    }
  }
);


