import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BalanceCard } from '@/components/BalanceCard';
import { DepositModal } from '@/components/DepositModal';

interface StatusMessage {
  message: string;
  type: 'success' | 'error';
}

const Popup: React.FC = () => {
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [gasBalance, setGasBalance] = useState<string | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const endpointResponse = await chrome.runtime.sendMessage({
        type: 'GET_ENDPOINT',
      });
      if (endpointResponse.success) {
        setApiEndpoint(endpointResponse.endpoint);
      }

      const walletResponse = await chrome.runtime.sendMessage({
        type: 'GET_WALLET_ADDRESS',
      });
      if (walletResponse.success && walletResponse.walletAddress) {
        setWalletAddress(walletResponse.walletAddress);
        setStatus({
          message: `Connected: ${walletResponse.walletAddress.substring(0, 10)}...`,
          type: 'success'
        });
        // Use the endpoint from the response for initial balance fetch
        await fetchBalances(walletResponse.walletAddress, endpointResponse.endpoint);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setStatus({ message: 'Failed to load settings', type: 'error' });
    }
  };

  const fetchBalances = async (address: string, endpoint?: string) => {
    setIsBalanceLoading(true);
    try {
      // Fetch ETH balance
      if (typeof window !== 'undefined' && window.ethereum) {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest']
        }) as string;
        const ethBalance = (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4);
        setEthBalance(ethBalance);
      }

      // Fetch gas balance from API
      const currentEndpoint = endpoint || apiEndpoint;
      if (currentEndpoint) {
        const baseUrl = currentEndpoint.replace('/api/memory/process', '');
        const response = await fetch(`${baseUrl}/api/deposit/balance/${address}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setGasBalance(data.data.balance);
          }
        } else {
          console.warn('Failed to fetch gas balance:', response.status);
        }
      } else {
        console.warn('No API endpoint configured for gas balance fetch');
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      setStatus({ message: 'Failed to fetch balances', type: 'error' });
    } finally {
      setIsBalanceLoading(false);
    }
  };

  const refreshBalances = async () => {
    if (walletAddress) {
      await fetchBalances(walletAddress, apiEndpoint);
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

  const saveWalletAddress = async () => {
    const wallet = walletAddress.trim();
    if (!wallet) {
      setStatus({ message: 'Please enter a wallet address', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SET_WALLET_ADDRESS',
        walletAddress: wallet,
      });
      if (response.success) {
        setStatus({ message: 'Wallet address saved successfully!', type: 'success' });
        await fetchBalances(wallet);
      } else {
        setStatus({ message: `Error: ${response.error}`, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: `Error: ${error}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const depositGas = async (amount: string) => {
    if (!walletAddress || !window.ethereum) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get contract address
      const baseUrl = apiEndpoint.replace('/api/memory/process', '');
      const response = await fetch(`${baseUrl}/api/deposit/address`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to get contract address');
      }

      const contractAddress = data.data.contractAddress;
      const amountWei = (parseFloat(amount) * Math.pow(10, 18)).toString(16);
      
      const depositGasFunctionSelector = '0xae9bb692';
      
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: contractAddress,
          value: `0x${amountWei}`,
          data: depositGasFunctionSelector,
          gas: '0xea60'
        }]
      });

      await new Promise((resolve, reject) => {
        const checkTransaction = async () => {
          try {
            const receipt = await window.ethereum!.request({
              method: 'eth_getTransactionReceipt',
              params: [txHash]
            }) as { status: string };
            
            if (receipt) {
              if (receipt.status === '0x1') {
                resolve(receipt);
              } else {
                console.error('Transaction failed with receipt:', receipt);
                reject(new Error(`Transaction failed: ${receipt.status}`));
              }
            } else {
              setTimeout(checkTransaction, 2000);
            }
          } catch (error) {
            reject(error);
          }
        }
        checkTransaction();
      });

      await refreshBalances();
      setStatus({ message: 'Gas deposited successfully!', type: 'success' });
    } catch (error) {
      console.error('Error depositing gas:', error);
      throw error;
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
      {walletAddress && (
        <BalanceCard
          ethBalance={ethBalance}
          gasBalance={gasBalance}
          isLoading={isBalanceLoading}
          onRefresh={refreshBalances}
          onDeposit={() => setIsDepositModalOpen(true)}
        />
      )}

      {/* Settings Card */}
      <Card>
        <CardContent className="p-4 space-y-3">
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
            <Label htmlFor="walletAddress" className="text-sm">Wallet Address</Label>
            <Input
              id="walletAddress"
              type="text"
              placeholder="Enter wallet address manually"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
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
            <Button 
              onClick={saveWalletAddress} 
              disabled={isLoading}
              variant="secondary"
              size="sm"
              className="flex-1"
            >
              Save Wallet
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

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onDeposit={depositGas}
        isLoading={isLoading}
      />
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
