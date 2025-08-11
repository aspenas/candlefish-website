import React from 'react'
import { cva } from 'class-variance-authority'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationStore } from '@/stores/notifications'
import type { NotificationItem } from '@/types'

const notificationVariants = cva(
  'relative flex items-start gap-3 rounded-lg border p-4 shadow-elevation-2 backdrop-blur-sm transition-all duration-300',
  {
    variants: {
      type: {
        success: 'border-green-500/50 bg-green-900/80 text-green-100',
        error: 'border-red-500/50 bg-red-900/80 text-red-100',
        warning: 'border-orange-500/50 bg-orange-900/80 text-orange-100',
        info: 'border-blue-500/50 bg-blue-900/80 text-blue-100',
      },
      position: {
        'top-right': 'animate-slide-in-right',
        'top-left': 'animate-slide-in-left',
        'bottom-right': 'animate-slide-in-up',
        'bottom-left': 'animate-slide-in-up',
      },
    },
    defaultVariants: {
      type: 'info',
      position: 'top-right',
    },
  }
)

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const iconColors = {
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-orange-400',
  info: 'text-blue-400',
}

interface NotificationProps {
  notification: NotificationItem
  onDismiss: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

const Notification: React.FC<NotificationProps> = ({
  notification,
  onDismiss,
  position = 'top-right',
}) => {
  const Icon = icons[notification.type]

  React.useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(notification.id)
      }, notification.duration)

      return () => clearTimeout(timer)
    }
  }, [notification.id, notification.duration, onDismiss])

  return (
    <div
      className={cn(notificationVariants({ type: notification.type, position }))}
      role="alert"
      aria-live="polite"
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', iconColors[notification.type])} />

      <div className="flex-1 min-w-0">
        <div className="font-medium">{notification.title}</div>
        {notification.message && (
          <div className="mt-1 text-sm opacity-90">{notification.message}</div>
        )}
        <div className="mt-2 text-xs opacity-70">
          {notification.timestamp.toLocaleTimeString()}
        </div>
      </div>

      <button
        onClick={() => onDismiss(notification.id)}
        className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export interface NotificationStackProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  maxItems?: number
  className?: string
}

export const NotificationStack: React.FC<NotificationStackProps> = ({
  position = 'top-right',
  maxItems = 5,
  className,
}) => {
  const { notifications, removeNotification } = useNotificationStore()

  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
  }

  const visibleNotifications = notifications.slice(-maxItems)

  if (visibleNotifications.length === 0) {
    return null
  }

  return (
    <div className={cn(positionClasses[position], className)}>
      <div className="flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)]">
        {visibleNotifications.map((notification) => (
          <Notification
            key={notification.id}
            notification={notification}
            onDismiss={removeNotification}
            position={position}
          />
        ))}
      </div>
    </div>
  )
}

// Hook for easy use of notifications in components
export const useNotificationToast = () => {
  const { addNotification } = useNotificationStore()

  return {
    toast: {
      success: (title: string, message?: string) =>
        addNotification({ type: 'success', title, message }),
      error: (title: string, message?: string) =>
        addNotification({ type: 'error', title, message, duration: 0 }),
      warning: (title: string, message?: string) =>
        addNotification({ type: 'warning', title, message }),
      info: (title: string, message?: string) =>
        addNotification({ type: 'info', title, message }),
    },
  }
}
