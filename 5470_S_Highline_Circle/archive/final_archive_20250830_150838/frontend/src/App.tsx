import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import PerformanceMonitor from './components/PerformanceMonitor';
import HashRedirect from './components/HashRedirect';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Eagerly load critical pages for immediate interaction
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';

// Lazy load non-critical pages to reduce initial bundle size
const ItemDetail = lazyWithRetry(() => import('./pages/ItemDetail'));
const BuyerView = lazyWithRetry(() => import('./pages/BuyerView'));
const Analytics = lazyWithRetry(() => import('./pages/Analytics'));
const Insights = lazyWithRetry(() => import('./pages/Insights'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const PhotoCapture = lazyWithRetry(() => import('./pages/PhotoCapture'));
const Collaboration = lazyWithRetry(() => import('./pages/Collaboration'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading component for lazy-loaded routes
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Router>
            <HashRedirect />
            <Routes>
              {/* All routes are public for local development */}
              <Route path="/" element={
                <Layout>
                  <Dashboard />
                </Layout>
              } />
              <Route path="/inventory" element={
                <Layout>
                  <Inventory />
                </Layout>
              } />
              <Route path="/item/:id" element={
                <Layout>
                  <Suspense fallback={<LoadingFallback />}>
                    <ItemDetail />
                  </Suspense>
                </Layout>
              } />
              <Route path="/buyer-view" element={
                <Layout>
                  <Suspense fallback={<LoadingFallback />}>
                    <BuyerView />
                  </Suspense>
                </Layout>
              } />
              <Route path="/analytics" element={
                <Layout>
                  <Suspense fallback={<LoadingFallback />}>
                    <Analytics />
                  </Suspense>
                </Layout>
              } />
              <Route path="/insights" element={
                <Layout>
                  <Suspense fallback={<LoadingFallback />}>
                    <Insights />
                  </Suspense>
                </Layout>
              } />
              <Route path="/collaboration" element={
                <Layout>
                  <Suspense fallback={<LoadingFallback />}>
                    <Collaboration />
                  </Suspense>
                </Layout>
              } />
              <Route path="/settings" element={
                <Layout>
                  <Suspense fallback={<LoadingFallback />}>
                    <Settings />
                  </Suspense>
                </Layout>
              } />
              <Route path="/photos" element={
                <Layout>
                  <Suspense fallback={<LoadingFallback />}>
                    <PhotoCapture />
                  </Suspense>
                </Layout>
              } />
              
              {/* Catch-all route - redirect unmatched paths to dashboard */}
              <Route path="*" element={
                <Layout>
                  <Dashboard />
                </Layout>
              } />
            </Routes>
          </Router>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          <PerformanceMonitor />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;