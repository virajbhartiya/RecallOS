import React, { useState, useEffect } from 'react'
import { useBlockscout } from '@/hooks/useBlockscout'

interface TransactionHistorySidebarProps {
  address: string
  network: string
  isOpen: boolean
  onClose: () => void
}

interface TransactionHistoryItem {
  hash: string
  status: 'pending' | 'confirmed' | 'failed'
  timestamp: number
  value?: string
  gasUsed?: string
  blockNumber?: number
}

export const TransactionHistorySidebar: React.FC<TransactionHistorySidebarProps> = ({
  address,
  network,
  isOpen,
  onClose
}) => {
  const { getNetworkName, showTransactionNotification } = useBlockscout()
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'failed'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const networkName = getNetworkName(network)

  useEffect(() => {
    if (isOpen && address) {
      loadTransactionHistory()
    }
  }, [isOpen, address, network])

  const loadTransactionHistory = async () => {
    setIsLoading(true)
    try {
      // This would typically fetch from Blockscout API
      // For now, we'll simulate some transaction data
      const mockTransactions: TransactionHistoryItem[] = [
        {
          hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          status: 'confirmed',
          timestamp: Date.now() - 3600000, // 1 hour ago
          value: '0.001',
          gasUsed: '21000',
          blockNumber: 12345678
        },
        {
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          status: 'pending',
          timestamp: Date.now() - 1800000, // 30 minutes ago
          value: '0.002',
          gasUsed: '25000'
        },
        {
          hash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
          status: 'failed',
          timestamp: Date.now() - 7200000, // 2 hours ago
          value: '0.0005',
          gasUsed: '15000'
        }
      ]
      setTransactions(mockTransactions)
    } catch (error) {
      console.error('Failed to load transaction history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = filter === 'all' || tx.status === filter
    const matchesSearch = searchQuery === '' || tx.hash.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: TransactionHistoryItem['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const handleTransactionClick = (txHash: string) => {
    showTransactionNotification(txHash, network)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-end z-50">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
            <p className="text-sm text-gray-500 font-mono">{networkName}</p>
            <p className="text-xs text-gray-400 font-mono">{address.slice(0, 6)}...{address.slice(-4)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-2 mb-4">
            {(['all', 'pending', 'confirmed', 'failed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 text-xs font-mono uppercase tracking-wide border rounded transition-all duration-200 ${
                  filter === status
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search by transaction hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Transaction List */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="ml-3 text-gray-600">Loading transactions...</span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.709M15 6.291A7.962 7.962 0 0012 5c-2.34 0-4.29 1.009-5.824 2.709" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.hash}
                  onClick={() => handleTransactionClick(tx.hash)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-mono uppercase tracking-wide border rounded ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                      {tx.blockNumber && (
                        <span className="text-xs text-gray-500 font-mono">
                          Block #{tx.blockNumber}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 font-mono">
                      {formatTimestamp(tx.timestamp)}
                    </span>
                  </div>
                  
                  <div className="mb-2">
                    <code className="text-sm font-mono text-gray-800 break-all">
                      {tx.hash}
                    </code>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                    {tx.value && (
                      <span>{tx.value} ETH</span>
                    )}
                    {tx.gasUsed && (
                      <span>{tx.gasUsed} gas</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
