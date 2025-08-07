/**
 * System Analyzer Dashboard Page
 * 
 * Main page component that sets up the Apollo provider and dashboard context
 */

'use client';

import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { Toaster } from 'sonner';
import { apolloClient } from '@/lib/graphql/apollo-client';
import { DashboardProvider } from '@/lib/context/DashboardContext';
import { SystemAnalyzerDashboard } from '@/components/dashboard/SystemAnalyzerDashboard';

export default function SystemAnalyzerPage() {
  return (
    <ApolloProvider client={apolloClient}>
      <DashboardProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <SystemAnalyzerDashboard />
          
          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700',
              duration: 5000,
            }}
          />
        </div>
      </DashboardProvider>
    </ApolloProvider>
  );
}