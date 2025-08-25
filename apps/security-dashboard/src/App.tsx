import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider } from 'react-helmet-async';

// Providers
import { ThemeProvider } from './providers/ThemeProvider';
import { apolloClient } from './lib/apollo-client';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Error fallback component
import ErrorFallback from './components/ui/ErrorFallback';
import LoadingScreen from './components/ui/LoadingScreen';

// Lazy-loaded pages for performance
const SecurityOverview = lazy(() => import('./pages/SecurityOverview'));
const AssetManagement = lazy(() => import('./pages/AssetManagement'));
const VulnerabilityManagement = lazy(() => import('./pages/VulnerabilityManagement'));
const AlertManagement = lazy(() => import('./pages/AlertManagement'));
const ComplianceDashboard = lazy(() => import('./pages/ComplianceDashboard'));
const Reports = lazy(() => import('./pages/Reports'));
const KongMonitoring = lazy(() => import('./pages/KongMonitoring'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <ErrorBoundary
        FallbackComponent={ErrorFallback}
        onError={(error, errorInfo) => {
          console.error('Application Error:', error, errorInfo);
          // Here you could send error reports to your error tracking service
        }}
      >
        <ApolloProvider client={apolloClient}>
          <ThemeProvider>
            <Router>
              <DashboardLayout title="Candlefish Security Dashboard">
                <Suspense fallback={<LoadingScreen />}>
                  <Routes>
                    {/* Main Dashboard */}
                    <Route path="/" element={<SecurityOverview />} />
                    
                    {/* Kong Gateway Monitoring */}
                    <Route path="/kong" element={<KongMonitoring />} />
                    
                    {/* Asset Management */}
                    <Route path="/assets" element={<AssetManagement />} />
                    <Route path="/assets/:category" element={<AssetManagement />} />
                    
                    {/* Vulnerability Management */}
                    <Route path="/vulnerabilities" element={<VulnerabilityManagement />} />
                    
                    {/* Alert Management */}
                    <Route path="/alerts" element={<AlertManagement />} />
                    
                    {/* Compliance */}
                    <Route path="/compliance" element={<ComplianceDashboard />} />
                    
                    {/* Reports */}
                    <Route path="/reports" element={<Reports />} />
                    
                    {/* Settings */}
                    <Route path="/settings" element={<Settings />} />
                    
                    {/* 404 Page */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </DashboardLayout>
            </Router>
          </ThemeProvider>
        </ApolloProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
};

export default App;