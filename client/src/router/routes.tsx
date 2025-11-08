import { lazy, Suspense } from "react"
import { Route, Routes } from "react-router-dom"

const Landing = lazy(() =>
  import("@/pages/Landing").then((module) => ({ default: module.Landing }))
)
const Memories = lazy(() =>
  import("@/pages/Memories").then((module) => ({ default: module.Memories }))
)
const Search = lazy(() =>
  import("@/pages/Search").then((module) => ({ default: module.Search }))
)
const Docs = lazy(() =>
  import("@/pages/Docs").then((module) => ({ default: module.Docs }))
)
const Login = lazy(() =>
  import("@/pages/Login").then((module) => ({ default: module.Login }))
)
const Analytics = lazy(() =>
  import("@/pages/Analytics").then((module) => ({ default: module.Analytics }))
)
const Profile = lazy(() =>
  import("@/pages/Profile").then((module) => ({ default: module.Profile }))
)

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-sm font-mono text-gray-600">Loading...</div>
  </div>
)

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/memories" element={<Memories />} />
        <Route path="/search" element={<Search />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/profile" element={<Profile />} />

        <Route path="*" element={<Landing />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
