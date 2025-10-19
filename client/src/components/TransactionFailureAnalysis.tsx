import React from 'react'
import { useBlockscout } from '@/hooks/useBlockscout'

interface TransactionFailureAnalysisProps {
  txHash: string
  network: string
  className?: string
}

interface FailureReason {
  type: 'gas' | 'revert' | 'network' | 'unknown'
  message: string
  suggestion: string
  severity: 'low' | 'medium' | 'high'
}

export const TransactionFailureAnalysis: React.FC<TransactionFailureAnalysisProps> = ({
  txHash,
  className = ''
}) => {
  const { getTransactionStatus } = useBlockscout()
  const txInfo = getTransactionStatus(txHash)

  // Analyze failure reasons (this would typically come from Blockscout API)
  const analyzeFailure = (): FailureReason | null => {
    if (!txInfo || txInfo.status !== 'failed') return null

    // Mock analysis - in real implementation, this would analyze the transaction data
    const mockFailureReasons: FailureReason[] = [
      {
        type: 'gas',
        message: 'Transaction ran out of gas',
        suggestion: 'Increase gas limit by 20-30% and retry',
        severity: 'medium'
      },
      {
        type: 'revert',
        message: 'Transaction reverted due to insufficient balance',
        suggestion: 'Check account balance and ensure sufficient funds',
        severity: 'high'
      },
      {
        type: 'network',
        message: 'Network congestion caused transaction timeout',
        suggestion: 'Retry with higher gas price during off-peak hours',
        severity: 'low'
      },
      {
        type: 'revert',
        message: 'Smart contract execution failed',
        suggestion: 'Review contract parameters and try again',
        severity: 'high'
      }
    ]

    // Return a random failure reason for demo purposes
    return mockFailureReasons[Math.floor(Math.random() * mockFailureReasons.length)]
  }

  const failureReason = analyzeFailure()

  if (!failureReason) return null

  const getSeverityColor = (severity: FailureReason['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: FailureReason['severity']) => {
    switch (severity) {
      case 'high':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'medium':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'low':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className={`p-4 border border-gray-200 rounded-lg bg-gray-50 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${getSeverityColor(failureReason.severity)}`}>
          {getSeverityIcon(failureReason.severity)}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-medium text-gray-900">Transaction Failed</h4>
            <span className={`px-2 py-1 text-xs font-mono uppercase tracking-wide border rounded ${getSeverityColor(failureReason.severity)}`}>
              {failureReason.severity} severity
            </span>
          </div>
          
          <p className="text-sm text-gray-700 mb-3">
            {failureReason.message}
          </p>
          
          <div className="bg-white border border-gray-200 rounded-md p-3">
            <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
              Suggested Action
            </h5>
            <p className="text-sm text-gray-800">
              {failureReason.suggestion}
            </p>
          </div>
          
          <div className="mt-3 flex gap-2">
            <button className="px-3 py-1 text-xs font-mono text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors">
              [RETRY TX]
            </button>
            <button className="px-3 py-1 text-xs font-mono text-gray-600 hover:text-gray-800 bg-gray-100 border border-gray-200 rounded hover:bg-gray-200 transition-colors">
              [VIEW LOGS]
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
