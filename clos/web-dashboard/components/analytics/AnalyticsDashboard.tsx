'use client';

import React, { useEffect, useState } from 'react';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  RefreshCw,
  Plus,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import SystemOverviewWidget from './widgets/SystemOverviewWidget';
import AgentPerformanceChart from './widgets/AgentPerformanceChart';
import ServiceHealthGrid from './widgets/ServiceHealthGrid';
import AlertsWidget from './widgets/AlertsWidget';
import WidgetContainer from './widgets/WidgetContainer';
import DashboardFilters from './DashboardFilters';
import AddWidgetModal from './AddWidgetModal';
import MobileAnalytics from './MobileAnalytics';

interface AnalyticsDashboardProps {
  className?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  className 
}) => {
  const { user } = useAuth();
  const {
    widgets,
    isLoading,
    error,
    lastUpdate,
    isConnected,
    initializeSocket,
    disconnectSocket,
    fetchAnalyticsData,
    setError,
  } = useAnalyticsStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize WebSocket and fetch initial data
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        initializeSocket(token);
        fetchAnalyticsData();
      }
    }

    return () => {
      disconnectSocket();
    };
  }, [user, initializeSocket, disconnectSocket, fetchAnalyticsData]);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        fetchAnalyticsData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchAnalyticsData, isLoading]);

  const handleRefresh = () => {
    setError(null);
    fetchAnalyticsData();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const renderWidget = (widget: any) => {
    const commonProps = {
      key: widget.id,
      widget,
      onSelect: () => setSelectedWidget(widget.id),
      isSelected: selectedWidget === widget.id,
    };

    switch (widget.type) {
      case 'metric':
        if (widget.id === 'system-overview') {
          return (
            <WidgetContainer {...commonProps}>
              <SystemOverviewWidget />
            </WidgetContainer>
          );
        }
        break;
      
      case 'chart':
        if (widget.id === 'agent-performance-chart') {
          return (
            <WidgetContainer {...commonProps}>
              <AgentPerformanceChart config={widget.config} />
            </WidgetContainer>
          );
        }
        break;
      
      case 'grid':
        if (widget.id === 'service-health-grid') {
          return (
            <WidgetContainer {...commonProps}>
              <ServiceHealthGrid />
            </WidgetContainer>
          );
        }
        break;
      
      case 'list':
        if (widget.id === 'recent-alerts') {
          return (
            <WidgetContainer {...commonProps}>
              <AlertsWidget config={widget.config} />
            </WidgetContainer>
          );
        }
        break;
      
      default:
        return (
          <WidgetContainer {...commonProps}>
            <div className="flex items-center justify-center h-32 text-gray-500">
              Unknown widget type: {widget.type}
            </div>
          </WidgetContainer>
        );
    }
  };

  if (error) {
    return (
      <div className={cn('p-6', className)}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-red-800 font-semibold">Error Loading Analytics</h3>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={handleRefresh}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Use mobile layout for small screens
  if (isMobile) {
    return <MobileAnalytics className={className} />;
  }

  return (
    <div className={cn('flex flex-col h-full bg-gray-50', className)}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center">
              <div 
                className={cn(
                  'w-2 h-2 rounded-full mr-2',
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                )}
              />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Last Update */}
            {lastUpdate && (
              <div className="text-sm text-gray-500">
                Last updated: {new Date(lastUpdate).toLocaleTimeString()}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className={cn(
                'p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
              title="Refresh Data"
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </button>

            {/* Add Widget Button */}
            <button
              onClick={() => setShowAddWidget(true)}
              className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Widget
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>

            {/* Settings */}
            <button className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4">
          <DashboardFilters />
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading && widgets.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-2" />
              <p className="text-gray-600">Loading analytics data...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 auto-rows-min">
            {widgets
              .filter(widget => widget.visible)
              .map(widget => (
                <div
                  key={widget.id}
                  className={cn(
                    'transition-all duration-200 col-span-1',
                    // Responsive grid columns based on widget width
                    widget.position.w === 3 && 'lg:col-span-3',
                    widget.position.w === 4 && 'lg:col-span-4',
                    widget.position.w === 6 && 'lg:col-span-6',
                    widget.position.w === 8 && 'lg:col-span-8',
                    widget.position.w === 9 && 'lg:col-span-9',
                    widget.position.w === 12 && 'lg:col-span-12',
                    selectedWidget === widget.id && 'ring-2 ring-blue-500 ring-opacity-50'
                  )}
                  style={{
                    minHeight: `${widget.position.h * 120}px`,
                  }}
                >
                  {renderWidget(widget)}
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* Add Widget Modal */}
      {showAddWidget && (
        <AddWidgetModal
          onClose={() => setShowAddWidget(false)}
          onAdd={(widget) => {
            // This would be implemented in the AddWidgetModal component
            setShowAddWidget(false);
          }}
        />
      )}
    </div>
  );
};

export default AnalyticsDashboard;