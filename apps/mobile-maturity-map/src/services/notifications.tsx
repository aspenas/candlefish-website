import React, { createContext, useContext, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '@/store';
import { NotificationPayload } from '@/types/assessment';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationContextType {
  expoPushToken: string | null;
  sendLocalNotification: (title: string, body: string, data?: any) => Promise<void>;
  scheduleAssessmentReminder: (assessmentId: string, title: string, scheduledTime: Date) => Promise<string>;
  cancelNotification: (notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const [expoPushToken, setExpoPushToken] = React.useState<string | null>(null);

  const { isAuthenticated, user } = useSelector((state: RootState) => ({
    isAuthenticated: state.auth.isAuthenticated,
    user: state.auth.user,
  }));

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotificationsAsync().then(token => setExpoPushToken(token));
    }

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data as NotificationPayload;
      handleNotificationReceived(data);
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as NotificationPayload;
      handleNotificationResponse(data);
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated]);

  const handleNotificationReceived = (data: NotificationPayload) => {
    // Handle notification received while app is open
    console.log('Notification received:', data);
    
    // Update app state based on notification type
    switch (data.type) {
      case 'assessment_update':
        // Refresh assessment data
        break;
      case 'processing_complete':
        // Show success message or navigate to results
        break;
      case 'sync_error':
        // Show error state
        break;
    }
  };

  const handleNotificationResponse = (data: NotificationPayload) => {
    // Handle notification tap/interaction
    console.log('Notification response:', data);
    
    // Navigate to relevant screen based on notification type
    switch (data.type) {
      case 'assessment_update':
        if (data.assessmentId) {
          // Navigate to assessment detail screen
          // navigation.navigate('AssessmentDetail', { id: data.assessmentId });
        }
        break;
      case 'processing_complete':
        // Navigate to results or dashboard
        break;
    }
  };

  const sendLocalNotification = async (title: string, body: string, data?: any) => {
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
  };

  const scheduleAssessmentReminder = async (
    assessmentId: string,
    title: string,
    scheduledTime: Date
  ): Promise<string> => {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Assessment Reminder',
          body: `Don't forget to complete: ${title}`,
          data: {
            type: 'reminder',
            assessmentId,
          },
          sound: 'default',
        },
        trigger: {
          date: scheduledTime,
        },
      });
      
      return notificationId;
    } catch (error) {
      console.error('Error scheduling assessment reminder:', error);
      throw error;
    }
  };

  const cancelNotification = async (notificationId: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  };

  const contextValue: NotificationContextType = {
    expoPushToken,
    sendLocalNotification,
    scheduleAssessmentReminder,
    cancelNotification,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'candlefish-maturity-map', // Replace with your Expo project ID
      })).data;
      
      console.log('Expo push token:', token);
    } catch (error) {
      console.error('Error getting Expo push token:', error);
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  return token;
}