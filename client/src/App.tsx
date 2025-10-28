import { BrowserRouter as Router } from 'react-router-dom'
import AppRoutes from '@/router/routes'
import { CommandMenu } from '@/components/CommandMenu'
import { Toaster } from '@/components/ui/sonner'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { TransactionPopupProvider } from '@/contexts/TransactionPopupContext'

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
