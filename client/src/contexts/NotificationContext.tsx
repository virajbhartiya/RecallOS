import React, { createContext, ReactNode, useContext } from "react"

interface NotificationContextType {
  openTxToast: () => Promise<void>
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
  const openTxToast = async () => {
    return
  }

  return (
    <NotificationContext.Provider value={{ openTxToast }}>
      {children}
    </NotificationContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    )
  }
  return context
}
