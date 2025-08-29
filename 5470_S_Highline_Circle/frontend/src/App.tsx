import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext';
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
                  <ItemDetail />
                </Layout>
              } />
              <Route path="/buyer-view" element={
                <Layout>
                  <BuyerView />
                </Layout>
              } />
              <Route path="/analytics" element={
                <Layout>
                  <Analytics />
                </Layout>
              } />
              <Route path="/insights" element={
                <Layout>
                  <Insights />
                </Layout>
              } />
              <Route path="/collaboration" element={
                <Layout>
                  <Collaboration />
                </Layout>
              } />
              <Route path="/settings" element={
                <Layout>
                  <Settings />
                </Layout>
              } />
              <Route path="/photos" element={
                <Layout>
                  <PhotoCapture />
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