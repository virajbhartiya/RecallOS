import React, { useEffect, useState } from 'react'
import { useBlockscout, type TransactionInfo } from '@/hooks/useBlockscout'
import { TransactionFailureAnalysis } from './TransactionFailureAnalysis'

interface TransactionDetailsOverlayProps {
  txHash: string
  network: string
  isOpen: boolean
  onClose: () => void
}

export const TransactionDetailsOverlay: React.FC<TransactionDetailsOverlayProps> = ({
  txHash,
  network,
  isOpen,
  onClose
}) => {
  const { getNetworkName, monitorTransaction } = useBlockscout()
  const [txInfo, setTxInfo] = useState<TransactionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && txHash) {
      setIsLoading(true)
      const loadTransactionInfo = async () => {
        try {
          const info = await monitorTransaction(txHash, network)
          setTxInfo(info)
        } catch (error) {
          console.error('Failed to load transaction info:', error)
        } finally {
          setIsLoading(false)
        }
      }
      
      loadTransactionInfo()
      const interval = setInterval(loadTransactionInfo, 5000)
      return () => clearInterval(interval)
    }
  }, [isOpen, txHash, network, monitorTransaction])

  if (!isOpen) return null
  const networkName = getNetworkName(network)

  const formatValue = (value?: string) => {
    if (!value) return 'N/A'
    const ethValue = parseFloat(value) / Math.pow(10, 18)
    return `${ethValue.toFixed(6)} ETH`
  }

  const formatGasPrice = (gasPrice?: string) => {
    if (!gasPrice) return 'N/A'
    const gwei = parseFloat(gasPrice) / Math.pow(10, 9)
    return `${gwei.toFixed(2)} Gwei`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Transaction Details</h3>
            <p className="text-sm text-gray-500 font-mono">{networkName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsLoading(true)
                monitorTransaction(txHash, network).then((info: TransactionInfo) => {
                  setTxInfo(info)
                  setIsLoading(false)
                })
              }}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200"
              title="Refresh transaction status"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Loading transaction details...</span>
            </div>
          ) : txInfo ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Hash
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <code className="text-sm font-mono text-gray-800 break-all">
                    {txInfo.hash}
                  </code>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    txInfo.status === 'confirmed' ? 'bg-green-500' :
                    txInfo.status === 'pending' ? 'bg-yellow-500 animate-pulse' :
                    txInfo.status === 'failed' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`}></div>
                  <span className="text-sm font-mono text-gray-800 capitalize">
                    {txInfo.status}
                  </span>
                </div>
              </div>

              {txInfo.blockNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Block Number
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <span className="text-sm font-mono text-gray-800">
                      #{txInfo.blockNumber}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {txInfo.gasUsed && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gas Used
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                      <span className="text-sm font-mono text-gray-800">
                        {txInfo.gasUsed}
                      </span>
                    </div>
                  </div>
                )}
                {txInfo.gasPrice && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gas Price
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                      <span className="text-sm font-mono text-gray-800">
                        {formatGasPrice(txInfo.gasPrice)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {txInfo.from && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                      <code className="text-sm font-mono text-gray-800 break-all">
                        {txInfo.from}
                      </code>
                    </div>
                  </div>
                )}
                {txInfo.to && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                      <code className="text-sm font-mono text-gray-800 break-all">
                        {txInfo.to}
                      </code>
                    </div>
                  </div>
                )}
              </div>

              {txInfo.value && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Value
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <span className="text-sm font-mono text-gray-800">
                      {formatValue(txInfo.value)}
                    </span>
                  </div>
                </div>
              )}

              {txInfo.timestamp && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timestamp
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <span className="text-sm font-mono text-gray-800">
                      {new Date(txInfo.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {txInfo.status === 'failed' && (
                <TransactionFailureAnalysis
                  txHash={txHash}
                  network={network}
                  className="mt-6"
                />
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-red-600">Failed to load transaction details</p>
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
