import { create } from 'zustand'
import type { NotificationItem } from '@/types'
import { generateId } from '@/lib/utils'

interface NotificationState {
  notifications: NotificationItem[]

  // Actions
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => string
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = generateId('notification')
    const newNotification: NotificationItem = {
      ...notification,
      id,
      timestamp: new Date(),
    }

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }))

    // Auto-remove after duration (default 5 seconds)
    const duration = notification.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        get().removeNotification(id)
      }, duration)
    }

    return id
  },

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  })),

  clearNotifications: () => set({ notifications: [] }),
}))

// Helper function to show notifications
export const useNotify = () => {
  const addNotification = useNotificationStore((state) => state.addNotification)

  return {
    success: (title: string, message?: string) =>
      addNotification({ type: 'success', title, message }),

    error: (title: string, message?: string) =>
      addNotification({ type: 'error', title, message, duration: 0 }),

    warning: (title: string, message?: string) =>
      addNotification({ type: 'warning', title, message }),

    info: (title: string, message?: string) =>
      addNotification({ type: 'info', title, message }),
  }
}
