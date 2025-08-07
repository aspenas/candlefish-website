/**
 * Dashboard Header Component
 * 
 * Features:
 * - Global search
 * - Filter controls
 * - User actions
 * - System status indicators
 */

'use client';

import React, { useState } from 'react';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  BellIcon,
  UserCircleIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useDashboard } from '@/lib/context/DashboardContext';
import { ServiceStatus, AlertSeverity } from '@/lib/types/dashboard';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface DashboardHeaderProps {
  onRefresh: () => void;
}

export function DashboardHeader({ onRefresh }: DashboardHeaderProps) {
  const {
    state,
    setFilters,
    resetFilters,
  } = useDashboard();

  const {
    filters,
    services,
    alerts,
    systemAnalysis,
    lastUpdated,
    notifications,
    loading,
  } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Get current view title
  const getViewTitle = () => {
    switch (state.view) {
      case 'overview':
        return 'System Overview';
      case 'services':
        return 'Services';
      case 'alerts':
        return 'Alerts';
      case 'metrics':
        return 'Metrics';
      case 'insights':
        return 'Insights';
      default:
        return 'Dashboard';
    }
  };

  // Get system health color
  const getHealthColor = () => {
    if (!systemAnalysis) return 'gray';
    if (systemAnalysis.healthScore >= 90) return 'green';
    if (systemAnalysis.healthScore >= 70) return 'yellow';
    return 'red';
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // TODO: Implement search functionality
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    setFilters({ [key]: value });
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800">
      {/* Left Section */}
      <div className="flex items-center space-x-6">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {getViewTitle()}
          </h1>
          {lastUpdated && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Last updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </p>
          )}
        </div>

        {/* System Health Indicator */}
        {systemAnalysis && (
          <div className="flex items-center space-x-2">
            <div className={cn(
              'w-3 h-3 rounded-full',
              getHealthColor() === 'green' && 'bg-green-500',
              getHealthColor() === 'yellow' && 'bg-yellow-500',
              getHealthColor() === 'red' && 'bg-red-500 animate-pulse',
              getHealthColor() === 'gray' && 'bg-gray-400'
            )} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Health Score: {Math.round(systemAnalysis.healthScore)}%
            </span>
          </div>
        )}
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-lg mx-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search services, alerts, metrics..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Quick Stats */}
        <div className="hidden md:flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">
              {services.filter(s => s.status === ServiceStatus.HEALTHY).length} Healthy
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span className="text-gray-600 dark:text-gray-400">
              {alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length} Critical
            </span>
          </div>
        </div>

        {/* Filters Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'p-2 rounded-lg transition-colors relative',
            showFilters
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
          title="Filters"
        >
          <AdjustmentsHorizontalIcon className="w-5 h-5" />
          {Object.keys(filters).length > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
          )}
        </button>

        {/* Notifications */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
          title="Notifications"
        >
          <BellIcon className="w-5 h-5" />
          {notifications.length > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {notifications.length > 9 ? '9+' : notifications.length}
            </div>
          )}
        </button>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={loading.services || loading.alerts || loading.analysis}
          className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <ArrowPathIcon className={cn(
            'w-5 h-5',
            (loading.services || loading.alerts || loading.analysis) && 'animate-spin'
          )} />
        </button>

        {/* Settings */}
        <button
          className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Settings"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>

        {/* User Menu */}
        <button
          className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="User menu"
        >
          <UserCircleIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Dropdown */}
      {showFilters && (
        <div className="absolute top-full right-6 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Filters
              </h3>
              {Object.keys(filters).length > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Environment Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Environment
              </label>
              <select
                value={filters.environment || ''}
                onChange={(e) => handleFilterChange('environment', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All environments</option>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Service Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All statuses</option>
                <option value={ServiceStatus.HEALTHY}>Healthy</option>
                <option value={ServiceStatus.DEGRADED}>Degraded</option>
                <option value={ServiceStatus.UNHEALTHY}>Unhealthy</option>
                <option value={ServiceStatus.MAINTENANCE}>Maintenance</option>
              </select>
            </div>

            {/* Alert Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Alert Severity
              </label>
              <select
                value={filters.alertSeverity || ''}
                onChange={(e) => handleFilterChange('alertSeverity', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">All severities</option>
                <option value={AlertSeverity.CRITICAL}>Critical</option>
                <option value={AlertSeverity.HIGH}>High</option>
                <option value={AlertSeverity.MEDIUM}>Medium</option>
                <option value={AlertSeverity.LOW}>Low</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardHeader;