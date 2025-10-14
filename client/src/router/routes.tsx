import { Landing } from '@/pages/Landing'
import { Memories } from '@/pages/Memories'
import { Search } from '@/pages/Search'
import { Route, Routes } from 'react-router-dom'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/memories" element={<Memories />} />
      <Route path="/search" element={<Search />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}

export default AppRoutes
