import { useCallback, useMemo, useRef } from 'react'

export type TransactionStatus = 'pending' | 'confirmed' | 'failed'

export interface TransactionInfo {
  hash: string
  status: TransactionStatus
  network: string
  blockNumber?: number
  gasUsed?: string
  gasPrice?: string
  from?: string
  to?: string
  value?: string
  timestamp?: number
  errorMessage?: string
}

/**
 * Minimal client-only Blockscout hook to satisfy imports and provide
 * lightweight transaction status tracking for UI components.
 */
export function useBlockscout() {
  const storeRef = useRef<Map<string, TransactionInfo>>(new Map())

  const getNetworkName = useCallback((network?: string) => {
    return network || 'unknown'
  }, [])

  const getTransactionStatus = useCallback((txHash?: string): TransactionInfo | null => {
    if (!txHash) return null
    return storeRef.current.get(txHash) || null
  }, [])

  const monitorTransaction = useCallback(async (txHash: string, network: string): Promise<TransactionInfo> => {
    const existing = storeRef.current.get(txHash)
    const next: TransactionInfo = existing || {
      hash: txHash,
      status: 'pending',
      network,
      timestamp: Date.now() / 1000
    }

    // Very naive progression: keep whatever we have; if first seen, keep as pending
    storeRef.current.set(txHash, next)
    return next
  }, [])

  const showTransactionNotification = useCallback((_txHash: string, _network?: string) => {
    // No-op placeholder for UI notifications
    return
  }, [])

  return useMemo(() => ({
    getNetworkName,
    getTransactionStatus,
    monitorTransaction,
    showTransactionNotification
  }), [getNetworkName, getTransactionStatus, monitorTransaction, showTransactionNotification])
}


