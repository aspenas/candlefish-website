import { create } from 'zustand';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
  persistent?: boolean;
  timestamp: number;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

interface NotificationState {
  notifications: Notification[];
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  markAsRead: (id: string) => void;
}

let notificationId = 0;

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `notification-${++notificationId}`;
    const timestamp = Date.now();
    
    const newNotification: Notification = {
      id,
      timestamp,
      duration: 5000, // Default 5 seconds
      ...notification,
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification]
    }));

    // Auto-remove notification after duration (unless persistent)
    if (!newNotification.persistent && newNotification.duration) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  },

  clearAllNotifications: () => {
    set({ notifications: [] });
  },

  markAsRead: (id: string) => {
    // Implementation for marking notifications as read
    // This could update the notification state or send to backend
    console.log(`Marking notification ${id} as read`);
  },
}));

// Helper functions for common notification patterns
export const notificationHelpers = {
  success: (title: string, message: string) => 
    useNotificationStore.getState().addNotification({
      type: 'success',
      title,
      message,
    }),

  error: (title: string, message: string, persistent = false) => 
    useNotificationStore.getState().addNotification({
      type: 'error',
      title,
      message,
      persistent,
      duration: persistent ? undefined : 8000,
    }),

  warning: (title: string, message: string) => 
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title,
      message,
      duration: 6000,
    }),

  info: (title: string, message: string) => 
    useNotificationStore.getState().addNotification({
      type: 'info',
      title,
      message,
    }),

  // Security-specific notification helpers
  securityAlert: (title: string, message: string, actions?: NotificationAction[]) =>
    useNotificationStore.getState().addNotification({
      type: 'error',
      title,
      message,
      actions,
      persistent: true,
    }),

  threatDetected: (threatName: string, severity: string) =>
    useNotificationStore.getState().addNotification({
      type: 'error',
      title: 'Threat Detected',
      message: `${threatName} (${severity})`,
      persistent: true,
      actions: [
        {
          label: 'View Details',
          action: () => {
            // Navigate to threat details
            window.location.href = '/threats';
          },
          variant: 'primary',
        },
        {
          label: 'Acknowledge',
          action: () => {
            // Mark as acknowledged
            console.log('Threat acknowledged');
          },
        },
      ],
    }),

  incidentCreated: (incidentId: string, title: string) =>
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title: 'New Incident Created',
      message: `${title} (ID: ${incidentId})`,
      actions: [
        {
          label: 'View Incident',
          action: () => {
            window.location.href = `/incidents/${incidentId}`;
          },
          variant: 'primary',
        },
      ],
    }),
};