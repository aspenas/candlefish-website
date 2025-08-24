import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { inventoryRepository } from '../database/repositories/InventoryRepository';
import { client } from '../graphql/client';
import { LOW_STOCK_ALERT } from '../graphql/schema';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationSettings {
  lowStockEnabled: boolean;
  outOfStockEnabled: boolean;
  reorderPointEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  badgeEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string;   // "08:00"
  categories: string[];    // Categories to monitor
}

const DEFAULT_SETTINGS: NotificationSettings = {
  lowStockEnabled: true,
  outOfStockEnabled: true,
  reorderPointEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  badgeEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  categories: [],
};

export class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;
  private subscription: any = null;
  private settings: NotificationSettings = DEFAULT_SETTINGS;
  private lastLowStockCheck: Date = new Date(0);

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load settings from storage
      await this.loadSettings();

      // Request permissions
      await this.requestPermissions();

      // Register for push notifications
      await this.registerForPushNotifications();

      // Set up subscription for real-time alerts
      this.subscribeToLowStockAlerts();

      // Schedule periodic low stock checks
      this.schedulePeriodicChecks();

      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  private async requestPermissions(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.log('Push notifications are not available on simulator');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  private async registerForPushNotifications(): Promise<void> {
    try {
      if (Device.isDevice) {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        this.pushToken = token;

        // Store token locally for offline access
        await AsyncStorage.setItem('push_token', token);

        // Register token with backend
        await this.registerTokenWithBackend(token);

        console.log('Push token registered:', token);
      }

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await this.createNotificationChannels();
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  }

  private async createNotificationChannels(): Promise<void> {
    try {
      // Low stock alerts channel
      await Notifications.setNotificationChannelAsync('low-stock', {
        name: 'Low Stock Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B35',
        sound: 'default',
      });

      // Out of stock alerts channel
      await Notifications.setNotificationChannelAsync('out-of-stock', {
        name: 'Out of Stock Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#FF0000',
        sound: 'default',
      });

      // Reorder point alerts channel
      await Notifications.setNotificationChannelAsync('reorder-point', {
        name: 'Reorder Point Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#FFA500',
        sound: 'default',
      });

      // General inventory updates
      await Notifications.setNotificationChannelAsync('inventory-updates', {
        name: 'Inventory Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        lightColor: '#007AFF',
        sound: 'default',
      });
    } catch (error) {
      console.error('Error creating notification channels:', error);
    }
  }

  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      // TODO: Implement GraphQL mutation to register push token
      // This would typically send the token to your backend
      console.log('Registering push token with backend:', token);
    } catch (error) {
      console.error('Failed to register token with backend:', error);
    }
  }

  private subscribeToLowStockAlerts(): void {
    try {
      this.subscription = client
        .subscribe({
          query: LOW_STOCK_ALERT,
        })
        .subscribe({
          next: ({ data }) => {
            if (data?.lowStockAlert) {
              this.handleLowStockAlert(data.lowStockAlert);
            }
          },
          error: (error) => {
            console.error('Low stock subscription error:', error);
          },
        });
    } catch (error) {
      console.error('Failed to subscribe to low stock alerts:', error);
    }
  }

  private async handleLowStockAlert(alert: any): Promise<void> {
    const { item, threshold, currentQuantity, alertType } = alert;

    if (!this.shouldSendNotification(alertType)) {
      return;
    }

    let title = '';
    let body = '';
    let channelId = '';

    switch (alertType) {
      case 'LOW_STOCK':
        title = 'Low Stock Alert';
        body = `${item.name} is running low (${currentQuantity} remaining)`;
        channelId = 'low-stock';
        break;
      case 'OUT_OF_STOCK':
        title = 'Out of Stock Alert';
        body = `${item.name} is out of stock!`;
        channelId = 'out-of-stock';
        break;
      case 'REORDER_POINT':
        title = 'Reorder Point Reached';
        body = `Time to reorder ${item.name} (${currentQuantity} left)`;
        channelId = 'reorder-point';
        break;
    }

    await this.sendLocalNotification({
      title,
      body,
      data: {
        itemId: item.id,
        alertType,
        currentQuantity,
        threshold,
      },
      channelId,
    });
  }

  private shouldSendNotification(alertType: string): boolean {
    // Check if notifications are enabled for this type
    switch (alertType) {
      case 'LOW_STOCK':
        if (!this.settings.lowStockEnabled) return false;
        break;
      case 'OUT_OF_STOCK':
        if (!this.settings.outOfStockEnabled) return false;
        break;
      case 'REORDER_POINT':
        if (!this.settings.reorderPointEnabled) return false;
        break;
      default:
        return false;
    }

    // Check quiet hours
    if (this.settings.quietHoursEnabled && this.isInQuietHours()) {
      return false;
    }

    return true;
  }

  private isInQuietHours(): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMinute] = this.settings.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = this.settings.quietHoursEnd.split(':').map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      // Same day quiet hours
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight quiet hours
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private async sendLocalNotification({
    title,
    body,
    data,
    channelId,
    delay = 0,
  }: {
    title: string;
    body: string;
    data?: any;
    channelId?: string;
    delay?: number;
  }): Promise<void> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: this.settings.soundEnabled ? 'default' : undefined,
          vibrate: this.settings.vibrationEnabled ? [0, 250, 250, 250] : undefined,
          badge: this.settings.badgeEnabled ? 1 : undefined,
        },
        trigger: delay > 0 ? { seconds: delay } : null,
      });

      console.log('Local notification sent:', notificationId);
    } catch (error) {
      console.error('Failed to send local notification:', error);
    }
  }

  private schedulePeriodicChecks(): void {
    // Check for low stock items every hour
    setInterval(async () => {
      try {
        const now = new Date();
        const hoursSinceLastCheck = (now.getTime() - this.lastLowStockCheck.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastCheck >= 1) {
          await this.checkLowStockItems();
          this.lastLowStockCheck = now;
        }
      } catch (error) {
        console.error('Error in periodic low stock check:', error);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  private async checkLowStockItems(): Promise<void> {
    try {
      const lowStockItems = await inventoryRepository.findLowStock();

      for (const item of lowStockItems) {
        if (item.quantity === 0) {
          await this.sendLocalNotification({
            title: 'Out of Stock Alert',
            body: `${item.name} is out of stock!`,
            data: { itemId: item.id, alertType: 'OUT_OF_STOCK' },
            channelId: 'out-of-stock',
          });
        } else if (item.quantity <= item.minQuantity) {
          await this.sendLocalNotification({
            title: 'Low Stock Alert',
            body: `${item.name} is running low (${item.quantity} remaining)`,
            data: { itemId: item.id, alertType: 'LOW_STOCK' },
            channelId: 'low-stock',
          });
        }
      }
    } catch (error) {
      console.error('Error checking low stock items:', error);
    }
  }

  // Public methods for managing notifications
  async updateSettings(newSettings: Partial<NotificationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
  }

  async getSettings(): Promise<NotificationSettings> {
    return { ...this.settings };
  }

  private async loadSettings(): Promise<void> {
    try {
      const settingsJson = await AsyncStorage.getItem('notification_settings');
      if (settingsJson) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) };
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  // Manually trigger low stock check (for testing or manual refresh)
  async manualLowStockCheck(): Promise<void> {
    await this.checkLowStockItems();
  }

  // Send test notification
  async sendTestNotification(): Promise<void> {
    await this.sendLocalNotification({
      title: 'Test Notification',
      body: 'Inventory notifications are working correctly!',
      channelId: 'inventory-updates',
    });
  }

  // Clean up resources
  dispose(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}

export const notificationService = NotificationService.getInstance();
