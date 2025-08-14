import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';

// iOS Specific
import * as Haptics from 'expo-haptics';

interface PlatformInfo {
  os: 'ios' | 'android' | 'web';
  version: string;
  modelName: string | null;
  brand: string | null;
  isDevice: boolean;
  appVersion: string;
  buildVersion: string;
  isTablet: boolean;
  hasNotch: boolean;
  screenScale: number;
  fontScale: number;
}

interface PlatformCapabilities {
  supportsHaptics: boolean;
  supportsDeepLinking: boolean;
  supportsBiometrics: boolean;
  supportsWidgets: boolean;
  supportsShortcuts: boolean;
  supportsPushNotifications: boolean;
  supportsBackgroundTasks: boolean;
  supportsFileSharing: boolean;
}

export class PlatformService {
  private static platformInfo: PlatformInfo | null = null;
  private static capabilities: PlatformCapabilities | null = null;

  static async initialize(): Promise<void> {
    await this.detectPlatformInfo();
    await this.detectCapabilities();
  }

  private static async detectPlatformInfo(): Promise<void> {
    const appVersion = Application.nativeApplicationVersion || '1.0.0';
    const buildVersion = Application.nativeBuildVersion || '1';

    this.platformInfo = {
      os: Platform.OS as 'ios' | 'android' | 'web',
      version: Platform.Version.toString(),
      modelName: Device.modelName,
      brand: Device.brand,
      isDevice: Device.isDevice,
      appVersion,
      buildVersion,
      isTablet: Device.deviceType === Device.DeviceType.TABLET,
      hasNotch: await this.detectNotch(),
      screenScale: Platform.OS === 'ios' ? 1 : Device.platformApiLevel || 1,
      fontScale: 1, // This would need to be detected from accessibility settings
    };
  }

  private static async detectNotch(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const { height } = require('react-native').Dimensions.get('window');
      // iPhone X and newer have specific heights that indicate notch
      const notchHeights = [812, 896, 844, 926, 932, 852]; // iPhone X series heights
      return notchHeights.includes(height);
    }
    return false;
  }

  private static async detectCapabilities(): Promise<void> {
    this.capabilities = {
      supportsHaptics: Platform.OS === 'ios' || (Platform.OS === 'android' && (Platform.Version as number) >= 26),
      supportsDeepLinking: true,
      supportsBiometrics: Platform.OS === 'ios' || Platform.OS === 'android',
      supportsWidgets: Platform.OS === 'ios' && parseFloat(Platform.Version as string) >= 14,
      supportsShortcuts: Platform.OS === 'android' && (Platform.Version as number) >= 25,
      supportsPushNotifications: Device.isDevice && Platform.OS !== 'web',
      supportsBackgroundTasks: Platform.OS === 'ios' || Platform.OS === 'android',
      supportsFileSharing: true,
    };
  }

  static getPlatformInfo(): PlatformInfo {
    if (!this.platformInfo) {
      throw new Error('PlatformService not initialized. Call initialize() first.');
    }
    return this.platformInfo;
  }

  static getCapabilities(): PlatformCapabilities {
    if (!this.capabilities) {
      throw new Error('PlatformService not initialized. Call initialize() first.');
    }
    return this.capabilities;
  }

  // Haptic feedback methods
  static async triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'): Promise<void> {
    if (!this.capabilities?.supportsHaptics) return;

    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch (error) {
      console.error('Failed to trigger haptic feedback:', error);
    }
  }

  // Platform-specific UI adjustments
  static getStatusBarHeight(): number {
    if (Platform.OS === 'ios') {
      const info = this.getPlatformInfo();
      return info.hasNotch ? 44 : 20;
    }
    return 24; // Android default
  }

  static getTabBarHeight(): number {
    if (Platform.OS === 'ios') {
      const info = this.getPlatformInfo();
      return info.hasNotch ? 83 : 49;
    }
    return 56; // Android material design
  }

  static getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
    const info = this.getPlatformInfo();

    if (Platform.OS === 'ios' && info.hasNotch) {
      return { top: 44, bottom: 34, left: 0, right: 0 };
    }

    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  // App state and lifecycle
  static async checkForUpdates(): Promise<{ isAvailable: boolean; manifest?: any }> {
    if (!Updates.isEnabledAsync || !(await Updates.isEnabledAsync())) {
      return { isAvailable: false };
    }

    try {
      const update = await Updates.checkForUpdateAsync();
      return {
        isAvailable: update.isAvailable,
        manifest: update.isAvailable ? update.manifest : undefined,
      };
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return { isAvailable: false };
    }
  }

  static async downloadAndApplyUpdate(): Promise<boolean> {
    try {
      const update = await Updates.fetchUpdateAsync();
      if (update.isNew) {
        await Updates.reloadAsync();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to download and apply update:', error);
      return false;
    }
  }

  // Device capabilities
  static supportsFeature(feature: keyof PlatformCapabilities): boolean {
    return this.capabilities?.[feature] || false;
  }

  static isTablet(): boolean {
    return this.platformInfo?.isTablet || false;
  }

  static isPhysicalDevice(): boolean {
    return this.platformInfo?.isDevice || false;
  }

  // iOS Specific features
  static async setupiOSWidgets(): Promise<boolean> {
    if (!this.supportsFeature('supportsWidgets')) return false;

    try {
      // iOS widget setup would go here
      // This would typically involve configuring widget intents and data providers
      console.log('Setting up iOS widgets...');
      return true;
    } catch (error) {
      console.error('Failed to setup iOS widgets:', error);
      return false;
    }
  }

  // Android Specific features
  static async setupAndroidShortcuts(): Promise<boolean> {
    if (!this.supportsFeature('supportsShortcuts')) return false;

    try {
      // Android shortcuts setup would go here
      // This would involve creating dynamic shortcuts
      console.log('Setting up Android shortcuts...');
      return true;
    } catch (error) {
      console.error('Failed to setup Android shortcuts:', error);
      return false;
    }
  }

  // Performance optimizations
  static getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const info = this.getPlatformInfo();

    // Check device performance characteristics
    if (info.os === 'android' && (Platform.Version as number) < 28) {
      recommendations.push('Consider reducing animation complexity for older Android versions');
    }

    if (!info.isDevice) {
      recommendations.push('Running in simulator - performance may not be representative');
    }

    if (info.isTablet) {
      recommendations.push('Optimize for tablet layout and interactions');
    }

    return recommendations;
  }

  // Debug information
  static getDebugInfo(): Record<string, any> {
    return {
      platformInfo: this.platformInfo,
      capabilities: this.capabilities,
      expoVersion: Updates.manifest?.expoVersion,
      updateId: Updates.updateId,
      runtimeVersion: Updates.runtimeVersion,
    };
  }
}

// Platform-specific hooks
export const usePlatformCapabilities = () => {
  const [capabilities, setCapabilities] = React.useState<PlatformCapabilities | null>(null);

  React.useEffect(() => {
    const loadCapabilities = async () => {
      await PlatformService.initialize();
      setCapabilities(PlatformService.getCapabilities());
    };

    loadCapabilities();
  }, []);

  return capabilities;
};

export const usePlatformInfo = () => {
  const [platformInfo, setPlatformInfo] = React.useState<PlatformInfo | null>(null);

  React.useEffect(() => {
    const loadPlatformInfo = async () => {
      await PlatformService.initialize();
      setPlatformInfo(PlatformService.getPlatformInfo());
    };

    loadPlatformInfo();
  }, []);

  return platformInfo;
};
