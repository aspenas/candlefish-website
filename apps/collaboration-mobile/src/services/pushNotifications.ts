/**
 * Push Notifications Service
 * Handles push notifications for real-time collaboration updates
 */

import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apolloClient } from './apollo';
import { getAuthToken } from './auth';
import Config from '@/constants/config';

export interface NotificationPayload {
  id?: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: any;
  documentId?: string;
  userId?: string;
  timestamp?: string;
}

export enum NotificationType {
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  DOCUMENT_SHARED = 'DOCUMENT_SHARED',
  COMMENT_ADDED = 'COMMENT_ADDED',
  COLLABORATION_INVITE = 'COLLABORATION_INVITE',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  MENTION_RECEIVED = 'MENTION_RECEIVED',
  VERSION_CREATED = 'VERSION_CREATED',
}

interface NotificationAction {
  identifier: string;
  title: string;
  options: {
    foreground?: boolean;
    destructive?: boolean;
    authenticationRequired?: boolean;
  };
}

interface NotificationCategory {
  identifier: string;
  actions: NotificationAction[];
  intentIdentifiers?: string[];
  options?: {
    customDismissAction?: boolean;
    allowInCarPlay?: boolean;
    hiddenPreviewsShowTitle?: boolean;
    hiddenPreviewsShowSubtitle?: boolean;
  };
}

class PushNotificationService {
  private isInitialized = false;
  private token: string | null = null;
  private notificationHandlers: Map<string, (data: any) => void> = new Map();

  /**
   * Initialize push notifications
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized || !Config.FEATURES.PUSH_NOTIFICATIONS) {
      return;
    }

    try {
      await this.requestPermissions();
      this.configureNotifications();
      await this.registerForPushNotifications();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message: 'This app needs access to notifications to keep you updated on document changes.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      return new Promise((resolve) => {
        PushNotificationIOS.requestPermissions({
          alert: true,
          badge: true,
          sound: true,
        }).then(
          (data) => {
            resolve(data.alert && data.badge && data.sound);
          },
          () => resolve(false)
        );
      });
    }
  }

  /**
   * Configure push notifications
   */
  private configureNotifications(): void {
    // Define notification categories with actions
    const categories: NotificationCategory[] = [
      {
        identifier: 'DOCUMENT_UPDATE',
        actions: [
          {
            identifier: 'OPEN_DOCUMENT',
            title: 'Open Document',
            options: { foreground: true },
          },
          {
            identifier: 'DISMISS',
            title: 'Dismiss',
            options: { foreground: false },
          },
        ],
      },
      {
        identifier: 'COLLABORATION_INVITE',
        actions: [
          {
            identifier: 'ACCEPT_INVITE',
            title: 'Accept',
            options: { foreground: true },
          },
          {
            identifier: 'DECLINE_INVITE',
            title: 'Decline',
            options: { foreground: false, destructive: true },
          },
        ],
      },
      {
        identifier: 'CONFLICT_RESOLUTION',
        actions: [
          {
            identifier: 'RESOLVE_CONFLICT',
            title: 'Resolve',
            options: { foreground: true },
          },
          {
            identifier: 'IGNORE',
            title: 'Ignore',
            options: { foreground: false },
          },
        ],
      },
    ];

    PushNotification.configure({
      onRegister: (token) => {
        console.log('TOKEN:', token);
        this.token = token.token;
        this.registerTokenWithServer(token.token);
      },

      onNotification: (notification) => {
        console.log('NOTIFICATION:', notification);
        this.handleNotification(notification);
      },

      onAction: (notification) => {
        console.log('ACTION:', notification.action);
        console.log('NOTIFICATION:', notification);
        this.handleNotificationAction(notification);
      },

      onRegistrationError: (err) => {
        console.error('Registration Error:', err.message);
      },

      // IOS ONLY (optional): default: all - Permissions to register.
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // Should the initial notification be popped automatically
      // default: true
      popInitialNotification: true,

      /**
       * (optional) default: true
       * - Specified if permissions (ios) and token (android and ios) will requested or not,
       * - if not, you must call PushNotificationsHandler.requestPermissions() later
       * - if you are not using remote notification or do not have Firebase installed, use this:
       *     requestPermissions: Platform.OS === 'ios'
       */
      requestPermissions: Platform.OS === 'ios',
    });

    // Set categories (iOS only)
    if (Platform.OS === 'ios') {
      PushNotificationIOS.setNotificationCategories(categories);
    }
  }

  /**
   * Register for push notifications
   */
  private async registerForPushNotifications(): Promise<void> {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.addEventListener('register', (token) => {
        this.token = token;
        this.registerTokenWithServer(token);
      });

      PushNotificationIOS.addEventListener('registrationError', (error) => {
        console.error('iOS Push notification registration error:', error);
      });

      PushNotificationIOS.addEventListener('notification', (notification) => {
        this.handleNotification(notification);
      });

      PushNotificationIOS.addEventListener('localNotification', (notification) => {
        this.handleNotification(notification);
      });
    }
  }

  /**
   * Register device token with server
   */
  private async registerTokenWithServer(token: string): Promise<void> {
    try {
      const authToken = await getAuthToken();
      if (!authToken) return;

      await apolloClient.mutate({
        mutation: REGISTER_DEVICE_TOKEN_MUTATION,
        variables: {
          input: {
            token,
            platform: Platform.OS,
            deviceInfo: {
              model: Platform.OS === 'ios' ? 'iPhone' : 'Android',
              osVersion: Platform.Version.toString(),
              appVersion: Config.APP_VERSION,
            },
          },
        },
      });

      // Store token locally for future use
      await AsyncStorage.setItem('fcm_token', token);
    } catch (error) {
      console.error('Failed to register device token:', error);
    }
  }

  /**
   * Handle incoming notification
   */
  private handleNotification(notification: any): void {
    const { data, userInteraction, foreground } = notification;
    
    if (userInteraction) {
      // User tapped on notification
      this.handleNotificationTap(data);
    } else if (!foreground) {
      // Background notification received
      this.showLocalNotification({
        title: notification.title || 'Collaboration Update',
        message: notification.message || notification.body || 'You have a new update',
        type: data?.type || NotificationType.DOCUMENT_UPDATED,
        data,
      });
    }

    // Call registered handlers
    if (data?.type && this.notificationHandlers.has(data.type)) {
      const handler = this.notificationHandlers.get(data.type);
      handler?.(data);
    }
  }

  /**
   * Handle notification tap
   */
  private handleNotificationTap(data: any): void {
    if (data?.documentId) {
      // Navigate to document
      // This would typically use a navigation service
      console.log('Navigate to document:', data.documentId);
    } else if (data?.type === NotificationType.COLLABORATION_INVITE) {
      // Handle collaboration invite
      console.log('Handle collaboration invite:', data);
    }
  }

  /**
   * Handle notification actions (iOS)
   */
  private handleNotificationAction(notification: any): void {
    const { action, data } = notification;

    switch (action) {
      case 'OPEN_DOCUMENT':
        if (data?.documentId) {
          this.handleNotificationTap(data);
        }
        break;

      case 'ACCEPT_INVITE':
        this.handleCollaborationInvite(data, true);
        break;

      case 'DECLINE_INVITE':
        this.handleCollaborationInvite(data, false);
        break;

      case 'RESOLVE_CONFLICT':
        if (data?.conflictId) {
          this.handleConflictResolution(data.conflictId);
        }
        break;

      default:
        console.log('Unknown notification action:', action);
    }
  }

  /**
   * Handle collaboration invite response
   */
  private async handleCollaborationInvite(data: any, accept: boolean): Promise<void> {
    try {
      await apolloClient.mutate({
        mutation: RESPOND_TO_COLLABORATION_INVITE_MUTATION,
        variables: {
          inviteId: data.inviteId,
          accept,
        },
      });

      this.showLocalNotification({
        title: accept ? 'Invitation Accepted' : 'Invitation Declined',
        message: accept 
          ? 'You can now collaborate on this document'
          : 'Invitation has been declined',
        type: NotificationType.COLLABORATION_INVITE,
      });
    } catch (error) {
      console.error('Failed to respond to collaboration invite:', error);
    }
  }

  /**
   * Handle conflict resolution
   */
  private handleConflictResolution(conflictId: string): void {
    // This would typically navigate to conflict resolution screen
    console.log('Navigate to conflict resolution:', conflictId);
  }

  /**
   * Show local notification
   */
  public showLocalNotification(payload: NotificationPayload): void {
    const notificationId = payload.id || Date.now().toString();
    
    PushNotification.localNotification({
      id: notificationId,
      title: payload.title,
      message: payload.message,
      playSound: true,
      soundName: 'default',
      category: this.getNotificationCategory(payload.type),
      userInfo: {
        ...payload.data,
        type: payload.type,
        documentId: payload.documentId,
        userId: payload.userId,
        timestamp: payload.timestamp || new Date().toISOString(),
      },
    });
  }

  /**
   * Get notification category based on type
   */
  private getNotificationCategory(type: NotificationType): string {
    switch (type) {
      case NotificationType.DOCUMENT_UPDATED:
      case NotificationType.DOCUMENT_SHARED:
      case NotificationType.COMMENT_ADDED:
      case NotificationType.MENTION_RECEIVED:
      case NotificationType.VERSION_CREATED:
        return 'DOCUMENT_UPDATE';
      case NotificationType.COLLABORATION_INVITE:
        return 'COLLABORATION_INVITE';
      case NotificationType.CONFLICT_DETECTED:
        return 'CONFLICT_RESOLUTION';
      default:
        return 'DEFAULT';
    }
  }

  /**
   * Register notification handler
   */
  public registerNotificationHandler(type: string, handler: (data: any) => void): void {
    this.notificationHandlers.set(type, handler);
  }

  /**
   * Unregister notification handler
   */
  public unregisterNotificationHandler(type: string): void {
    this.notificationHandlers.delete(type);
  }

  /**
   * Schedule notification
   */
  public scheduleNotification(payload: NotificationPayload, date: Date): void {
    const notificationId = payload.id || Date.now().toString();
    
    PushNotification.localNotificationSchedule({
      id: notificationId,
      title: payload.title,
      message: payload.message,
      date,
      playSound: true,
      soundName: 'default',
      category: this.getNotificationCategory(payload.type),
      userInfo: {
        ...payload.data,
        type: payload.type,
        documentId: payload.documentId,
        userId: payload.userId,
        timestamp: payload.timestamp || new Date().toISOString(),
      },
    });
  }

  /**
   * Cancel notification
   */
  public cancelNotification(notificationId: string): void {
    PushNotification.cancelLocalNotifications({ id: notificationId });
  }

  /**
   * Cancel all notifications
   */
  public cancelAllNotifications(): void {
    PushNotification.cancelAllLocalNotifications();
  }

  /**
   * Get badge count
   */
  public getBadgeCount(): Promise<number> {
    return new Promise((resolve) => {
      if (Platform.OS === 'ios') {
        PushNotificationIOS.getApplicationIconBadgeNumber((badgeCount) => {
          resolve(badgeCount);
        });
      } else {
        resolve(0);
      }
    });
  }

  /**
   * Set badge count
   */
  public setBadgeCount(count: number): void {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.setApplicationIconBadgeNumber(count);
    } else {
      // Android badge count would be handled differently
      // Usually through launcher badge libraries
    }
  }

  /**
   * Clear badge
   */
  public clearBadge(): void {
    this.setBadgeCount(0);
  }

  /**
   * Check if push notifications are enabled
   */
  public async isEnabled(): Promise<boolean> {
    return new Promise((resolve) => {
      PushNotification.checkPermissions((permissions) => {
        resolve(
          Platform.OS === 'ios' 
            ? permissions.alert && permissions.badge && permissions.sound
            : true // Android permissions are handled differently
        );
      });
    });
  }

  /**
   * Get device token
   */
  public getToken(): string | null {
    return this.token;
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    if (Platform.OS === 'ios') {
      PushNotificationIOS.removeEventListener('register');
      PushNotificationIOS.removeEventListener('registrationError');
      PushNotificationIOS.removeEventListener('notification');
      PushNotificationIOS.removeEventListener('localNotification');
    }
    this.notificationHandlers.clear();
    this.isInitialized = false;
  }
}

// GraphQL mutations
const REGISTER_DEVICE_TOKEN_MUTATION = `
  mutation RegisterDeviceToken($input: RegisterDeviceTokenInput!) {
    registerDeviceToken(input: $input) {
      success
      errors {
        field
        message
        code
      }
    }
  }
`;

const RESPOND_TO_COLLABORATION_INVITE_MUTATION = `
  mutation RespondToCollaborationInvite($inviteId: UUID!, $accept: Boolean!) {
    respondToCollaborationInvite(inviteId: $inviteId, accept: $accept) {
      success
      errors {
        field
        message
        code
      }
    }
  }
`;

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;