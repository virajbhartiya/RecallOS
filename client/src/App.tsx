import { NotificationProvider } from "@/contexts/NotificationContext"
import { TransactionPopupProvider } from "@/contexts/TransactionPopupContext"
import AppRoutes from "@/router/routes"
import { BrowserRouter as Router } from "react-router-dom"

import { Toaster } from "@/components/ui/sonner"
import { CommandMenu } from "@/components/CommandMenu"

function App() {
  return (
    <NotificationProvider>
      <TransactionPopupProvider>
        <Router>
          <CommandMenu />
          <AppRoutes />
          <Toaster />
        </Router>
      </TransactionPopupProvider>
    </NotificationProvider>
  )
}

export default App
