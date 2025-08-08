/**
 * Dashboard Sidebar Component
 *
 * Features:
 * - Navigation menu
 * - Real-time status indicators
 * - Collapsible design
 * - Filter controls
 */

'use client';

import React from 'react';
import {
  HomeIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  LightBulbIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useDashboard } from '@/lib/context/DashboardContext';
import { ServiceStatus, AlertSeverity } from '@/lib/types/dashboard';
import { cn } from '@/lib/utils';

interface DashboardSidebarProps {
  collapsed: boolean;
  onRefresh: () => void;
}

export function DashboardSidebar({ collapsed, onRefresh }: DashboardSidebarProps) {
  const {
    state,
    setView,
    toggleSidebar,
    toggleRealTime,
    toggleDarkMode,
  } = useDashboard();

  const {
    view,
    services,
    alerts,
    systemAnalysis,
    isRealTimeEnabled,
    darkMode,
    loading,
  } = state;

  // Calculate status counts
  const serviceCounts = {
    total: services.length,
    healthy: services.filter(s => s.status === ServiceStatus.HEALTHY).length,
    degraded: services.filter(s => s.status === ServiceStatus.DEGRADED).length,
    unhealthy: services.filter(s => s.status === ServiceStatus.UNHEALTHY).length,
  };

  const alertCounts = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
    high: alerts.filter(a => a.severity === AlertSeverity.HIGH).length,
  };

  // Navigation items
  const navigationItems = [
    {
      id: 'overview',
      name: 'Overview',
      icon: HomeIcon,
      badge: systemAnalysis?.healthScore ? Math.round(systemAnalysis.healthScore) : null,
      badgeColor: systemAnalysis?.healthScore
        ? systemAnalysis.healthScore >= 90 ? 'green'
        : systemAnalysis.healthScore >= 70 ? 'yellow'
        : 'red'
        : 'gray',
    },
    {
      id: 'services',
      name: 'Services',
      icon: ServerIcon,
      badge: serviceCounts.total,
      badgeColor: serviceCounts.unhealthy > 0 ? 'red'
        : serviceCounts.degraded > 0 ? 'yellow'
        : 'green',
    },
    {
      id: 'alerts',
      name: 'Alerts',
      icon: ExclamationTriangleIcon,
      badge: alertCounts.total,
      badgeColor: alertCounts.critical > 0 ? 'red'
        : alertCounts.high > 0 ? 'yellow'
        : alertCounts.total > 0 ? 'blue'
        : 'gray',
    },
    {
      id: 'metrics',
      name: 'Metrics',
      icon: ChartBarIcon,
      badge: null,
      badgeColor: 'blue',
    },
    {
      id: 'insights',
      name: 'Insights',
      icon: LightBulbIcon,
      badge: systemAnalysis?.recommendations.length || null,
      badgeColor: 'purple',
    },
  ];

  const getBadgeColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'red':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'blue':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'purple':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <ServerIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                System Analyzer
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Dashboard
              </p>
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
              title={collapsed ? item.name : undefined}
            >
              <div className="flex items-center space-x-3">
                <Icon className={cn(
                  'w-5 h-5 flex-shrink-0',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                )} />
                {!collapsed && (
                  <span className="font-medium">{item.name}</span>
                )}
              </div>

              {!collapsed && item.badge !== null && (
                <span className={cn(
                  'px-2 py-1 text-xs font-medium rounded-full',
                  getBadgeColorClasses(item.badgeColor)
                )}>
                  {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Controls */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        {/* Real-time toggle */}
        <button
          onClick={toggleRealTime}
          className={cn(
            'w-full flex items-center p-3 rounded-lg transition-colors',
            isRealTimeEnabled
              ? 'bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-200'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          )}
          title={collapsed ? (isRealTimeEnabled ? 'Real-time enabled' : 'Real-time disabled') : undefined}
        >
          <div className="flex items-center space-x-3">
            <div className={cn(
              'w-2 h-2 rounded-full',
              isRealTimeEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            )} />
            {!collapsed && (
              <span className="text-sm font-medium">
                Real-time {isRealTimeEnabled ? 'ON' : 'OFF'}
              </span>
            )}
          </div>
        </button>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={loading.services || loading.alerts || loading.analysis}
          className="w-full flex items-center justify-center p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title={collapsed ? 'Refresh data' : undefined}
        >
          <ArrowPathIcon className={cn(
            'w-5 h-5',
            (loading.services || loading.alerts || loading.analysis) && 'animate-spin'
          )} />
          {!collapsed && (
            <span className="ml-3 text-sm font-medium">
              Refresh
            </span>
          )}
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center justify-center p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title={collapsed ? (darkMode ? 'Switch to light mode' : 'Switch to dark mode') : undefined}
        >
          {darkMode ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
          {!collapsed && (
            <span className="ml-3 text-sm font-medium">
              {darkMode ? 'Light' : 'Dark'} Mode
            </span>
          )}
        </button>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            System Analyzer v1.0.0
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardSidebar;
