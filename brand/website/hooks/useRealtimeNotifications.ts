import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from '../components/netlify/WebSocketProvider';

export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  duration?: number; // in ms, null for persistent
  siteId?: string;
  extensionId?: string;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

interface UseRealtimeNotificationsOptions {
  maxNotifications?: number;
  defaultDuration?: number;
  enableAutoRemove?: boolean;
}

export const useRealtimeNotifications = (options: UseRealtimeNotificationsOptions = {}) => {
  const {
    maxNotifications = 5,
    defaultDuration = 5000,
    enableAutoRemove = true
  } = options;

  const { subscribe } = useWebSocket();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  // Add notification
  const addNotification = useCallback((notification: Omit<NotificationData, 'id' | 'timestamp'>) => {
    const newNotification: NotificationData = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      duration: notification.duration ?? defaultDuration
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Keep only the most recent notifications
      return updated.slice(0, maxNotifications);
    });

    // Auto-remove if enabled and duration is set
    if (enableAutoRemove && newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(newNotification.id);
      }, newNotification.duration);
    }

    return newNotification.id;
  }, [defaultDuration, maxNotifications, enableAutoRemove]);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Clear notifications for specific site
  const clearForSite = useCallback((siteId: string) => {
    setNotifications(prev => prev.filter(notification => notification.siteId !== siteId));
  }, []);

  // Listen to WebSocket messages and convert them to notifications
  useEffect(() => {
    const unsubscribe = subscribe((message) => {
      let notification: Omit<NotificationData, 'id' | 'timestamp'> | null = null;

      switch (message.type) {
        case 'site_update':
          if (message.data.status === 'deployed') {
            notification = {
              type: 'success',
              title: 'Site Deployed',
              message: `${message.data.siteName || 'Site'} has been successfully deployed`,
              siteId: message.siteId,
              actions: [
                {
                  label: 'View Site',
                  action: () => window.open(message.data.url, '_blank'),
                  variant: 'primary'
                }
              ]
            };
          } else if (message.data.status === 'failed') {
            notification = {
              type: 'error',
              title: 'Deployment Failed',
              message: `Failed to deploy ${message.data.siteName || 'site'}: ${message.data.error || 'Unknown error'}`,
              siteId: message.siteId,
              duration: null, // Persistent for errors
              actions: [
                {
                  label: 'View Logs',
                  action: () => console.log('View deployment logs', message.data),
                  variant: 'secondary'
                }
              ]
            };
          }
          break;

        case 'extension_update':
          if (message.data.action === 'installed') {
            notification = {
              type: 'success',
              title: 'Extension Installed',
              message: `${message.data.extensionName} has been installed successfully`,
              siteId: message.siteId,
              extensionId: message.extensionId
            };
          } else if (message.data.action === 'uninstalled') {
            notification = {
              type: 'info',
              title: 'Extension Removed',
              message: `${message.data.extensionName} has been removed`,
              siteId: message.siteId,
              extensionId: message.extensionId
            };
          } else if (message.data.action === 'error') {
            notification = {
              type: 'error',
              title: 'Extension Error',
              message: `Error with ${message.data.extensionName}: ${message.data.error}`,
              siteId: message.siteId,
              extensionId: message.extensionId,
              duration: null // Persistent for errors
            };
          }
          break;

        case 'deployment_progress':
          if (message.data.status === 'completed' && message.data.success) {
            notification = {
              type: 'success',
              title: 'Bulk Deployment Complete',
              message: `Successfully deployed to ${message.data.successCount} site(s)`,
              duration: 7000
            };
          } else if (message.data.status === 'completed' && !message.data.success) {
            notification = {
              type: 'error',
              title: 'Bulk Deployment Failed',
              message: `Deployment completed with ${message.data.errorCount} error(s)`,
              duration: null,
              actions: [
                {
                  label: 'View Details',
                  action: () => console.log('View deployment details', message.data),
                  variant: 'secondary'
                }
              ]
            };
          }
          break;

        case 'health_status':
          if (message.data.status === 'critical') {
            notification = {
              type: 'error',
              title: 'Critical Issue Detected',
              message: `${message.data.siteName}: ${message.data.primaryIssue}`,
              siteId: message.siteId,
              duration: null,
              actions: [
                {
                  label: 'View Details',
                  action: () => console.log('View health details', message.data),
                  variant: 'primary'
                }
              ]
            };
          } else if (message.data.status === 'warning' && message.data.newIssues?.length > 0) {
            notification = {
              type: 'warning',
              title: 'New Issues Detected',
              message: `${message.data.siteName}: ${message.data.newIssues.length} new issue(s) found`,
              siteId: message.siteId,
              duration: 8000
            };
          } else if (message.data.status === 'healthy' && message.data.resolvedIssues?.length > 0) {
            notification = {
              type: 'success',
              title: 'Issues Resolved',
              message: `${message.data.siteName}: ${message.data.resolvedIssues.length} issue(s) resolved`,
              siteId: message.siteId
            };
          }
          break;

        case 'metrics_update':
          // Only show notifications for significant performance changes
          if (message.data.performanceChange && Math.abs(message.data.performanceChange) > 20) {
            const isImprovement = message.data.performanceChange > 0;
            notification = {
              type: isImprovement ? 'success' : 'warning',
              title: isImprovement ? 'Performance Improved' : 'Performance Degraded',
              message: `${message.data.siteName}: ${Math.abs(message.data.performanceChange)}% ${isImprovement ? 'improvement' : 'degradation'} in performance score`,
              siteId: message.siteId,
              duration: 10000
            };
          }
          break;

        case 'error':
          notification = {
            type: 'error',
            title: 'System Error',
            message: message.data.message || 'An unexpected error occurred',
            duration: null,
            actions: message.data.recoverable ? [
              {
                label: 'Retry',
                action: () => {
                  // Implement retry logic based on error context
                  console.log('Retrying action', message.data);
                },
                variant: 'primary'
              }
            ] : undefined
          };
          break;
      }

      if (notification) {
        addNotification(notification);
      }
    });

    return unsubscribe;
  }, [subscribe, addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    clearForSite
  };
};
