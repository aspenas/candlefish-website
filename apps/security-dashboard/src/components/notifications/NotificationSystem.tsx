import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useNotificationStore, Notification } from '../../store/notificationStore';
import clsx from 'clsx';

const NotificationItem: React.FC<{ 
  notification: Notification; 
  onClose: (id: string) => void;
}> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(notification.id), 300);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-success-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-warning-400" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-critical-400" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-info-400" />;
    }
  };

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'border-success-800 bg-success-950/90';
      case 'warning':
        return 'border-warning-800 bg-warning-950/90';
      case 'error':
        return 'border-critical-800 bg-critical-950/90';
      default:
        return 'border-info-800 bg-info-950/90';
    }
  };

  return (
    <div
      className={clsx(
        'flex items-start space-x-3 p-4 rounded-lg border backdrop-blur-sm shadow-lg transition-all duration-300 max-w-md',
        getStyles(),
        isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-white">
          {notification.title}
        </h4>
        <p className="text-sm text-soc-muted mt-1">
          {notification.message}
        </p>
        
        {/* Actions */}
        {notification.actions && notification.actions.length > 0 && (
          <div className="flex items-center space-x-2 mt-3">
            {notification.actions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={clsx(
                  'px-3 py-1 text-xs rounded transition-colors',
                  action.variant === 'primary'
                    ? 'bg-security-600 text-white hover:bg-security-700'
                    : 'text-soc-muted hover:text-white border border-soc-border hover:border-security-700'
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Close Button */}
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 text-soc-muted hover:text-white transition-colors"
        aria-label="Close notification"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

const NotificationSystem: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Create container for notifications if it doesn't exist
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
      notificationContainer = document.createElement('div');
      notificationContainer.id = 'notification-container';
      notificationContainer.className = 'fixed top-4 right-4 z-50 space-y-4 pointer-events-none';
      document.body.appendChild(notificationContainer);
    }
    setContainer(notificationContainer);

    return () => {
      // Cleanup when component unmounts
      if (notificationContainer && notificationContainer.children.length === 0) {
        document.body.removeChild(notificationContainer);
      }
    };
  }, []);

  if (!container || notifications.length === 0) {
    return null;
  }

  return createPortal(
    <div className="space-y-4">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationItem
            notification={notification}
            onClose={removeNotification}
          />
        </div>
      ))}
    </div>,
    container
  );
};

export default NotificationSystem;