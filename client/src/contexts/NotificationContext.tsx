import React, { createContext, ReactNode, useContext } from "react"

interface NotificationContextType {
  openTxToast: (chainId: string, txHash: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
)

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const openTxToast = async (_chainId: string, _txHash: string) => {
    return
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
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    )
  }
  return context
}
