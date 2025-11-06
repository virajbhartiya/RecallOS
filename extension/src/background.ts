import { getUserId, requireAuthToken, clearAuthToken } from '@/lib/userId'
/// <reference types="chrome" />

interface ContextData {
  source: string;
  url: string;
  title: string;
  content_snippet: string;
  timestamp: number;
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
    return 'http://localhost:3000/api/memory/process';
  }
}

async function getApiBaseUrl(): Promise<string> {
  try {
    const endpoint = await getApiEndpoint();
    const url = new URL(endpoint);
    return `${url.protocol}//${url.host}`;
  } catch (error) {
    return 'http://localhost:3000';
  }
}

async function checkApiHealth(): Promise<boolean> {
  try {
    const apiBase = await getApiBaseUrl();
    const healthUrl = `${apiBase}/health`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        credentials: 'include',
      });
      clearTimeout(timeout);
      return response.ok || response.status < 500;
    } catch (error) {
      clearTimeout(timeout);
      // Try a simple endpoint if /health doesn't exist
      try {
        const searchUrl = `${apiBase}/api/search`;
        const searchResponse = await fetch(searchUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'health-check', limit: 1 }),
          signal: controller.signal,
          credentials: 'include',
        });
        return searchResponse.status < 500;
      } catch {
        return false;
      }
    }
  } catch (error) {
    return false;
  }
}

async function isExtensionEnabled(): Promise<boolean> {
  try {
    const result = await chrome.storage.sync.get(['extensionEnabled']);
    return result.extensionEnabled !== false;
  } catch (error) {
    return true;
  }
}

async function setExtensionEnabled(enabled: boolean): Promise<void> {
  try {
    await chrome.storage.sync.set({ extensionEnabled: enabled });
    if (chrome.runtime.lastError) {
      throw new Error(chrome.runtime.lastError.message);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to save extension state');
  }
}

async function getBlockedWebsites(): Promise<string[]> {
  try {
    const result = await chrome.storage.sync.get(['blockedWebsites']);
    return result.blockedWebsites || [];
  } catch (error) {
    return [];
  }
}

async function setBlockedWebsites(websites: string[]): Promise<void> {
  try {
    await chrome.storage.sync.set({ blockedWebsites: websites });
  } catch (error) {
    // Ignore errors
  }
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (error) {
    return '';
  }
}

async function isWebsiteBlocked(url: string): Promise<boolean> {
  try {
    const blockedWebsites = await getBlockedWebsites();
    if (blockedWebsites.length === 0) {
      return false;
    }
    
    const domain = extractDomain(url);
    if (!domain) {
      return false;
    }
    
    return blockedWebsites.some(blocked => {
      const blockedDomain = extractDomain(blocked);
      if (!blockedDomain) {
        return url.includes(blocked) || blocked.includes(url);
      }
      return domain === blockedDomain || domain.endsWith('.' + blockedDomain) || blockedDomain.endsWith('.' + domain);
    });
  } catch (error) {
    return false;
  }
}


function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      controller.signal.aborted
        ? reject(new DOMException('Aborted', 'AbortError'))
        : undefined
    ),
  ])
    .finally(() => clearTimeout(timeout)) as Promise<T>;
}

async function sendToBackend(data: ContextData): Promise<void> {
  try {
    // Check if extension is enabled
    const enabled = await isExtensionEnabled();
    if (!enabled) {
      return;
    }

    // Check if website is blocked
    const blocked = await isWebsiteBlocked(data.url);
    if (blocked) {
      return;
    }

    const apiEndpoint = await getApiEndpoint();

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

    let userId: string
    try {
      userId = await getUserId()
    } catch (error) {
      return;
    }

    const payload = {
      content: content,
      url: data.url,
      title: data.title,
      userId: userId,
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


    // Require authentication token
    let authToken: string
    try {
      authToken = await requireAuthToken()
    } catch (error) {
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    const controller = new AbortController();
    const fetchPromise = fetch(apiEndpoint, {
      method: 'POST',
      headers,
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({ ...payload, userId: userId }),
      signal: controller.signal,
    });

    const response = await withTimeout(fetchPromise, 4000).catch((_e) => null);

    if (response && !response.ok) {
      // Handle 401 - clear invalid token
      if (response.status === 401) {
        await chrome.storage?.local?.remove?.('auth_token');
        clearAuthToken();
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Fire-and-forget: do not wait on response body; API queues work and returns 202 quickly
  } catch (error) {
    // Ignore errors
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


chrome.runtime.onMessage.addListener(
  (
    message: {
      type?: string;
      data?: ContextData;
      endpoint?: string;
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

    if (message?.type === 'SYNC_AUTH_TOKEN') {
      (async () => {
        try {
          const token = (message as any).token;
          if (token) {
            await chrome.storage.local.set({ auth_token: token });
          }
        } catch (error) {
          // Ignore errors
        }
      })();
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
      (async () => {
        try {
          await setExtensionEnabled(message.enabled!);
          sendResponse({ success: true, message: 'Extension state updated' });
        } catch (error) {
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Failed to update extension state' });
        }
      })();
      return true;
    }

    if (message?.type === 'GET_BLOCKED_WEBSITES') {
      getBlockedWebsites()
        .then(websites => {
          sendResponse({ success: true, websites });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message?.type === 'SET_BLOCKED_WEBSITES' && Array.isArray((message as any).websites)) {
      setBlockedWebsites((message as any).websites)
        .then(() => {
          sendResponse({ success: true, message: 'Blocked websites updated' });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message?.type === 'ADD_BLOCKED_WEBSITE' && (message as any).website) {
      getBlockedWebsites()
        .then(websites => {
          const website = (message as any).website.trim();
          if (website && !websites.includes(website)) {
            websites.push(website);
            return setBlockedWebsites(websites);
          }
          return Promise.resolve();
        })
        .then(() => {
          sendResponse({ success: true, message: 'Website added to blocked list' });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message?.type === 'REMOVE_BLOCKED_WEBSITE' && (message as any).website) {
      getBlockedWebsites()
        .then(websites => {
          const website = (message as any).website.trim();
          const filtered = websites.filter(w => w !== website);
          return setBlockedWebsites(filtered);
        })
        .then(() => {
          sendResponse({ success: true, message: 'Website removed from blocked list' });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });

      return true;
    }

    if (message?.type === 'CHECK_WEBSITE_BLOCKED' && (message as any).url) {
      isWebsiteBlocked((message as any).url)
        .then(blocked => {
          sendResponse({ success: true, blocked });
        })
        .catch(error => {
          sendResponse({ success: false, blocked: false, error: error.message });
        });

      return true;
    }

    if (message?.type === 'CHECK_API_HEALTH') {
      checkApiHealth()
        .then(healthy => {
          sendResponse({ success: true, healthy });
        })
        .catch(error => {
          sendResponse({ success: false, healthy: false, error: error.message });
        });

      return true;
    }

    if (message?.type === 'PING') {
      sendResponse({ type: 'PONG', from: 'background' });
    }
  }
);
