import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
 

interface StatusMessage {
  message: string;
  type: 'success' | 'error';
}

const Popup: React.FC = () => {
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ethBalance] = useState<string | null>(null);
  const [gasBalance] = useState<string | null>(null);
  const [isDepositModalOpen] = useState(false);
  const [isBalanceLoading] = useState(false);
  const [extensionEnabled, setExtensionEnabled] = useState(true);

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
      // Wallet removed

      const extensionResponse = await chrome.runtime.sendMessage({
        type: 'GET_EXTENSION_ENABLED',
      });
      if (extensionResponse && extensionResponse.success) {
        setExtensionEnabled(extensionResponse.enabled);
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
      if (response.success) {
        setStatus({ message: 'Configuration saved successfully!', type: 'success' });
      } else {
        setStatus({ message: `Error: ${response.error}`, type: 'error' });
      }
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
      const response = await chrome.runtime.sendMessage({
        type: 'SET_EXTENSION_ENABLED',
        enabled: newState,
      });
      if (response.success) {
        setExtensionEnabled(newState);
        setStatus({ 
          message: `Extension ${newState ? 'enabled' : 'disabled'} successfully!`, 
          type: 'success' 
        });
      } else {
        setStatus({ message: `Error: ${response.error}`, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: `Error: ${error}`, type: 'error' });
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

      
    </div>
  );
};

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}

// Add ethereum type declaration for extension context
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeAllListeners: (event: string) => void
    }
  }
}
