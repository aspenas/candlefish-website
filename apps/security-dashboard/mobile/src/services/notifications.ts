import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as TaskManager from 'expo-task-manager';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from './auth';

// Types
interface NotificationPayload {
  title: string;
  message: string;
  type: 'alert' | 'threat' | 'incident' | 'info' | 'warning' | 'error';
  priority?: 'low' | 'normal' | 'high' | 'critical';
  data?: {
    alertId?: string;
    threatId?: string;
    incidentId?: string;
    severity?: string;
    requiresAction?: boolean;
    actionUrl?: string;
    [key: string]: any;
  };
}

interface NotificationSettings {
  enabled: boolean;
  criticalAlerts: boolean;
  threatDetection: boolean;
  incidentUpdates: boolean;
  systemNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string; // HH:MM format
}

interface PushToken {
  token: string;
  type: 'expo' | 'fcm' | 'apns';
  deviceId: string;
  platform: 'ios' | 'android';
  timestamp: number;
}

const BACKGROUND_NOTIFICATION_TASK = 'background-notification-task';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const settings = await NotificationService.getInstance().getSettings();
    const notificationType = notification.request.content.data?.type || 'info';
    
    // Handle quiet hours
    if (settings.quietHoursEnabled && isInQuietHours(settings)) {
      // Only show critical alerts during quiet hours
      if (notificationType !== 'alert' || notification.request.content.data?.priority !== 'critical') {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: true,
        };
      }
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: settings.soundEnabled,
      shouldSetBadge: true,
    };
  },
});

// Background task for handling notifications when app is closed
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error }) => {
  if (error) {
    console.error('Background notification task error:', error);
    return;
  }
  
  if (data) {
    // Handle background notification
    console.log('Background notification received:', data);
    
    // Process critical security alerts even when app is closed
    const notification = data as any;
    if (notification.type === 'alert' && notification.priority === 'critical') {
      // Trigger immediate local notification
      Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Critical Security Alert',
          body: notification.message,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          sticky: true,
        },
        trigger: null, // Show immediately
      });
    }
  }
});

function isInQuietHours(settings: NotificationSettings): boolean {
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const startTime = settings.quietHoursStart;
  const endTime = settings.quietHoursEnd;
  
  if (startTime <= endTime) {
    // Same day range (e.g., 22:00 to 06:00)
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Cross midnight range (e.g., 22:00 to 06:00)
    return currentTime >= startTime || currentTime <= endTime;
  }
}

class NotificationServiceClass {
  private static instance: NotificationServiceClass;
  private pushToken: PushToken | null = null;
  private settings: NotificationSettings = {
    enabled: true,
    criticalAlerts: true,
    threatDetection: true,
    incidentUpdates: true,
    systemNotifications: false,
    soundEnabled: true,
    vibrationEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '06:00'
  };
  
  private listeners: Array<(notification: Notifications.Notification) => void> = [];
  private responseListeners: Array<(response: Notifications.NotificationResponse) => void> = [];

  public static getInstance(): NotificationServiceClass {
    if (!NotificationServiceClass.instance) {
      NotificationServiceClass.instance = new NotificationServiceClass();
    }
    return NotificationServiceClass.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load settings
      await this.loadSettings();
      
      // Request permissions and register for push notifications
      await this.registerForPushNotifications();
      
      // Set up notification listeners
      this.setupNotificationListeners();
      
      // Register background task
      await this.registerBackgroundTask();
      
      console.log('📱 Notification service initialized');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  // Push Notification Registration
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push notification permissions not granted');
        return null;
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.pushToken = {
        token: tokenData.data,
        type: 'expo',
        deviceId: Constants.deviceId || 'unknown',
        platform: Platform.OS as 'ios' | 'android',
        timestamp: Date.now()
      };

      // Register token with backend
      await this.registerTokenWithBackend(this.pushToken);

      console.log('📱 Push notification token registered:', this.pushToken.token);
      return this.pushToken.token;

    } catch (error) {
      console.error('Push notification registration failed:', error);
      return null;
    }
  }

  private async registerTokenWithBackend(tokenData: PushToken): Promise<void> {
    try {
      const authToken = AuthService.getToken();
      if (!authToken) {
        console.warn('No auth token available for push notification registration');
        return;
      }

      const response = await fetch(`${this.getApiUrl()}/notifications/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          token: tokenData.token,
          type: tokenData.type,
          deviceId: tokenData.deviceId,
          platform: tokenData.platform,
          appVersion: Constants.expoConfig?.version || '1.0.0',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token registration failed: ${response.status}`);
      }

      console.log('✅ Push token registered with backend');
    } catch (error) {
      console.error('Backend token registration failed:', error);
      // Continue without backend registration - local notifications still work
    }
  }

  // Notification Display
  async showNotification(payload: NotificationPayload): Promise<void> {
    try {
      if (!this.settings.enabled) {
        return;
      }

      // Check type-specific settings
      if (!this.shouldShowNotificationType(payload.type)) {
        return;
      }

      const notificationContent: Notifications.NotificationContentInput = {
        title: payload.title,
        body: payload.message,
        data: payload.data || {},
        sound: this.settings.soundEnabled ? 'default' : undefined,
        priority: this.getAndroidPriority(payload.priority || 'normal'),
        sticky: payload.priority === 'critical',
      };

      // Add notification icon based on type
      if (Platform.OS === 'android') {
        notificationContent.color = this.getNotificationColor(payload.type);
      }

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Show immediately
      });

      // Vibrate for high priority notifications
      if (this.settings.vibrationEnabled && (payload.priority === 'high' || payload.priority === 'critical')) {
        // Vibration patterns would be handled by expo-haptics
        console.log('🔸 Triggering vibration for high priority notification');
      }

    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  async scheduleNotification(payload: NotificationPayload, triggerDate: Date): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.message,
          data: payload.data || {},
          sound: this.settings.soundEnabled ? 'default' : undefined,
        },
        trigger: triggerDate,
      });

      return identifier;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  // Badge Management
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Failed to clear badge:', error);
    }
  }

  // Settings Management
  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await AsyncStorage.setItem('notification_settings', JSON.stringify(this.settings));
      
      // Re-register for notifications if enabled status changed
      if ('enabled' in newSettings) {
        if (newSettings.enabled && !this.pushToken) {
          await this.registerForPushNotifications();
        }
      }
      
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw error;
    }
  }

  async getSettings(): Promise<NotificationSettings> {
    return { ...this.settings };
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('notification_settings');
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  // Event Listeners
  private setupNotificationListeners(): void {
    // Notification received listener
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('📱 Notification received:', notification);
      
      this.listeners.forEach(listener => {
        try {
          listener(notification);
        } catch (error) {
          console.error('Notification listener error:', error);
        }
      });
    });

    // Notification response listener (user interaction)
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('📱 Notification response:', response);
      
      // Handle notification actions
      this.handleNotificationResponse(response);
      
      this.responseListeners.forEach(listener => {
        try {
          listener(response);
        } catch (error) {
          console.error('Notification response listener error:', error);
        }
      });
    });
  }

  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    try {
      const data = response.notification.request.content.data;
      
      // Handle different types of notifications
      if (data.alertId) {
        // Navigate to alert details
        console.log('Navigate to alert:', data.alertId);
      } else if (data.threatId) {
        // Navigate to threat details
        console.log('Navigate to threat:', data.threatId);
      } else if (data.incidentId) {
        // Navigate to incident details
        console.log('Navigate to incident:', data.incidentId);
      } else if (data.actionUrl) {
        // Navigate to specific URL/screen
        console.log('Navigate to:', data.actionUrl);
      }
      
    } catch (error) {
      console.error('Error handling notification response:', error);
    }
  }

  private async registerBackgroundTask(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
      if (!isRegistered) {
        await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
        console.log('📱 Background notification task registered');
      }
    } catch (error) {
      console.error('Failed to register background notification task:', error);
    }
  }

  // Utility Methods
  private shouldShowNotificationType(type: string): boolean {
    switch (type) {
      case 'alert':
        return this.settings.criticalAlerts;
      case 'threat':
        return this.settings.threatDetection;
      case 'incident':
        return this.settings.incidentUpdates;
      case 'info':
      case 'warning':
      case 'error':
        return this.settings.systemNotifications;
      default:
        return true;
    }
  }

  private getAndroidPriority(priority: string): Notifications.AndroidNotificationPriority {
    switch (priority) {
      case 'critical':
        return Notifications.AndroidNotificationPriority.MAX;
      case 'high':
        return Notifications.AndroidNotificationPriority.HIGH;
      case 'normal':
        return Notifications.AndroidNotificationPriority.DEFAULT;
      case 'low':
        return Notifications.AndroidNotificationPriority.LOW;
      default:
        return Notifications.AndroidNotificationPriority.DEFAULT;
    }
  }

  private getNotificationColor(type: string): string {
    switch (type) {
      case 'alert':
        return '#ef4444'; // Red
      case 'threat':
        return '#f97316'; // Orange
      case 'incident':
        return '#eab308'; // Yellow
      case 'warning':
        return '#f59e0b'; // Amber
      case 'error':
        return '#dc2626'; // Red
      case 'info':
      default:
        return '#3b82f6'; // Blue
    }
  }

  private getApiUrl(): string {
    return __DEV__ ? 'http://localhost:4000' : 'https://api.candlefish.ai';
  }

  // Public API Methods
  addNotificationListener(listener: (notification: Notifications.Notification) => void): void {
    this.listeners.push(listener);
  }

  removeNotificationListener(listener: (notification: Notifications.Notification) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  addNotificationResponseListener(listener: (response: Notifications.NotificationResponse) => void): void {
    this.responseListeners.push(listener);
  }

  removeNotificationResponseListener(listener: (response: Notifications.NotificationResponse) => void): void {
    const index = this.responseListeners.indexOf(listener);
    if (index > -1) {
      this.responseListeners.splice(index, 1);
    }
  }

  getPushToken(): string | null {
    return this.pushToken?.token || null;
  }

  async refreshPushToken(): Promise<string | null> {
    try {
      this.pushToken = null;
      return await this.registerForPushNotifications();
    } catch (error) {
      console.error('Failed to refresh push token:', error);
      return null;
    }
  }

  // Permission Management
  async checkPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.getPermissionsAsync();
  }

  async requestPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowAnnouncements: true,
      },
    });
  }
}

export const NotificationService = NotificationServiceClass.getInstance();
export default NotificationService;