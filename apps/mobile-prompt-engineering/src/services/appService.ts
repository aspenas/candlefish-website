import * as Font from 'expo-font';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import NetInfo from '@react-native-community/netinfo';

import { store } from '@/store';
import { setNetworkStatus } from '@/store/slices/offlineSlice';

/**
 * Initialize the app with all required services
 */
export async function initializeApp(): Promise<void> {
  try {
    // Initialize notification handling
    await initializeNotifications();
    
    // Setup network monitoring
    setupNetworkMonitoring();
    
    // Load cached user session
    await loadUserSession();
    
    console.log('App initialized successfully');
  } catch (error) {
    console.error('App initialization failed:', error);
    throw error;
  }
}

/**
 * Initialize push notifications
 */
async function initializeNotifications(): Promise<void> {
  // Configure notification handling
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  // Request permissions on iOS
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.warn('Failed to get push notification permissions');
    return;
  }

  // Configure notification categories
  await Notifications.setNotificationCategoryAsync('execution_complete', [
    {
      identifier: 'view_result',
      buttonTitle: 'View Result',
      options: { opensAppToForeground: true }
    },
    {
      identifier: 'dismiss',
      buttonTitle: 'Dismiss',
      options: { opensAppToForeground: false }
    }
  ]);

  await Notifications.setNotificationCategoryAsync('error_alert', [
    {
      identifier: 'retry',
      buttonTitle: 'Retry',
      options: { opensAppToForeground: true }
    },
    {
      identifier: 'view_error',
      buttonTitle: 'View Details',
      options: { opensAppToForeground: true }
    }
  ]);
}

/**
 * Setup network monitoring
 */
function setupNetworkMonitoring(): void {
  NetInfo.addEventListener(state => {
    const networkStatus = {
      isConnected: state.isConnected ?? false,
      type: state.type as 'wifi' | 'cellular' | 'none',
      isInternetReachable: state.isInternetReachable ?? false,
    };
    
    store.dispatch(setNetworkStatus(networkStatus));
  });
}

/**
 * Load cached user session if available
 */
async function loadUserSession(): Promise<void> {
  try {
    const userSession = await SecureStore.getItemAsync('user_session');
    if (userSession) {
      const userData = JSON.parse(userSession);
      store.dispatch({ type: 'auth/setUser', payload: userData });
    }
  } catch (error) {
    console.warn('Failed to load cached user session:', error);
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleNotification(
  title: string,
  body: string,
  data?: any,
  categoryIdentifier?: string
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      categoryIdentifier,
    },
    trigger: null, // Show immediately
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}