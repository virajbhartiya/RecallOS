import React, { useEffect } from 'react'
import { useBlockscout, type TransactionInfo } from '@/hooks/useBlockscout'

interface TransactionStatusIndicatorProps {
  txHash: string
  network: string
  className?: string
}

export const TransactionStatusIndicator: React.FC<TransactionStatusIndicatorProps> = ({
  txHash,
  network,
  className = ''
}) => {
  const { getTransactionStatus, monitorTransaction } = useBlockscout()
  const txInfo = getTransactionStatus(txHash)

  // Start monitoring when component mounts
  useEffect(() => {
    if (txHash) {
      monitorTransaction(txHash, network)
    }
  }, [txHash, network, monitorTransaction])

  if (!txInfo) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
        <span className="text-xs text-gray-500 font-mono">Loading...</span>
      </div>
    )
  }

  const getStatusColor = (status: TransactionInfo['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500'
      case 'pending':
        return 'bg-yellow-500 animate-pulse'
      case 'failed':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusText = (status: TransactionInfo['status']) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed'
      case 'pending':
        return 'Pending'
      case 'failed':
        return 'Failed'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getStatusColor(txInfo.status)}`}></div>
      <span className="text-xs font-mono text-gray-600">
        {getStatusText(txInfo.status)}
      </span>
      {txInfo.blockNumber && (
        <span className="text-xs text-gray-500 font-mono">
          Block #{txInfo.blockNumber}
        </span>
      )}
      {txInfo.gasUsed && (
        <span className="text-xs text-gray-500 font-mono">
          {txInfo.gasUsed} gas
        </span>
      )}
    </div>
  )
}
