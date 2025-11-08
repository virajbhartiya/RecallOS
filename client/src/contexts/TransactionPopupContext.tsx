import React, { createContext, ReactNode, useContext } from "react"

interface TransactionPopupContextType {
  openPopup: (options: { chainId: string; address?: string }) => void
}

const TransactionPopupContext = createContext<
  TransactionPopupContextType | undefined
>(undefined)

interface TransactionPopupProviderProps {
  children: ReactNode
}

export const TransactionPopupProvider: React.FC<
  TransactionPopupProviderProps
> = ({ children }) => {
  const openPopup = (_opts: { chainId: string; address?: string }) => {
    return
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
    throw new Error(
      "useTransactionPopup must be used within a TransactionPopupProvider"
    )
  }
  return context
}
