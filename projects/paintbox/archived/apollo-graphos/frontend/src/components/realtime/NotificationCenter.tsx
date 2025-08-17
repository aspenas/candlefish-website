import React, { useState, useCallback } from 'react';
import { Bell, X, Check, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useUIState, useNotificationActions } from '@/store';
import { formatRelativeTime } from '@/utils/formatting';
import type { Notification } from '@/store';

interface NotificationCenterProps {
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications } = useUIState();
  const { markNotificationRead, removeNotification, clearNotifications } = useNotificationActions();

  const unreadCount = notifications.filter(n => !n.read).length;
  const recentNotifications = notifications.slice(0, 10);

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (!notification.read) {
      markNotificationRead(notification.id);
    }
    // Handle notification actions if any
    if (notification.actions && notification.actions.length > 0) {
      // For now, just execute the first action
      notification.actions[0].action();
    }
  }, [markNotificationRead]);

  const handleRemoveNotification = useCallback((notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeNotification(notificationId);
  }, [removeNotification]);

  const handleClearAll = useCallback(() => {
    clearNotifications();
  }, [clearNotifications]);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success-600" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-error-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-primary-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationBorderColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-l-success-500';
      case 'error':
        return 'border-l-error-500';
      case 'warning':
        return 'border-l-warning-500';
      case 'info':
        return 'border-l-primary-500';
      default:
        return 'border-l-gray-500';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge
            variant="error"
            size="sm"
            dot
            className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="primary" size="sm">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                >
                  Clear All
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationClick}
                    onRemove={handleRemoveNotification}
                    getIcon={getNotificationIcon}
                    getBorderColor={getNotificationBorderColor}
                  />
                ))}
              </div>
            )}
          </div>

          {notifications.length > 10 && (
            <div className="p-4 border-t border-gray-200 text-center">
              <Button variant="outline" size="sm">
                View All {notifications.length} Notifications
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

// Notification Item Component
interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
  onRemove: (id: string, event: React.MouseEvent) => void;
  getIcon: (type: Notification['type']) => React.ReactNode;
  getBorderColor: (type: Notification['type']) => string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClick,
  onRemove,
  getIcon,
  getBorderColor,
}) => {
  return (
    <div
      className={`p-4 hover:bg-gray-50 cursor-pointer border-l-4 ${getBorderColor(notification.type)} ${
        !notification.read ? 'bg-blue-50' : ''
      } transition-colors`}
      onClick={() => onClick(notification)}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                {notification.title}
              </p>
              <p className={`text-sm mt-1 ${!notification.read ? 'text-gray-700' : 'text-gray-500'}`}>
                {notification.message}
              </p>
            </div>

            <div className="flex items-center space-x-2 ml-2">
              {!notification.read && (
                <div className="w-2 h-2 bg-primary-600 rounded-full" />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => onRemove(notification.id, e)}
                className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              {formatRelativeTime(new Date(notification.timestamp).toISOString())}
            </p>

            {notification.actions && notification.actions.length > 0 && (
              <div className="flex items-center space-x-2">
                {notification.actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant === 'primary' ? 'primary' : 'outline'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      action.action();
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
