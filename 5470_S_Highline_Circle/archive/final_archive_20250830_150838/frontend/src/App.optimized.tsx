import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import PerformanceMonitor from './components/PerformanceMonitor';
import HashRedirect from './components/HashRedirect';

// Import lazy loaded routes
import {
  Dashboard,
  Inventory,
  ItemDetail,
  BuyerView,
  Analytics,
  Insights,
  PhotoCapture,
  Collaboration,
  Valuations,
  Settings,
  prefetchRoute
} from './utils/lazyRoutes';

// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  // Prefetch critical routes on app load
  useEffect(() => {
    // Prefetch dashboard after initial load
    const timer = setTimeout(() => {
      prefetchRoute('dashboard');
      prefetchRoute('inventory');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Implement service worker for offline support
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <Layout>
                <HashRedirect />
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/item/:id" element={<ItemDetail />} />
                  <Route path="/buyer-view" element={<BuyerView />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/collaboration" element={<Collaboration />} />
                  <Route path="/valuations" element={<Valuations />} />
                  <Route path="/valuations/:itemId" element={<Valuations />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/photos" element={<PhotoCapture />} />
                  {/* Catch-all route - redirect unmatched paths to dashboard */}
                  <Route path="*" element={<Dashboard />} />
                </Routes>
              </Layout>
            </Router>
          </AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
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