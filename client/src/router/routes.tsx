import { Landing } from '@/pages/Landing'
import { Memories } from '@/pages/Memories'
import { Search } from '@/pages/Search'
import { Docs } from '@/pages/Docs'
import { Route, Routes } from 'react-router-dom'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/memories" element={<Memories />} />
      <Route path="/search" element={<Search />} />
      <Route path="/docs" element={<Docs />} />
      
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}

export default AppRoutes
