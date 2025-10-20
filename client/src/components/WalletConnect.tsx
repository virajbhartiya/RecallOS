import React from 'react'
import { useWallet } from '../contexts/WalletContext'

interface WalletConnectProps {
  variant?: 'button' | 'card' | 'inline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onConnect?: () => void
}

export const WalletConnect: React.FC<WalletConnectProps> = ({ 
  variant = 'button',
  size = 'md',
  className = '',
  onConnect
}) => {
  const { connect, isConnecting } = useWallet()

  const handleConnect = async () => {
    if (isConnecting) {
      console.log('Wallet connection already in progress...')
      return
    }

    try {
      await connect()
      onConnect?.()
    } catch (error) {
      console.error('Connection failed:', error)
    }
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  if (variant === 'card') {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-light mb-2">Connect Your Wallet</h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Connect your wallet to start building your memory network. 
          RecallOS works with MetaMask, WalletConnect, and other Web3 wallets.
          <br />
          <span className="text-xs text-blue-600 font-mono">Recommended: Sepolia testnet</span>
        </p>

        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={`w-full ${sizeClasses[size]} font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
              <span>CONNECTING...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>CONNECT WALLET</span>
            </>
          )}
        </button>

        <div className="mt-6 bg-gray-50 border border-gray-200 p-4 rounded-lg">
          <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">SUPPORTED WALLETS</div>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-2 py-1 text-xs font-mono bg-white border border-gray-200 rounded">MetaMask</span>
            <span className="px-2 py-1 text-xs font-mono bg-white border border-gray-200 rounded">WalletConnect</span>
            <span className="px-2 py-1 text-xs font-mono bg-white border border-gray-200 rounded">Coinbase</span>
            <span className="px-2 py-1 text-xs font-mono bg-white border border-gray-200 rounded">Trust Wallet</span>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="text-sm text-gray-600">Connect your wallet to continue:</div>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={`${sizeClasses[size]} font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
        >
          {isConnecting ? (
            <>
              <div className="w-3 h-3 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
              <span>CONNECTING...</span>
            </>
          ) : (
            <span>CONNECT WALLET</span>
          )}
        </button>
      </div>
    )
  }

  // Default button variant
  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className={`${sizeClasses[size]} font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${className}`}
    >
      {isConnecting ? (
        <>
          <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
          <span>CONNECTING...</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span>CONNECT WALLET</span>
        </>
      )}
    </button>
  )
}
