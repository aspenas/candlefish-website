'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';
import { NotificationData, useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';

interface NotificationToastProps {
  notification: NotificationData;
  onRemove: (id: string) => void;
  className?: string;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onRemove,
  className
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(notification.id), 300);
  };

  const typeStyles = {
    success: 'bg-operation-complete/10 border-operation-complete/30 text-operation-complete',
    error: 'bg-operation-alert/10 border-operation-alert/30 text-operation-alert',
    warning: 'bg-operation-processing/10 border-operation-processing/30 text-operation-processing',
    info: 'bg-interface-focus/10 border-interface-focus/30 text-interface-focus'
  };

  const typeIcons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 max-w-md',
        typeStyles[notification.type],
        isVisible ? 'transform translate-x-0 opacity-100' : 'transform translate-x-full opacity-0',
        isRemoving ? 'transform translate-x-full opacity-0' : '',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Close button */}
      <button
        onClick={handleRemove}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded hover:bg-black/10 transition-colors"
        aria-label="Close notification"
      >
        <span className="text-sm opacity-60 hover:opacity-100">×</span>
      </button>

      {/* Content */}
      <div className="pr-8">
        <div className="flex items-start gap-3 mb-2">
          <span className="text-lg flex-shrink-0 mt-0.5" aria-hidden="true">
            {typeIcons[notification.type]}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-light-primary mb-1 text-sm">
              {notification.title}
            </h4>
            <p className="text-sm text-light-secondary leading-relaxed">
              {notification.message}
            </p>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 mb-3 text-xs text-light-tertiary">
          <time dateTime={new Date(notification.timestamp).toISOString()}>
            {new Date(notification.timestamp).toLocaleTimeString()}
          </time>
          {notification.siteId && (
            <Badge className="bg-depth-ocean/30 text-light-tertiary border-light-tertiary/30">
              Site: {notification.siteId}
            </Badge>
          )}
          {notification.extensionId && (
            <Badge className="bg-depth-ocean/30 text-light-tertiary border-light-tertiary/30">
              Extension: {notification.extensionId}
            </Badge>
          )}
        </div>

        {/* Actions */}
        {notification.actions && notification.actions.length > 0 && (
          <div className="flex gap-2 mt-3">
            {notification.actions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant={action.variant === 'primary' ? 'primary' : 'outline'}
                onClick={() => {
                  action.action();
                  if (action.variant === 'primary') {
                    handleRemove();
                  }
                }}
                className={cn(
                  'text-xs',
                  action.variant === 'primary'
                    ? 'bg-operation-active text-depth-void hover:bg-interface-hover'
                    : 'border-current text-current hover:bg-current/10'
                )}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Progress bar for timed notifications */}
        {notification.duration && notification.duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 rounded-b-lg overflow-hidden">
            <div
              className="h-full bg-current opacity-30 transition-all linear"
              style={{
                animation: `shrink ${notification.duration}ms linear`,
                animationFillMode: 'forwards'
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

// Main notification container component
interface NotificationContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  className?: string;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({
  position = 'top-right',
  className
}) => {
  const { notifications, removeNotification } = useRealtimeNotifications();

  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  if (notifications.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-3 pointer-events-none',
        positionStyles[position],
        className
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationToast
            notification={notification}
            onRemove={removeNotification}
          />
        </div>
      ))}
    </div>
  );
};

// Notification summary component for showing counts
interface NotificationSummaryProps {
  className?: string;
  onClick?: () => void;
}

const NotificationSummary: React.FC<NotificationSummaryProps> = ({ className, onClick }) => {
  const { notifications } = useRealtimeNotifications();

  const counts = notifications.reduce((acc, notification) => {
    acc[notification.type] = (acc[notification.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalCount = notifications.length;
  const hasErrors = counts.error > 0;
  const hasWarnings = counts.warning > 0;

  if (totalCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-2 rounded-lg border transition-all hover:scale-105',
        hasErrors
          ? 'bg-operation-alert/10 border-operation-alert/30 text-operation-alert'
          : hasWarnings
          ? 'bg-operation-processing/10 border-operation-processing/30 text-operation-processing'
          : 'bg-interface-focus/10 border-interface-focus/30 text-interface-focus',
        className
      )}
      aria-label={`${totalCount} notification${totalCount !== 1 ? 's' : ''}`}
    >
      <span className="text-xl">🔔</span>

      {totalCount > 0 && (
        <Badge
          className={cn(
            'absolute -top-1 -right-1 text-xs min-w-5 h-5 rounded-full flex items-center justify-center',
            hasErrors
              ? 'bg-operation-alert text-depth-void'
              : hasWarnings
              ? 'bg-operation-processing text-depth-void'
              : 'bg-interface-focus text-depth-void'
          )}
        >
          {totalCount > 99 ? '99+' : totalCount}
        </Badge>
      )}
    </button>
  );
};

// Hook for managing notification panel state
export const useNotificationPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, removeNotification, clearAll } = useRealtimeNotifications();

  const togglePanel = () => setIsOpen(!isOpen);
  const closePanel = () => setIsOpen(false);

  return {
    isOpen,
    notifications,
    togglePanel,
    closePanel,
    removeNotification,
    clearAll
  };
};

export { NotificationToast, NotificationContainer, NotificationSummary };
