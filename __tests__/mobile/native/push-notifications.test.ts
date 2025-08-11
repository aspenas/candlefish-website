import { PushNotificationService } from '../../../apps/mobile-dashboard/src/services/push-notifications';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock Expo Notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
  dismissAllNotificationsAsync: jest.fn(),
  getPresentedNotificationsAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
  AndroidImportance: {
    MIN: 1,
    LOW: 2,
    DEFAULT: 3,
    HIGH: 4,
    MAX: 5,
  },
  NotificationContent: {},
  NotificationTrigger: {},
  NotificationRequest: {},
  NotificationResponse: {},
}));

// Mock Expo Device
jest.mock('expo-device', () => ({
  isDevice: true,
  deviceType: 2,
  deviceName: 'Test Device',
  osName: 'iOS',
  osVersion: '16.0',
  modelName: 'iPhone 14',
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

describe('PushNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    PushNotificationService['instance'] = undefined;
  });

  describe('Initialization', () => {
    it('should initialize notification handler and permissions', async () => {
      // Arrange
      (Device.isDevice as boolean) = true;
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'ExponentPushToken[test-token]',
      });

      // Act
      await PushNotificationService.initialize();

      // Assert
      expect(Notifications.setNotificationHandler).toHaveBeenCalledWith({
        handleNotification: expect.any(Function),
      });
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
    });

    it('should handle initialization on non-device environments', async () => {
      // Arrange
      (Device.isDevice as boolean) = false;

      // Act
      const result = await PushNotificationService.initialize();

      // Assert
      expect(result).toBe(false);
      expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      // Arrange
      (Device.isDevice as boolean) = true;
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permissions check failed')
      );

      // Act & Assert
      await expect(PushNotificationService.initialize()).resolves.not.toThrow();
    });
  });

  describe('Permission Management', () => {
    beforeEach(async () => {
      (Device.isDevice as boolean) = true;
      await PushNotificationService.initialize();
    });

    it('should check permissions status', async () => {
      // Arrange
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });

      // Act
      const result = await PushNotificationService.checkPermissions();

      // Assert
      expect(result).toEqual({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
    });

    it('should request permissions when not granted', async () => {
      // Arrange
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'undetermined',
        canAskAgain: true,
        granted: false,
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
      });

      // Act
      const result = await PushNotificationService.requestPermissions();

      // Assert
      expect(result.granted).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should handle permission denial gracefully', async () => {
      // Arrange
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
        canAskAgain: false,
        granted: false,
      });

      // Act
      const result = await PushNotificationService.requestPermissions();

      // Assert
      expect(result.granted).toBe(false);
      expect(result.status).toBe('denied');
    });

    it('should handle permission errors', async () => {
      // Arrange
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission check failed')
      );

      // Act
      const result = await PushNotificationService.checkPermissions();

      // Assert
      expect(result.granted).toBe(false);
      expect(result.status).toBe('unknown');
    });
  });

  describe('Push Token Management', () => {
    beforeEach(async () => {
      (Device.isDevice as boolean) = true;
      await PushNotificationService.initialize();
    });

    it('should get and cache push token', async () => {
      // Arrange
      const mockToken = 'ExponentPushToken[test-token]';
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: mockToken,
      });

      // Act
      const token = await PushNotificationService.getPushToken();

      // Assert
      expect(token).toBe(mockToken);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('push_token', mockToken);
    });

    it('should return cached token if available', async () => {
      // Arrange
      const cachedToken = 'ExponentPushToken[cached-token]';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(cachedToken);

      // Act
      const token = await PushNotificationService.getPushToken();

      // Assert
      expect(token).toBe(cachedToken);
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });

    it('should handle token generation errors', async () => {
      // Arrange
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
        new Error('Token generation failed')
      );

      // Act
      const token = await PushNotificationService.getPushToken();

      // Assert
      expect(token).toBeNull();
    });

    it('should register token with backend', async () => {
      // Arrange
      const mockToken = 'ExponentPushToken[test-token]';
      const mockUserId = 'user-123';
      const mockOrganizationId = 'org-123';

      // Mock the registerToken method's network call
      const mockRegisterToken = jest.fn().mockResolvedValue({ success: true });
      PushNotificationService['registerTokenWithBackend'] = mockRegisterToken;

      // Act
      await PushNotificationService.registerToken(mockUserId, mockOrganizationId);

      // Assert
      expect(mockRegisterToken).toHaveBeenCalledWith(
        mockToken,
        mockUserId,
        mockOrganizationId,
        expect.objectContaining({
          deviceType: expect.any(String),
          osVersion: expect.any(String),
        })
      );
    });
  });

  describe('Local Notifications', () => {
    beforeEach(async () => {
      (Device.isDevice as boolean) = true;
      await PushNotificationService.initialize();
    });

    it('should schedule local notification', async () => {
      // Arrange
      const notificationContent = {
        title: 'Test Notification',
        body: 'This is a test notification',
        data: { screen: 'Dashboard', id: '123' },
      };
      const trigger = { seconds: 10 };

      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(
        'notification-id-123'
      );

      // Act
      const notificationId = await PushNotificationService.scheduleLocalNotification(
        notificationContent,
        trigger
      );

      // Assert
      expect(notificationId).toBe('notification-id-123');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: notificationContent,
        trigger,
      });
    });

    it('should cancel scheduled notification', async () => {
      // Arrange
      const notificationId = 'notification-id-123';

      // Act
      await PushNotificationService.cancelScheduledNotification(notificationId);

      // Assert
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        notificationId
      );
    });

    it('should cancel all scheduled notifications', async () => {
      // Act
      await PushNotificationService.cancelAllScheduledNotifications();

      // Assert
      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });

    it('should handle notification scheduling errors', async () => {
      // Arrange
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        new Error('Scheduling failed')
      );

      // Act
      const notificationId = await PushNotificationService.scheduleLocalNotification(
        { title: 'Test', body: 'Test' },
        { seconds: 10 }
      );

      // Assert
      expect(notificationId).toBeNull();
    });
  });

  describe('Badge Management', () => {
    beforeEach(async () => {
      (Device.isDevice as boolean) = true;
      await PushNotificationService.initialize();
    });

    it('should get badge count', async () => {
      // Arrange
      (Notifications.getBadgeCountAsync as jest.Mock).mockResolvedValue(5);

      // Act
      const count = await PushNotificationService.getBadgeCount();

      // Assert
      expect(count).toBe(5);
      expect(Notifications.getBadgeCountAsync).toHaveBeenCalled();
    });

    it('should set badge count', async () => {
      // Arrange
      const newCount = 3;

      // Act
      await PushNotificationService.setBadgeCount(newCount);

      // Assert
      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(newCount);
    });

    it('should clear badge count', async () => {
      // Act
      await PushNotificationService.clearBadgeCount();

      // Assert
      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
    });

    it('should handle badge count errors', async () => {
      // Arrange
      (Notifications.getBadgeCountAsync as jest.Mock).mockRejectedValue(
        new Error('Badge count failed')
      );

      // Act
      const count = await PushNotificationService.getBadgeCount();

      // Assert
      expect(count).toBe(0);
    });
  });

  describe('Notification Listeners', () => {
    beforeEach(async () => {
      (Device.isDevice as boolean) = true;
      await PushNotificationService.initialize();
    });

    it('should add notification received listener', () => {
      // Arrange
      const mockListener = jest.fn();
      const mockSubscription = { remove: jest.fn() };
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );

      // Act
      const subscription = PushNotificationService.addNotificationReceivedListener(
        mockListener
      );

      // Assert
      expect(subscription).toBe(mockSubscription);
      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalledWith(
        mockListener
      );
    });

    it('should add notification response listener', () => {
      // Arrange
      const mockListener = jest.fn();
      const mockSubscription = { remove: jest.fn() };
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );

      // Act
      const subscription = PushNotificationService.addNotificationResponseListener(
        mockListener
      );

      // Assert
      expect(subscription).toBe(mockSubscription);
      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(
        mockListener
      );
    });

    it('should handle notification received', async () => {
      // Arrange
      const mockNotification = {
        request: {
          identifier: 'notif-123',
          content: {
            title: 'Test Notification',
            body: 'Test body',
            data: { screen: 'Dashboard' },
          },
        },
      };

      let receivedListener: (notification: any) => void = () => {};
      (Notifications.addNotificationReceivedListener as jest.Mock).mockImplementation(
        (listener) => {
          receivedListener = listener;
          return { remove: jest.fn() };
        }
      );

      const handleNotificationReceived = jest.fn();
      PushNotificationService.addNotificationReceivedListener(handleNotificationReceived);

      // Act
      receivedListener(mockNotification);

      // Assert
      expect(handleNotificationReceived).toHaveBeenCalledWith(mockNotification);
    });

    it('should handle notification response', async () => {
      // Arrange
      const mockResponse = {
        notification: {
          request: {
            identifier: 'notif-123',
            content: {
              title: 'Test Notification',
              data: { screen: 'Dashboard', id: '123' },
            },
          },
        },
        actionIdentifier: 'default',
        userText: undefined,
      };

      let responseListener: (response: any) => void = () => {};
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementation(
        (listener) => {
          responseListener = listener;
          return { remove: jest.fn() };
        }
      );

      const handleNotificationResponse = jest.fn();
      PushNotificationService.addNotificationResponseListener(handleNotificationResponse);

      // Act
      responseListener(mockResponse);

      // Assert
      expect(handleNotificationResponse).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('Notification Categories and Actions', () => {
    it('should configure notification categories for iOS', async () => {
      // Arrange
      Platform.OS = 'ios';
      const mockSetNotificationCategoryAsync = jest.fn();
      Notifications.setNotificationCategoryAsync = mockSetNotificationCategoryAsync;

      // Act
      await PushNotificationService.configureNotificationCategories();

      // Assert
      expect(mockSetNotificationCategoryAsync).toHaveBeenCalledWith('dashboard_alert', [
        expect.objectContaining({
          identifier: 'view',
          buttonTitle: 'View Dashboard',
        }),
        expect.objectContaining({
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
        }),
      ]);
    });

    it('should handle Android notification channels', async () => {
      // Arrange
      Platform.OS = 'android';
      const mockSetNotificationChannelAsync = jest.fn();
      Notifications.setNotificationChannelAsync = mockSetNotificationChannelAsync;

      // Act
      await PushNotificationService.configureNotificationChannels();

      // Assert
      expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('dashboard_alerts', {
        name: 'Dashboard Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    });
  });

  describe('Analytics and Tracking', () => {
    it('should track notification delivery', async () => {
      // Arrange
      const notificationId = 'notif-123';
      const userId = 'user-123';
      const organizationId = 'org-123';

      const mockTrackDelivery = jest.fn().mockResolvedValue({ success: true });
      PushNotificationService['trackNotificationDelivery'] = mockTrackDelivery;

      // Act
      await PushNotificationService.trackDelivery(notificationId, userId, organizationId);

      // Assert
      expect(mockTrackDelivery).toHaveBeenCalledWith(
        notificationId,
        userId,
        organizationId,
        'delivered'
      );
    });

    it('should track notification interaction', async () => {
      // Arrange
      const notificationId = 'notif-123';
      const userId = 'user-123';
      const action = 'tapped';

      const mockTrackInteraction = jest.fn().mockResolvedValue({ success: true });
      PushNotificationService['trackNotificationInteraction'] = mockTrackInteraction;

      // Act
      await PushNotificationService.trackInteraction(notificationId, userId, action);

      // Assert
      expect(mockTrackInteraction).toHaveBeenCalledWith(
        notificationId,
        userId,
        action,
        expect.any(Number) // timestamp
      );
    });

    it('should get notification statistics', async () => {
      // Arrange
      const userId = 'user-123';
      const timeRange = { start: '2024-01-01', end: '2024-01-31' };

      const mockStats = {
        delivered: 100,
        opened: 75,
        clicked: 25,
        dismissed: 50,
      };

      const mockGetStats = jest.fn().mockResolvedValue(mockStats);
      PushNotificationService['getNotificationStatistics'] = mockGetStats;

      // Act
      const stats = await PushNotificationService.getStatistics(userId, timeRange);

      // Assert
      expect(stats).toEqual(mockStats);
      expect(mockGetStats).toHaveBeenCalledWith(userId, timeRange);
    });
  });

  describe('Notification Settings', () => {
    it('should save user notification preferences', async () => {
      // Arrange
      const preferences = {
        enablePushNotifications: true,
        enableDashboardAlerts: true,
        enableSystemNotifications: false,
        quietHours: { start: '22:00', end: '08:00' },
        categories: {
          alerts: true,
          reports: true,
          updates: false,
        },
      };

      // Act
      await PushNotificationService.saveNotificationPreferences(preferences);

      // Assert
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'notification_preferences',
        JSON.stringify(preferences)
      );
    });

    it('should load user notification preferences', async () => {
      // Arrange
      const preferences = {
        enablePushNotifications: true,
        enableDashboardAlerts: true,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(preferences)
      );

      // Act
      const result = await PushNotificationService.getNotificationPreferences();

      // Assert
      expect(result).toEqual(preferences);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('notification_preferences');
    });

    it('should return default preferences when none saved', async () => {
      // Arrange
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await PushNotificationService.getNotificationPreferences();

      // Assert
      expect(result).toEqual(expect.objectContaining({
        enablePushNotifications: true,
        enableDashboardAlerts: true,
        enableSystemNotifications: true,
      }));
    });

    it('should check if notifications are enabled during quiet hours', () => {
      // Arrange
      const preferences = {
        quietHours: { start: '22:00', end: '08:00' },
        enablePushNotifications: true,
      };

      // Mock current time to be during quiet hours (23:30)
      const mockDate = new Date('2024-01-01T23:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      // Act
      const isQuietTime = PushNotificationService.isQuietTime(preferences);

      // Assert
      expect(isQuietTime).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle notification permission errors gracefully', async () => {
      // Arrange
      (Device.isDevice as boolean) = true;
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(
        new Error('Permission system error')
      );

      // Act
      const result = await PushNotificationService.checkPermissions();

      // Assert
      expect(result.granted).toBe(false);
      expect(result.status).toBe('unknown');
    });

    it('should handle network errors when registering token', async () => {
      // Arrange
      const mockRegisterToken = jest.fn().mockRejectedValue(
        new Error('Network error')
      );
      PushNotificationService['registerTokenWithBackend'] = mockRegisterToken;

      // Act & Assert
      await expect(
        PushNotificationService.registerToken('user-123', 'org-123')
      ).resolves.not.toThrow();
    });

    it('should handle storage errors gracefully', async () => {
      // Arrange
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      // Act & Assert
      await expect(
        PushNotificationService.saveNotificationPreferences({
          enablePushNotifications: true,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Platform-Specific Behavior', () => {
    it('should handle iOS-specific notification features', async () => {
      // Arrange
      Platform.OS = 'ios';
      const mockSetNotificationCategoryAsync = jest.fn();
      Notifications.setNotificationCategoryAsync = mockSetNotificationCategoryAsync;

      // Act
      await PushNotificationService.configurePlatformSpecificFeatures();

      // Assert
      expect(mockSetNotificationCategoryAsync).toHaveBeenCalled();
    });

    it('should handle Android-specific notification features', async () => {
      // Arrange
      Platform.OS = 'android';
      const mockSetNotificationChannelAsync = jest.fn();
      Notifications.setNotificationChannelAsync = mockSetNotificationChannelAsync;

      // Act
      await PushNotificationService.configurePlatformSpecificFeatures();

      // Assert
      expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          importance: expect.any(Number),
          vibrationPattern: expect.any(Array),
        })
      );
    });

    it('should handle platform-specific token formats', async () => {
      // Arrange - Test iOS token format
      Platform.OS = 'ios';
      const iosToken = 'ExponentPushToken[ios-token-123]';
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: iosToken,
      });

      // Act
      const token = await PushNotificationService.getPushToken();

      // Assert
      expect(token).toBe(iosToken);
      expect(token).toContain('ExponentPushToken');

      // Test Android token format
      Platform.OS = 'android';
      const androidToken = 'ExponentPushToken[android-token-123]';
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: androidToken,
      });

      const androidTokenResult = await PushNotificationService.getPushToken();
      expect(androidTokenResult).toBe(androidToken);
    });
  });
});
