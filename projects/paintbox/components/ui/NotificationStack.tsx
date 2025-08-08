/**
 * Notification Stack Component
 *
 * Displays a stack of notifications in the corner of the screen
 */

'use client';

import React, { useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useDashboard } from '@/lib/context/DashboardContext';
import { NotificationMessage } from '@/lib/types/dashboard';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

export function NotificationStack() {
  const { state, removeNotification } = useDashboard();
  const { notifications } = state;

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    notifications.forEach((notification) => {
      if (notification.dismissible) {
        const timer = setTimeout(() => {
          removeNotification(notification.id);
        }, 5000);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications, removeNotification]);

  const getIcon = (type: NotificationMessage['type']) => {
    switch (type) {
      case 'success':
        return CheckCircleIcon;
      case 'error':
        return ExclamationCircleIcon;
      case 'warning':
        return ExclamationTriangleIcon;
      case 'info':
        return InformationCircleIcon;
      default:
        return InformationCircleIcon;
    }
  };

  const getColorClasses = (type: NotificationMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-200';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/50 dark:border-red-700 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-700 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-200';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200';
    }
  };

  const getIconColorClasses = (type: NotificationMessage['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => {
          const Icon = getIcon(notification.type);

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={cn(
                'relative flex items-start p-4 border rounded-lg shadow-lg backdrop-blur-sm',
                getColorClasses(notification.type)
              )}
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                <Icon className={cn('w-6 h-6', getIconColorClasses(notification.type))} />
              </div>

              {/* Content */}
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-semibold">
                  {notification.title}
                </h4>
                <p className="text-sm mt-1 opacity-90">
                  {notification.message}
                </p>
              </div>

              {/* Dismiss Button */}
              {notification.dismissible && (
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="ml-2 flex-shrink-0 p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}

              {/* Progress Bar for Auto-dismiss */}
              {notification.dismissible && (
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  className="absolute bottom-0 left-0 h-1 bg-current opacity-30 rounded-b-lg"
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default NotificationStack;
