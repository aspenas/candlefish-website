import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Notification, NotificationSettings } from '@/types/graphql';
import { apolloClient } from './apollo';
import {
  REGISTER_PUSH_TOKEN_MUTATION,
  UPDATE_NOTIFICATION_SETTINGS_MUTATION,
  GET_NOTIFICATIONS_QUERY,
  MARK_NOTIFICATION_READ_MUTATION,
  MARK_ALL_NOTIFICATIONS_READ_MUTATION,
} from '@/graphql/notifications';

// Configure how notifications should be handled when the app is running
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface LocalNotificationConfig {
  title: string;
  body: string;
  data?: any;
  trigger?: Notifications.NotificationTriggerInput;
}

interface NotificationPermissionResult {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
}

export class NotificationService {
  private static pushToken: string | null = null;
  private static isInitialized = false;

  static async initialize(): Promise<{
    permissionStatus: 'granted' | 'denied' | 'undetermined';
    pushToken: string | null;
    settings: NotificationSettings | null;
  }> {
    if (this.isInitialized) {
      return {
        permissionStatus: 'granted',
        pushToken: this.pushToken,
        settings: null,
      };
    }

    try {
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return {
          permissionStatus: 'denied',
          pushToken: null,
          settings: null,
        };
      }

      // Get existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return {
          permissionStatus: finalStatus as any,
          pushToken: null,
          settings: null,
        };
      }

      // Get the push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.pushToken = token;

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await this.createNotificationChannels();
      }

      // Register token with backend
      await this.registerPushToken(token);

      // Set up notification listeners
      this.setupNotificationListeners();

      this.isInitialized = true;

      console.log('Notification service initialized with token:', token);

      return {
        permissionStatus: finalStatus as any,
        pushToken: token,
        settings: null, // Would be fetched from backend
      };
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return {
        permissionStatus: 'denied',
        pushToken: null,
        settings: null,
      };
    }
  }

  static async requestPermissions(): Promise<NotificationPermissionResult> {
    try {
      const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
      return {
        status: status as 'granted' | 'denied' | 'undetermined',
        canAskAgain,
      };
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return {
        status: 'denied',
        canAskAgain: false,
      };
    }
  }

  static async registerForPushNotifications(): Promise<string> {
    const initResult = await this.initialize();

    if (initResult.permissionStatus !== 'granted') {
      throw new Error('Notification permissions not granted');
    }

    if (!initResult.pushToken) {
      throw new Error('Failed to get push token');
    }

    return initResult.pushToken;
  }

  private static async registerPushToken(token: string): Promise<void> {
    try {
      await apolloClient.mutate({
        mutation: REGISTER_PUSH_TOKEN_MUTATION,
        variables: {
          token,
          platform: Platform.OS,
          deviceInfo: {
            brand: Device.brand,
            model: Device.modelName,
            osVersion: Device.osVersion,
          },
        },
      });
    } catch (error) {
      console.error('Failed to register push token with backend:', error);
      // Don't throw - local notifications will still work
    }
  }

  private static async createNotificationChannels(): Promise<void> {
    // Create notification channels for different types of notifications
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Alert Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF0000',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('system', {
      name: 'System Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0099FF',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('dashboard', {
      name: 'Dashboard Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100, 150, 100],
      lightColor: '#00FF00',
      sound: 'default',
    });
  }

  private static setupNotificationListeners(): void {
    // Handle notification received while app is running
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      // Handle the notification in your app
      this.handleNotificationReceived(notification);
    });

    // Handle notification tapped
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped:', response);
      // Handle the notification tap
      this.handleNotificationTapped(response);
    });
  }

  private static handleNotificationReceived(notification: Notifications.Notification): void {
    // Update Redux store with new notification
    // This would typically dispatch an action to add the notification
    const notificationData = notification.request.content.data;

    // You could dispatch a Redux action here to update the notification state
    // store.dispatch(addNotification(notificationData));
  }

  private static handleNotificationTapped(response: Notifications.NotificationResponse): void {
    const notification = response.notification;
    const data = notification.request.content.data;

    // Handle different types of notifications
    if (data?.type === 'dashboard') {
      // Navigate to specific dashboard
      console.log('Navigate to dashboard:', data.dashboardId);
    } else if (data?.type === 'alert') {
      // Navigate to alerts screen
      console.log('Navigate to alerts');
    }
  }

  // Local Notifications
  static async scheduleLocalNotification(config: LocalNotificationConfig): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: config.title,
          body: config.body,
          data: config.data,
          sound: 'default',
        },
        trigger: config.trigger || null,
      });

      return identifier;
    } catch (error) {
      console.error('Failed to schedule local notification:', error);
      throw error;
    }
  }

  static async cancelLocalNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Failed to cancel local notification:', error);
      throw error;
    }
  }

  static async cancelAllLocalNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all local notifications:', error);
      throw error;
    }
  }

  // Badge Management
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  static async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Failed to get badge count:', error);
      return 0;
    }
  }

  // Backend Integration
  static async getNotifications(limit: number = 50, offset: number = 0): Promise<{
    notifications: Notification[];
    unreadCount: number;
  }> {
    try {
      const { data } = await apolloClient.query({
        query: GET_NOTIFICATIONS_QUERY,
        variables: { limit, offset },
        fetchPolicy: 'cache-and-network',
      });

      return {
        notifications: data?.notifications?.items || [],
        unreadCount: data?.notifications?.unreadCount || 0,
      };
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw error;
    }
  }

  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await apolloClient.mutate({
        mutation: MARK_NOTIFICATION_READ_MUTATION,
        variables: { notificationId },
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  static async markAllAsRead(): Promise<void> {
    try {
      await apolloClient.mutate({
        mutation: MARK_ALL_NOTIFICATIONS_READ_MUTATION,
      });

      // Clear badge count
      await this.setBadgeCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  static async updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: UPDATE_NOTIFICATION_SETTINGS_MUTATION,
        variables: { settings },
      });

      return data.updateNotificationSettings;
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw error;
    }
  }

  // Alert-specific notifications
  static async scheduleAlertNotification(
    alertName: string,
    value: number,
    threshold: number,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<void> {
    const severityColors = {
      low: '#00FF00',
      medium: '#FFFF00',
      high: '#FF8000',
      critical: '#FF0000',
    };

    await this.scheduleLocalNotification({
      title: `Alert: ${alertName}`,
      body: `Value ${value} has exceeded threshold ${threshold}`,
      data: {
        type: 'alert',
        alertName,
        value,
        threshold,
        severity,
      },
    });
  }

  // Dashboard-specific notifications
  static async scheduleDashboardUpdateNotification(
    dashboardName: string,
    dashboardId: string
  ): Promise<void> {
    await this.scheduleLocalNotification({
      title: 'Dashboard Updated',
      body: `${dashboardName} has been updated with new data`,
      data: {
        type: 'dashboard',
        dashboardId,
        dashboardName,
      },
    });
  }

  static getPushToken(): string | null {
    return this.pushToken;
  }

  static isInitialized(): boolean {
    return this.isInitialized;
  }
}
