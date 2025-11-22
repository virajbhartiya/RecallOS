import { NotificationProvider } from "@/contexts/notification.context"
import { TransactionPopupProvider } from "@/contexts/transaction-popup.context"
import AppRoutes from "@/router/routes.route"
import { Analytics } from "@vercel/analytics/react"
import { BrowserRouter as Router } from "react-router-dom"

import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { Toaster } from "@/components/ui/sonner"
import { CommandMenu } from "@/components/CommandMenu"

function AppContent() {
  useKeyboardShortcuts()

  return (
    <>
      <CommandMenu />
      <AppRoutes />
      <Toaster />
    </>
  )
}

function App() {
  return (
    <NotificationProvider>
      <TransactionPopupProvider>
        <Router>
          <Analytics />
          <AppContent />
        </Router>
      </TransactionPopupProvider>
    </NotificationProvider>
  )
}

export default App
