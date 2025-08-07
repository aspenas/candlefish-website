/**
 * Services View Component
 * 
 * Detailed view of all services with filtering and management capabilities
 */

'use client';

import React from 'react';
import { useDashboard } from '@/lib/context/DashboardContext';
import { ServiceGrid } from '../components/ServiceGrid';

export function ServicesView() {
  const { state, selectService } = useDashboard();
  const { services, loading } = state;

  if (loading.services) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
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
            Services
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and monitor all your services
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-500">
          {services.length} total services
        </div>
      </div>

      <ServiceGrid 
        services={services}
        showAll={true}
        onServiceClick={selectService}
      />
    </div>
  );
}

export default ServicesView;