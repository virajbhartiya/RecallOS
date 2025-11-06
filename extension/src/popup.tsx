import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { getAuthToken, requireAuthToken } from '@/lib/userId';

const Popup: React.FC = () => {
  const [extensionEnabled, setExtensionEnabled] = useState(true);
  const [blockedWebsites, setBlockedWebsites] = useState<string[]>([]);
  const [newBlockedWebsite, setNewBlockedWebsite] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);

  useEffect(() => {
    loadSettings();
    checkStatus();
    // Check health periodically
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadSettings = async () => {
    try {
      const extensionResponse = await chrome.runtime.sendMessage({
        type: 'GET_EXTENSION_ENABLED',
      });
      if (extensionResponse && extensionResponse.success) {
        setExtensionEnabled(extensionResponse.enabled);
      }

      const blockedResponse = await chrome.runtime.sendMessage({
        type: 'GET_BLOCKED_WEBSITES',
      });
      if (blockedResponse && blockedResponse.success) {
        setBlockedWebsites(blockedResponse.websites || []);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const checkStatus = async () => {
    setIsCheckingHealth(true);
    try {
      // Check API health
      const healthResponse = await chrome.runtime.sendMessage({
        type: 'CHECK_API_HEALTH',
      });
      if (healthResponse && healthResponse.success) {
        setIsConnected(healthResponse.healthy);
      } else {
        setIsConnected(false);
      }

      // Check auth status - try multiple sources like requireAuthToken does
      let isAuth = false;
      try {
        // First check chrome.storage.local (works in popup)
        const stored = await chrome.storage?.local?.get?.(['auth_token']);
        if (stored && stored.auth_token) {
          isAuth = true;
        } else {
          // Try localStorage (might work in popup)
          const token = getAuthToken();
          if (token) {
            isAuth = true;
          } else {
            // Try requireAuthToken which checks cookies too
            try {
              await requireAuthToken();
              isAuth = true;
            } catch {
              isAuth = false;
            }
          }
        }
      } catch (error) {
        isAuth = false;
      }
      setIsAuthenticated(isAuth);
    } catch (error) {
      setIsConnected(false);
      setIsAuthenticated(false);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const toggleExtension = async () => {
    setIsLoading(true);
    try {
      const newState = !extensionEnabled;
      
      if (chrome.runtime.lastError) {
        setIsLoading(false);
        return;
      }
      
      const response = await chrome.runtime.sendMessage({
        type: 'SET_EXTENSION_ENABLED',
        enabled: newState,
      });
      
      if (chrome.runtime.lastError) {
        setIsLoading(false);
        return;
      }
      
      if (response && response.success) {
        setExtensionEnabled(newState);
      }
    } catch (error) {
      console.error('Error toggling extension:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addBlockedWebsite = async (website?: string) => {
    const websiteToAdd = website || newBlockedWebsite.trim();
    if (!websiteToAdd) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ADD_BLOCKED_WEBSITE',
        website: websiteToAdd,
      });
      if (response && response.success) {
        setNewBlockedWebsite('');
        await loadSettings();
      }
    } catch (error) {
      console.error('Error adding blocked website:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const blockCurrentDomain = async () => {
    setIsLoading(true);
    try {
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0 || !tabs[0].url) {
        return;
      }

      const url = tabs[0].url;
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace(/^www\./, '');
        
        if (domain) {
          await addBlockedWebsite(domain);
        }
      } catch (error) {
        console.error('Error extracting domain:', error);
      }
    } catch (error) {
      console.error('Error getting current tab:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeBlockedWebsite = async (website: string) => {
    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REMOVE_BLOCKED_WEBSITE',
        website: website,
      });
      if (response && response.success) {
        await loadSettings();
      }
    } catch (error) {
      console.error('Error removing blocked website:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-80 bg-white text-black font-primary" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-base font-mono">
            R
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-black">RecallOS</span>
            <span className="text-xs text-gray-600 font-mono -mt-0.5">Remember what the web showed you</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Section */}
        <div className="border border-gray-200 bg-white p-3 space-y-2">
          <div className="text-sm font-medium text-black mb-2">Status</div>
          
          {/* API Connection Status */}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-gray-700">API</span>
            <div className="flex items-center gap-2">
              {isCheckingHealth ? (
                <span className="text-xs text-gray-400">Checking...</span>
              ) : (
                <>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-black' : 'bg-gray-400'}`} />
                  <span className="text-xs text-gray-600">{isConnected ? 'Connected' : 'Not connected'}</span>
                </>
              )}
            </div>
          </div>

          {/* Auth Status */}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-gray-700">Auth</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-black' : 'bg-gray-400'}`} />
              <span className="text-xs text-gray-600">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</span>
            </div>
          </div>
        </div>

        {/* Extension Toggle */}
        <div className="border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-black mb-0.5">Extension</div>
              <div className="text-xs text-gray-600">
                {extensionEnabled ? 'Active' : 'Disabled'}
              </div>
            </div>
            <button
              onClick={toggleExtension}
              disabled={isLoading}
              className={`px-4 py-1.5 text-xs font-medium border transition-colors ${
                extensionEnabled
                  ? 'border-black bg-black text-white hover:bg-gray-800'
                  : 'border-gray-300 bg-white text-black hover:bg-gray-50'
              }`}
            >
              {isLoading ? '...' : extensionEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>

        {/* Blocked Websites */}
        <div className="border border-gray-200 bg-white p-3 space-y-3">
          <div className="text-sm font-medium text-black">Blocked Websites</div>
          
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="example.com"
              value={newBlockedWebsite}
              onChange={(e) => setNewBlockedWebsite(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addBlockedWebsite();
                }
              }}
              className="flex-1 border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-black"
            />
            <button
              onClick={() => addBlockedWebsite()}
              disabled={isLoading || !newBlockedWebsite.trim()}
              className="px-3 py-1.5 text-xs font-medium border border-black bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          <button
            onClick={blockCurrentDomain}
            disabled={isLoading}
            className="w-full px-3 py-1.5 text-xs font-medium border border-gray-300 bg-white text-black hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Block Current Domain
          </button>

          {blockedWebsites.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {blockedWebsites.map((website, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 border border-gray-100"
                >
                  <span className="text-xs text-gray-700 truncate flex-1">{website}</span>
                  <button
                    onClick={() => removeBlockedWebsite(website)}
                    disabled={isLoading}
                    className="ml-2 px-2 py-0.5 text-xs text-gray-600 hover:text-black hover:underline disabled:opacity-50"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}

          {blockedWebsites.length === 0 && (
            <div className="text-xs text-gray-500 text-center py-2">
              No websites blocked
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
