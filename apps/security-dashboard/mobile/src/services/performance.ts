import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

// Types
interface PerformanceMetrics {
  batteryLevel: number;
  batteryState: Battery.BatteryState;
  networkType: string;
  networkStrength: number;
  dataUsage: {
    totalBytes: number;
    sessionBytes: number;
    lastReset: number;
  };
  cpuUsage: number;
  memoryUsage: number;
  appState: AppStateStatus;
  lastOptimization: number;
}

interface OptimizationSettings {
  batteryOptimization: {
    enabled: boolean;
    lowBatteryThreshold: number; // 0-1 (20% = 0.2)
    aggressiveMode: boolean;
    backgroundSyncReduction: number; // 0-1 (50% = 0.5)
    disableAnimations: boolean;
    reducePushFrequency: boolean;
  };
  dataOptimization: {
    enabled: boolean;
    maxDailyDataUsage: number; // bytes
    compressImages: boolean;
    preloadThreshold: number; // bytes
    offlineFirst: boolean;
    wifiOnlyUpdates: boolean;
  };
  performanceMode: {
    mode: 'power_save' | 'balanced' | 'performance';
    adaptiveMode: boolean; // Auto-switch based on conditions
    backgroundProcessing: boolean;
    realTimeUpdates: boolean;
    chartAnimations: boolean;
  };
  networkOptimization: {
    requestBatching: boolean;
    connectionPooling: boolean;
    compressionEnabled: boolean;
    timeoutReduction: boolean;
    retryStrategy: 'aggressive' | 'balanced' | 'conservative';
  };
}

interface OptimizationAction {
  type: 'battery' | 'data' | 'performance' | 'network';
  action: string;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  timestamp: number;
  automatic: boolean;
}

const DEFAULT_OPTIMIZATION_SETTINGS: OptimizationSettings = {
  batteryOptimization: {
    enabled: true,
    lowBatteryThreshold: 0.2, // 20%
    aggressiveMode: false,
    backgroundSyncReduction: 0.5, // 50%
    disableAnimations: false,
    reducePushFrequency: true,
  },
  dataOptimization: {
    enabled: true,
    maxDailyDataUsage: 100 * 1024 * 1024, // 100MB
    compressImages: true,
    preloadThreshold: 1024 * 1024, // 1MB
    offlineFirst: true,
    wifiOnlyUpdates: false,
  },
  performanceMode: {
    mode: 'balanced',
    adaptiveMode: true,
    backgroundProcessing: true,
    realTimeUpdates: true,
    chartAnimations: true,
  },
  networkOptimization: {
    requestBatching: true,
    connectionPooling: true,
    compressionEnabled: true,
    timeoutReduction: false,
    retryStrategy: 'balanced',
  },
};

const PERFORMANCE_MONITORING_TASK = 'performance-monitoring-task';
const SETTINGS_KEY = 'performance_settings';
const METRICS_KEY = 'performance_metrics';
const ACTIONS_KEY = 'optimization_actions';
const DATA_USAGE_KEY = 'data_usage_tracking';

// Background task for performance monitoring
TaskManager.defineTask(PERFORMANCE_MONITORING_TASK, async () => {
  console.log('📊 Performance monitoring task executed');
  
  try {
    await PerformanceService.getInstance().performBackgroundOptimization();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Performance monitoring task failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

class PerformanceServiceClass {
  private static instance: PerformanceServiceClass;
  private settings: OptimizationSettings = DEFAULT_OPTIMIZATION_SETTINGS;
  private currentMetrics: PerformanceMetrics = {
    batteryLevel: 1,
    batteryState: Battery.BatteryState.UNKNOWN,
    networkType: 'unknown',
    networkStrength: 0,
    dataUsage: {
      totalBytes: 0,
      sessionBytes: 0,
      lastReset: Date.now(),
    },
    cpuUsage: 0,
    memoryUsage: 0,
    appState: 'active',
    lastOptimization: 0,
  };
  
  private optimizationActions: OptimizationAction[] = [];
  private listeners: Array<(metrics: PerformanceMetrics) => void> = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private dataTrackingStartTime = Date.now();
  private sessionStartTime = Date.now();

  public static getInstance(): PerformanceServiceClass {
    if (!PerformanceServiceClass.instance) {
      PerformanceServiceClass.instance = new PerformanceServiceClass();
    }
    return PerformanceServiceClass.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load settings and data
      await this.loadSettings();
      await this.loadStoredData();
      
      // Set up monitoring
      this.setupBatteryMonitoring();
      this.setupNetworkMonitoring();
      this.setupAppStateMonitoring();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      // Register background task
      await this.registerBackgroundTask();
      
      // Initial optimization check
      await this.performOptimizationCheck();
      
      console.log('📊 Performance service initialized');
    } catch (error) {
      console.error('Failed to initialize performance service:', error);
      throw error;
    }
  }

  // Battery Optimization
  private setupBatteryMonitoring(): void {
    // Monitor battery level changes
    const batterySubscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      this.currentMetrics.batteryLevel = batteryLevel;
      this.checkBatteryOptimization();
    });

    // Monitor battery state changes
    const stateSubscription = Battery.addBatteryStateListener(({ batteryState }) => {
      this.currentMetrics.batteryState = batteryState;
      this.checkBatteryOptimization();
    });
  }

  private async checkBatteryOptimization(): Promise<void> {
    if (!this.settings.batteryOptimization.enabled) return;

    const { batteryLevel, batteryState } = this.currentMetrics;
    const isLowBattery = batteryLevel <= this.settings.batteryOptimization.lowBatteryThreshold;
    const isCharging = batteryState === Battery.BatteryState.CHARGING;

    if (isLowBattery && !isCharging) {
      await this.activateBatterySaveMode();
    } else if (batteryLevel > this.settings.batteryOptimization.lowBatteryThreshold * 1.5) {
      // Hysteresis: only deactivate when battery is significantly higher
      await this.deactivateBatterySaveMode();
    }
  }

  private async activateBatterySaveMode(): Promise<void> {
    const actions: OptimizationAction[] = [];

    // Reduce background sync frequency
    if (this.settings.batteryOptimization.backgroundSyncReduction > 0) {
      actions.push({
        type: 'battery',
        action: 'reduce_background_sync',
        reason: 'Low battery detected',
        impact: 'medium',
        timestamp: Date.now(),
        automatic: true,
      });
    }

    // Disable animations if configured
    if (this.settings.batteryOptimization.disableAnimations) {
      actions.push({
        type: 'battery',
        action: 'disable_animations',
        reason: 'Battery save mode activated',
        impact: 'low',
        timestamp: Date.now(),
        automatic: true,
      });
    }

    // Reduce push notification frequency
    if (this.settings.batteryOptimization.reducePushFrequency) {
      actions.push({
        type: 'battery',
        action: 'reduce_push_frequency',
        reason: 'Conserve battery power',
        impact: 'low',
        timestamp: Date.now(),
        automatic: true,
      });
    }

    this.optimizationActions.push(...actions);
    await this.saveOptimizationActions();
    
    console.log('🔋 Battery save mode activated');
  }

  private async deactivateBatterySaveMode(): Promise<void> {
    // Reverse battery saving optimizations
    const action: OptimizationAction = {
      type: 'battery',
      action: 'restore_normal_mode',
      reason: 'Battery level restored',
      impact: 'medium',
      timestamp: Date.now(),
      automatic: true,
    };

    this.optimizationActions.push(action);
    await this.saveOptimizationActions();
    
    console.log('🔋 Battery save mode deactivated');
  }

  // Network and Data Optimization
  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      this.currentMetrics.networkType = state.type || 'unknown';
      this.currentMetrics.networkStrength = this.calculateNetworkStrength(state);
      this.checkNetworkOptimization();
    });
  }

  private calculateNetworkStrength(state: any): number {
    // Simplified network strength calculation
    if (!state.isConnected) return 0;
    if (state.details?.strength) return state.details.strength / 100;
    if (state.details?.ssid) return 0.8; // WiFi assumed good
    return 0.5; // Default for cellular
  }

  private async checkNetworkOptimization(): Promise<void> {
    if (!this.settings.dataOptimization.enabled) return;

    const { networkType } = this.currentMetrics;
    const dailyDataUsage = await this.getDailyDataUsage();
    const isApproachingLimit = dailyDataUsage > (this.settings.dataOptimization.maxDailyDataUsage * 0.8);

    if (isApproachingLimit || networkType === 'cellular') {
      await this.activateDataSaveMode();
    } else if (networkType === 'wifi') {
      await this.activateWifiOptimizations();
    }
  }

  private async activateDataSaveMode(): Promise<void> {
    const actions: OptimizationAction[] = [];

    // Enable image compression
    if (this.settings.dataOptimization.compressImages) {
      actions.push({
        type: 'data',
        action: 'enable_image_compression',
        reason: 'Data usage optimization',
        impact: 'medium',
        timestamp: Date.now(),
        automatic: true,
      });
    }

    // Prioritize offline-first behavior
    if (this.settings.dataOptimization.offlineFirst) {
      actions.push({
        type: 'data',
        action: 'enable_offline_first',
        reason: 'Reduce data consumption',
        impact: 'high',
        timestamp: Date.now(),
        automatic: true,
      });
    }

    // Batch network requests
    if (this.settings.networkOptimization.requestBatching) {
      actions.push({
        type: 'network',
        action: 'enable_request_batching',
        reason: 'Optimize network efficiency',
        impact: 'medium',
        timestamp: Date.now(),
        automatic: true,
      });
    }

    this.optimizationActions.push(...actions);
    await this.saveOptimizationActions();
    
    console.log('📊 Data save mode activated');
  }

  private async activateWifiOptimizations(): Promise<void> {
    const action: OptimizationAction = {
      type: 'network',
      action: 'enable_wifi_optimizations',
      reason: 'WiFi connection available',
      impact: 'low',
      timestamp: Date.now(),
      automatic: true,
    };

    this.optimizationActions.push(action);
    await this.saveOptimizationActions();
    
    // Perform background sync when on WiFi
    await this.performWifiSync();
  }

  // Performance Mode Management
  private async checkPerformanceMode(): Promise<void> {
    if (!this.settings.performanceMode.adaptiveMode) return;

    const { batteryLevel, networkType, appState } = this.currentMetrics;
    let optimalMode: OptimizationSettings['performanceMode']['mode'] = 'balanced';

    // Determine optimal performance mode
    if (batteryLevel < 0.2 || networkType === 'none') {
      optimalMode = 'power_save';
    } else if (batteryLevel > 0.8 && networkType === 'wifi' && appState === 'active') {
      optimalMode = 'performance';
    }

    if (optimalMode !== this.settings.performanceMode.mode) {
      await this.switchPerformanceMode(optimalMode);
    }
  }

  private async switchPerformanceMode(mode: OptimizationSettings['performanceMode']['mode']): Promise<void> {
    const oldMode = this.settings.performanceMode.mode;
    this.settings.performanceMode.mode = mode;
    await this.saveSettings();

    const action: OptimizationAction = {
      type: 'performance',
      action: `switch_to_${mode}_mode`,
      reason: `Auto-switched from ${oldMode}`,
      impact: 'high',
      timestamp: Date.now(),
      automatic: true,
    };

    this.optimizationActions.push(action);
    await this.saveOptimizationActions();
    
    console.log(`🚀 Performance mode switched to: ${mode}`);
  }

  // App State Monitoring
  private setupAppStateMonitoring(): void {
    AppState.addEventListener('change', (nextAppState) => {
      this.currentMetrics.appState = nextAppState;
      this.handleAppStateChange(nextAppState);
    });
  }

  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App moved to background - optimize for background operation
      await this.optimizeForBackground();
    } else if (nextAppState === 'active') {
      // App became active - restore normal operation
      await this.optimizeForForeground();
    }
  }

  private async optimizeForBackground(): Promise<void> {
    const actions: OptimizationAction[] = [];

    // Reduce update frequencies
    actions.push({
      type: 'performance',
      action: 'reduce_background_updates',
      reason: 'App moved to background',
      impact: 'medium',
      timestamp: Date.now(),
      automatic: true,
    });

    // Pause non-critical animations
    actions.push({
      type: 'performance',
      action: 'pause_animations',
      reason: 'Background optimization',
      impact: 'low',
      timestamp: Date.now(),
      automatic: true,
    });

    this.optimizationActions.push(...actions);
    await this.saveOptimizationActions();
  }

  private async optimizeForForeground(): Promise<void> {
    const action: OptimizationAction = {
      type: 'performance',
      action: 'restore_foreground_mode',
      reason: 'App returned to foreground',
      impact: 'medium',
      timestamp: Date.now(),
      automatic: true,
    };

    this.optimizationActions.push(action);
    await this.saveOptimizationActions();
  }

  // Data Usage Tracking
  async trackDataUsage(bytes: number, operation: string): Promise<void> {
    this.currentMetrics.dataUsage.sessionBytes += bytes;
    this.currentMetrics.dataUsage.totalBytes += bytes;

    // Save updated usage
    await this.saveDataUsage();

    // Check if approaching limits
    const dailyUsage = await this.getDailyDataUsage();
    const limit = this.settings.dataOptimization.maxDailyDataUsage;
    
    if (dailyUsage > limit * 0.8) {
      console.warn(`📊 Data usage warning: ${Math.round(dailyUsage / (1024 * 1024))}MB used today`);
    }
  }

  private async getDailyDataUsage(): Promise<number> {
    const today = new Date().toDateString();
    const stored = await AsyncStorage.getItem(`${DATA_USAGE_KEY}_${today}`);
    return stored ? parseInt(stored, 10) : 0;
  }

  private async saveDataUsage(): Promise<void> {
    const today = new Date().toDateString();
    const dailyUsage = await this.getDailyDataUsage();
    const newDailyUsage = dailyUsage + this.currentMetrics.dataUsage.sessionBytes;
    
    await AsyncStorage.setItem(`${DATA_USAGE_KEY}_${today}`, newDailyUsage.toString());
    
    // Reset session counter
    this.currentMetrics.dataUsage.sessionBytes = 0;
  }

  // Performance Monitoring
  private startPerformanceMonitoring(): void {
    this.stopPerformanceMonitoring();
    
    // Monitor every 30 seconds when app is active
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
      await this.performOptimizationCheck();
    }, 30000);
  }

  private stopPerformanceMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      // Update battery metrics
      this.currentMetrics.batteryLevel = await Battery.getBatteryLevelAsync();
      this.currentMetrics.batteryState = await Battery.getBatteryStateAsync();
      
      // Update network metrics
      const networkState = await NetInfo.fetch();
      this.currentMetrics.networkType = networkState.type || 'unknown';
      this.currentMetrics.networkStrength = this.calculateNetworkStrength(networkState);
      
      // Estimate CPU and memory usage (simplified)
      this.currentMetrics.cpuUsage = Math.random() * 0.3; // Placeholder
      this.currentMetrics.memoryUsage = Math.random() * 0.5; // Placeholder
      
      // Notify listeners
      this.notifyMetricsListeners();
      
      // Save metrics
      await this.saveMetrics();
      
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
    }
  }

  private async performOptimizationCheck(): Promise<void> {
    await Promise.all([
      this.checkBatteryOptimization(),
      this.checkNetworkOptimization(),
      this.checkPerformanceMode(),
    ]);
    
    this.currentMetrics.lastOptimization = Date.now();
  }

  async performBackgroundOptimization(): Promise<void> {
    console.log('📊 Performing background optimization');
    
    // Collect metrics
    await this.collectMetrics();
    
    // Perform optimizations if needed
    await this.performOptimizationCheck();
    
    // Clean up old data
    await this.cleanupOldData();
  }

  private async performWifiSync(): Promise<void> {
    // This would trigger background sync operations when on WiFi
    console.log('📊 Performing WiFi sync optimizations');
  }

  // Background Task Management
  private async registerBackgroundTask(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(PERFORMANCE_MONITORING_TASK);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(PERFORMANCE_MONITORING_TASK, {
          minimumInterval: 15 * 60 * 1000, // 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log('📊 Performance monitoring task registered');
      }
    } catch (error) {
      console.error('Failed to register performance monitoring task:', error);
    }
  }

  // Storage Methods
  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_OPTIMIZATION_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load performance settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save performance settings:', error);
    }
  }

  private async loadStoredData(): Promise<void> {
    try {
      const [metricsData, actionsData] = await Promise.all([
        AsyncStorage.getItem(METRICS_KEY),
        AsyncStorage.getItem(ACTIONS_KEY),
      ]);

      if (metricsData) {
        const stored = JSON.parse(metricsData);
        this.currentMetrics = { ...this.currentMetrics, ...stored };
      }

      if (actionsData) {
        this.optimizationActions = JSON.parse(actionsData);
      }
    } catch (error) {
      console.error('Failed to load stored performance data:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(METRICS_KEY, JSON.stringify(this.currentMetrics));
    } catch (error) {
      console.error('Failed to save performance metrics:', error);
    }
  }

  private async saveOptimizationActions(): Promise<void> {
    try {
      // Keep only the last 100 actions
      const recentActions = this.optimizationActions.slice(-100);
      await AsyncStorage.setItem(ACTIONS_KEY, JSON.stringify(recentActions));
      this.optimizationActions = recentActions;
    } catch (error) {
      console.error('Failed to save optimization actions:', error);
    }
  }

  private async cleanupOldData(): Promise<void> {
    try {
      // Remove data usage records older than 30 days
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const keys = await AsyncStorage.getAllKeys();
      const oldDataKeys = keys.filter(key => 
        key.startsWith(DATA_USAGE_KEY) && 
        new Date(key.replace(`${DATA_USAGE_KEY}_`, '')) < cutoffDate
      );
      
      if (oldDataKeys.length > 0) {
        await AsyncStorage.multiRemove(oldDataKeys);
        console.log(`📊 Cleaned up ${oldDataKeys.length} old data usage records`);
      }
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  // Public API
  async updateSettings(updates: Partial<OptimizationSettings>): Promise<void> {
    this.settings = { ...this.settings, ...updates };
    await this.saveSettings();
  }

  getSettings(): OptimizationSettings {
    return { ...this.settings };
  }

  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.currentMetrics };
  }

  getOptimizationActions(limit: number = 50): OptimizationAction[] {
    return this.optimizationActions.slice(-limit);
  }

  async resetDataUsage(): Promise<void> {
    this.currentMetrics.dataUsage.totalBytes = 0;
    this.currentMetrics.dataUsage.sessionBytes = 0;
    this.currentMetrics.dataUsage.lastReset = Date.now();
    await this.saveMetrics();
    
    // Clear daily usage records
    const keys = await AsyncStorage.getAllKeys();
    const dataKeys = keys.filter(key => key.startsWith(DATA_USAGE_KEY));
    if (dataKeys.length > 0) {
      await AsyncStorage.multiRemove(dataKeys);
    }
  }

  async getDataUsageReport(): Promise<{
    today: number;
    thisWeek: number;
    thisMonth: number;
    average: number;
  }> {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let todayUsage = 0;
    let weekUsage = 0;
    let monthUsage = 0;
    let dayCount = 0;
    
    try {
      const keys = await AsyncStorage.getAllKeys();
      const dataKeys = keys.filter(key => key.startsWith(DATA_USAGE_KEY));
      
      for (const key of dataKeys) {
        const dateStr = key.replace(`${DATA_USAGE_KEY}_`, '');
        const date = new Date(dateStr);
        const usage = parseInt(await AsyncStorage.getItem(key) || '0', 10);
        
        if (date.toDateString() === today.toDateString()) {
          todayUsage = usage;
        }
        
        if (date >= weekAgo) {
          weekUsage += usage;
        }
        
        if (date >= monthAgo) {
          monthUsage += usage;
          dayCount++;
        }
      }
    } catch (error) {
      console.error('Failed to generate data usage report:', error);
    }
    
    return {
      today: todayUsage,
      thisWeek: weekUsage,
      thisMonth: monthUsage,
      average: dayCount > 0 ? monthUsage / dayCount : 0,
    };
  }

  // Event Listeners
  addMetricsListener(listener: (metrics: PerformanceMetrics) => void): void {
    this.listeners.push(listener);
  }

  removeMetricsListener(listener: (metrics: PerformanceMetrics) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyMetricsListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getCurrentMetrics());
      } catch (error) {
        console.error('Metrics listener error:', error);
      }
    });
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.stopPerformanceMonitoring();
    await TaskManager.unregisterTaskAsync(PERFORMANCE_MONITORING_TASK).catch(() => {});
    this.listeners = [];
  }
}

export const PerformanceService = PerformanceServiceClass.getInstance();
export default PerformanceService;
export type { PerformanceMetrics, OptimizationSettings, OptimizationAction };