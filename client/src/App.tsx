import { BrowserRouter as Router } from 'react-router-dom'
import AppRoutes from '@/router/routes'
import { CommandMenu } from '@/components/CommandMenu'
import { Toaster } from '@/components/ui/sonner'
import { WalletProvider } from '@/contexts/WalletContext'
import { NotificationProvider, TransactionPopupProvider } from '@blockscout/app-sdk'

function App() {
  return (
    <WalletProvider>
      <NotificationProvider>
        <TransactionPopupProvider>
          <Router>
            <CommandMenu />
            <AppRoutes />
            <Toaster />
          </Router>
        </TransactionPopupProvider>
      </NotificationProvider>
    </WalletProvider>
  )
}

export default App
