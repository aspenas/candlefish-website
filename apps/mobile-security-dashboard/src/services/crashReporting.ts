// Crash Reporting and Error Monitoring Service for Mobile Security Dashboard
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { environmentConfig } from '@/config/environment';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Types
export interface CrashReport {
  id: string;
  timestamp: string;
  type: 'crash' | 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  breadcrumbs: Breadcrumb[];
  deviceInfo: DeviceInfo;
  appInfo: AppInfo;
  userInfo?: UserInfo;
  tags: Record<string, string>;
  extra: Record<string, any>;
}

export interface Breadcrumb {
  timestamp: string;
  message: string;
  category: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
  data?: Record<string, any>;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model: string;
  manufacturer: string;
  orientation: string;
  batteryLevel?: number;
  memoryUsage?: number;
  storageAvailable?: number;
  networkType?: string;
}

export interface AppInfo {
  version: string;
  buildNumber: string;
  environment: string;
  bundleId: string;
  sessionId: string;
  launchTime: string;
}

export interface UserInfo {
  id?: string;
  email?: string;
  username?: string;
  role?: string;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  screen?: string;
  userId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

class CrashReportingService {
  private static instance: CrashReportingService;
  private isInitialized = false;
  private breadcrumbs: Breadcrumb[] = [];
  private sessionId: string;
  private userInfo: UserInfo | null = null;
  private globalTags: Record<string, string> = {};
  private globalExtra: Record<string, any> = {};

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): CrashReportingService {
    if (!CrashReportingService.instance) {
      CrashReportingService.instance = new CrashReportingService();
    }
    return CrashReportingService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Only initialize if crash reporting is enabled
      if (!environmentConfig.isFeatureEnabled('crashReporting')) {
        console.log('Crash reporting is disabled');
        return;
      }

      // Set up global error handlers
      this.setupGlobalErrorHandlers();

      // Set up React Native error handler
      this.setupReactNativeErrorHandler();

      // Set up unhandled promise rejection handler
      this.setupUnhandledPromiseRejectionHandler();

      // Initialize session tracking
      await this.initializeSession();

      // Set up periodic cleanup
      this.setupPeriodicCleanup();

      // Add initial breadcrumb
      this.addBreadcrumb('App initialized', 'app', 'info', {
        sessionId: this.sessionId,
        environment: environmentConfig.getEnvironment(),
      });

      this.isInitialized = true;
      console.log('Crash reporting service initialized successfully');

    } catch (error) {
      console.error('Failed to initialize crash reporting service:', error);
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Global JavaScript error handler
    const originalErrorHandler = global.ErrorUtils?.getGlobalHandler();

    global.ErrorUtils?.setGlobalHandler(async (error, isFatal) => {
      try {
        await this.reportError(error, {
          component: 'GlobalErrorHandler',
          extra: { isFatal },
        });
      } catch (reportError) {
        console.error('Error reporting failed:', reportError);
      }

      // Call original handler if exists
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });
  }

  private setupReactNativeErrorHandler(): void {
    // React Native specific error handler
    if (Platform.OS === 'android' && global.ErrorUtils) {
      const originalHandler = global.ErrorUtils.getGlobalHandler();
      
      global.ErrorUtils.setGlobalHandler(async (error, isFatal) => {
        await this.reportError(error, {
          component: 'ReactNativeErrorHandler',
          extra: { isFatal, platform: 'android' },
        });

        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }
  }

  private setupUnhandledPromiseRejectionHandler(): void {
    // Handle unhandled promise rejections
    const tracking = require('react-native/Libraries/Core/ExceptionsManager');
    
    const originalHandler = tracking.unstable_setExceptionDecorator;
    if (originalHandler) {
      tracking.unstable_setExceptionDecorator(async (error: any) => {
        await this.reportError(error, {
          component: 'UnhandledPromiseRejection',
          extra: { type: 'promise_rejection' },
        });
        return error;
      });
    }
  }

  private async initializeSession(): Promise<void> {
    try {
      // Store session start time
      await AsyncStorage.setItem('crash_session_start', new Date().toISOString());
      
      // Load previous crash reports count
      const crashCount = await AsyncStorage.getItem('total_crash_count');
      const totalCrashes = crashCount ? parseInt(crashCount, 10) : 0;
      
      this.globalExtra.totalCrashes = totalCrashes;
      this.globalExtra.sessionStartTime = new Date().toISOString();
      
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }

  private setupPeriodicCleanup(): void {
    // Clean up old crash reports every hour
    setInterval(async () => {
      await this.cleanupOldReports();
    }, 60 * 60 * 1000);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add breadcrumb for debugging
  addBreadcrumb(
    message: string,
    category = 'general',
    level: Breadcrumb['level'] = 'info',
    data?: Record<string, any>
  ): void {
    const breadcrumb: Breadcrumb = {
      timestamp: new Date().toISOString(),
      message,
      category,
      level,
      data,
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only last 50 breadcrumbs
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs.splice(0, this.breadcrumbs.length - 50);
    }
  }

  // Set user information
  setUserInfo(userInfo: UserInfo): void {
    this.userInfo = userInfo;
  }

  // Set global tags
  setTag(key: string, value: string): void {
    this.globalTags[key] = value;
  }

  // Set global extra data
  setExtra(key: string, value: any): void {
    this.globalExtra[key] = value;
  }

  // Report an error
  async reportError(
    error: Error,
    context?: ErrorContext
  ): Promise<void> {
    try {
      if (!environmentConfig.isFeatureEnabled('crashReporting')) {
        return;
      }

      const crashReport = await this.createCrashReport(error, 'error', context);
      await this.storeCrashReport(crashReport);

      // Add breadcrumb for this error
      this.addBreadcrumb(
        `Error: ${error.message}`,
        'error',
        'error',
        {
          stack: error.stack,
          component: context?.component,
          action: context?.action,
        }
      );

      console.log('Error reported:', crashReport.id);

    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  // Report a crash
  async reportCrash(
    error: Error,
    context?: ErrorContext
  ): Promise<void> {
    try {
      if (!environmentConfig.isFeatureEnabled('crashReporting')) {
        return;
      }

      const crashReport = await this.createCrashReport(error, 'crash', context);
      await this.storeCrashReport(crashReport);

      // Increment crash count
      const crashCount = await AsyncStorage.getItem('total_crash_count');
      const totalCrashes = crashCount ? parseInt(crashCount, 10) : 0;
      await AsyncStorage.setItem('total_crash_count', (totalCrashes + 1).toString());

      console.log('Crash reported:', crashReport.id);

    } catch (reportingError) {
      console.error('Failed to report crash:', reportingError);
    }
  }

  // Log a message
  async logMessage(
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: ErrorContext
  ): Promise<void> {
    try {
      if (!environmentConfig.shouldLogLevel(level)) {
        return;
      }

      // Add as breadcrumb
      this.addBreadcrumb(message, context?.component || 'app', level, context?.extra);

      // For warnings and errors, also create a report
      if (level === 'warning' || level === 'error') {
        const error = new Error(message);
        const crashReport = await this.createCrashReport(error, level, context);
        await this.storeCrashReport(crashReport);
      }

    } catch (error) {
      console.error('Failed to log message:', error);
    }
  }

  // Create comprehensive crash report
  private async createCrashReport(
    error: Error,
    type: CrashReport['type'],
    context?: ErrorContext
  ): Promise<CrashReport> {
    const reportId = `crash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Collect device information
    const deviceInfo: DeviceInfo = {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      model: Device.modelName || 'Unknown',
      manufacturer: Device.manufacturer || 'Unknown',
      orientation: 'unknown', // Would be determined from device orientation
    };

    // Try to get additional device info
    try {
      // Battery level (if available)
      if (Device.getBatteryLevelAsync) {
        deviceInfo.batteryLevel = await Device.getBatteryLevelAsync();
      }
      
      // Memory usage (simplified)
      if (global.performance?.memory) {
        deviceInfo.memoryUsage = global.performance.memory.usedJSHeapSize;
      }
    } catch (infoError) {
      // Ignore errors getting additional info
    }

    // Collect app information
    const config = environmentConfig.getConfig();
    const appInfo: AppInfo = {
      version: config.app.version,
      buildNumber: config.app.buildNumber,
      environment: config.app.environment,
      bundleId: Constants.expoConfig?.ios?.bundleIdentifier || Constants.expoConfig?.android?.package || 'unknown',
      sessionId: this.sessionId,
      launchTime: this.globalExtra.sessionStartTime || new Date().toISOString(),
    };

    // Combine tags
    const tags = {
      ...this.globalTags,
      ...context?.tags,
      platform: Platform.OS,
      environment: config.app.environment,
    };

    // Combine extra data
    const extra = {
      ...this.globalExtra,
      ...context?.extra,
      component: context?.component,
      action: context?.action,
      screen: context?.screen,
    };

    return {
      id: reportId,
      timestamp: new Date().toISOString(),
      type,
      message: error.message,
      stack: error.stack,
      breadcrumbs: [...this.breadcrumbs],
      deviceInfo,
      appInfo,
      userInfo: this.userInfo || undefined,
      tags,
      extra,
    };
  }

  // Store crash report locally
  private async storeCrashReport(report: CrashReport): Promise<void> {
    try {
      // Store individual report
      await AsyncStorage.setItem(`crash_report_${report.id}`, JSON.stringify(report));

      // Update crash reports index
      const existingReports = await AsyncStorage.getItem('crash_reports_index');
      const reportsIndex = existingReports ? JSON.parse(existingReports) : [];
      
      reportsIndex.push({
        id: report.id,
        timestamp: report.timestamp,
        type: report.type,
        message: report.message,
      });

      // Keep only last 100 reports in index
      if (reportsIndex.length > 100) {
        // Remove old reports
        const oldReports = reportsIndex.splice(0, reportsIndex.length - 100);
        for (const oldReport of oldReports) {
          try {
            await AsyncStorage.removeItem(`crash_report_${oldReport.id}`);
          } catch (deleteError) {
            // Ignore deletion errors
          }
        }
      }

      await AsyncStorage.setItem('crash_reports_index', JSON.stringify(reportsIndex));

      // Queue for upload to monitoring service
      await this.queueReportForUpload(report);

    } catch (error) {
      console.error('Error storing crash report:', error);
    }
  }

  // Queue report for upload to monitoring service
  private async queueReportForUpload(report: CrashReport): Promise<void> {
    try {
      const uploadQueue = await AsyncStorage.getItem('crash_upload_queue');
      const queue = uploadQueue ? JSON.parse(uploadQueue) : [];
      
      queue.push(report.id);
      
      await AsyncStorage.setItem('crash_upload_queue', JSON.stringify(queue));
      
      // Trigger upload attempt
      this.attemptUpload();
      
    } catch (error) {
      console.error('Error queuing report for upload:', error);
    }
  }

  // Attempt to upload queued reports
  private async attemptUpload(): Promise<void> {
    try {
      const uploadQueue = await AsyncStorage.getItem('crash_upload_queue');
      if (!uploadQueue) return;
      
      const queue: string[] = JSON.parse(uploadQueue);
      if (queue.length === 0) return;

      // In a real implementation, this would send to Sentry, Crashlytics, or custom endpoint
      console.log(`Attempting to upload ${queue.length} crash reports`);

      // For now, just simulate successful upload by clearing queue
      await AsyncStorage.setItem('crash_upload_queue', JSON.stringify([]));
      
    } catch (error) {
      console.error('Error uploading crash reports:', error);
    }
  }

  // Clean up old reports
  private async cleanupOldReports(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep reports for 30 days

      const existingReports = await AsyncStorage.getItem('crash_reports_index');
      if (!existingReports) return;

      const reportsIndex = JSON.parse(existingReports);
      const validReports = [];

      for (const report of reportsIndex) {
        const reportDate = new Date(report.timestamp);
        if (reportDate >= cutoffDate) {
          validReports.push(report);
        } else {
          // Remove old report
          try {
            await AsyncStorage.removeItem(`crash_report_${report.id}`);
          } catch (deleteError) {
            // Ignore deletion errors
          }
        }
      }

      await AsyncStorage.setItem('crash_reports_index', JSON.stringify(validReports));
      
      console.log(`Cleaned up ${reportsIndex.length - validReports.length} old crash reports`);
      
    } catch (error) {
      console.error('Error cleaning up old reports:', error);
    }
  }

  // Public methods
  async getCrashReports(limit = 20): Promise<CrashReport[]> {
    try {
      const existingReports = await AsyncStorage.getItem('crash_reports_index');
      if (!existingReports) return [];

      const reportsIndex = JSON.parse(existingReports);
      const recentReports = reportsIndex.slice(-limit);
      
      const reports = [];
      for (const reportInfo of recentReports) {
        try {
          const reportData = await AsyncStorage.getItem(`crash_report_${reportInfo.id}`);
          if (reportData) {
            reports.push(JSON.parse(reportData));
          }
        } catch (error) {
          // Skip corrupted reports
        }
      }
      
      return reports;
    } catch (error) {
      console.error('Error getting crash reports:', error);
      return [];
    }
  }

  async getCrashStatistics(): Promise<{
    totalReports: number;
    crashCount: number;
    errorCount: number;
    warningCount: number;
    lastCrash?: string;
  }> {
    try {
      const existingReports = await AsyncStorage.getItem('crash_reports_index');
      if (!existingReports) {
        return {
          totalReports: 0,
          crashCount: 0,
          errorCount: 0,
          warningCount: 0,
        };
      }

      const reportsIndex = JSON.parse(existingReports);
      const stats = {
        totalReports: reportsIndex.length,
        crashCount: reportsIndex.filter((r: any) => r.type === 'crash').length,
        errorCount: reportsIndex.filter((r: any) => r.type === 'error').length,
        warningCount: reportsIndex.filter((r: any) => r.type === 'warning').length,
        lastCrash: undefined as string | undefined,
      };

      const crashes = reportsIndex.filter((r: any) => r.type === 'crash');
      if (crashes.length > 0) {
        stats.lastCrash = crashes[crashes.length - 1].timestamp;
      }

      return stats;
    } catch (error) {
      console.error('Error getting crash statistics:', error);
      return {
        totalReports: 0,
        crashCount: 0,
        errorCount: 0,
        warningCount: 0,
      };
    }
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const crashReportingService = CrashReportingService.getInstance();

// React hook for crash reporting
export const useCrashReporting = () => {
  const reportError = (error: Error, context?: ErrorContext) => {
    crashReportingService.reportError(error, context);
  };

  const reportCrash = (error: Error, context?: ErrorContext) => {
    crashReportingService.reportCrash(error, context);
  };

  const logMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) => {
    crashReportingService.logMessage(message, level, context);
  };

  const addBreadcrumb = (message: string, category?: string, level?: Breadcrumb['level'], data?: Record<string, any>) => {
    crashReportingService.addBreadcrumb(message, category, level, data);
  };

  return {
    reportError,
    reportCrash,
    logMessage,
    addBreadcrumb,
    setUserInfo: crashReportingService.setUserInfo.bind(crashReportingService),
    setTag: crashReportingService.setTag.bind(crashReportingService),
    setExtra: crashReportingService.setExtra.bind(crashReportingService),
  };
};

export default crashReportingService;