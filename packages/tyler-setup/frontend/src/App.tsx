import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ProtectedRoute } from '@/components/protected-route';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('@/pages/auth/login'));
const DashboardPage = lazy(() => import('@/pages/dashboard/dashboard'));
const UsersPage = lazy(() => import('@/pages/users/users'));
const ContractorsPage = lazy(() => import('@/pages/contractors/contractors'));
const SecretsPage = lazy(() => import('@/pages/secrets/secrets'));
const AuditPage = lazy(() => import('@/pages/audit/audit'));
const SettingsPage = lazy(() => import('@/pages/settings/settings'));
const NotFoundPage = lazy(() => import('@/pages/not-found'));

function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground">Loading Tyler Setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <UsersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/contractors"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <ContractorsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/secrets"
            element={
              <ProtectedRoute>
                <SecretsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/audit"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AuditPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
