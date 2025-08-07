/**
 * Service Grid Component
 * 
 * Displays services in a grid layout with status indicators
 */

'use client';

import React from 'react';
import { Service, ServiceStatus } from '@/lib/types/dashboard';
import { 
  ServerIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ServiceGridProps {
  services: Service[];
  showAll?: boolean;
  onViewAll?: () => void;
  onServiceClick?: (service: Service) => void;
}

export function ServiceGrid({ 
  services, 
  showAll = false, 
  onViewAll, 
  onServiceClick 
}: ServiceGridProps) {
  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.HEALTHY:
        return CheckCircleIcon;
      case ServiceStatus.DEGRADED:
        return ExclamationTriangleIcon;
      case ServiceStatus.UNHEALTHY:
        return XCircleIcon;
      case ServiceStatus.MAINTENANCE:
        return ClockIcon;
      default:
        return QuestionMarkCircleIcon;
    }
  };

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.HEALTHY:
        return 'text-green-600 dark:text-green-400';
      case ServiceStatus.DEGRADED:
        return 'text-yellow-600 dark:text-yellow-400';
      case ServiceStatus.UNHEALTHY:
        return 'text-red-600 dark:text-red-400 animate-pulse';
      case ServiceStatus.MAINTENANCE:
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusBadgeColor = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.HEALTHY:
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      case ServiceStatus.DEGRADED:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case ServiceStatus.UNHEALTHY:
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case ServiceStatus.MAINTENANCE:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getCardBorderColor = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.HEALTHY:
        return 'border-green-200 dark:border-green-800';
      case ServiceStatus.DEGRADED:
        return 'border-yellow-200 dark:border-yellow-800';
      case ServiceStatus.UNHEALTHY:
        return 'border-red-200 dark:border-red-800';
      case ServiceStatus.MAINTENANCE:
        return 'border-blue-200 dark:border-blue-800';
      default:
        return 'border-gray-200 dark:border-gray-700';
    }
  };

  if (services.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 text-center">
        <ServerIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No Services Found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          No services are currently registered or match your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {services.map((service) => {
          const StatusIcon = getStatusIcon(service.status);
          
          return (
            <div
              key={service.id}
              onClick={() => onServiceClick?.(service)}
              className={cn(
                'bg-white dark:bg-gray-800 rounded-lg p-4 border-2 transition-all duration-200',
                getCardBorderColor(service.status),
                onServiceClick && 'cursor-pointer hover:shadow-md hover:scale-105'
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <ServerIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    getStatusBadgeColor(service.status)
                  )}>
                    {service.status.toLowerCase()}
                  </span>
                </div>
                <StatusIcon className={cn('w-5 h-5', getStatusColor(service.status))} />
              </div>

              {/* Service Info */}
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 truncate">
                  {service.displayName || service.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {service.environment}
                </p>
                {service.version && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    v{service.version}
                  </p>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-500">
                <div>
                  <div className="font-medium">Containers</div>
                  <div>{service.containers?.length || 0}</div>
                </div>
                <div>
                  <div className="font-medium">Processes</div>
                  <div>{service.processes?.length || 0}</div>
                </div>
              </div>

              {/* Last Health Check */}
              {service.lastHealthCheck && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Last check: {formatDistanceToNow(new Date(service.lastHealthCheck), { addSuffix: true })}
                  </p>
                </div>
              )}

              {/* Tags */}
              {service.tags && service.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {service.tags.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {service.tags.length > 2 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      +{service.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* View All Button */}
      {!showAll && onViewAll && (
        <div className="text-center">
          <button
            onClick={onViewAll}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View All Services
          </button>
        </div>
      )}
    </div>
  );
}

export default ServiceGrid;