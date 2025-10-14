import { useNotification, useTransactionPopup } from '@blockscout/app-sdk'
import { useCallback } from 'react'

const CHAIN_IDS = {
  sepolia: '11155111',
  mainnet: '1',
  polygon: '137',
  arbitrum: '42161',
  optimism: '10'
} as const

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

  return {
    showTransactionNotification,
    showTransactionHistory,
    showAllTransactions,
    CHAIN_IDS
  }
}
