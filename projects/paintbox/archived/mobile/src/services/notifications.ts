/**
 * Push Notifications Service
 * Handles notification setup, registration, and delivery
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'alert' | 'service_down' | 'system_health' | 'metric_threshold';
  serviceId?: string;
  serviceName?: string;
  alertId?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
}

export const initializeNotifications = async (): Promise<string | null> => {
  try {
    // Check if device supports notifications
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    // Get existing permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get push token
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;

    console.log('Push notification token:', token);

    // Store token locally
    await AsyncStorage.setItem('pushToken', token);

    // Configure notification categories for iOS
    if (Platform.OS === 'ios') {
      await Notifications.setNotificationCategoryAsync('ALERT_ACTIONS', [
        {
          identifier: 'ACKNOWLEDGE',
          buttonTitle: 'Acknowledge',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'VIEW_SERVICE',
          buttonTitle: 'View Service',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('SERVICE_ACTIONS', [
        {
          identifier: 'RESTART_SERVICE',
          buttonTitle: 'Restart',
          options: {
            opensAppToForeground: false,
            isDestructive: true,
          },
        },
        {
          identifier: 'VIEW_SERVICE',
          buttonTitle: 'View Details',
          options: {
            opensAppToForeground: true,
          },
        },
      ]);
    }

    return token;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return null;
  }
};

export const scheduleNotification = async (
  title: string,
  body: string,
  data: NotificationData,
  delay: number = 0
): Promise<string | null> => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: getSoundForSeverity(data.severity),
        priority: getPriorityForSeverity(data.severity),
        categoryIdentifier: getCategoryForType(data.type),
        badge: await getBadgeCount() + 1,
      },
      trigger: delay > 0 ? { seconds: delay } : null,
    });

    // Update badge count
    await updateBadgeCount(1);

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

export const showLocalNotification = async (
  title: string,
  body: string,
  data: NotificationData
): Promise<void> => {
  await scheduleNotification(title, body, data);
};

export const cancelNotification = async (notificationId: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

export const cancelAllNotifications = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const clearBadge = async (): Promise<void> => {
  await Notifications.setBadgeCountAsync(0);
  await AsyncStorage.setItem('badgeCount', '0');
};

// Helper functions
const getSoundForSeverity = (severity?: string): string | undefined => {
  switch (severity) {
    case 'CRITICAL':
      return 'default'; // Use system alert sound
    case 'HIGH':
      return 'default';
    case 'MEDIUM':
      return 'default';
    case 'LOW':
      return undefined; // Silent
    default:
      return 'default';
  }
};

const getPriorityForSeverity = (severity?: string): Notifications.AndroidNotificationPriority => {
  switch (severity) {
    case 'CRITICAL':
      return Notifications.AndroidNotificationPriority.MAX;
    case 'HIGH':
      return Notifications.AndroidNotificationPriority.HIGH;
    case 'MEDIUM':
      return Notifications.AndroidNotificationPriority.DEFAULT;
    case 'LOW':
      return Notifications.AndroidNotificationPriority.LOW;
    default:
      return Notifications.AndroidNotificationPriority.DEFAULT;
  }
};

const getCategoryForType = (type: string): string | undefined => {
  switch (type) {
    case 'alert':
      return 'ALERT_ACTIONS';
    case 'service_down':
      return 'SERVICE_ACTIONS';
    default:
      return undefined;
  }
};

const getBadgeCount = async (): Promise<number> => {
  try {
    const count = await AsyncStorage.getItem('badgeCount');
    return count ? parseInt(count, 10) : 0;
  } catch {
    return 0;
  }
};

const updateBadgeCount = async (increment: number): Promise<void> => {
  try {
    const currentCount = await getBadgeCount();
    const newCount = Math.max(0, currentCount + increment);
    await AsyncStorage.setItem('badgeCount', newCount.toString());
    await Notifications.setBadgeCountAsync(newCount);
  } catch (error) {
    console.error('Error updating badge count:', error);
  }
};

// Notification event handlers
export const addNotificationReceivedListener = (
  handler: (notification: Notifications.Notification) => void
) => {
  return Notifications.addNotificationReceivedListener(handler);
};

export const addNotificationResponseReceivedListener = (
  handler: (response: Notifications.NotificationResponse) => void
) => {
  return Notifications.addNotificationResponseReceivedListener(handler);
};

// Predefined notification templates
export const sendAlertNotification = async (
  alertName: string,
  serviceName: string,
  severity: string,
  alertId: string,
  serviceId: string
): Promise<void> => {
  const title = `${severity} Alert: ${alertName}`;
  const body = `Service: ${serviceName}`;

  await showLocalNotification(title, body, {
    type: 'alert',
    serviceId,
    serviceName,
    alertId,
    severity: severity as any,
    message: body,
  });
};

export const sendServiceDownNotification = async (
  serviceName: string,
  serviceId: string
): Promise<void> => {
  const title = 'Service Down';
  const body = `${serviceName} is no longer responding`;

  await showLocalNotification(title, body, {
    type: 'service_down',
    serviceId,
    serviceName,
    severity: 'HIGH',
    message: body,
  });
};

export const sendSystemHealthNotification = async (
  healthScore: number,
  issue: string
): Promise<void> => {
  const title = 'System Health Alert';
  const body = `Health score: ${healthScore}% - ${issue}`;

  await showLocalNotification(title, body, {
    type: 'system_health',
    severity: healthScore < 50 ? 'CRITICAL' : healthScore < 70 ? 'HIGH' : 'MEDIUM',
    message: body,
  });
};
