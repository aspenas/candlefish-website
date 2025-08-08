/**
 * Alerts View Component
 *
 * Detailed view of all alerts with filtering and management capabilities
 */

'use client';

import React from 'react';
import { useDashboard } from '@/lib/context/DashboardContext';
import { AlertList } from '../components/AlertList';

export function AlertsView() {
  const { state, selectAlert } = useDashboard();
  const { alerts, loading } = state;

  if (loading.alerts) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Alerts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor and manage system alerts
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-500">
          {alerts.length} active alerts
        </div>
      </div>

      <AlertList
        alerts={alerts}
        showAll={true}
        onAlertClick={selectAlert}
      />
    </div>
  );
}

export default AlertsView;
