import { BrowserRouter as Router } from 'react-router-dom'
import AppRoutes from '@/router/routes'
import { CommandMenu } from '@/components/CommandMenu'
import { Toaster } from '@/components/ui/sonner'
import { WalletProvider } from '@/contexts/WalletContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { TransactionPopupProvider } from '@/contexts/TransactionPopupContext'
import { WalletConnectionToast } from '@/components/WalletConnectionToast'

function App() {
  return (
    <WalletProvider>
      <NotificationProvider>
        <TransactionPopupProvider>
          <Router>
            <CommandMenu />
            <AppRoutes />
            <Toaster />
            <WalletConnectionToast />
          </Router>
        </TransactionPopupProvider>
      </NotificationProvider>
    </WalletProvider>
  )
}

export default App
