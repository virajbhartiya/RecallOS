import React, { createContext, useContext, ReactNode } from 'react'

interface NotificationContextType {
  openTxToast: (chainId: string, txHash: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const openTxToast = async (_chainId: string, txHash: string) => {
    // Simple implementation that opens Blockscout in a new tab
    const blockscoutUrl = `https://eth-sepolia.blockscout.com/tx/${txHash}`
    window.open(blockscoutUrl, '_blank')
  }

  return (
    <NotificationContext.Provider value={{ openTxToast }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
