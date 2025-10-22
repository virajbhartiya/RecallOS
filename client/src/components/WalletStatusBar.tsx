import React from 'react'
import { useWallet } from '../contexts/WalletContext'

interface WalletStatusBarProps {
  className?: string
}

export const WalletStatusBar: React.FC<WalletStatusBarProps> = ({ className = '' }) => {
  const { isConnected, address, chainId, gasBalance } = useWallet()

  const getNetworkName = (chainId: number | null) => {
    switch (chainId) {
      case 11155111: return 'Sepolia'
      case 1: return 'Ethereum'
      case 137: return 'Polygon'
      case 42161: return 'Arbitrum'
      case 10: return 'Optimism'
      case 8453: return 'Base'
      case 56: return 'BSC'
      case 250: return 'Fantom'
      case 43114: return 'Avalanche'
      default: 
        console.log('Unknown chainId:', chainId)
        return 'Unknown'
    }
  }

  const isLowGas = gasBalance && parseFloat(gasBalance) < 0.005
  const isWrongNetwork = chainId !== 11155111

  if (!isConnected) {
    return (
      <div className={`bg-gray-100 border-t border-gray-200 px-4 py-2 ${className}`}>
        <div className="flex items-center justify-between text-xs font-mono text-gray-500">
          <span>WALLET: DISCONNECTED</span>
          <span>Connect your wallet to start</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border-t border-gray-200 px-4 py-2 ${className}`}>
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-600">CONNECTED</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">ADDRESS:</span>
            <span className="text-gray-700">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">NETWORK:</span>
            <span className={`px-2 py-0.5 rounded text-xs ${
              isWrongNetwork 
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              {getNetworkName(chainId)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {gasBalance && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">GAS:</span>
              <span className={`${isLowGas ? 'text-yellow-600' : 'text-gray-700'}`}>
                {parseFloat(gasBalance).toFixed(6)} ETH
              </span>
              {isLowGas && <span className="text-yellow-600">⚠️</span>}
            </div>
          )}
          
          {isWrongNetwork && (
            <div className="flex items-center space-x-2 text-yellow-600">
              <span>⚠️</span>
              <button 
                onClick={async () => {
                  try {
                    if (window.ethereum) {
                      await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0xaa36a7' }],
                      })
                    }
                  } catch (error) {
                    console.error('Failed to switch network:', error)
                  }
                }}
                className="underline hover:text-yellow-800"
              >
                Switch to Sepolia
              </button>
            </div>
          )}
          
          {isLowGas && (
            <div className="flex items-center space-x-2 text-yellow-600">
              <span>⚠️</span>
              <span>Low Gas Balance</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
