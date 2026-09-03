import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ROUTES } from './constants/routes'
import { Loader2 } from 'lucide-react'

// Layout
import AppShell from './components/layout/AppShell'

// Lazy Pages
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const NewScreeningPage = lazy(() => import('./pages/NewScreeningPage'))
const ScreeningStatusPage = lazy(() => import('./pages/ScreeningStatusPage'))
const ScreeningResultPage = lazy(() => import('./pages/ScreeningResultPage'))
const ScreeningAnalysisPage = lazy(() => import('./pages/ScreeningAnalysisPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function LoadingFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center font-mono text-xs text-console-muted">
      <div className="flex items-center gap-2 border border-console-border bg-console-panel px-4 py-3 shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin text-console-accent" />
        <span className="uppercase tracking-widest">LOADING CONSOLE MODULE...</span>
      </div>
    </div>
  )
}

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center bg-console-bg text-console-muted font-mono text-xs uppercase tracking-widest">
        INITIALIZING SECURITY CONSOLE SESSION...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  return <AppShell />
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return null
  }

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return children
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Login Route */}
            <Route
              path={ROUTES.LOGIN}
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            {/* Protected Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route index element={<Navigate to={ROUTES.DASHBOARD} replace />} />
              <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
              <Route path={ROUTES.NEW_SCREENING} element={<NewScreeningPage />} />
              <Route path="/screening/:id/status" element={<ScreeningStatusPage />} />
              <Route path="/screening/:id/result" element={<ScreeningResultPage />} />
              <Route path="/screening/:id/analysis" element={<ScreeningAnalysisPage />} />
              <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
              <Route path={ROUTES.ANALYTICS} element={<AnalyticsPage />} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App