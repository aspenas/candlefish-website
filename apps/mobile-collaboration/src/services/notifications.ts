import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { apolloClient } from './apollo';
import { store } from '@/stores';
import { logError, logInfo } from '@/utils/logger';

// Notification types
export enum NotificationType {
  MENTION = 'mention',
  COMMENT_REPLY = 'comment_reply',
  DOCUMENT_UPDATED = 'document_updated',
  USER_JOINED = 'user_joined',
  DOCUMENT_SHARED = 'document_shared',
  COMMENT_RESOLVED = 'comment_resolved',
  SYSTEM_UPDATE = 'system_update',
}

interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data: {
    documentId?: string;
    commentId?: string;
    userId?: string;
    actionUrl?: string;
    [key: string]: any;
  };
}

interface NotificationPreferences {
  enabled: boolean;
  mentions: boolean;
  comments: boolean;
  documentUpdates: boolean;
  userActivity: boolean;
  systemUpdates: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm format
  quietHoursEnd: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  mentions: true,
  comments: true,
  documentUpdates: false,
  userActivity: true,
  systemUpdates: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  soundEnabled: true,
  vibrationEnabled: true,
};

const STORAGE_KEYS = {
  PUSH_TOKEN: '@candlefish/push_token',
  NOTIFICATION_PREFERENCES: '@candlefish/notification_preferences',
  NOTIFICATION_HISTORY: '@candlefish/notification_history',
} as const;

class NotificationManager {
  private expoPushToken: string | null = null;
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;
  private subscriptions: { [key: string]: Notifications.Subscription } = {};

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Load preferences
      await this.loadPreferences();

      // Configure notifications
      this.configureNotifications();

      // Register for push notifications
      if (this.preferences.enabled) {
        await this.registerForPushNotifications();
      }

      // Set up listeners
      this.setupListeners();

      logInfo('Notification manager initialized');
    } catch (error) {
      logError('Failed to initialize notification manager:', error);
    }
  }

  private configureNotifications() {
    // Configure how notifications are handled when received
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const { type } = notification.request.content.data as { type?: NotificationType };

        // Check preferences
        if (!this.preferences.enabled) {
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }

        // Check quiet hours
        if (this.isQuietHours()) {
          return {
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: true,
          };
        }

        // Check type-specific preferences
        const shouldShow = this.shouldShowNotification(type);

        return {
          shouldShowAlert: shouldShow,
          shouldPlaySound: shouldShow && this.preferences.soundEnabled,
          shouldSetBadge: shouldShow,
        };
      },
    });
  }

  private async registerForPushNotifications() {
    try {
      if (!Device.isDevice) {
        logInfo('Push notifications only work on physical devices');
        return;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logError('Push notification permissions not granted');
        return;
      }

      // Get push token
      const token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })
      ).data;

      this.expoPushToken = token;

      // Store token
      await SecureStore.setItemAsync(STORAGE_KEYS.PUSH_TOKEN, token);

      // Send token to server
      await this.registerTokenWithServer(token);

      logInfo('Push notification token registered:', token);
    } catch (error) {
      logError('Failed to register for push notifications:', error);
    }
  }

  private async registerTokenWithServer(token: string) {
    try {
      // TODO: Send token to your GraphQL API
      // Example mutation:
      /*
      await apolloClient.mutate({
        mutation: REGISTER_PUSH_TOKEN,
        variables: {
          token,
          platform: Platform.OS,
          deviceId: Constants.deviceId,
        },
      });
      */

      logInfo('Push token registered with server');
    } catch (error) {
      logError('Failed to register token with server:', error);
    }
  }

  private setupListeners() {
    // Notification received while app is running
    this.subscriptions.received = Notifications.addNotificationReceivedListener(
      (notification) => {
        logInfo('Notification received:', notification);
        this.handleNotificationReceived(notification);
      }
    );

    // Notification tapped/clicked
    this.subscriptions.response = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        logInfo('Notification response:', response);
        this.handleNotificationResponse(response);
      }
    );
  }

  private handleNotificationReceived(notification: Notifications.Notification) {
    const { type, documentId, commentId } = notification.request.content.data as any;

    // Save to notification history
    this.saveNotificationToHistory(notification);

    // Update app state based on notification type
    switch (type as NotificationType) {
      case NotificationType.MENTION:
        // Handle mention notification
        this.handleMentionNotification(documentId, commentId);
        break;

      case NotificationType.COMMENT_REPLY:
        // Handle comment reply
        this.handleCommentReplyNotification(documentId, commentId);
        break;

      case NotificationType.DOCUMENT_UPDATED:
        // Handle document update
        this.handleDocumentUpdateNotification(documentId);
        break;

      case NotificationType.USER_JOINED:
        // Handle user joined
        this.handleUserJoinedNotification(documentId);
        break;

      default:
        logInfo('Unknown notification type:', type);
    }
  }

  private handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { type, actionUrl, documentId, commentId } = response.notification.request.content.data as any;

    // Navigate based on notification type
    switch (type as NotificationType) {
      case NotificationType.MENTION:
      case NotificationType.COMMENT_REPLY:
        if (documentId && commentId) {
          // Navigate to document with comment highlighted
          this.navigateToDocumentComment(documentId, commentId);
        } else if (documentId) {
          this.navigateToDocument(documentId);
        }
        break;

      case NotificationType.DOCUMENT_UPDATED:
      case NotificationType.USER_JOINED:
        if (documentId) {
          this.navigateToDocument(documentId);
        }
        break;

      case NotificationType.DOCUMENT_SHARED:
        if (actionUrl) {
          // Handle document sharing link
          this.handleDocumentShare(actionUrl);
        }
        break;

      default:
        // Default action or no action needed
        break;
    }
  }

  // Local notification scheduling
  async scheduleLocalNotification(payload: NotificationPayload) {
    try {
      if (!this.preferences.enabled || !this.shouldShowNotification(payload.type)) {
        return;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          sound: this.preferences.soundEnabled ? 'default' : undefined,
          vibrate: this.preferences.vibrationEnabled ? [0, 250, 250, 250] : undefined,
        },
        trigger: null, // Show immediately
      });

      logInfo('Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      logError('Failed to schedule local notification:', error);
    }
  }

  // Notification helpers
  private shouldShowNotification(type?: NotificationType): boolean {
    if (!type) return true;

    switch (type) {
      case NotificationType.MENTION:
        return this.preferences.mentions;
      case NotificationType.COMMENT_REPLY:
        return this.preferences.comments;
      case NotificationType.DOCUMENT_UPDATED:
        return this.preferences.documentUpdates;
      case NotificationType.USER_JOINED:
        return this.preferences.userActivity;
      case NotificationType.SYSTEM_UPDATE:
        return this.preferences.systemUpdates;
      default:
        return true;
    }
  }

  private isQuietHours(): boolean {
    if (!this.preferences.quietHoursEnabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const start = this.preferences.quietHoursStart;
    const end = this.preferences.quietHoursEnd;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }

  // Navigation handlers
  private navigateToDocument(documentId: string) {
    // TODO: Implement navigation to document
    // This depends on your navigation setup
    logInfo('Navigate to document:', documentId);
  }

  private navigateToDocumentComment(documentId: string, commentId: string) {
    // TODO: Implement navigation to document with comment highlighted
    logInfo('Navigate to document comment:', { documentId, commentId });
  }

  private handleDocumentShare(actionUrl: string) {
    // TODO: Handle document sharing
    logInfo('Handle document share:', actionUrl);
  }

  // Specific notification handlers
  private handleMentionNotification(documentId?: string, commentId?: string) {
    // TODO: Update UI to show new mention
    logInfo('Handle mention notification:', { documentId, commentId });
  }

  private handleCommentReplyNotification(documentId?: string, commentId?: string) {
    // TODO: Update UI to show new reply
    logInfo('Handle comment reply notification:', { documentId, commentId });
  }

  private handleDocumentUpdateNotification(documentId?: string) {
    // TODO: Refresh document data
    if (documentId) {
      apolloClient.refetchQueries({
        include: [`Document:${documentId}`],
      });
    }
  }

  private handleUserJoinedNotification(documentId?: string) {
    // TODO: Update presence indicators
    logInfo('Handle user joined notification:', documentId);
  }

  // Notification history
  private async saveNotificationToHistory(notification: Notifications.Notification) {
    try {
      const history = await this.getNotificationHistory();

      const notificationRecord = {
        id: notification.request.identifier,
        title: notification.request.content.title || '',
        body: notification.request.content.body || '',
        data: notification.request.content.data,
        receivedAt: Date.now(),
        read: false,
      };

      history.unshift(notificationRecord);

      // Keep only last 100 notifications
      if (history.length > 100) {
        history.splice(100);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, JSON.stringify(history));
    } catch (error) {
      logError('Failed to save notification to history:', error);
    }
  }

  async getNotificationHistory() {
    try {
      const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
      return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
      logError('Failed to get notification history:', error);
      return [];
    }
  }

  // Preferences management
  async updatePreferences(newPreferences: Partial<NotificationPreferences>) {
    try {
      this.preferences = { ...this.preferences, ...newPreferences };

      await AsyncStorage.setItem(
        STORAGE_KEYS.NOTIFICATION_PREFERENCES,
        JSON.stringify(this.preferences)
      );

      // Re-register for notifications if enabled status changed
      if (newPreferences.enabled !== undefined) {
        if (newPreferences.enabled && !this.expoPushToken) {
          await this.registerForPushNotifications();
        }
      }

      logInfo('Notification preferences updated');
    } catch (error) {
      logError('Failed to update notification preferences:', error);
    }
  }

  private async loadPreferences() {
    try {
      const preferencesJson = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_PREFERENCES);

      if (preferencesJson) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(preferencesJson) };
      }
    } catch (error) {
      logError('Failed to load notification preferences:', error);
    }
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  // Badge management
  async setBadgeCount(count: number) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      logError('Failed to set badge count:', error);
    }
  }

  async clearBadge() {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      logError('Failed to clear badge:', error);
    }
  }

  // Cleanup
  cleanup() {
    Object.values(this.subscriptions).forEach(subscription => {
      subscription.remove();
    });
  }

  // Test notification (for development)
  async testNotification() {
    await this.scheduleLocalNotification({
      type: NotificationType.SYSTEM_UPDATE,
      title: 'Test Notification',
      body: 'This is a test notification from Candlefish Collaboration',
      data: {
        test: true,
      },
    });
  }
}

export const notificationManager = new NotificationManager();
export default notificationManager;
