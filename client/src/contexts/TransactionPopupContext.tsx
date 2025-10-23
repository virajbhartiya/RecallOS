import React, { createContext, useContext, ReactNode } from 'react'

interface TransactionPopupContextType {
  openPopup: (options: { chainId: string; address?: string }) => void
}

const TransactionPopupContext = createContext<TransactionPopupContextType | undefined>(undefined)

interface TransactionPopupProviderProps {
  children: ReactNode
}

export const TransactionPopupProvider: React.FC<TransactionPopupProviderProps> = ({ children }) => {
  const openPopup = ({ chainId: _chainId, address }: { chainId: string; address?: string }) => {
    // Open Blockscout explorer in a new tab
    let blockscoutUrl = 'https://eth-sepolia.blockscout.com'
    
    if (address) {
      blockscoutUrl = `https://eth-sepolia.blockscout.com/address/${address}`
    }
    
    window.open(blockscoutUrl, '_blank')
  }

  return (
    <TransactionPopupContext.Provider value={{ openPopup }}>
      {children}
    </TransactionPopupContext.Provider>
  )
}

export const useTransactionPopup = () => {
  const context = useContext(TransactionPopupContext)
  if (context === undefined) {
    throw new Error('useTransactionPopup must be used within a TransactionPopupProvider')
  }
  return context
}
