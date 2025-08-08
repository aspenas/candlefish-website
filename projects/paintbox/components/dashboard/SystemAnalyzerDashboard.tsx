/**
 * System Analyzer Dashboard - Main Component
 *
 * Features:
 * - Real-time service monitoring
 * - Interactive metrics visualization
 * - Alert management
 * - System health overview
 * - Responsive design
 */

'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_SERVICES,
  GET_ALERTS,
  GET_SYSTEM_ANALYSIS
} from '@/lib/graphql/queries';
import { useDashboard } from '@/lib/context/DashboardContext';
import { ServiceStatus, AlertSeverity } from '@/lib/types/dashboard';

// Layout Components
import { DashboardLayout } from './layout/DashboardLayout';
import { DashboardSidebar } from './layout/DashboardSidebar';
import { DashboardHeader } from './layout/DashboardHeader';

// View Components
import { OverviewDashboard } from './views/OverviewDashboard';
import { ServicesView } from './views/ServicesView';
import { AlertsView } from './views/AlertsView';
import { MetricsView } from './views/MetricsView';
import { InsightsView } from './views/InsightsView';

// UI Components
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { NotificationStack } from '../ui/NotificationStack';

export function SystemAnalyzerDashboard() {
  const {
    state,
    setServices,
    setAlerts,
    setSystemAnalysis,
    setLoading,
    setError,
    addNotification,
  } = useDashboard();

  const {
    view,
    filters,
    sidebarCollapsed,
    darkMode,
    isRealTimeEnabled,
  } = state;

  // Fetch services
  const {
    data: servicesData,
    loading: servicesLoading,
    error: servicesError,
    refetch: refetchServices,
  } = useQuery(GET_SERVICES, {
    variables: {
      status: filters.status,
      environment: filters.environment,
      tags: filters.tags,
      limit: 50,
    },
    pollInterval: isRealTimeEnabled ? 30000 : 0, // Poll every 30 seconds if real-time enabled
    errorPolicy: 'partial',
    notifyOnNetworkStatusChange: true,
  });

  // Fetch alerts
  const {
    data: alertsData,
    loading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useQuery(GET_ALERTS, {
    variables: {
      severity: filters.alertSeverity,
      status: 'ACTIVE',
      limit: 50,
    },
    pollInterval: isRealTimeEnabled ? 15000 : 0, // Poll every 15 seconds
    errorPolicy: 'partial',
    notifyOnNetworkStatusChange: true,
  });

  // Fetch system analysis
  const {
    data: analysisData,
    loading: analysisLoading,
    error: analysisError,
    refetch: refetchAnalysis,
  } = useQuery(GET_SYSTEM_ANALYSIS, {
    variables: {
      timeRange: filters.timeRange,
    },
    pollInterval: isRealTimeEnabled ? 60000 : 0, // Poll every minute
    errorPolicy: 'partial',
    notifyOnNetworkStatusChange: true,
  });

  // Update loading states
  useEffect(() => {
    setLoading('services', servicesLoading);
    setLoading('alerts', alertsLoading);
    setLoading('analysis', analysisLoading);
  }, [servicesLoading, alertsLoading, analysisLoading, setLoading]);

  // Handle data updates
  useEffect(() => {
    if (servicesData?.services) {
      setServices(servicesData.services);
      setError('services', null);
    }
  }, [servicesData, setServices, setError]);

  useEffect(() => {
    if (alertsData?.alerts) {
      setAlerts(alertsData.alerts);
      setError('alerts', null);
    }
  }, [alertsData, setAlerts, setError]);

  useEffect(() => {
    if (analysisData?.systemAnalysis) {
      setSystemAnalysis(analysisData.systemAnalysis);
      setError('analysis', null);
    }
  }, [analysisData, setSystemAnalysis, setError]);

  // Handle errors
  useEffect(() => {
    if (servicesError) {
      setError('services', servicesError.message);
      addNotification({
        type: 'error',
        title: 'Failed to load services',
        message: servicesError.message,
        dismissible: true,
      });
    }
  }, [servicesError, setError, addNotification]);

  useEffect(() => {
    if (alertsError) {
      setError('alerts', alertsError.message);
      addNotification({
        type: 'error',
        title: 'Failed to load alerts',
        message: alertsError.message,
        dismissible: true,
      });
    }
  }, [alertsError, setError, addNotification]);

  useEffect(() => {
    if (analysisError) {
      setError('analysis', analysisError.message);
      addNotification({
        type: 'error',
        title: 'Failed to load system analysis',
        message: analysisError.message,
        dismissible: true,
      });
    }
  }, [analysisError, setError, addNotification]);

  // Render current view
  const renderView = () => {
    switch (view) {
      case 'overview':
        return <OverviewDashboard />;
      case 'services':
        return <ServicesView />;
      case 'alerts':
        return <AlertsView />;
      case 'metrics':
        return <MetricsView />;
      case 'insights':
        return <InsightsView />;
      default:
        return <OverviewDashboard />;
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    try {
      addNotification({
        type: 'info',
        title: 'Refreshing data',
        message: 'Fetching latest system status...',
        dismissible: false,
      });

      await Promise.all([
        refetchServices(),
        refetchAlerts(),
        refetchAnalysis(),
      ]);

      addNotification({
        type: 'success',
        title: 'Data refreshed',
        message: 'System data has been updated successfully',
        dismissible: true,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Refresh failed',
        message: 'Failed to refresh system data',
        dismissible: true,
      });
    }
  };

  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Dashboard Error
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Something went wrong while loading the dashboard.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      }
    >
      <DashboardLayout
        sidebar={
          <DashboardSidebar
            collapsed={sidebarCollapsed}
            onRefresh={handleRefresh}
          />
        }
        header={
          <DashboardHeader
            onRefresh={handleRefresh}
          />
        }
        className={`min-h-screen transition-colors duration-200 ${
          darkMode
            ? 'bg-gray-900 text-gray-100'
            : 'bg-gray-50 text-gray-900'
        }`}
      >
        <div className="flex-1 relative">
          {/* Loading Overlay */}
          {(servicesLoading || alertsLoading || analysisLoading) && (
            <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-40 flex items-center justify-center">
              <LoadingSpinner
                size="lg"
                message="Loading system data..."
              />
            </div>
          )}

          {/* Main Content */}
          <div className="h-full overflow-auto">
            {renderView()}
          </div>

          {/* Notification Stack */}
          <NotificationStack />
        </div>
      </DashboardLayout>
    </ErrorBoundary>
  );
}

export default SystemAnalyzerDashboard;
