import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { LoadingScreen } from './components/LoadingScreen'

// Layout components
import { AuthLayout } from './components/layouts/AuthLayout'
import { DashboardLayout } from './components/layouts/DashboardLayout'

// Auth pages
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'

// Dashboard pages
import { DashboardsPage } from './pages/dashboards/DashboardsPage'
import { DashboardViewPage } from './pages/dashboards/DashboardViewPage'
import { DashboardEditPage } from './pages/dashboards/DashboardEditPage'
import { CreateDashboardPage } from './pages/dashboards/CreateDashboardPage'

// Organization pages
import { OrganizationPage } from './pages/organization/OrganizationPage'
import { MembersPage } from './pages/organization/MembersPage'
import { SettingsPage } from './pages/organization/SettingsPage'

// Data source pages
import { DataSourcesPage } from './pages/data-sources/DataSourcesPage'
import { CreateDataSourcePage } from './pages/data-sources/CreateDataSourcePage'

// Profile pages
import { ProfilePage } from './pages/profile/ProfilePage'

// 404 page
import { NotFoundPage } from './pages/NotFoundPage'

// Protected route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Public route wrapper (redirects to dashboard if authenticated)
interface PublicRouteProps {
  children: React.ReactNode
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboards" replace />
  }

  return <>{children}</>
}

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <AuthLayout>
                <LoginPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <AuthLayout>
                <RegisterPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <AuthLayout>
                <ForgotPasswordPage />
              </AuthLayout>
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <AuthLayout>
                <ResetPasswordPage />
              </AuthLayout>
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboards"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboards/create"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CreateDashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboards/:id"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardViewPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboards/:id/edit"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardEditPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Data Sources */}
        <Route
          path="/data-sources"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DataSourcesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/data-sources/create"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <CreateDataSourcePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Organization */}
        <Route
          path="/organization"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <OrganizationPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organization/members"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <MembersPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/organization/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Profile */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProfilePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboards" replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default App
