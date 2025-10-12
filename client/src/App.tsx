import { BrowserRouter as Router } from 'react-router-dom'
import AppRoutes from '@/router/routes'
import { CommandMenu } from '@/components/CommandMenu'
import { Toaster } from '@/components/ui/sonner'
import { WalletProvider } from '@/contexts/WalletContext'

function App() {
  return (
    <WalletProvider>
      <Router>
        <CommandMenu />
        <AppRoutes />
        <Toaster />
      </Router>
    </WalletProvider>
  )
}

export default App
