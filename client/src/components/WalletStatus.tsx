import React, { useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { DepositManager } from './DepositManager'

interface WalletStatusProps {
  variant?: 'compact' | 'expanded' | 'minimal'
  showActions?: boolean
  className?: string
}

export const WalletStatus: React.FC<WalletStatusProps> = ({ 
  variant = 'compact', 
  showActions = true,
  className = ''
}) => {
  const { isConnected, address, chainId, balance, gasBalance, isConnecting, connect, disconnect } = useWallet()
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)

  const getNetworkName = (chainId: number | null) => {
    switch (chainId) {
      case 11155111: return 'Sepolia'
      case 1: return 'Ethereum'
      case 137: return 'Polygon'
      case 42161: return 'Arbitrum'
      default: return 'Unknown'
    }
  }

  const getNetworkColor = (chainId: number | null) => {
    switch (chainId) {
      case 11155111: return 'text-blue-600 bg-blue-50 border-blue-200'
      case 1: return 'text-gray-600 bg-gray-50 border-gray-200'
      case 137: return 'text-purple-600 bg-purple-50 border-purple-200'
      case 42161: return 'text-cyan-600 bg-cyan-50 border-cyan-200'
      default: return 'text-red-600 bg-red-50 border-red-200'
    }
  }

  const isLowGas = gasBalance && parseFloat(gasBalance) < 0.005
  const isWrongNetwork = chainId !== 11155111

  if (!isConnected) {
    return (
      <>
        <div className={`flex items-center space-x-3 ${className}`}>
          <button
            onClick={() => setShowWalletModal(true)}
            data-wallet-trigger
            className="px-4 py-2 text-sm font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200"
          >
            [CONNECT WALLET]
          </button>
        </div>
        
        {/* Wallet Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl rounded-lg">
i

              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-light mb-2">Connect Your Wallet</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Connect your wallet to start building your memory network. 
                    RecallOS works with MetaMask, WalletConnect, and other Web3 wallets.
                    <br />
                    <span className="text-xs text-blue-600 font-mono">Recommended: Sepolia testnet</span>
                  </p>
                </div>

                <button
                  onClick={async () => {
                    try {
                      await connect()
                      setShowWalletModal(false)
                    } catch (error) {
                      console.error('Connection failed:', error)
                    }
                  }}
                  disabled={isConnecting}
                  className="w-full px-6 py-4 text-sm font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">SUPPORTED WALLETS</div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs font-mono bg-white border border-gray-200 rounded">MetaMask</span>
                    <span className="px-2 py-1 text-xs font-mono bg-white border border-gray-200 rounded">WalletConnect</span>
                    <span className="px-2 py-1 text-xs font-mono bg-white border border-gray-200 rounded">Coinbase</span>
                    <span className="px-2 py-1 text-xs font-mono bg-white border border-gray-200 rounded">Trust Wallet</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center space-x-2 text-xs font-mono text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
        </div>
        {isLowGas && (
          <button
            onClick={() => setShowDepositModal(true)}
            className="text-xs text-yellow-600 hover:text-yellow-800"
            title="Low gas balance"
          >
            ⚠️
          </button>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <>
        <div className={`flex items-center space-x-4 ${className}`}>
          {/* Connection Status */}
          <div className="flex items-center space-x-2 text-xs font-mono text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          </div>

          {/* Network Badge */}
          <div className={`px-2 py-1 text-xs font-mono uppercase tracking-wide border rounded ${getNetworkColor(chainId)}`}>
            {getNetworkName(chainId)}
          </div>

          {/* Gas Balance */}
          {gasBalance && (
            <button 
              onClick={() => setShowDepositModal(true)}
              className={`flex items-center space-x-1 text-xs font-mono px-2 py-1 rounded transition-colors ${
                isLowGas 
                  ? 'text-yellow-600 bg-yellow-50 border border-yellow-200 hover:bg-yellow-100' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>Gas:</span>
              <span className={isLowGas ? 'text-yellow-600' : 'text-gray-900'}>
                {parseFloat(gasBalance).toFixed(6)} ETH
              </span>
              {isLowGas && <span>⚠️</span>}
            </button>
          )}

          {/* Quick Actions */}
          {showActions && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowWalletModal(true)}
                data-wallet-trigger
                className="text-xs font-mono text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-200 hover:border-gray-300 transition-all duration-200"
              >
                [WALLET]
              </button>
              {isLowGas && (
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="text-xs font-mono text-yellow-600 hover:text-yellow-800 px-2 py-1 border border-yellow-200 hover:border-yellow-300 transition-all duration-200"
                >
                  [DEPOSIT]
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {showDepositModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-200 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-light">Gas Deposit Manager</h2>
                <button 
                  onClick={() => setShowDepositModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl font-mono"
                >
                  ×
                </button>
              </div>
              <DepositManager onClose={() => setShowDepositModal(false)} />
            </div>
          </div>
        )}

        {showWalletModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl rounded-lg">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                  <h2 className="text-2xl font-light font-mono uppercase tracking-wide">
                    WALLET CONNECTED
                  </h2>
                </div>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="text-gray-400 hover:text-black transition-colors p-1 hover:bg-gray-100 rounded-full"
                >
                  <span className="text-2xl leading-none">×</span>
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 p-6 rounded-lg">
                  <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">WALLET ADDRESS</div>
                  <div className="font-mono text-sm break-all bg-white p-3 rounded border border-gray-200">
                    {address}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(address || '')}
                    className="mt-2 text-xs font-mono text-gray-500 hover:text-black transition-colors"
                  >
                    [COPY ADDRESS]
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">STATUS</div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-mono text-green-600">CONNECTED</span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">NETWORK</div>
                    <div className="text-sm font-mono text-gray-800">{getNetworkName(chainId)}</div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">BALANCE</div>
                    <div className="text-sm font-mono text-gray-800">
                      {balance ? `${balance} ETH` : 'Loading...'}
                    </div>
                  </div>
                </div>

                {isWrongNetwork && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <div className="text-xs font-mono text-yellow-700 uppercase tracking-wider mb-2">⚠️ NETWORK WARNING</div>
                    <div className="text-sm text-yellow-800">
                      RecallOS works best on Sepolia testnet. Please switch to Sepolia network for optimal experience.
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowWalletModal(false)
                      window.location.href = '/memories'
                    }}
                    className="flex-1 px-4 py-3 text-sm font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200"
                  >
                    VIEW MEMORIES
                  </button>
                  <button
                    onClick={() => {
                      setShowWalletModal(false)
                      setShowDepositModal(true)
                    }}
                    className="flex-1 px-4 py-3 text-sm font-mono uppercase tracking-wide border border-blue-300 bg-white hover:bg-blue-50 hover:border-blue-500 text-blue-600 hover:text-blue-700 transition-all duration-200"
                  >
                    DEPOSIT GAS
                  </button>
                  <button
                    onClick={() => {
                      disconnect()
                      setShowWalletModal(false)
                    }}
                    className="flex-1 px-4 py-3 text-sm font-mono uppercase tracking-wide border border-red-300 bg-white hover:bg-red-50 hover:border-red-500 text-red-600 hover:text-red-700 transition-all duration-200"
                  >
                    DISCONNECT
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // Expanded variant
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="text-sm font-mono uppercase tracking-wide text-gray-700">WALLET STATUS</h3>
        </div>
        <button
          onClick={() => setShowWalletModal(true)}
          data-wallet-trigger
          className="text-xs font-mono text-gray-500 hover:text-gray-700"
        >
          [MANAGE]
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-1">ADDRESS</div>
          <div className="text-sm font-mono text-gray-900 break-all">
            {address?.slice(0, 10)}...{address?.slice(-8)}
          </div>
        </div>
        <div>
          <div className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-1">NETWORK</div>
          <div className={`text-sm font-mono px-2 py-1 rounded border inline-block ${getNetworkColor(chainId)}`}>
            {getNetworkName(chainId)}
          </div>
        </div>
        <div>
          <div className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-1">BALANCE</div>
          <div className="text-sm font-mono text-gray-900">
            {balance ? `${balance} ETH` : 'Loading...'}
          </div>
        </div>
        <div>
          <div className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-1">GAS BALANCE</div>
          <div className={`text-sm font-mono ${isLowGas ? 'text-yellow-600' : 'text-gray-900'}`}>
            {gasBalance ? `${gasBalance} ETH` : 'Loading...'}
            {isLowGas && <span className="ml-1">⚠️</span>}
          </div>
        </div>
      </div>


      {isLowGas && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <div className="text-xs font-mono text-yellow-700 uppercase tracking-wide mb-1">⚠️ LOW GAS BALANCE</div>
          <div className="text-sm text-yellow-800">
            Your gas balance is low. Deposit more ETH to continue creating memories.
          </div>
        </div>
      )}
      {showActions && (
        <div className="flex space-x-2">
          <button
            onClick={() => setShowDepositModal(true)}
            className="flex-1 px-3 py-2 text-xs font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200"
          >
            [DEPOSIT GAS]
          </button>
        </div>
      )}

      {/* Modals */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-light">Gas Deposit Manager</h2>
              <button 
                onClick={() => setShowDepositModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-mono"
              >
                ×
              </button>
            </div>
            <DepositManager onClose={() => setShowDepositModal(false)} />
          </div>
        </div>
      )}

      {showWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl rounded-lg">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <h2 className="text-2xl font-light font-mono uppercase tracking-wide">
                  WALLET CONNECTED
                </h2>
              </div>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-gray-400 hover:text-black transition-colors p-1 hover:bg-gray-100 rounded-full"
              >
                <span className="text-2xl leading-none">×</span>
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 p-6 rounded-lg">
                <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">WALLET ADDRESS</div>
                <div className="font-mono text-sm break-all bg-white p-3 rounded border border-gray-200">
                  {address}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(address || '')}
                  className="mt-2 text-xs font-mono text-gray-500 hover:text-black transition-colors"
                >
                  [COPY ADDRESS]
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">STATUS</div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-mono text-green-600">CONNECTED</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">NETWORK</div>
                  <div className="text-sm font-mono text-gray-800">{getNetworkName(chainId)}</div>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-2">BALANCE</div>
                  <div className="text-sm font-mono text-gray-800">
                    {balance ? `${balance} ETH` : 'Loading...'}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowWalletModal(false)
                    window.location.href = '/memories'
                  }}
                  className="flex-1 px-4 py-3 text-sm font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200"
                >
                  VIEW MEMORIES
                </button>
                <button
                  onClick={() => {
                    setShowWalletModal(false)
                    setShowDepositModal(true)
                  }}
                  className="flex-1 px-4 py-3 text-sm font-mono uppercase tracking-wide border border-blue-300 bg-white hover:bg-blue-50 hover:border-blue-500 text-blue-600 hover:text-blue-700 transition-all duration-200"
                >
                  DEPOSIT GAS
                </button>
                <button
                  onClick={() => {
                    disconnect()
                    setShowWalletModal(false)
                  }}
                  className="flex-1 px-4 py-3 text-sm font-mono uppercase tracking-wide border border-red-300 bg-white hover:bg-red-50 hover:border-red-500 text-red-600 hover:text-red-700 transition-all duration-200"
                >
                  DISCONNECT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
