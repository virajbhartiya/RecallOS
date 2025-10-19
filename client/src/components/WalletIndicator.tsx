import React from 'react'
import { useWallet } from '../contexts/WalletContext'

interface WalletIndicatorProps {
  showDetails?: boolean
  className?: string
}

export const WalletIndicator: React.FC<WalletIndicatorProps> = ({ 
  showDetails = false,
  className = ''
}) => {
  const { isConnected, address, chainId, gasBalance } = useWallet()

  const getNetworkColor = (chainId: number | null) => {
    switch (chainId) {
      case 11155111: return 'bg-blue-500'
      case 1: return 'bg-gray-500'
      case 137: return 'bg-purple-500'
      case 42161: return 'bg-cyan-500'
      default: return 'bg-red-500'
    }
  }

  const getNetworkName = (chainId: number | null) => {
    switch (chainId) {
      case 11155111: return 'Sepolia'
      case 1: return 'Ethereum'
      case 137: return 'Polygon'
      case 42161: return 'Arbitrum'
      default: return 'Unknown'
    }
  }

  const isLowGas = gasBalance && parseFloat(gasBalance) < 0.005
  const isWrongNetwork = chainId !== 11155111

  if (!isConnected) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
        <span className="text-xs font-mono text-gray-500">DISCONNECTED</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Connection Status */}
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      
      {/* Network Indicator */}
      <div className={`w-1.5 h-1.5 rounded-full ${getNetworkColor(chainId)}`}></div>
      
      {showDetails && (
        <>
          <span className="text-xs font-mono text-gray-600">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
          <span className="text-xs font-mono text-gray-500">
            {getNetworkName(chainId)}
          </span>
          {isLowGas && (
            <span className="text-xs text-yellow-600" title="Low gas balance">
              ⚠️
            </span>
          )}
          {isWrongNetwork && (
            <span className="text-xs text-yellow-600" title="Wrong network">
              ⚠️
            </span>
          )}
        </>
      )}
    </div>
  )
}
