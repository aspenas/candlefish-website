import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider } from 'react-helmet-async';
import { ApolloProvider } from '@apollo/client';

// Store
import { useAuthStore } from './store/authStore';
import { useRealTimeUpdates } from './hooks/useApi';

// Apollo Client
import { apolloClient } from './lib/apollo-client';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Components
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorMessage from './components/ui/ErrorMessage';
import NotificationSystem from './components/notifications/NotificationSystem';

// Lazy-loaded pages for performance
const SecurityOverview = lazy(() => import('./pages/SecurityOverview'));
const EventTimeline = lazy(() => import('./pages/EventTimeline'));
const ThreatDetectionDashboard = lazy(() => import('./pages/ThreatDetectionDashboard'));
const IncidentManagement = lazy(() => import('./pages/IncidentManagement'));
const ComplianceDashboard = lazy(() => import('./pages/ComplianceDashboard'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Settings = lazy(() => import('./pages/Settings'));
const LoginPage = lazy(() => import('./pages/LoginPage'));

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Error Fallback Component
const AppErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({
  error,
  resetError,
}) => (
  <div className="min-h-screen bg-soc-background flex items-center justify-center p-4">
    <ErrorMessage
      title="Application Error"
      message={error.message || 'An unexpected error occurred'}
      onRetry={resetError}
    />
  </div>
);

// Loading Component
const AppLoading: React.FC = () => (
  <div className="min-h-screen bg-soc-background flex items-center justify-center">
    <LoadingSpinner size="lg" text="Loading Security Dashboard..." />
  </div>
);

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const { startListening } = useRealTimeUpdates();

  useEffect(() => {
    if (isAuthenticated) {
      // Start WebSocket connection when authenticated
      startListening();
    }
  }, [isAuthenticated, startListening]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary
      FallbackComponent={AppErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Application Error:', error, errorInfo);
        // Here you could send error reports to your error tracking service
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ApolloProvider client={apolloClient}>
          <HelmetProvider>
            <div className="dark min-h-screen bg-soc-background text-white">
            <Router>
              <Routes>
                {/* Public Routes */}
                <Route
                  path="/login"
                  element={
                    <Suspense fallback={<AppLoading />}>
                      <LoginPage />
                    </Suspense>
                  }
                />

                {/* Protected Routes */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Suspense fallback={<AppLoading />}>
                          <Routes>
                            {/* Main Dashboard */}
                            <Route path="/" element={<SecurityOverview />} />
                            <Route path="/dashboard" element={<SecurityOverview />} />

                            {/* Security Events */}
                            <Route path="/events" element={<EventTimeline />} />

                            {/* Threat Detection */}
                            <Route path="/threats" element={<ThreatDetectionDashboard />} />

                            {/* Incident Management */}
                            <Route path="/incidents" element={<IncidentManagement />} />

                            {/* Compliance */}
                            <Route path="/compliance" element={<ComplianceDashboard />} />

                            {/* User Management */}
                            <Route path="/users" element={<UserManagement />} />

                            {/* Settings */}
                            <Route path="/settings" element={<Settings />} />

                            {/* Redirect unknown routes to dashboard */}
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        </Suspense>
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
              </Routes>

              {/* Global Notification System */}
              <NotificationSystem />
            </Router>
            </div>
          </HelmetProvider>
        </ApolloProvider>
        
        {/* React Query DevTools */}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
