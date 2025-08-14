import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Notification, NotificationSettings } from '@/types/graphql';
import { NotificationService } from '@/services/notifications';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  settings: NotificationSettings | null;
  isLoading: boolean;
  error: string | null;
  pushToken: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  settings: null,
  isLoading: false,
  error: null,
  pushToken: null,
  permissionStatus: 'undetermined',
};

// Async thunks
export const initializeNotifications = createAsyncThunk(
  'notification/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const result = await NotificationService.initialize();
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to initialize notifications');
    }
  }
);

export const requestPermissions = createAsyncThunk(
  'notification/requestPermissions',
  async (_, { rejectWithValue }) => {
    try {
      const result = await NotificationService.requestPermissions();
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to request permissions');
    }
  }
);

export const registerForPushNotifications = createAsyncThunk(
  'notification/registerForPush',
  async (_, { rejectWithValue }) => {
    try {
      const token = await NotificationService.registerForPushNotifications();
      return token;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to register for push notifications');
    }
  }
);

export const fetchNotifications = createAsyncThunk(
  'notification/fetchNotifications',
  async ({ limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}, { rejectWithValue }) => {
    try {
      return await NotificationService.getNotifications(limit, offset);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch notifications');
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notification/markAsRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await NotificationService.markAsRead(notificationId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to mark as read');
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notification/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await NotificationService.markAllAsRead();
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to mark all as read');
    }
  }
);

export const updateNotificationSettings = createAsyncThunk(
  'notification/updateSettings',
  async (settings: Partial<NotificationSettings>, { rejectWithValue }) => {
    try {
      return await NotificationService.updateSettings(settings);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update settings');
    }
  }
);

export const scheduleLocalNotification = createAsyncThunk(
  'notification/scheduleLocal',
  async ({
    title,
    body,
    data,
    trigger
  }: {
    title: string;
    body: string;
    data?: any;
    trigger?: any;
  }, { rejectWithValue }) => {
    try {
      const notificationId = await NotificationService.scheduleLocalNotification({
        title,
        body,
        data,
        trigger,
      });
      return notificationId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to schedule notification');
    }
  }
);

export const cancelLocalNotification = createAsyncThunk(
  'notification/cancelLocal',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await NotificationService.cancelLocalNotification(notificationId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to cancel notification');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      // Add to the beginning of the array
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
      // Keep only the latest 100 notifications in memory
      if (state.notifications.length > 100) {
        state.notifications = state.notifications.slice(0, 100);
      }
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
    updateNotification: (state, action: PayloadAction<Partial<Notification> & { id: string }>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload.id);
      if (index !== -1) {
        const oldNotification = state.notifications[index];
        state.notifications[index] = { ...oldNotification, ...action.payload };

        // Update unread count if read status changed
        if (action.payload.read !== undefined && action.payload.read !== oldNotification.read) {
          if (action.payload.read) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          } else {
            state.unreadCount += 1;
          }
        }
      }
    },
    setBadgeCount: (state, action: PayloadAction<number>) => {
      NotificationService.setBadgeCount(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize notifications
      .addCase(initializeNotifications.fulfilled, (state, action) => {
        state.permissionStatus = action.payload.permissionStatus;
        state.pushToken = action.payload.pushToken;
        state.settings = action.payload.settings;
      })
      .addCase(initializeNotifications.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Request permissions
      .addCase(requestPermissions.fulfilled, (state, action) => {
        state.permissionStatus = action.payload.status;
      })
      .addCase(requestPermissions.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Register for push notifications
      .addCase(registerForPushNotifications.fulfilled, (state, action) => {
        state.pushToken = action.payload;
        state.permissionStatus = 'granted';
      })
      .addCase(registerForPushNotifications.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Mark as read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.read) {
          notification.read = true;
          notification.readAt = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Mark all as read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(notification => {
          if (!notification.read) {
            notification.read = true;
            notification.readAt = new Date().toISOString();
          }
        });
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Update notification settings
      .addCase(updateNotificationSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      })
      .addCase(updateNotificationSettings.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Schedule local notification
      .addCase(scheduleLocalNotification.fulfilled, (state, action) => {
        // Local notifications don't need to be stored in state
        // They're handled by the system
      })
      .addCase(scheduleLocalNotification.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  addNotification,
  removeNotification,
  clearAllNotifications,
  updateNotification,
  setBadgeCount,
} = notificationSlice.actions;

export default notificationSlice.reducer;
