import React, { useState } from 'react'
import { useWallet } from '../contexts/WalletContext'

interface WalletConnectionFlowProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  className?: string
}

export const WalletConnectionFlow: React.FC<WalletConnectionFlowProps> = ({
  onSuccess,
  onError,
  className = ''
}) => {
  const { isConnected, connect, chainId, isConnecting } = useWallet()
  const [connectionStep, setConnectionStep] = useState<'idle' | 'connecting' | 'checking-network' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    if (isConnecting) {
      console.log('Wallet connection already in progress...')
      return
    }

    setConnectionStep('connecting')
    setError(null)

    try {
      await connect()
      setConnectionStep('checking-network')
      
      if (chainId !== 11155111) {
        setConnectionStep('error')
        setError('Please switch to Sepolia testnet for the best experience')
        onError?.('Wrong network')
        return
      }

      setConnectionStep('success')
      onSuccess?.()
    } catch (err) {
      setConnectionStep('error')
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }

  const getStepIcon = () => {
    switch (connectionStep) {
      case 'idle':
        return (
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      case 'connecting':
        return (
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        )
      case 'checking-network':
        return (
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        )
      case 'success':
        return (
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )
    }
  }

  const getStepText = () => {
    switch (connectionStep) {
      case 'idle':
        return 'Connect Your Wallet'
      case 'connecting':
        return 'Connecting...'
      case 'checking-network':
        return 'Checking Network...'
      case 'success':
        return 'Connected Successfully!'
      case 'error':
        return 'Connection Failed'
    }
  }

  const getStepDescription = () => {
    switch (connectionStep) {
      case 'idle':
        return 'Connect your wallet to start building your memory network'
      case 'connecting':
        return 'Please approve the connection in your wallet'
      case 'checking-network':
        return 'Verifying network configuration...'
      case 'success':
        return 'You can now start creating memories'
      case 'error':
        return error || 'Something went wrong'
    }
  }

  if (isConnected) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <div>
            <h3 className="text-sm font-medium text-green-800">Wallet Connected</h3>
            <p className="text-xs text-green-600">Ready to create memories</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          {getStepIcon()}
        </div>
        
        <h3 className="text-lg font-light mb-2">{getStepText()}</h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          {getStepDescription()}
        </p>

        {connectionStep === 'error' && error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {connectionStep !== 'success' && (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full px-6 py-3 text-sm font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
        )}

        {connectionStep === 'success' && (
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/memories'}
              className="w-full px-6 py-3 text-sm font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200"
            >
              VIEW MEMORIES
            </button>
            <button
              onClick={() => setConnectionStep('idle')}
              className="w-full px-6 py-3 text-sm font-mono uppercase tracking-wide border border-gray-300 bg-white hover:bg-gray-50 transition-all duration-200"
            >
              CONNECT ANOTHER WALLET
            </button>
          </div>
        )}

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
    </div>
  )
}
