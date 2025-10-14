import { useNotification, useTransactionPopup } from '@blockscout/app-sdk'
import { useCallback, useState } from 'react'

const CHAIN_IDS = {
  sepolia: '11155111',
  mainnet: '1',
  polygon: '137',
  arbitrum: '42161',
  optimism: '10'
} as const

// Network names for display
const NETWORK_NAMES = {
  sepolia: 'Sepolia Testnet',
  mainnet: 'Ethereum Mainnet',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum One',
  optimism: 'Optimism'
} as const

// Transaction status types
export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'unknown'

// Enhanced transaction info interface
export interface TransactionInfo {
  hash: string
  status: TransactionStatus
  blockNumber?: number
  gasUsed?: string
  gasPrice?: string
  timestamp?: number
  from?: string
  to?: string
  value?: string
  network: string
}

// Validation functions for real transaction data
const isValidTxHash = (txHash: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash)
}

const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export const useBlockscout = () => {
  const { openTxToast } = useNotification()
  const { openPopup } = useTransactionPopup()
  const [transactionStatuses, setTransactionStatuses] = useState<Map<string, TransactionInfo>>(new Map())
  const [networkHealth, setNetworkHealth] = useState<Map<string, boolean>>(new Map())

  // Show transaction notification for a real memory transaction
  const showTransactionNotification = useCallback(async (
    txHash: string,
    network: string = 'sepolia'
  ) => {
    // Only proceed with valid transaction hashes
    if (!isValidTxHash(txHash)) {
      console.error('Invalid transaction hash format:', txHash)
      return
    }

    const chainId = CHAIN_IDS[network as keyof typeof CHAIN_IDS] || CHAIN_IDS.sepolia
    
    try {
      await openTxToast(chainId, txHash)
    } catch (error) {
      console.error('Failed to show transaction notification:', error)
    }
  }, [openTxToast])

  // Show transaction history popup for a real address
  const showTransactionHistory = useCallback((
    address: string,
    network: string = 'sepolia'
  ) => {
    // Only proceed with valid addresses
    if (!isValidAddress(address)) {
      console.error('Invalid address format:', address)
      return
    }

    const chainId = CHAIN_IDS[network as keyof typeof CHAIN_IDS] || CHAIN_IDS.sepolia
    
    try {
      openPopup({
        chainId,
        address
      })
    } catch (error) {
      console.error('Failed to show transaction history:', error)
    }
  }, [openPopup])

  // Show all transactions for a network (real transactions only)
  const showAllTransactions = useCallback((
    network: string = 'sepolia'
  ) => {
    const chainId = CHAIN_IDS[network as keyof typeof CHAIN_IDS] || CHAIN_IDS.sepolia
    
    try {
      openPopup({
        chainId
      })
    } catch (error) {
      console.error('Failed to show all transactions:', error)
    }
  }, [openPopup])

  // Monitor transaction status
  const monitorTransaction = useCallback(async (
    txHash: string,
    network: string = 'sepolia'
  ): Promise<TransactionInfo | null> => {
    if (!isValidTxHash(txHash)) {
      console.error('Invalid transaction hash format:', txHash)
      return null
    }

    try {
      // Fetch real transaction data from Blockscout API
      const response = await fetch(`https://eth-sepolia.blockscout.com/api/v2/transactions/${txHash}`)
      
      if (!response.ok) {
        // If transaction not found, it might still be pending
        const txInfo: TransactionInfo = {
          hash: txHash,
          status: 'pending',
          network,
          timestamp: Date.now()
        }
        setTransactionStatuses(prev => new Map(prev.set(txHash, txInfo)))
        return txInfo
      }

      const txData = await response.json()
      
      // Debug logging
      console.log('Transaction data from Blockscout:', txData)
      
      // Determine status based on transaction data
      let status: TransactionStatus = 'pending'
      if (txData.status === 'ok') {
        status = 'confirmed'
      } else if (txData.status === 'error') {
        status = 'failed'
      }
      
      console.log('Determined transaction status:', status)

      const txInfo: TransactionInfo = {
        hash: txHash,
        status,
        network,
        blockNumber: txData.block ? parseInt(txData.block) : undefined,
        gasUsed: txData.gas_used,
        gasPrice: txData.gas_price,
        timestamp: txData.timestamp ? new Date(txData.timestamp).getTime() : Date.now(),
        from: txData.from?.hash,
        to: txData.to?.hash,
        value: txData.value
      }

      setTransactionStatuses(prev => new Map(prev.set(txHash, txInfo)))
      return txInfo
    } catch (error) {
      console.error('Failed to monitor transaction:', error)
      // Return pending status as fallback
      const txInfo: TransactionInfo = {
        hash: txHash,
        status: 'pending',
        network,
        timestamp: Date.now()
      }
      setTransactionStatuses(prev => new Map(prev.set(txHash, txInfo)))
      return txInfo
    }
  }, [])

  // Get transaction status
  const getTransactionStatus = useCallback((txHash: string): TransactionInfo | null => {
    return transactionStatuses.get(txHash) || null
  }, [transactionStatuses])

  // Check network health
  const checkNetworkHealth = useCallback(async (network: string = 'sepolia'): Promise<boolean> => {
    try {
      // This would typically ping the Blockscout API
      // For now, we'll assume it's healthy
      const isHealthy = true
      setNetworkHealth(prev => new Map(prev.set(network, isHealthy)))
      return isHealthy
    } catch (error) {
      console.error('Failed to check network health:', error)
      setNetworkHealth(prev => new Map(prev.set(network, false)))
      return false
    }
  }, [])

  // Get network name for display
  const getNetworkName = useCallback((network: string): string => {
    return NETWORK_NAMES[network as keyof typeof NETWORK_NAMES] || network
  }, [])

  // Get chain ID for a network
  const getChainId = useCallback((network: string): string => {
    return CHAIN_IDS[network as keyof typeof CHAIN_IDS] || CHAIN_IDS.sepolia
  }, [])

  // Check if network is healthy
  const isNetworkHealthy = useCallback((network: string): boolean => {
    return networkHealth.get(network) ?? true
  }, [networkHealth])

  return {
    showTransactionNotification,
    showTransactionHistory,
    showAllTransactions,
    monitorTransaction,
    getTransactionStatus,
    checkNetworkHealth,
    getNetworkName,
    getChainId,
    isNetworkHealthy,
    CHAIN_IDS,
    NETWORK_NAMES
  }
}
