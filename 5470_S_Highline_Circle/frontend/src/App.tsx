import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import PerformanceMonitor from './components/PerformanceMonitor';
import HashRedirect from './components/HashRedirect';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import ItemDetail from './pages/ItemDetail';
import BuyerView from './pages/BuyerView';
import Analytics from './pages/Analytics';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import PhotoCapture from './pages/PhotoCapture';
import Collaboration from './pages/Collaboration';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
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
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/item/:id" element={<ItemDetail />} />
                  <Route path="/buyer-view" element={<BuyerView />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/collaboration" element={<Collaboration />} />
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
            }}
          />
          <PerformanceMonitor />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
