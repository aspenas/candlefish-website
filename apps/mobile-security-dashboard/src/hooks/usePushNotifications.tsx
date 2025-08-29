import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { notificationService } from '@/services/notifications';
import { secureStorage } from '@/utils/secure-storage';

interface PushNotificationHook {
  expoPushToken: string | null;
  isRegistered: boolean;
  isLoading: boolean;
  registerForPushNotifications: () => Promise<boolean>;
  unregisterFromPushNotifications: () => Promise<void>;
  sendLocalNotification: (title: string, body: string, data?: any) => Promise<void>;
  clearBadgeCount: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  scheduleNotification: (title: string, body: string, scheduledTime: Date, data?: any) => Promise<string | null>;
  cancelNotification: (notificationId: string) => Promise<void>;
  getPendingNotifications: () => Promise<Notifications.NotificationRequest[]>;
}

export const usePushNotifications = (): PushNotificationHook => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Set up notification handlers
    setupNotificationHandlers();
    
    // Check if already registered
    checkRegistrationStatus();
    
    // Set up notification listeners
    setupNotificationListeners();
    
    return () => {
      // Clean up listeners
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const setupNotificationHandlers = (): void => {
    // Configure how notifications are handled when app is in foreground
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const { data } = notification.request.content;
        
        // Show notification in foreground for critical security alerts
        const isCritical = data?.severity === 'CRITICAL' || data?.priority === 'high';
        
        return {
          shouldShowAlert: isCritical,
          shouldPlaySound: isCritical,
          shouldSetBadge: true,
        };
      },
    });
  };

  const checkRegistrationStatus = async (): Promise<void> => {
    try {
      const token = await secureStorage.getItem('expo_push_token');
      if (token) {
        setExpoPushToken(token);
        setIsRegistered(true);
      }
    } catch (error) {
      console.error('Error checking push notification registration:', error);
    }
  };

  const setupNotificationListeners = (): void => {
    // Listener for notifications received while app is running
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      
      const { data } = notification.request.content;
      
      // Handle special notification types
      if (data?.type === 'security_alert') {
        handleSecurityAlert(notification);
      } else if (data?.type === 'incident_update') {
        handleIncidentUpdate(notification);
      }
    });

    // Listener for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      
      const { data } = response.notification.request.content;
      
      // Handle navigation based on notification data
      if (data?.deepLink) {
        // This would typically use navigation service
        console.log('Navigate to:', data.deepLink);
      }
    });
  };

  const handleSecurityAlert = (notification: Notifications.Notification): void => {
    const { title, body, data } = notification.request.content;
    
    // Show in-app alert for critical security notifications
    if (data?.severity === 'CRITICAL') {
      Alert.alert(
        title || 'Critical Security Alert',
        body || 'A critical security event has occurred.',
        [
          {
            text: 'View Details',
            onPress: () => {
              // Navigate to alert details
              if (data?.alertId) {
                console.log('Navigate to alert:', data.alertId);
              }
            },
          },
          { text: 'Dismiss', style: 'cancel' },
        ]
      );
    }
  };

  const handleIncidentUpdate = (notification: Notifications.Notification): void => {
    const { data } = notification.request.content;
    
    // Update incident badge or status indicators
    if (data?.incidentId) {
      console.log('Update incident UI:', data.incidentId);
    }
  };

  const registerForPushNotifications = useCallback(async (): Promise<boolean> => {
    if (!Device.isDevice) {
      Alert.alert('Error', 'Push notifications only work on physical devices');
      return false;
    }

    setIsLoading(true);

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Push notifications are required for critical security alerts. Please enable them in device settings.'
        );
        return false;
      }

      // Get Expo push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      console.log('Expo push token:', token.data);
      
      // Store token securely
      await secureStorage.setItem('expo_push_token', token.data);
      setExpoPushToken(token.data);

      // Register token with backend
      await notificationService.registerPushToken(token.data);

      // Configure notification categories for iOS
      if (Platform.OS === 'ios') {
        await setupNotificationCategories();
      }

      setIsRegistered(true);
      
      Alert.alert(
        'Notifications Enabled',
        'You will now receive critical security alerts and updates.'
      );
      
      return true;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      Alert.alert(
        'Registration Failed',
        'Failed to register for push notifications. Please try again.'
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setupNotificationCategories = async (): Promise<void> => {
    // Set up notification categories for iOS interactive notifications
    await Notifications.setNotificationCategoryAsync('SECURITY_ALERT', [
      {
        identifier: 'ACKNOWLEDGE',
        buttonTitle: 'Acknowledge',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'VIEW_DETAILS',
        buttonTitle: 'View Details',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('INCIDENT_UPDATE', [
      {
        identifier: 'UPDATE_STATUS',
        buttonTitle: 'Update Status',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);
  };

  const unregisterFromPushNotifications = useCallback(async (): Promise<void> => {
    try {
      if (expoPushToken) {
        // Unregister token from backend
        await notificationService.unregisterPushToken(expoPushToken);
      }

      // Clear stored token
      await secureStorage.removeItem('expo_push_token');
      setExpoPushToken(null);
      setIsRegistered(false);

      console.log('Unregistered from push notifications');
    } catch (error) {
      console.error('Error unregistering from push notifications:', error);
    }
  }, [expoPushToken]);

  const sendLocalNotification = useCallback(async (
    title: string,
    body: string,
    data?: any
  ): Promise<void> => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }, []);

  const clearBadgeCount = useCallback(async (): Promise<void> => {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge count:', error);
    }
  }, []);

  const clearNotifications = useCallback(async (): Promise<void> => {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await clearBadgeCount();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }, [clearBadgeCount]);

  const scheduleNotification = useCallback(async (
    title: string,
    body: string,
    scheduledTime: Date,
    data?: any
  ): Promise<string | null> => {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: {
          date: scheduledTime,
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }, []);

  const cancelNotification = useCallback(async (notificationId: string): Promise<void> => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }, []);

  const getPendingNotifications = useCallback(async (): Promise<Notifications.NotificationRequest[]> => {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }, []);

  return {
    expoPushToken,
    isRegistered,
    isLoading,
    registerForPushNotifications,
    unregisterFromPushNotifications,
    sendLocalNotification,
    clearBadgeCount,
    clearNotifications,
    scheduleNotification,
    cancelNotification,
    getPendingNotifications,
  };
};

export default usePushNotifications;