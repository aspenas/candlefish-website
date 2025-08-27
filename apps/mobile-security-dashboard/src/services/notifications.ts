// Push Notifications Service for Security Dashboard
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Types
import {
  MobileSecurityNotification,
  NotificationType,
  Severity,
  NotificationSettings
} from '@/types/security';

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android';
  deviceId?: string;
  appVersion?: string;
}

export interface NotificationAction {
  id: string;
  title: string;
  icon?: string;
  foreground?: boolean;
}

export interface NotificationCategory {
  id: string;
  actions: NotificationAction[];
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized: boolean = false;
  private settings: NotificationSettings | null = null;
  private pushToken: string | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize notification service
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up notification handling
      await this.configureNotifications();

      // Request permissions
      await this.requestPermissions();

      // Set up notification categories with actions
      await this.setupNotificationCategories();

      // Get and register push token
      await this.registerForPushNotifications();

      // Load user notification settings
      await this.loadSettings();

      // Set up notification listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  // Configure notification behavior
  private async configureNotifications(): Promise<void> {
    // Set default notification handler
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const { data } = notification.request.content;
        const severity = data?.severity as Severity;

        // Show notification for critical alerts even when app is active
        const shouldShowAlert = severity === Severity.CRITICAL ||
                               data?.type === NotificationType.KONG_ADMIN_API;

        return {
          shouldShowAlert,
          shouldPlaySound: this.settings?.soundEnabled !== false,
          shouldSetBadge: true,
        };
      },
    });

    // Configure Firebase messaging (Android)
    if (Platform.OS === 'android') {
      await messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('Message handled in the background!', remoteMessage);
        await this.handleBackgroundNotification(remoteMessage);
      });
    }
  }

  // Request notification permissions
  private async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.warn('Push notifications only work on physical devices');
        return false;
      }

      // Request permissions for local notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: true,
            allowCriticalAlerts: true,
            allowProvisional: false,
            allowAnnouncements: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Request FCM permissions (iOS)
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission({
          alert: true,
          badge: true,
          sound: true,
          carPlay: true,
          criticalAlert: true,
          provisional: false,
          announcement: true,
        });

        const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.warn('FCM permissions not granted');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Set up notification categories with quick actions
  private async setupNotificationCategories(): Promise<void> {
    const categories: NotificationCategory[] = [
      {
        id: 'SECURITY_ALERT',
        actions: [
          {
            id: 'ACKNOWLEDGE',
            title: 'Acknowledge',
            icon: 'checkmark',
            foreground: false,
          },
          {
            id: 'VIEW_DETAILS',
            title: 'View Details',
            icon: 'eye',
            foreground: true,
          },
          {
            id: 'ESCALATE',
            title: 'Escalate',
            icon: 'warning',
            foreground: true,
          },
        ],
      },
      {
        id: 'KONG_VULNERABILITY',
        actions: [
          {
            id: 'FIX_NOW',
            title: 'Fix Now',
            icon: 'build',
            foreground: true,
          },
          {
            id: 'VIEW_GUIDE',
            title: 'View Guide',
            icon: 'book',
            foreground: true,
          },
        ],
      },
      {
        id: 'CRITICAL_VULNERABILITY',
        actions: [
          {
            id: 'REVIEW',
            title: 'Review',
            icon: 'eye',
            foreground: true,
          },
          {
            id: 'ASSIGN_TO_ME',
            title: 'Assign to Me',
            icon: 'person',
            foreground: false,
          },
        ],
      },
    ];

    // Set categories for local notifications
    await Notifications.setNotificationCategoryAsync(
      'SECURITY_ALERT',
      categories[0].actions.map(action => ({
        identifier: action.id,
        buttonTitle: action.title,
        options: {
          isDestructive: action.id === 'ESCALATE',
          isAuthenticationRequired: action.id === 'ESCALATE',
          opensAppToForeground: action.foreground,
        },
      }))
    );
  }

  // Register for push notifications
  private async registerForPushNotifications(): Promise<void> {
    try {
      if (!Device.isDevice) return;

      // Get Firebase token
      let token: string | null = null;

      try {
        token = await messaging().getToken();
      } catch (firebaseError) {
        console.warn('Failed to get Firebase token, falling back to Expo token:', firebaseError);

        // Fallback to Expo push token
        const expoPushToken = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        token = expoPushToken.data;
      }

      if (token) {
        this.pushToken = token;

        // Store token locally
        await AsyncStorage.setItem('push_notification_token', token);

        // Register token with backend
        await this.registerTokenWithBackend(token);

        console.log('Push notification token registered:', token.substring(0, 20) + '...');
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  }

  // Register token with backend server
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      // This would typically make an API call to your backend
      const tokenData: PushNotificationToken = {
        token,
        platform: Platform.OS as 'ios' | 'android',
        deviceId: await AsyncStorage.getItem('device_id') || undefined,
        appVersion: Constants.expoConfig?.version,
      };

      // Store for later sync when GraphQL is available
      const existingTokens = await AsyncStorage.getItem('pending_token_registrations');
      const tokens = existingTokens ? JSON.parse(existingTokens) : [];
      tokens.push(tokenData);
      await AsyncStorage.setItem('pending_token_registrations', JSON.stringify(tokens));

      console.log('Token queued for backend registration');
    } catch (error) {
      console.error('Error registering token with backend:', error);
    }
  }

  // Set up notification listeners
  private setupNotificationListeners(): void {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('Notification received in foreground:', notification);
      await this.handleForegroundNotification(notification);
    });

    // Handle notification tapped/clicked
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('Notification response received:', response);
      await this.handleNotificationResponse(response);
    });

    // Handle Firebase messages (when app is in foreground)
    if (Platform.OS === 'android') {
      const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
        console.log('FCM message received in foreground:', remoteMessage);
        await this.displayLocalNotification(remoteMessage);
      });

      // Handle notification opened app
      messaging().onNotificationOpenedApp((remoteMessage) => {
        console.log('Notification caused app to open from background:', remoteMessage);
        this.handleDeepLink(remoteMessage.data);
      });

      // Check if app was opened by a notification
      messaging().getInitialNotification()
        .then((remoteMessage) => {
          if (remoteMessage) {
            console.log('Notification caused app to open from quit state:', remoteMessage);
            this.handleDeepLink(remoteMessage.data);
          }
        });
    }

    // Handle token refresh
    messaging().onTokenRefresh(async (token) => {
      console.log('FCM token refreshed:', token);
      this.pushToken = token;
      await AsyncStorage.setItem('push_notification_token', token);
      await this.registerTokenWithBackend(token);
    });
  }

  // Handle notification received in foreground
  private async handleForegroundNotification(notification: Notifications.Notification): Promise<void> {
    const { data } = notification.request.content;

    // Check if we should show this notification based on settings
    if (!this.shouldShowNotification(data)) return;

    // Check quiet hours
    if (this.isInQuietHours()) {
      // Store for later if it's critical
      if (data?.severity === Severity.CRITICAL) {
        await this.storeDelayedNotification(notification);
      }
      return;
    }

    // Update app badge
    await this.updateBadgeCount();

    // Track notification metrics
    await this.trackNotificationMetrics('received_foreground', data);
  }

  // Handle notification response (tap, action, etc.)
  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    const { notification, actionIdentifier } = response;
    const { data } = notification.request.content;

    // Track notification interaction
    await this.trackNotificationMetrics('interacted', data, actionIdentifier);

    // Handle quick actions
    if (actionIdentifier && actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      await this.handleQuickAction(actionIdentifier, data);
    } else {
      // Handle regular tap - deep link to relevant screen
      await this.handleDeepLink(data);
    }
  }

  // Handle background notification
  private async handleBackgroundNotification(remoteMessage: any): Promise<void> {
    console.log('Handling background notification:', remoteMessage);

    // Display local notification
    await this.displayLocalNotification(remoteMessage);

    // Update badge count
    await this.updateBadgeCount();
  }

  // Display local notification from FCM message
  private async displayLocalNotification(remoteMessage: any): Promise<void> {
    const { notification, data } = remoteMessage;

    if (!notification) return;

    const severity = data?.severity as Severity;
    const notificationType = data?.type as NotificationType;

    // Determine category for actions
    let categoryIdentifier = 'SECURITY_ALERT';
    if (notificationType === NotificationType.KONG_ADMIN_API) {
      categoryIdentifier = 'KONG_VULNERABILITY';
    } else if (severity === Severity.CRITICAL && notificationType === NotificationType.VULNERABILITY) {
      categoryIdentifier = 'CRITICAL_VULNERABILITY';
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title || 'Security Alert',
        body: notification.body || 'New security event detected',
        data: data || {},
        sound: this.getNotificationSound(severity),
        badge: await this.getBadgeCount() + 1,
        categoryIdentifier,
      },
      trigger: null, // Show immediately
    });
  }

  // Handle quick actions from notifications
  private async handleQuickAction(actionId: string, data: any): Promise<void> {
    try {
      switch (actionId) {
        case 'ACKNOWLEDGE':
          if (data?.alertId) {
            // This would call GraphQL mutation
            await this.acknowledgeAlert(data.alertId);
          }
          break;

        case 'ASSIGN_TO_ME':
          if (data?.vulnerabilityId) {
            // This would call GraphQL mutation
            await this.assignVulnerabilityToMe(data.vulnerabilityId);
          }
          break;

        case 'FIX_NOW':
        case 'VIEW_DETAILS':
        case 'VIEW_GUIDE':
        case 'REVIEW':
        case 'ESCALATE':
          // These actions open the app to specific screens
          await this.handleDeepLink(data, actionId);
          break;

        default:
          console.warn('Unknown notification action:', actionId);
      }
    } catch (error) {
      console.error('Error handling quick action:', error);
    }
  }

  // Handle deep linking from notifications
  private async handleDeepLink(data: any, action?: string): Promise<void> {
    // Store deep link data for navigation after app loads
    const deepLinkData = {
      ...data,
      action,
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem('pending_deep_link', JSON.stringify(deepLinkData));
  }

  // Quick action implementations
  private async acknowledgeAlert(alertId: string): Promise<void> {
    // Queue offline action if not connected
    const offlineAction = {
      id: `acknowledge_${alertId}_${Date.now()}`,
      type: 'acknowledge',
      targetId: alertId,
      targetType: 'alert',
      payload: { note: 'Acknowledged via notification' },
      timestamp: new Date().toISOString(),
      userId: 'current_user', // This would be actual user ID
      retryCount: 0,
    };

    // Store for later sync
    const existingActions = await AsyncStorage.getItem('offline_actions');
    const actions = existingActions ? JSON.parse(existingActions) : [];
    actions.push(offlineAction);
    await AsyncStorage.setItem('offline_actions', JSON.stringify(actions));

    console.log('Alert acknowledgment queued for sync');
  }

  private async assignVulnerabilityToMe(vulnerabilityId: string): Promise<void> {
    // Similar to acknowledge alert - queue offline action
    const offlineAction = {
      id: `assign_${vulnerabilityId}_${Date.now()}`,
      type: 'assign',
      targetId: vulnerabilityId,
      targetType: 'vulnerability',
      payload: { assignTo: 'current_user' },
      timestamp: new Date().toISOString(),
      userId: 'current_user',
      retryCount: 0,
    };

    const existingActions = await AsyncStorage.getItem('offline_actions');
    const actions = existingActions ? JSON.parse(existingActions) : [];
    actions.push(offlineAction);
    await AsyncStorage.setItem('offline_actions', JSON.stringify(actions));

    console.log('Vulnerability assignment queued for sync');
  }

  // Notification settings management
  async loadSettings(): Promise<NotificationSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem('notification_settings');
      this.settings = settingsJson ? JSON.parse(settingsJson) : this.getDefaultSettings();
      return this.settings;
    } catch (error) {
      console.error('Error loading notification settings:', error);
      this.settings = this.getDefaultSettings();
      return this.settings;
    }
  }

  async saveSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...settings } as NotificationSettings;
      await AsyncStorage.setItem('notification_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      pushEnabled: true,
      criticalAlertsOnly: false,
      kongVulnerabilityAlerts: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      soundEnabled: true,
      vibrationEnabled: true,
    };
  }

  // Utility methods
  private shouldShowNotification(data: any): boolean {
    if (!this.settings?.pushEnabled) return false;

    const severity = data?.severity as Severity;
    const type = data?.type as NotificationType;

    // Always show critical alerts
    if (severity === Severity.CRITICAL) return true;

    // Always show Kong vulnerability alerts if enabled
    if (type === NotificationType.KONG_ADMIN_API && this.settings?.kongVulnerabilityAlerts) {
      return true;
    }

    // If critical alerts only, don't show others
    if (this.settings?.criticalAlertsOnly) {
      return severity === Severity.CRITICAL;
    }

    return true;
  }

  private isInQuietHours(): boolean {
    if (!this.settings?.quietHours?.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = this.settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.settings.quietHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  private getNotificationSound(severity?: Severity): string | undefined {
    if (!this.settings?.soundEnabled) return undefined;

    switch (severity) {
      case Severity.CRITICAL:
        return 'critical-alert.wav';
      case Severity.HIGH:
        return 'high-alert.wav';
      default:
        return undefined; // Use default sound
    }
  }

  private async getBadgeCount(): Promise<number> {
    try {
      const count = await Notifications.getBadgeCountAsync();
      return count || 0;
    } catch (error) {
      return 0;
    }
  }

  private async updateBadgeCount(): Promise<void> {
    try {
      const currentCount = await this.getBadgeCount();
      await Notifications.setBadgeCountAsync(currentCount + 1);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  async clearBadgeCount(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge count:', error);
    }
  }

  private async storeDelayedNotification(notification: Notifications.Notification): Promise<void> {
    // Store critical notifications to show after quiet hours
    try {
      const delayed = await AsyncStorage.getItem('delayed_notifications');
      const notifications = delayed ? JSON.parse(delayed) : [];
      notifications.push({
        notification: notification.request.content,
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem('delayed_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error storing delayed notification:', error);
    }
  }

  private async trackNotificationMetrics(
    event: string,
    data: any,
    action?: string
  ): Promise<void> {
    try {
      const metrics = {
        event,
        data,
        action,
        timestamp: Date.now(),
        platform: Platform.OS,
      };

      const existing = await AsyncStorage.getItem('notification_metrics');
      const allMetrics = existing ? JSON.parse(existing) : [];
      allMetrics.push(metrics);

      // Keep only last 1000 entries
      if (allMetrics.length > 1000) {
        allMetrics.splice(0, allMetrics.length - 1000);
      }

      await AsyncStorage.setItem('notification_metrics', JSON.stringify(allMetrics));
    } catch (error) {
      console.error('Error tracking notification metrics:', error);
    }
  }

  // Public methods
  getSettings(): NotificationSettings | null {
    return this.settings;
  }

  getPushToken(): string | null {
    return this.pushToken;
  }

  async sendLocalNotification(notification: MobileSecurityNotification): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data,
        sound: this.getNotificationSound(notification.data.severity),
        badge: await this.getBadgeCount() + 1,
      },
      trigger: null,
    });
  }

  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
    await this.clearBadgeCount();
  }

  // Get pending deep link data
  async getPendingDeepLink(): Promise<any> {
    try {
      const data = await AsyncStorage.getItem('pending_deep_link');
      if (data) {
        await AsyncStorage.removeItem('pending_deep_link');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('Error getting pending deep link:', error);
      return null;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// React hook
export const useNotificationService = () => {
  const [settings, setSettings] = React.useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const initializeNotifications = async () => {
      try {
        await notificationService.initialize();
        const userSettings = await notificationService.loadSettings();
        setSettings(userSettings);
      } catch (error) {
        console.error('Error initializing notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeNotifications();
  }, []);

  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    await notificationService.saveSettings(newSettings);
    const updatedSettings = await notificationService.loadSettings();
    setSettings(updatedSettings);
  };

  return {
    settings,
    isLoading,
    updateSettings,
    initialize: notificationService.initialize.bind(notificationService),
    sendLocalNotification: notificationService.sendLocalNotification.bind(notificationService),
    clearAllNotifications: notificationService.clearAllNotifications.bind(notificationService),
    clearBadgeCount: notificationService.clearBadgeCount.bind(notificationService),
    getPendingDeepLink: notificationService.getPendingDeepLink.bind(notificationService),
  };
};

export default notificationService;
