import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

const Landing = lazy(() =>
  import("@/pages/landing.page").then((module) => ({ default: module.Landing }))
)
const Memories = lazy(() =>
  import("@/pages/memories.page").then((module) => ({
    default: module.Memories,
  }))
)
const Search = lazy(() =>
  import("@/pages/search.page").then((module) => ({ default: module.Search }))
)
const Docs = lazy(() =>
  import("@/pages/docs.page").then((module) => ({ default: module.Docs }))
)
const Login = lazy(() =>
  import("@/pages/login.page").then((module) => ({ default: module.Login }))
)
const Analytics = lazy(() =>
  import("@/pages/analytics.page").then((module) => ({
    default: module.Analytics,
  }))
)
const Profile = lazy(() =>
  import("@/pages/profile.page").then((module) => ({ default: module.Profile }))
)
const Insights = lazy(() =>
  import("@/pages/insights.page").then((module) => ({
    default: module.Insights,
  }))
)

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-sm font-mono text-gray-600">Loading...</div>
  </div>
)

const AppRoutes = () => {
  const enableInternalRoutes =
    import.meta.env.VITE_ENABLE_INTERNAL_ROUTES !== "false"

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        {enableInternalRoutes ? (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="/memories" element={<Memories />} />
            <Route path="/search" element={<Search />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/insights" element={<Insights />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/memories" element={<Navigate to="/" replace />} />
            <Route path="/search" element={<Navigate to="/" replace />} />
            <Route path="/docs" element={<Navigate to="/" replace />} />
            <Route path="/analytics" element={<Navigate to="/" replace />} />
            <Route path="/profile" element={<Navigate to="/" replace />} />
            <Route path="/insights" element={<Navigate to="/" replace />} />
          </>
        )}

        <Route path="*" element={<Landing />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
