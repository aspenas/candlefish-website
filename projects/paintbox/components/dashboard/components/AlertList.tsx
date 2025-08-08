/**
 * Alert List Component
 *
 * Displays alerts in a list format with severity indicators and actions
 */

'use client';

import React from 'react';
import { useMutation } from '@apollo/client';
import { Alert, AlertSeverity, AlertStatus } from '@/lib/types/dashboard';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import {
  ACKNOWLEDGE_ALERT,
  RESOLVE_ALERT,
  SUPPRESS_ALERT
} from '@/lib/graphql/queries';
import { useDashboard } from '@/lib/context/DashboardContext';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AlertListProps {
  alerts: Alert[];
  showAll?: boolean;
  onViewAll?: () => void;
  onAlertClick?: (alert: Alert) => void;
}

export function AlertList({
  alerts,
  showAll = false,
  onViewAll,
  onAlertClick
}: AlertListProps) {
  const { updateAlert, addNotification } = useDashboard();

  // Mutations
  const [acknowledgeAlert] = useMutation(ACKNOWLEDGE_ALERT);
  const [resolveAlert] = useMutation(RESOLVE_ALERT);
  const [suppressAlert] = useMutation(SUPPRESS_ALERT);

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return XCircleIcon;
      case AlertSeverity.HIGH:
      case AlertSeverity.MEDIUM:
        return ExclamationTriangleIcon;
      case AlertSeverity.LOW:
        return ClockIcon;
      default:
        return ExclamationTriangleIcon;
    }
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'text-red-600 dark:text-red-400';
      case AlertSeverity.HIGH:
        return 'text-orange-600 dark:text-orange-400';
      case AlertSeverity.MEDIUM:
        return 'text-yellow-600 dark:text-yellow-400';
      case AlertSeverity.LOW:
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getSeverityBadgeColor = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case AlertSeverity.HIGH:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200';
      case AlertSeverity.MEDIUM:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case AlertSeverity.LOW:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusBadgeColor = (status: AlertStatus) => {
    switch (status) {
      case AlertStatus.ACTIVE:
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200';
      case AlertStatus.ACKNOWLEDGED:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case AlertStatus.RESOLVED:
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      case AlertStatus.SUPPRESSED:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const handleAcknowledgeAlert = async (alert: Alert, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      const { data } = await acknowledgeAlert({
        variables: {
          alertId: alert.id,
          userId: 'current-user', // TODO: Get from auth context
        },
      });

      if (data?.acknowledgeAlert) {
        updateAlert(data.acknowledgeAlert);
        addNotification({
          type: 'success',
          title: 'Alert Acknowledged',
          message: `${alert.name} has been acknowledged`,
          dismissible: true,
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to acknowledge alert',
        message: error instanceof Error ? error.message : 'Unknown error',
        dismissible: true,
      });
    }
  };

  const handleResolveAlert = async (alert: Alert, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      const { data } = await resolveAlert({
        variables: {
          alertId: alert.id,
          userId: 'current-user', // TODO: Get from auth context
        },
      });

      if (data?.resolveAlert) {
        updateAlert(data.resolveAlert);
        addNotification({
          type: 'success',
          title: 'Alert Resolved',
          message: `${alert.name} has been resolved`,
          dismissible: true,
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to resolve alert',
        message: error instanceof Error ? error.message : 'Unknown error',
        dismissible: true,
      });
    }
  };

  const handleSuppressAlert = async (alert: Alert, event: React.MouseEvent) => {
    event.stopPropagation();

    try {
      const { data } = await suppressAlert({
        variables: {
          alertId: alert.id,
          duration: '1h', // TODO: Allow user to select duration
        },
      });

      if (data?.suppressAlert) {
        updateAlert(data.suppressAlert);
        addNotification({
          type: 'info',
          title: 'Alert Suppressed',
          message: `${alert.name} has been suppressed for 1 hour`,
          dismissible: true,
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to suppress alert',
        message: error instanceof Error ? error.message : 'Unknown error',
        dismissible: true,
      });
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 text-center">
        <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No Active Alerts
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          All systems are running smoothly.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
        {alerts.map((alert) => {
          const SeverityIcon = getSeverityIcon(alert.severity);

          return (
            <div
              key={alert.id}
              onClick={() => onAlertClick?.(alert)}
              className={cn(
                'p-4 transition-colors duration-200',
                onAlertClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Severity Icon */}
                  <div className="flex-shrink-0">
                    <SeverityIcon className={cn(
                      'w-5 h-5 mt-0.5',
                      getSeverityColor(alert.severity),
                      alert.severity === AlertSeverity.CRITICAL && 'animate-pulse'
                    )} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {alert.name}
                      </h3>
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full flex-shrink-0',
                        getSeverityBadgeColor(alert.severity)
                      )}>
                        {alert.severity.toLowerCase()}
                      </span>
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full flex-shrink-0',
                        getStatusBadgeColor(alert.status)
                      )}>
                        {alert.status.toLowerCase()}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {alert.description}
                    </p>

                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                      <span>
                        Service: {alert.service.displayName || alert.service.name}
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}
                      </span>
                      {alert.acknowledgedBy && (
                        <span>
                          Acked by {alert.acknowledgedBy}
                        </span>
                      )}
                    </div>

                    {/* Trigger Values */}
                    {alert.triggerValue !== undefined && alert.thresholdValue !== undefined && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                        Value: {alert.triggerValue} / Threshold: {alert.thresholdValue}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                  {alert.status === AlertStatus.ACTIVE && (
                    <>
                      <button
                        onClick={(e) => handleAcknowledgeAlert(alert, e)}
                        className="p-1 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 rounded"
                        title="Acknowledge"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleSuppressAlert(alert, e)}
                        className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="Suppress"
                      >
                        <EyeSlashIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {(alert.status === AlertStatus.ACTIVE || alert.status === AlertStatus.ACKNOWLEDGED) && (
                    <button
                      onClick={(e) => handleResolveAlert(alert, e)}
                      className="p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
                      title="Resolve"
                    >
                      <XCircleIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
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
            View All Alerts
          </button>
        </div>
      )}
    </div>
  );
}

export default AlertList;
