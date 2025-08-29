// Push Notification Channels Service for Mobile Security Dashboard
// Manages severity-based notification channels with different behaviors and priorities

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { environmentConfig } from '@/config/environment';
import { crashReportingService } from './crashReporting';

// Types
export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  importance: 'min' | 'low' | 'default' | 'high' | 'max';
  sound?: string;
  vibrationPattern?: number[];
  lightColor?: string;
  badge?: boolean;
  showBanner?: boolean;
  allowInDoNotDisturb?: boolean;
  groupId?: string;
  lockscreenVisibility?: 'public' | 'private' | 'secret';
}

export interface NotificationChannelGroup {
  id: string;
  name: string;
  description: string;
  channels: NotificationChannel[];
}

export interface ChannelSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  badgeEnabled: boolean;
  bannerEnabled: boolean;
  lockScreenEnabled: boolean;
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
    allowCritical: boolean;
  };
  customSettings?: Record<string, any>;
}

export interface NotificationPreferences {
  channels: Record<string, ChannelSettings>;
  globalSettings: {
    masterEnabled: boolean;
    doNotDisturbRespect: boolean;
    groupedNotifications: boolean;
    maxNotificationsPerHour: number;
    intelligentScheduling: boolean;
  };
}

class NotificationChannelsService {
  private static instance: NotificationChannelsService;
  private isInitialized = false;
  private channelGroups: NotificationChannelGroup[] = [];
  private preferences: NotificationPreferences;
  private notificationCounts: Record<string, { count: number; resetTime: number }> = {};

  private constructor() {
    this.preferences = this.getDefaultPreferences();
  }

  static getInstance(): NotificationChannelsService {
    if (!NotificationChannelsService.instance) {
      NotificationChannelsService.instance = new NotificationChannelsService();
    }
    return NotificationChannelsService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load user preferences
      await this.loadPreferences();

      // Create notification channel groups
      await this.createChannelGroups();

      // Set up notification channels
      await this.setupNotificationChannels();

      // Set up notification categories with actions
      await this.setupNotificationCategories();

      this.isInitialized = true;
      console.log('Notification channels service initialized');
      crashReportingService.addBreadcrumb('Notification channels initialized', 'notifications', 'info');

    } catch (error) {
      console.error('Failed to initialize notification channels service:', error);
      crashReportingService.reportError(error as Error, {
        component: 'NotificationChannelsService',
        action: 'initialize',
      });
    }
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      channels: {
        'security-critical': {
          enabled: true,
          soundEnabled: true,
          vibrationEnabled: true,
          badgeEnabled: true,
          bannerEnabled: true,
          lockScreenEnabled: true,
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
            allowCritical: true,
          },
        },
        'security-high': {
          enabled: true,
          soundEnabled: true,
          vibrationEnabled: true,
          badgeEnabled: true,
          bannerEnabled: true,
          lockScreenEnabled: true,
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '08:00',
            allowCritical: false,
          },
        },
        'security-medium': {
          enabled: true,
          soundEnabled: false,
          vibrationEnabled: true,
          badgeEnabled: true,
          bannerEnabled: true,
          lockScreenEnabled: false,
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '08:00',
            allowCritical: false,
          },
        },
        'security-low': {
          enabled: true,
          soundEnabled: false,
          vibrationEnabled: false,
          badgeEnabled: true,
          bannerEnabled: false,
          lockScreenEnabled: false,
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '08:00',
            allowCritical: false,
          },
        },
        'security-info': {
          enabled: true,
          soundEnabled: false,
          vibrationEnabled: false,
          badgeEnabled: true,
          bannerEnabled: false,
          lockScreenEnabled: false,
          quietHours: {
            enabled: true,
            start: '20:00',
            end: '09:00',
            allowCritical: false,
          },
        },
        'kong-vulnerabilities': {
          enabled: true,
          soundEnabled: true,
          vibrationEnabled: true,
          badgeEnabled: true,
          bannerEnabled: true,
          lockScreenEnabled: true,
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
            allowCritical: true,
          },
        },
        'location-security': {
          enabled: true,
          soundEnabled: true,
          vibrationEnabled: true,
          badgeEnabled: true,
          bannerEnabled: true,
          lockScreenEnabled: true,
        },
        'system-status': {
          enabled: true,
          soundEnabled: false,
          vibrationEnabled: false,
          badgeEnabled: false,
          bannerEnabled: false,
          lockScreenEnabled: false,
          quietHours: {
            enabled: true,
            start: '18:00',
            end: '10:00',
            allowCritical: false,
          },
        },
      },
      globalSettings: {
        masterEnabled: true,
        doNotDisturbRespect: true,
        groupedNotifications: true,
        maxNotificationsPerHour: 20,
        intelligentScheduling: true,
      },
    };
  }

  private async loadPreferences(): Promise<void> {
    try {
      const preferencesJson = await AsyncStorage.getItem('notification_channel_preferences');
      if (preferencesJson) {
        const storedPrefs = JSON.parse(preferencesJson);
        this.preferences = { ...this.preferences, ...storedPrefs };
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  }

  private async savePreferences(): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_channel_preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  }

  private async createChannelGroups(): Promise<void> {
    this.channelGroups = [
      {
        id: 'security-alerts',
        name: 'Security Alerts',
        description: 'Critical security threats and vulnerabilities',
        channels: [
          {
            id: 'security-critical',
            name: 'Critical Security Threats',
            description: 'Immediate action required - highest priority security events',
            importance: 'max',
            sound: 'critical-alert.wav',
            vibrationPattern: [0, 100, 200, 100, 200, 100],
            lightColor: '#FF0000',
            badge: true,
            showBanner: true,
            allowInDoNotDisturb: true,
            groupId: 'security-alerts',
            lockscreenVisibility: 'public',
          },
          {
            id: 'security-high',
            name: 'High Priority Security Events',
            description: 'Important security events requiring attention',
            importance: 'high',
            sound: 'high-alert.wav',
            vibrationPattern: [0, 150, 300, 150],
            lightColor: '#FF4500',
            badge: true,
            showBanner: true,
            allowInDoNotDisturb: false,
            groupId: 'security-alerts',
            lockscreenVisibility: 'public',
          },
          {
            id: 'security-medium',
            name: 'Medium Priority Security Events',
            description: 'Notable security events for awareness',
            importance: 'default',
            vibrationPattern: [0, 200, 400],
            lightColor: '#FFA500',
            badge: true,
            showBanner: true,
            allowInDoNotDisturb: false,
            groupId: 'security-alerts',
            lockscreenVisibility: 'private',
          },
          {
            id: 'security-low',
            name: 'Low Priority Security Events',
            description: 'Minor security events and updates',
            importance: 'low',
            lightColor: '#FFFF00',
            badge: true,
            showBanner: false,
            allowInDoNotDisturb: false,
            groupId: 'security-alerts',
            lockscreenVisibility: 'private',
          },
          {
            id: 'security-info',
            name: 'Security Information',
            description: 'General security updates and information',
            importance: 'min',
            lightColor: '#00FF00',
            badge: false,
            showBanner: false,
            allowInDoNotDisturb: false,
            groupId: 'security-alerts',
            lockscreenVisibility: 'secret',
          },
        ],
      },
      {
        id: 'specialized-alerts',
        name: 'Specialized Security Alerts',
        description: 'Specific security system alerts',
        channels: [
          {
            id: 'kong-vulnerabilities',
            name: 'Kong API Gateway Vulnerabilities',
            description: 'Kong API gateway security vulnerabilities and patches',
            importance: 'high',
            sound: 'api-alert.wav',
            vibrationPattern: [0, 100, 100, 100, 100, 100],
            lightColor: '#0066CC',
            badge: true,
            showBanner: true,
            allowInDoNotDisturb: true,
            groupId: 'specialized-alerts',
            lockscreenVisibility: 'public',
          },
          {
            id: 'location-security',
            name: 'Location-Based Security',
            description: 'Geofence and location-based security events',
            importance: 'high',
            sound: 'location-alert.wav',
            vibrationPattern: [0, 150, 100, 150, 100],
            lightColor: '#9400D3',
            badge: true,
            showBanner: true,
            allowInDoNotDisturb: false,
            groupId: 'specialized-alerts',
            lockscreenVisibility: 'public',
          },
        ],
      },
      {
        id: 'system-notifications',
        name: 'System Notifications',
        description: 'App status and system updates',
        channels: [
          {
            id: 'system-status',
            name: 'System Status Updates',
            description: 'App connectivity, sync status, and system health',
            importance: 'low',
            lightColor: '#808080',
            badge: false,
            showBanner: false,
            allowInDoNotDisturb: false,
            groupId: 'system-notifications',
            lockscreenVisibility: 'secret',
          },
        ],
      },
    ];
  }

  private async setupNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') {
      return; // Notification channels are Android-specific
    }

    try {
      // Create channel groups first
      for (const group of this.channelGroups) {
        await Notifications.setNotificationChannelGroupAsync(group.id, {
          name: group.name,
          description: group.description,
        });
      }

      // Create individual channels
      for (const group of this.channelGroups) {
        for (const channel of group.channels) {
          const channelSettings = this.preferences.channels[channel.id];
          
          await Notifications.setNotificationChannelAsync(channel.id, {
            name: channel.name,
            description: channel.description,
            importance: this.mapImportanceToAndroid(channel.importance),
            sound: channelSettings?.soundEnabled && channel.sound ? channel.sound : undefined,
            vibrationPattern: channelSettings?.vibrationEnabled && channel.vibrationPattern ? 
              channel.vibrationPattern : undefined,
            lightColor: channel.lightColor,
            showBadge: channelSettings?.badgeEnabled && channel.badge,
            lockscreenVisibility: this.mapLockscreenVisibility(channel.lockscreenVisibility),
            bypassDnd: channel.allowInDoNotDisturb && channelSettings?.enabled,
            groupId: channel.groupId,
          });
        }
      }

      console.log('Android notification channels created');

    } catch (error) {
      console.error('Error setting up Android notification channels:', error);
    }
  }

  private mapImportanceToAndroid(importance: NotificationChannel['importance']): Notifications.AndroidImportance {
    switch (importance) {
      case 'min':
        return Notifications.AndroidImportance.MIN;
      case 'low':
        return Notifications.AndroidImportance.LOW;
      case 'default':
        return Notifications.AndroidImportance.DEFAULT;
      case 'high':
        return Notifications.AndroidImportance.HIGH;
      case 'max':
        return Notifications.AndroidImportance.MAX;
      default:
        return Notifications.AndroidImportance.DEFAULT;
    }
  }

  private mapLockscreenVisibility(visibility?: string): Notifications.AndroidNotificationVisibility {
    switch (visibility) {
      case 'public':
        return Notifications.AndroidNotificationVisibility.PUBLIC;
      case 'private':
        return Notifications.AndroidNotificationVisibility.PRIVATE;
      case 'secret':
        return Notifications.AndroidNotificationVisibility.SECRET;
      default:
        return Notifications.AndroidNotificationVisibility.PRIVATE;
    }
  }

  private async setupNotificationCategories(): Promise<void> {
    // Set up iOS/general notification categories with quick actions
    const categories = [
      {
        identifier: 'CRITICAL_SECURITY_ALERT',
        actions: [
          {
            identifier: 'ACKNOWLEDGE_CRITICAL',
            buttonTitle: 'Acknowledge',
            options: {
              isDestructive: false,
              isAuthenticationRequired: true,
              opensAppToForeground: false,
            },
          },
          {
            identifier: 'VIEW_CRITICAL_DETAILS',
            buttonTitle: 'View Details',
            options: {
              isDestructive: false,
              isAuthenticationRequired: true,
              opensAppToForeground: true,
            },
          },
          {
            identifier: 'ESCALATE_CRITICAL',
            buttonTitle: 'Escalate',
            options: {
              isDestructive: true,
              isAuthenticationRequired: true,
              opensAppToForeground: true,
            },
          },
        ],
      },
      {
        identifier: 'HIGH_SECURITY_ALERT',
        actions: [
          {
            identifier: 'ACKNOWLEDGE_HIGH',
            buttonTitle: 'Acknowledge',
            options: {
              isDestructive: false,
              isAuthenticationRequired: false,
              opensAppToForeground: false,
            },
          },
          {
            identifier: 'VIEW_HIGH_DETAILS',
            buttonTitle: 'View Details',
            options: {
              isDestructive: false,
              isAuthenticationRequired: false,
              opensAppToForeground: true,
            },
          },
        ],
      },
      {
        identifier: 'KONG_VULNERABILITY',
        actions: [
          {
            identifier: 'FIX_KONG_VULNERABILITY',
            buttonTitle: 'Fix Now',
            options: {
              isDestructive: false,
              isAuthenticationRequired: true,
              opensAppToForeground: true,
            },
          },
          {
            identifier: 'VIEW_KONG_GUIDE',
            buttonTitle: 'View Guide',
            options: {
              isDestructive: false,
              isAuthenticationRequired: false,
              opensAppToForeground: true,
            },
          },
          {
            identifier: 'SNOOZE_KONG_ALERT',
            buttonTitle: 'Snooze 1h',
            options: {
              isDestructive: false,
              isAuthenticationRequired: false,
              opensAppToForeground: false,
            },
          },
        ],
      },
      {
        identifier: 'LOCATION_SECURITY',
        actions: [
          {
            identifier: 'VIEW_LOCATION_DETAILS',
            buttonTitle: 'View Location',
            options: {
              isDestructive: false,
              isAuthenticationRequired: false,
              opensAppToForeground: true,
            },
          },
          {
            identifier: 'ACKNOWLEDGE_LOCATION',
            buttonTitle: 'Acknowledge',
            options: {
              isDestructive: false,
              isAuthenticationRequired: false,
              opensAppToForeground: false,
            },
          },
        ],
      },
    ];

    for (const category of categories) {
      await Notifications.setNotificationCategoryAsync(
        category.identifier,
        category.actions.map(action => ({
          identifier: action.identifier,
          buttonTitle: action.buttonTitle,
          options: action.options,
        }))
      );
    }
  }

  // Public methods

  // Send notification through appropriate channel
  async sendChannelNotification(
    channelId: string,
    title: string,
    body: string,
    data: Record<string, any> = {},
    options: {
      categoryIdentifier?: string;
      priority?: 'min' | 'low' | 'default' | 'high' | 'max';
      tag?: string;
      group?: string;
      sticky?: boolean;
      sound?: string | boolean;
      vibrate?: boolean | number[];
      badge?: number;
      color?: string;
    } = {}
  ): Promise<string | null> {
    try {
      // Check if notifications are globally enabled
      if (!this.preferences.globalSettings.masterEnabled) {
        return null;
      }

      // Check channel-specific settings
      const channelSettings = this.preferences.channels[channelId];
      if (!channelSettings?.enabled) {
        return null;
      }

      // Check rate limiting
      if (!this.checkRateLimit(channelId)) {
        console.warn(`Rate limit exceeded for channel: ${channelId}`);
        return null;
      }

      // Check quiet hours
      if (!this.shouldSendDuringQuietHours(channelId, options.priority || 'default')) {
        await this.queueNotificationForLater(channelId, title, body, data, options);
        return null;
      }

      // Get channel configuration
      const channel = this.findChannel(channelId);
      if (!channel) {
        console.error(`Unknown notification channel: ${channelId}`);
        return null;
      }

      // Build notification content
      const notificationContent: any = {
        title,
        body,
        data: {
          ...data,
          channelId,
          timestamp: new Date().toISOString(),
        },
        categoryIdentifier: options.categoryIdentifier,
        priority: this.mapPriorityToNotification(options.priority || channel.importance),
        sound: this.determineSoundSetting(channelSettings, channel, options.sound),
        badge: options.badge,
        color: options.color || channel.lightColor,
      };

      // Android-specific settings
      if (Platform.OS === 'android') {
        notificationContent.channelId = channelId;
        notificationContent.tag = options.tag;
        notificationContent.group = options.group || channel.groupId;
        notificationContent.sticky = options.sticky;
        
        if (channelSettings.vibrationEnabled && (options.vibrate || channel.vibrationPattern)) {
          notificationContent.vibrate = Array.isArray(options.vibrate) ? 
            options.vibrate : channel.vibrationPattern;
        }
      }

      // Schedule notification
      const identifier = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Send immediately
      });

      // Update rate limiting counter
      this.updateRateLimit(channelId);

      // Log notification
      crashReportingService.addBreadcrumb(
        `Notification sent: ${channelId}`,
        'notifications',
        this.getLogLevel(options.priority || channel.importance),
        {
          title: title.substring(0, 50),
          channelId,
          identifier,
        }
      );

      return identifier;

    } catch (error) {
      console.error('Error sending channel notification:', error);
      crashReportingService.reportError(error as Error, {
        component: 'NotificationChannelsService',
        action: 'sendChannelNotification',
        extra: { channelId, title },
      });
      return null;
    }
  }

  private findChannel(channelId: string): NotificationChannel | null {
    for (const group of this.channelGroups) {
      const channel = group.channels.find(c => c.id === channelId);
      if (channel) return channel;
    }
    return null;
  }

  private checkRateLimit(channelId: string): boolean {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;

    if (!this.notificationCounts[channelId]) {
      this.notificationCounts[channelId] = { count: 0, resetTime: now + hourInMs };
      return true;
    }

    const channelCount = this.notificationCounts[channelId];

    // Reset counter if hour has passed
    if (now > channelCount.resetTime) {
      channelCount.count = 0;
      channelCount.resetTime = now + hourInMs;
    }

    // Check if under limit
    return channelCount.count < this.preferences.globalSettings.maxNotificationsPerHour;
  }

  private updateRateLimit(channelId: string): void {
    if (this.notificationCounts[channelId]) {
      this.notificationCounts[channelId].count++;
    }
  }

  private shouldSendDuringQuietHours(channelId: string, priority: string): boolean {
    const channelSettings = this.preferences.channels[channelId];
    const quietHours = channelSettings?.quietHours;

    if (!quietHours?.enabled) {
      return true;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    let inQuietHours: boolean;
    if (startTime < endTime) {
      inQuietHours = currentTime >= startTime && currentTime < endTime;
    } else {
      // Quiet hours span midnight
      inQuietHours = currentTime >= startTime || currentTime < endTime;
    }

    if (!inQuietHours) {
      return true;
    }

    // Check if critical notifications are allowed during quiet hours
    return quietHours.allowCritical && (priority === 'max' || priority === 'high');
  }

  private async queueNotificationForLater(
    channelId: string,
    title: string,
    body: string,
    data: Record<string, any>,
    options: any
  ): Promise<void> {
    try {
      const queuedNotification = {
        channelId,
        title,
        body,
        data,
        options,
        queuedAt: new Date().toISOString(),
      };

      const existingQueue = await AsyncStorage.getItem('queued_notifications');
      const queue = existingQueue ? JSON.parse(existingQueue) : [];
      queue.push(queuedNotification);

      // Keep only last 50 queued notifications
      if (queue.length > 50) {
        queue.splice(0, queue.length - 50);
      }

      await AsyncStorage.setItem('queued_notifications', JSON.stringify(queue));

    } catch (error) {
      console.error('Error queuing notification:', error);
    }
  }

  private determineSoundSetting(
    channelSettings: ChannelSettings,
    channel: NotificationChannel,
    optionSound?: string | boolean
  ): string | boolean | undefined {
    if (optionSound !== undefined) {
      return optionSound;
    }
    
    if (channelSettings.soundEnabled && channel.sound) {
      return channel.sound;
    }
    
    return channelSettings.soundEnabled;
  }

  private mapPriorityToNotification(importance: NotificationChannel['importance']): Notifications.NotificationPriority {
    switch (importance) {
      case 'min':
        return Notifications.NotificationPriority.LOW;
      case 'low':
        return Notifications.NotificationPriority.LOW;
      case 'default':
        return Notifications.NotificationPriority.DEFAULT;
      case 'high':
        return Notifications.NotificationPriority.HIGH;
      case 'max':
        return Notifications.NotificationPriority.MAX;
      default:
        return Notifications.NotificationPriority.DEFAULT;
    }
  }

  private getLogLevel(importance: NotificationChannel['importance']): 'debug' | 'info' | 'warning' | 'error' {
    switch (importance) {
      case 'max':
      case 'high':
        return 'warning';
      case 'default':
        return 'info';
      case 'low':
      case 'min':
      default:
        return 'debug';
    }
  }

  // Channel management
  async updateChannelSettings(channelId: string, settings: Partial<ChannelSettings>): Promise<void> {
    if (this.preferences.channels[channelId]) {
      this.preferences.channels[channelId] = {
        ...this.preferences.channels[channelId],
        ...settings,
      };
      
      await this.savePreferences();

      // Re-setup channels if on Android
      if (Platform.OS === 'android') {
        await this.setupNotificationChannels();
      }
    }
  }

  getChannelSettings(channelId: string): ChannelSettings | null {
    return this.preferences.channels[channelId] || null;
  }

  getAllChannelSettings(): Record<string, ChannelSettings> {
    return { ...this.preferences.channels };
  }

  getChannelGroups(): NotificationChannelGroup[] {
    return [...this.channelGroups];
  }

  async updateGlobalSettings(settings: Partial<NotificationPreferences['globalSettings']>): Promise<void> {
    this.preferences.globalSettings = {
      ...this.preferences.globalSettings,
      ...settings,
    };
    
    await this.savePreferences();
  }

  getGlobalSettings(): NotificationPreferences['globalSettings'] {
    return { ...this.preferences.globalSettings };
  }

  // Process queued notifications
  async processQueuedNotifications(): Promise<void> {
    try {
      const queuedJson = await AsyncStorage.getItem('queued_notifications');
      if (!queuedJson) return;

      const queue = JSON.parse(queuedJson);
      const processedIds: string[] = [];

      for (const notification of queue) {
        const { channelId, title, body, data, options } = notification;
        
        // Check if we can send this notification now
        if (this.shouldSendDuringQuietHours(channelId, options.priority || 'default')) {
          await this.sendChannelNotification(channelId, title, body, data, options);
          processedIds.push(notification.queuedAt);
        }
      }

      // Remove processed notifications from queue
      if (processedIds.length > 0) {
        const remainingQueue = queue.filter((n: any) => !processedIds.includes(n.queuedAt));
        await AsyncStorage.setItem('queued_notifications', JSON.stringify(remainingQueue));
      }

    } catch (error) {
      console.error('Error processing queued notifications:', error);
    }
  }

  // Convenience methods for different severity levels
  async sendCriticalAlert(title: string, body: string, data: Record<string, any> = {}): Promise<string | null> {
    return this.sendChannelNotification('security-critical', title, body, data, {
      categoryIdentifier: 'CRITICAL_SECURITY_ALERT',
      priority: 'max',
      sticky: true,
    });
  }

  async sendHighPriorityAlert(title: string, body: string, data: Record<string, any> = {}): Promise<string | null> {
    return this.sendChannelNotification('security-high', title, body, data, {
      categoryIdentifier: 'HIGH_SECURITY_ALERT',
      priority: 'high',
    });
  }

  async sendKongVulnerability(title: string, body: string, data: Record<string, any> = {}): Promise<string | null> {
    return this.sendChannelNotification('kong-vulnerabilities', title, body, data, {
      categoryIdentifier: 'KONG_VULNERABILITY',
      priority: 'high',
    });
  }

  async sendLocationAlert(title: string, body: string, data: Record<string, any> = {}): Promise<string | null> {
    return this.sendChannelNotification('location-security', title, body, data, {
      categoryIdentifier: 'LOCATION_SECURITY',
      priority: 'high',
    });
  }

  async sendSystemStatus(title: string, body: string, data: Record<string, any> = {}): Promise<string | null> {
    return this.sendChannelNotification('system-status', title, body, data, {
      priority: 'low',
    });
  }

  // Statistics and monitoring
  getNotificationStats(): {
    totalChannels: number;
    enabledChannels: number;
    recentNotificationCounts: Record<string, number>;
    globalSettings: NotificationPreferences['globalSettings'];
  } {
    const totalChannels = this.channelGroups.reduce((sum, group) => sum + group.channels.length, 0);
    const enabledChannels = Object.values(this.preferences.channels)
      .filter(settings => settings.enabled).length;

    const recentCounts: Record<string, number> = {};
    for (const [channelId, countData] of Object.entries(this.notificationCounts)) {
      recentCounts[channelId] = countData.count;
    }

    return {
      totalChannels,
      enabledChannels,
      recentNotificationCounts: recentCounts,
      globalSettings: this.preferences.globalSettings,
    };
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const notificationChannelsService = NotificationChannelsService.getInstance();

export default notificationChannelsService;