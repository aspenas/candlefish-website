import { Platform, Dimensions, PixelRatio } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MemoryManager, ImageOptimizer } from './performanceOptimizations';

// Device capability detection
export interface DeviceCapabilities {
  isLowEndDevice: boolean;
  availableMemory: number;
  screenDensity: number;
  screenSize: { width: number; height: number };
  platform: 'ios' | 'android';
  platformVersion: string;
  supportedFeatures: {
    backgroundProcessing: boolean;
    pushNotifications: boolean;
    cameraAccess: boolean;
    locationServices: boolean;
  };
}

// Performance configuration based on device capabilities
export interface PerformanceConfig {
  maxConcurrentRequests: number;
  cacheSize: number;
  imageQuality: number;
  maxImageResolution: { width: number; height: number };
  backgroundSyncInterval: number;
  virtualListWindowSize: number;
  enableAnimations: boolean;
  prefetchCount: number;
}

class MobileOptimizationService {
  private deviceCapabilities: DeviceCapabilities | null = null;
  private performanceConfig: PerformanceConfig | null = null;

  async initialize(): Promise<void> {
    this.deviceCapabilities = await this.detectDeviceCapabilities();
    this.performanceConfig = this.generatePerformanceConfig();
    await this.optimizeForDevice();
  }

  // Detect device capabilities
  private async detectDeviceCapabilities(): Promise<DeviceCapabilities> {
    const { width, height } = Dimensions.get('window');
    const screenDensity = PixelRatio.get();
    const platform = Platform.OS as 'ios' | 'android';
    const platformVersion = Platform.Version.toString();

    // Estimate available memory based on device characteristics
    const screenPixels = width * height * screenDensity;
    const estimatedMemory = this.estimateDeviceMemory(screenPixels, platform);
    
    // Detect if it's a low-end device
    const isLowEndDevice = 
      estimatedMemory < 2048 || // Less than 2GB RAM
      screenPixels < 1000000 || // Low resolution screen
      (platform === 'android' && parseFloat(platformVersion) < 8.0);

    return {
      isLowEndDevice,
      availableMemory: estimatedMemory,
      screenDensity,
      screenSize: { width, height },
      platform,
      platformVersion,
      supportedFeatures: {
        backgroundProcessing: !isLowEndDevice,
        pushNotifications: true,
        cameraAccess: true,
        locationServices: true,
      },
    };
  }

  // Estimate device memory based on screen characteristics
  private estimateDeviceMemory(screenPixels: number, platform: string): number {
    // Rough estimation based on screen resolution and platform
    if (platform === 'ios') {
      if (screenPixels > 2000000) return 6144; // High-end iPhone
      if (screenPixels > 1000000) return 4096; // Mid-range iPhone
      return 2048; // Older iPhone
    } else {
      // Android estimation
      if (screenPixels > 2500000) return 8192; // Flagship Android
      if (screenPixels > 1500000) return 4096; // Mid-range Android
      if (screenPixels > 1000000) return 3072; // Budget Android
      return 2048; // Low-end Android
    }
  }

  // Generate performance configuration based on device
  private generatePerformanceConfig(): PerformanceConfig {
    if (!this.deviceCapabilities) {
      throw new Error('Device capabilities not detected');
    }

    const { isLowEndDevice, availableMemory } = this.deviceCapabilities;

    if (isLowEndDevice) {
      return {
        maxConcurrentRequests: 2,
        cacheSize: 25 * 1024 * 1024, // 25MB
        imageQuality: 0.6,
        maxImageResolution: { width: 1280, height: 720 },
        backgroundSyncInterval: 300000, // 5 minutes
        virtualListWindowSize: 5,
        enableAnimations: false,
        prefetchCount: 3,
      };
    }

    if (availableMemory < 4096) {
      return {
        maxConcurrentRequests: 4,
        cacheSize: 50 * 1024 * 1024, // 50MB
        imageQuality: 0.7,
        maxImageResolution: { width: 1920, height: 1080 },
        backgroundSyncInterval: 120000, // 2 minutes
        virtualListWindowSize: 8,
        enableAnimations: true,
        prefetchCount: 5,
      };
    }

    // High-end device configuration
    return {
      maxConcurrentRequests: 8,
      cacheSize: 100 * 1024 * 1024, // 100MB
      imageQuality: 0.8,
      maxImageResolution: { width: 2560, height: 1440 },
      backgroundSyncInterval: 60000, // 1 minute
      virtualListWindowSize: 15,
      enableAnimations: true,
      prefetchCount: 10,
    };
  }

  // Apply device-specific optimizations
  private async optimizeForDevice(): Promise<void> {
    if (!this.performanceConfig || !this.deviceCapabilities) return;

    const { isLowEndDevice } = this.deviceCapabilities;
    
    // Configure cache sizes
    await this.configureCacheSizes();
    
    // Set up memory monitoring
    if (isLowEndDevice) {
      await this.enableAggressiveMemoryManagement();
    }
    
    // Configure image optimization
    await this.configureImageOptimization();
    
    console.log('Mobile optimizations applied:', {
      deviceType: isLowEndDevice ? 'low-end' : 'high-end',
      config: this.performanceConfig,
    });
  }

  // Configure cache sizes based on device capability
  private async configureCacheSizes(): Promise<void> {
    if (!this.performanceConfig) return;

    const { cacheSize } = this.performanceConfig;
    
    // Set Apollo cache size limit
    await AsyncStorage.setItem('@paintbox/cache_limit', cacheSize.toString());
    
    // Configure AsyncStorage cleanup thresholds
    await AsyncStorage.setItem('@paintbox/cleanup_threshold', (cacheSize * 0.8).toString());
  }

  // Enable aggressive memory management for low-end devices
  private async enableAggressiveMemoryManagement(): Promise<void> {
    // Clear caches more frequently
    setInterval(async () => {
      await MemoryManager.clearCachesIfNeeded();
    }, 60000); // Every minute

    // Reduce image cache size
    await AsyncStorage.setItem('@paintbox/image_cache_limit', '10485760'); // 10MB
    
    // Enable more aggressive garbage collection hints
    if (global.gc && typeof global.gc === 'function') {
      setInterval(() => {
        global.gc();
      }, 300000); // Every 5 minutes
    }
  }

  // Configure image optimization based on device
  private async configureImageOptimization(): Promise<void> {
    if (!this.performanceConfig) return;

    const { imageQuality, maxImageResolution } = this.performanceConfig;
    
    await AsyncStorage.setItem('@paintbox/image_quality', imageQuality.toString());
    await AsyncStorage.setItem('@paintbox/max_image_width', maxImageResolution.width.toString());
    await AsyncStorage.setItem('@paintbox/max_image_height', maxImageResolution.height.toString());
  }

  // Get current device capabilities
  getDeviceCapabilities(): DeviceCapabilities | null {
    return this.deviceCapabilities;
  }

  // Get current performance configuration
  getPerformanceConfig(): PerformanceConfig | null {
    return this.performanceConfig;
  }

  // Check if device supports feature
  supportsFeature(feature: keyof DeviceCapabilities['supportedFeatures']): boolean {
    return this.deviceCapabilities?.supportedFeatures[feature] || false;
  }

  // Get optimal settings for virtual lists
  getVirtualListSettings() {
    if (!this.performanceConfig) {
      return {
        windowSize: 10,
        initialNumToRender: 10,
        maxToRenderPerBatch: 5,
        updateCellsBatchingPeriod: 50,
      };
    }

    const { virtualListWindowSize, isLowEndDevice } = this.deviceCapabilities!;
    
    return {
      windowSize: this.performanceConfig.virtualListWindowSize,
      initialNumToRender: isLowEndDevice ? 5 : 15,
      maxToRenderPerBatch: isLowEndDevice ? 3 : 10,
      updateCellsBatchingPeriod: isLowEndDevice ? 100 : 50,
    };
  }

  // Get optimal network settings
  getNetworkSettings() {
    if (!this.performanceConfig) {
      return {
        maxConcurrentRequests: 4,
        timeout: 30000,
        retryDelay: 1000,
      };
    }

    const { isLowEndDevice } = this.deviceCapabilities!;
    
    return {
      maxConcurrentRequests: this.performanceConfig.maxConcurrentRequests,
      timeout: isLowEndDevice ? 60000 : 30000, // Longer timeout for slow devices
      retryDelay: isLowEndDevice ? 2000 : 1000,
    };
  }

  // Get image optimization settings
  async getImageSettings() {
    if (!this.performanceConfig) {
      return {
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080,
      };
    }

    return {
      quality: this.performanceConfig.imageQuality,
      maxWidth: this.performanceConfig.maxImageResolution.width,
      maxHeight: this.performanceConfig.maxImageResolution.height,
    };
  }

  // Battery optimization settings
  getBatteryOptimizationSettings() {
    const { isLowEndDevice } = this.deviceCapabilities || { isLowEndDevice: false };
    
    return {
      reducedAnimations: isLowEndDevice,
      backgroundSyncInterval: this.performanceConfig?.backgroundSyncInterval || 120000,
      enableLocationTracking: !isLowEndDevice,
      aggressiveCaching: isLowEndDevice,
    };
  }

  // Memory usage monitoring
  async monitorMemoryUsage(): Promise<void> {
    // Platform-specific memory monitoring would go here
    console.log('Memory monitoring started');
    
    setInterval(async () => {
      try {
        await MemoryManager.checkMemoryUsage();
      } catch (error) {
        console.error('Memory monitoring error:', error);
      }
    }, 30000); // Every 30 seconds
  }
}

// Export singleton instance
export const mobileOptimizationService = new MobileOptimizationService();

// React Hook for using mobile optimizations
export function useMobileOptimizations() {
  const deviceCapabilities = mobileOptimizationService.getDeviceCapabilities();
  const performanceConfig = mobileOptimizationService.getPerformanceConfig();
  
  return {
    deviceCapabilities,
    performanceConfig,
    isLowEndDevice: deviceCapabilities?.isLowEndDevice || false,
    getVirtualListSettings: () => mobileOptimizationService.getVirtualListSettings(),
    getNetworkSettings: () => mobileOptimizationService.getNetworkSettings(),
    getImageSettings: () => mobileOptimizationService.getImageSettings(),
    getBatterySettings: () => mobileOptimizationService.getBatteryOptimizationSettings(),
    supportsFeature: (feature: keyof DeviceCapabilities['supportedFeatures']) => 
      mobileOptimizationService.supportsFeature(feature),
  };
}

export default mobileOptimizationService;