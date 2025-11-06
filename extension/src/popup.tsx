import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAuthToken, setAuthToken, clearAuthToken } from '@/lib/userId';
 

interface StatusMessage {
  message: string;
  type: 'success' | 'error';
}

const Popup: React.FC = () => {
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [authToken, setAuthTokenState] = useState('');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ethBalance] = useState<string | null>(null);
  const [gasBalance] = useState<string | null>(null);
  const [isDepositModalOpen] = useState(false);
  const [isBalanceLoading] = useState(false);
  const [extensionEnabled, setExtensionEnabled] = useState(true);
  const [blockedWebsites, setBlockedWebsites] = useState<string[]>([]);
  const [newBlockedWebsite, setNewBlockedWebsite] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const endpointResponse = await chrome.runtime.sendMessage({
        type: 'GET_ENDPOINT',
      });
      if (endpointResponse && endpointResponse.success) {
        setApiEndpoint(endpointResponse.endpoint);
      }

      // Load auth token from localStorage
      const token = getAuthToken();
      if (token) {
        setAuthTokenState(token);
      }

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
      setStatus({ message: 'Failed to load settings', type: 'error' });
    }
  };

  

  const saveEndpoint = async () => {
    const endpoint = apiEndpoint.trim();
    if (!endpoint) {
      setStatus({ message: 'Please enter an API endpoint', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SET_ENDPOINT',
        endpoint,
      });
      if (response && response.success) {
        setStatus({ message: 'Configuration saved successfully!', type: 'success' });
      } else {
        setStatus({ message: `Error: ${response?.error || 'Failed to save configuration'}`, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: `Error: ${error}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuthToken = async () => {
    const token = authToken.trim();
    if (!token) {
      setStatus({ message: 'Please enter an auth token', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      setAuthToken(token);
      setStatus({ message: 'Auth token saved successfully!', type: 'success' });
    } catch (error) {
      setStatus({ message: `Error: ${error}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAuthToken = async () => {
    setIsLoading(true);
    try {
      clearAuthToken();
      setAuthTokenState('');
      setStatus({ message: 'Auth token cleared successfully!', type: 'success' });
    } catch (error) {
      setStatus({ message: `Error: ${error}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  

  

  const toggleExtension = async () => {
    setIsLoading(true);
    try {
      const newState = !extensionEnabled;
      
      // Check for Chrome runtime errors first
      if (chrome.runtime.lastError) {
        setStatus({ message: `Error: ${chrome.runtime.lastError.message}`, type: 'error' });
        setIsLoading(false);
        return;
      }
      
      const response = await chrome.runtime.sendMessage({
        type: 'SET_EXTENSION_ENABLED',
        enabled: newState,
      });
      
      // Check for runtime errors after sending message
      if (chrome.runtime.lastError) {
        setStatus({ message: `Error: ${chrome.runtime.lastError.message}`, type: 'error' });
        setIsLoading(false);
        return;
      }
      
      if (response && response.success) {
        setExtensionEnabled(newState);
        setStatus({ 
          message: `Extension ${newState ? 'enabled' : 'disabled'} successfully!`, 
          type: 'success' 
        });
      } else {
        setStatus({ message: `Error: ${response?.error || 'Failed to update extension state'}`, type: 'error' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatus({ message: `Error: ${errorMessage}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const showStatus = (message: string, type: 'success' | 'error') => {
    setStatus({ message, type });
    setTimeout(() => {
      setStatus(null);
    }, 3000);
  };

  const addBlockedWebsite = async () => {
    const website = newBlockedWebsite.trim();
    if (!website) {
      setStatus({ message: 'Please enter a website URL or domain', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ADD_BLOCKED_WEBSITE',
        website: website,
      });
      if (response && response.success) {
        setNewBlockedWebsite('');
        await loadSettings();
        setStatus({ message: 'Website added to blocked list', type: 'success' });
      } else {
        setStatus({ message: `Error: ${response?.error || 'Failed to add website'}`, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: `Error: ${error}`, type: 'error' });
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
        setStatus({ message: 'Website unblocked successfully', type: 'success' });
      } else {
        setStatus({ message: `Error: ${response?.error || 'Failed to unblock website'}`, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: `Error: ${error}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-80 p-4 bg-background text-foreground space-y-3">
      {/* Balance Card */}
      

      {/* Settings Card */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Extension Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Extension Status</Label>
              <div className="text-xs text-gray-600">
                {extensionEnabled ? 'Active - Context injection enabled' : 'Disabled - No context injection'}
              </div>
            </div>
            <Button
              onClick={toggleExtension}
              disabled={isLoading}
              variant={extensionEnabled ? "destructive" : "default"}
              size="sm"
              className="min-w-[80px]"
            >
              {isLoading ? '...' : extensionEnabled ? 'Disable' : 'Enable'}
            </Button>
          </div>

          <div className="space-y-1">
            <Label htmlFor="apiEndpoint" className="text-sm">API Endpoint</Label>
            <Input
              id="apiEndpoint"
              type="text"
              placeholder="http://localhost:3000/api/memory/process"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              className="h-8"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="authToken" className="text-sm">Auth Token (Optional)</Label>
            <Input
              id="authToken"
              type="password"
              placeholder="Enter your auth token"
              value={authToken}
              onChange={(e) => setAuthTokenState(e.target.value)}
              className="h-8"
            />
            <div className="flex gap-2">
              <Button 
                onClick={saveAuthToken} 
                disabled={isLoading}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                Save Token
              </Button>
              <Button 
                onClick={handleClearAuthToken} 
                disabled={isLoading}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                Clear
              </Button>
            </div>
          </div>

          

          <div className="flex gap-2 pt-1">
            <Button 
              onClick={saveEndpoint} 
              disabled={isLoading}
              size="sm"
              className="flex-1"
            >
              Save Config
            </Button>
            
          </div>

          {status && (
            <div className={`p-2 rounded text-xs ${
              status.type === 'success' 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              {status.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Blocked Websites Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Blocked Websites</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="blockedWebsite" className="text-sm">Add Website to Block</Label>
            <div className="flex gap-2">
              <Input
                id="blockedWebsite"
                type="text"
                placeholder="example.com or https://example.com"
                value={newBlockedWebsite}
                onChange={(e) => setNewBlockedWebsite(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addBlockedWebsite();
                  }
                }}
                className="h-8 flex-1"
              />
              <Button
                onClick={addBlockedWebsite}
                disabled={isLoading}
                size="sm"
                variant="outline"
              >
                Add
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              Enter a domain (e.g., example.com) or full URL. Data collection will be disabled for these websites.
            </div>
          </div>

          {blockedWebsites.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Blocked Websites ({blockedWebsites.length})</Label>
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded p-2">
                {blockedWebsites.map((website, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <span className="truncate flex-1">{website}</span>
                    <Button
                      onClick={() => removeBlockedWebsite(website)}
                      disabled={isLoading}
                      size="sm"
                      variant="ghost"
                      className="ml-2 h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      Unblock
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {blockedWebsites.length === 0 && (
            <div className="text-xs text-gray-500 text-center py-2">
              No websites blocked. Add websites above to disable data collection for specific sites.
            </div>
          )}
        </CardContent>
      </Card>
      
    </div>
  );
};

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}

