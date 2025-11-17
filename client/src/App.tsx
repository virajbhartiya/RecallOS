import { NotificationProvider } from "@/contexts/notification.context"
import { TransactionPopupProvider } from "@/contexts/transaction-popup.context"
import AppRoutes from "@/router/routes.route"
import { Analytics } from "@vercel/analytics/react"
import { BrowserRouter as Router } from "react-router-dom"

import { Toaster } from "@/components/ui/sonner"
import { CommandMenu } from "@/components/CommandMenu"

function App() {
  return (
    <NotificationProvider>
      <TransactionPopupProvider>
        <Router>
          <Analytics />
          <CommandMenu />
          <AppRoutes />
          <Toaster />
        </Router>
      </TransactionPopupProvider>
    </NotificationProvider>
  )
}

export default App
