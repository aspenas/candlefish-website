// Firebase Service Configuration for Mobile Security Dashboard
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, MessagePayload, Messaging } from 'firebase/messaging';
import { getAnalytics, Analytics } from 'firebase/analytics';
import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { environmentConfig } from '@/config/environment';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

class FirebaseService {
  private static instance: FirebaseService;
  private app: FirebaseApp | null = null;
  private messaging: Messaging | null = null;
  private analytics: Analytics | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const config = environmentConfig.getConfig().firebase;
      const firebaseConfig: FirebaseConfig = {
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
      };

      // Initialize Firebase app if not already initialized
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
      } else {
        this.app = getApps()[0];
      }

      // Initialize Firebase Cloud Messaging for web/development
      if (Platform.OS === 'web' || __DEV__) {
        this.messaging = getMessaging(this.app);
      }

      // Initialize Firebase Analytics if enabled
      if (environmentConfig.isFeatureEnabled('crashReporting')) {
        this.analytics = getAnalytics(this.app);
      }

      // Set up native messaging for React Native
      await this.setupNativeMessaging();

      this.isInitialized = true;
      console.log('Firebase service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase service:', error);
      throw error;
    }
  }

  private async setupNativeMessaging(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      // Request permission for iOS
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
          console.warn('Firebase messaging permission not granted');
        }
      }

      // Get registration token
      const token = await messaging().getToken();
      if (token) {
        console.log('FCM Registration Token:', token.substring(0, 20) + '...');
        await AsyncStorage.setItem('fcm_token', token);
      }

      // Handle token refresh
      messaging().onTokenRefresh(async (token) => {
        console.log('FCM Token refreshed:', token.substring(0, 20) + '...');
        await AsyncStorage.setItem('fcm_token', token);
        // Send token to backend
        await this.sendTokenToBackend(token);
      });

      // Handle background messages
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('Message handled in the background!', remoteMessage);
        // Process background message
        await this.processBackgroundMessage(remoteMessage);
      });

      // Handle foreground messages
      messaging().onMessage(async (remoteMessage) => {
        console.log('A new FCM message arrived!', remoteMessage);
        await this.processForegroundMessage(remoteMessage);
      });

      // Handle notification that opened the app from quit state
      messaging().getInitialNotification()
        .then(async (remoteMessage) => {
          if (remoteMessage) {
            console.log('Notification caused app to open from quit state:', remoteMessage);
            await this.handleNotificationOpen(remoteMessage);
          }
        });

      // Handle notification that opened the app from background state
      messaging().onNotificationOpenedApp(async (remoteMessage) => {
        console.log('Notification caused app to open from background state:', remoteMessage);
        await this.handleNotificationOpen(remoteMessage);
      });

    } catch (error) {
      console.error('Error setting up native messaging:', error);
    }
  }

  // Send FCM token to backend
  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      // Store token for backend sync when GraphQL is available
      const tokenData = {
        token,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        deviceId: await AsyncStorage.getItem('device_id'),
      };

      // Queue for later sync
      const existingTokens = await AsyncStorage.getItem('pending_fcm_tokens');
      const tokens = existingTokens ? JSON.parse(existingTokens) : [];
      
      // Remove old tokens for this device
      const filteredTokens = tokens.filter((t: any) => t.deviceId !== tokenData.deviceId);
      filteredTokens.push(tokenData);
      
      await AsyncStorage.setItem('pending_fcm_tokens', JSON.stringify(filteredTokens));
      
      console.log('FCM token queued for backend sync');
    } catch (error) {
      console.error('Error sending token to backend:', error);
    }
  }

  // Process background message
  private async processBackgroundMessage(remoteMessage: any): Promise<void> {
    const { data, notification } = remoteMessage;
    
    try {
      // Store notification for display when app becomes active
      const backgroundNotif = {
        id: `bg_${Date.now()}`,
        title: notification?.title || 'Security Alert',
        body: notification?.body || 'New security event detected',
        data: data || {},
        timestamp: new Date().toISOString(),
      };

      const existing = await AsyncStorage.getItem('background_notifications');
      const notifications = existing ? JSON.parse(existing) : [];
      notifications.push(backgroundNotif);
      
      // Keep only last 50 background notifications
      if (notifications.length > 50) {
        notifications.splice(0, notifications.length - 50);
      }
      
      await AsyncStorage.setItem('background_notifications', JSON.stringify(notifications));
      
      // Process critical security alerts immediately
      if (data?.severity === 'CRITICAL' || data?.type === 'KONG_ADMIN_API') {
        await this.handleCriticalAlert(data);
      }
      
    } catch (error) {
      console.error('Error processing background message:', error);
    }
  }

  // Process foreground message
  private async processForegroundMessage(remoteMessage: any): Promise<void> {
    const { data, notification } = remoteMessage;
    
    try {
      // Show local notification if app is in foreground
      const localNotif = {
        id: `fg_${Date.now()}`,
        title: notification?.title || 'Security Alert',
        body: notification?.body || 'New security event detected',
        data: data || {},
        timestamp: new Date().toISOString(),
        showInForeground: true,
      };

      // Store for notification history
      const existing = await AsyncStorage.getItem('notification_history');
      const notifications = existing ? JSON.parse(existing) : [];
      notifications.unshift(localNotif);
      
      // Keep only last 100 notifications
      if (notifications.length > 100) {
        notifications.splice(100);
      }
      
      await AsyncStorage.setItem('notification_history', JSON.stringify(notifications));
      
      // Trigger local notification display
      await this.displayLocalNotification(localNotif);
      
    } catch (error) {
      console.error('Error processing foreground message:', error);
    }
  }

  // Handle notification that opened the app
  private async handleNotificationOpen(remoteMessage: any): Promise<void> {
    const { data } = remoteMessage;
    
    try {
      // Store deep link data for navigation
      const deepLink = {
        source: 'firebase_notification',
        data: data || {},
        timestamp: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem('pending_deep_link', JSON.stringify(deepLink));
      
      // Log notification open event
      await this.logNotificationEvent('opened', data);
      
    } catch (error) {
      console.error('Error handling notification open:', error);
    }
  }

  // Handle critical security alerts
  private async handleCriticalAlert(data: any): Promise<void> {
    try {
      // Store critical alert for immediate attention
      const criticalAlert = {
        id: `critical_${Date.now()}`,
        type: data?.type || 'UNKNOWN',
        severity: data?.severity || 'HIGH',
        alertId: data?.alertId,
        vulnerabilityId: data?.vulnerabilityId,
        message: data?.message,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      };

      const existing = await AsyncStorage.getItem('critical_alerts');
      const alerts = existing ? JSON.parse(existing) : [];
      alerts.unshift(criticalAlert);
      
      // Keep only last 20 critical alerts
      if (alerts.length > 20) {
        alerts.splice(20);
      }
      
      await AsyncStorage.setItem('critical_alerts', JSON.stringify(alerts));
      
      console.log('Critical alert stored:', criticalAlert);
      
    } catch (error) {
      console.error('Error handling critical alert:', error);
    }
  }

  // Display local notification
  private async displayLocalNotification(notification: any): Promise<void> {
    // This would integrate with the notification service
    console.log('Local notification:', notification);
  }

  // Log notification event
  private async logNotificationEvent(event: string, data: any): Promise<void> {
    try {
      const eventData = {
        event,
        data,
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
      };

      const existing = await AsyncStorage.getItem('notification_events');
      const events = existing ? JSON.parse(existing) : [];
      events.push(eventData);
      
      // Keep only last 500 events
      if (events.length > 500) {
        events.splice(0, events.length - 500);
      }
      
      await AsyncStorage.setItem('notification_events', JSON.stringify(events));
      
    } catch (error) {
      console.error('Error logging notification event:', error);
    }
  }

  // Public methods
  async getFCMToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') return null;
      
      const token = await messaging().getToken();
      await AsyncStorage.setItem('fcm_token', token);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  async subscribeTo(topic: string): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
      
      // Store subscription locally
      const existing = await AsyncStorage.getItem('fcm_subscriptions');
      const subscriptions = existing ? JSON.parse(existing) : [];
      if (!subscriptions.includes(topic)) {
        subscriptions.push(topic);
        await AsyncStorage.setItem('fcm_subscriptions', JSON.stringify(subscriptions));
      }
      
    } catch (error) {
      console.error(`Error subscribing to topic ${topic}:`, error);
    }
  }

  async unsubscribeFrom(topic: string): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
      
      // Remove from local subscriptions
      const existing = await AsyncStorage.getItem('fcm_subscriptions');
      const subscriptions = existing ? JSON.parse(existing) : [];
      const filtered = subscriptions.filter((sub: string) => sub !== topic);
      await AsyncStorage.setItem('fcm_subscriptions', JSON.stringify(filtered));
      
    } catch (error) {
      console.error(`Error unsubscribing from topic ${topic}:`, error);
    }
  }

  async getSubscriptions(): Promise<string[]> {
    try {
      const existing = await AsyncStorage.getItem('fcm_subscriptions');
      return existing ? JSON.parse(existing) : [];
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      return [];
    }
  }

  async getCriticalAlerts(): Promise<any[]> {
    try {
      const existing = await AsyncStorage.getItem('critical_alerts');
      return existing ? JSON.parse(existing) : [];
    } catch (error) {
      console.error('Error getting critical alerts:', error);
      return [];
    }
  }

  async acknowledgeCriticalAlert(alertId: string): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem('critical_alerts');
      const alerts = existing ? JSON.parse(existing) : [];
      
      const updated = alerts.map((alert: any) => {
        if (alert.id === alertId) {
          return { ...alert, acknowledged: true, acknowledgedAt: new Date().toISOString() };
        }
        return alert;
      });
      
      await AsyncStorage.setItem('critical_alerts', JSON.stringify(updated));
      console.log(`Critical alert ${alertId} acknowledged`);
      
    } catch (error) {
      console.error('Error acknowledging critical alert:', error);
    }
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const firebaseService = FirebaseService.getInstance();

export default firebaseService;