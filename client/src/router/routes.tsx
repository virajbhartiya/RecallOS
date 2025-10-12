import { Landing } from '@/pages/Landing'
import { Memories } from '@/pages/Memories'
import { Route, Routes } from 'react-router-dom'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/memories" element={<Memories />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}

export default AppRoutes
