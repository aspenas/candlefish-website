import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  data?: any;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  settings: {
    enabled: boolean;
    assessmentUpdates: boolean;
    syncNotifications: boolean;
    marketingMessages: boolean;
  };
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  settings: {
    enabled: true,
    assessmentUpdates: true,
    syncNotifications: true,
    marketingMessages: false,
  },
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
      };
      
      state.notifications.unshift(notification);
      state.unreadCount++;
      
      // Keep only the last 50 notifications
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }
    },
    
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    
    markAllAsRead: (state) => {
      state.notifications.forEach(n => n.read = true);
      state.unreadCount = 0;
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index !== -1) {
        const notification = state.notifications[index];
        if (!notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications.splice(index, 1);
      }
    },
    
    clearAllNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    
    updateSettings: (state, action: PayloadAction<Partial<NotificationsState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
  },
});

export const {
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  clearAllNotifications,
  updateSettings,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;