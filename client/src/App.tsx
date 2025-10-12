import { BrowserRouter as Router } from 'react-router-dom'
import AppRoutes from '@/router/routes'
import { CommandMenu } from '@/components/CommandMenu'
import { Toaster } from '@/components/ui/sonner'
function App() {
  return (
    <Router>
      <CommandMenu />
      <AppRoutes />
      <Toaster />
    </Router>
  )
}

export default App
