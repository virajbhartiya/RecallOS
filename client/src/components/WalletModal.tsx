import React from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useBlockscout } from '@/hooks/useBlockscout'

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { isConnected, address, chainId, balance, connect, disconnect, isConnecting } = useWallet()
  const { showTransactionHistory } = useBlockscout()

  const handleConnect = async () => {
    if (isConnecting) {
      console.log('Wallet connection already in progress...')
      return
    }

    try {
      await connect()
      onClose()
    } catch (error) {
      console.error('Connection failed:', error)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    onClose()
  }

  const getNetworkName = (chainId: number | null) => {
    switch (chainId) {
      case 11155111:
        return 'Sepolia'
      case 1:
        return 'Ethereum'
      case 137:
        return 'Polygon'
      case 42161:
        return 'Arbitrum'
      default:
        return 'Unknown'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white p-8 max-w-lg w-full mx-4 border border-gray-200 shadow-2xl transform transition-all duration-300 scale-100">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
            <h2 className="text-2xl font-light font-mono uppercase tracking-wide">
              {isConnected ? 'WALLET CONNECTED' : 'CONNECT WALLET'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors p-1 hover:bg-gray-100 rounded-full"
          >
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>

        {isConnected ? (
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

            {chainId !== 11155111 && (
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
                  onClose()
                  window.location.href = '/memories'
                }}
                className="flex-1 px-4 py-3 text-sm font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200"
              >
                VIEW MEMORIES
              </button>
              {address && address.startsWith('0x') && address.length === 42 && (
                <button
                  onClick={() => {
                    showTransactionHistory(address, 'sepolia')
                  }}
                  className="flex-1 px-4 py-3 text-sm font-mono uppercase tracking-wide border border-blue-300 bg-white hover:bg-blue-50 hover:border-blue-500 text-blue-600 hover:text-blue-700 transition-all duration-200"
                >
                  TX HISTORY
                </button>
              )}
              <button
                onClick={handleDisconnect}
                className="flex-1 px-4 py-3 text-sm font-mono uppercase tracking-wide border border-red-300 bg-white hover:bg-red-50 hover:border-red-500 text-red-600 hover:text-red-700 transition-all duration-200"
              >
                DISCONNECT
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 text-sm font-mono uppercase tracking-wide border border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-500 transition-all duration-200"
              >
                CLOSE
              </button>
            </div>
          </div>
        ) : (
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
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full px-6 py-4 text-sm font-mono uppercase tracking-wide border border-black bg-white hover:bg-black hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
        )}
      </div>
    </div>
  )
}

export default WalletModal
