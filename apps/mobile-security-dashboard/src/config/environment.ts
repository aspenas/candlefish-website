// Environment Configuration Manager for Mobile Security Dashboard
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { mobileSecretsManager, type SecretsConfig } from '../services/mobile-secrets-manager';

export type Environment = 'development' | 'staging' | 'production';

export interface AppConfig {
  // API Configuration
  apiUrl: string;
  restApiUrl: string;
  websocketUrl: string;

  // Authentication
  authDomain: string;
  clientId: string;
  oauthRedirectUrl: string;

  // Firebase
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };

  // Push Notifications
  notifications: {
    fcmServerKey: string;
    apnsKeyId: string;
    apnsTeamId: string;
  };

  // Error Reporting
  sentry: {
    dsn: string;
    org: string;
    project: string;
  };

  // Analytics
  analytics: {
    endpoint: string;
    mixpanelToken: string;
  };

  // Feature Flags
  features: {
    biometricAuth: boolean;
    pushNotifications: boolean;
    locationServices: boolean;
    crashReporting: boolean;
    offlineMode: boolean;
    demoMode: boolean;
  };

  // Security
  security: {
    certificatePinning: boolean;
    rootDetection: boolean;
    debugPrevention: boolean;
  };

  // App Info
  app: {
    version: string;
    buildNumber: string;
    environment: Environment;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };

  // Deep Linking
  deepLinking: {
    prefix: string;
    universalLinksDomain: string;
  };

  // Background Sync
  sync: {
    interval: number;
    maxOfflineActions: number;
    retryAttempts: number;
  };

  // Location
  location: {
    geofenceRadius: number;
    accuracy: 'high' | 'balanced' | 'low';
    backgroundLocation: boolean;
  };

  // Performance
  performance: {
    maxMemoryUsage: number;
    imageCacheSize: number;
    apiTimeout: number;
  };
}

class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: AppConfig;
  private secretsConfig: SecretsConfig | null = null;
  private isInitialized = false;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  /**
   * Initialize environment config with secrets manager
   * Must be called early in app lifecycle
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('Initializing Environment Config with Secrets Manager...');
      
      // Initialize secrets manager
      await mobileSecretsManager.initialize();
      
      // Load secrets
      this.secretsConfig = await mobileSecretsManager.getAllSecrets();
      
      // Reload config with secrets
      this.config = this.loadConfig();
      
      this.isInitialized = true;
      console.log('Environment Config initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Environment Config:', error);
      // Continue with fallback config (without secrets)
      console.warn('Continuing with fallback configuration (secrets unavailable)');
      this.isInitialized = true;
    }
  }

  private loadConfig(): AppConfig {
    const env = this.getCurrentEnvironment();
    
    return {
      // API Configuration
      apiUrl: this.getEnvVar('EXPO_PUBLIC_API_URL'),
      restApiUrl: this.getEnvVar('EXPO_PUBLIC_REST_API_URL'),
      websocketUrl: this.getEnvVar('EXPO_PUBLIC_WEBSOCKET_URL'),

      // Authentication
      authDomain: this.getEnvVar('EXPO_PUBLIC_AUTH_DOMAIN'),
      clientId: this.getEnvVar('EXPO_PUBLIC_CLIENT_ID'),
      oauthRedirectUrl: this.getEnvVar('EXPO_PUBLIC_OAUTH_REDIRECT_URL'),

      // Firebase (with secrets fallback)
      firebase: {
        apiKey: this.secretsConfig?.firebase?.apiKey || this.getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY'),
        authDomain: this.getEnvVar('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
        projectId: this.getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
        storageBucket: this.getEnvVar('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: this.secretsConfig?.firebase?.messagingSenderId || this.getEnvVar('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
        appId: this.secretsConfig?.firebase?.appId || this.getEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID'),
      },

      // Push Notifications (with secrets fallback)
      notifications: {
        fcmServerKey: this.secretsConfig?.notifications?.fcmServerKey || this.getEnvVar('EXPO_PUBLIC_FCM_SERVER_KEY'),
        apnsKeyId: this.secretsConfig?.notifications?.apnsKeyId || this.getEnvVar('EXPO_PUBLIC_APNS_KEY_ID'),
        apnsTeamId: this.secretsConfig?.notifications?.apnsTeamId || this.getEnvVar('EXPO_PUBLIC_APNS_TEAM_ID'),
      },

      // Error Reporting (with secrets fallback)
      sentry: {
        dsn: this.secretsConfig?.analytics?.sentryDsn || this.getEnvVar('EXPO_PUBLIC_SENTRY_DSN'),
        org: this.getEnvVar('EXPO_PUBLIC_SENTRY_ORG'),
        project: this.getEnvVar('EXPO_PUBLIC_SENTRY_PROJECT'),
      },

      // Analytics (with secrets fallback)
      analytics: {
        endpoint: this.getEnvVar('EXPO_PUBLIC_ANALYTICS_ENDPOINT'),
        mixpanelToken: this.secretsConfig?.analytics?.mixpanelToken || this.getEnvVar('EXPO_PUBLIC_MIXPANEL_TOKEN'),
      },

      // Feature Flags
      features: {
        biometricAuth: this.getBooleanEnvVar('EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH', true),
        pushNotifications: this.getBooleanEnvVar('EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS', true),
        locationServices: this.getBooleanEnvVar('EXPO_PUBLIC_ENABLE_LOCATION_SERVICES', false),
        crashReporting: this.getBooleanEnvVar('EXPO_PUBLIC_ENABLE_CRASH_REPORTING', env === 'production'),
        offlineMode: this.getBooleanEnvVar('EXPO_PUBLIC_ENABLE_OFFLINE_MODE', true),
        demoMode: this.getBooleanEnvVar('EXPO_PUBLIC_ENABLE_DEMO_MODE', env !== 'production'),
      },

      // Security
      security: {
        certificatePinning: this.getBooleanEnvVar('EXPO_PUBLIC_CERTIFICATE_PINNING', env === 'production'),
        rootDetection: this.getBooleanEnvVar('EXPO_PUBLIC_ROOT_DETECTION', env === 'production'),
        debugPrevention: this.getBooleanEnvVar('EXPO_PUBLIC_DEBUG_PREVENTION', env === 'production'),
      },

      // App Info
      app: {
        version: this.getEnvVar('EXPO_PUBLIC_APP_VERSION', Constants.expoConfig?.version || '1.0.0'),
        buildNumber: this.getEnvVar('EXPO_PUBLIC_BUILD_NUMBER', '1'),
        environment: env,
        logLevel: this.getEnvVar('EXPO_PUBLIC_LOG_LEVEL', env === 'production' ? 'error' : 'debug') as any,
      },

      // Deep Linking
      deepLinking: {
        prefix: this.getEnvVar('EXPO_PUBLIC_DEEP_LINK_PREFIX'),
        universalLinksDomain: this.getEnvVar('EXPO_PUBLIC_UNIVERSAL_LINKS_DOMAIN'),
      },

      // Background Sync
      sync: {
        interval: this.getNumberEnvVar('EXPO_PUBLIC_SYNC_INTERVAL', 300000),
        maxOfflineActions: this.getNumberEnvVar('EXPO_PUBLIC_MAX_OFFLINE_ACTIONS', 1000),
        retryAttempts: this.getNumberEnvVar('EXPO_PUBLIC_RETRY_ATTEMPTS', 3),
      },

      // Location
      location: {
        geofenceRadius: this.getNumberEnvVar('EXPO_PUBLIC_GEOFENCE_RADIUS', 100),
        accuracy: this.getEnvVar('EXPO_PUBLIC_LOCATION_ACCURACY', 'high') as any,
        backgroundLocation: this.getBooleanEnvVar('EXPO_PUBLIC_BACKGROUND_LOCATION', false),
      },

      // Performance
      performance: {
        maxMemoryUsage: this.getNumberEnvVar('EXPO_PUBLIC_MAX_MEMORY_USAGE', 256),
        imageCacheSize: this.getNumberEnvVar('EXPO_PUBLIC_IMAGE_CACHE_SIZE', 100),
        apiTimeout: this.getNumberEnvVar('EXPO_PUBLIC_API_TIMEOUT', 30000),
      },
    };
  }

  private getCurrentEnvironment(): Environment {
    const env = this.getEnvVar('EXPO_PUBLIC_ENVIRONMENT');
    if (env === 'production' || env === 'staging' || env === 'development') {
      return env;
    }

    // Fallback logic
    if (Constants.expoConfig?.extra?.eas?.projectId?.includes('prod')) {
      return 'production';
    }
    if (Constants.expoConfig?.extra?.eas?.projectId?.includes('staging')) {
      return 'staging';
    }

    return __DEV__ ? 'development' : 'production';
  }

  private getEnvVar(key: string, defaultValue = ''): string {
    // Try process.env first (for local development)
    if (process.env[key]) {
      return process.env[key];
    }

    // Try Constants.expoConfig.extra (for Expo builds)
    if (Constants.expoConfig?.extra?.[key]) {
      return Constants.expoConfig.extra[key];
    }

    return defaultValue;
  }

  private getBooleanEnvVar(key: string, defaultValue = false): boolean {
    const value = this.getEnvVar(key);
    if (value === '') return defaultValue;
    
    return value.toLowerCase() === 'true';
  }

  private getNumberEnvVar(key: string, defaultValue = 0): number {
    const value = this.getEnvVar(key);
    if (value === '') return defaultValue;
    
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  // Public getters
  getConfig(): AppConfig {
    return this.config;
  }

  getEnvironment(): Environment {
    return this.config.app.environment;
  }

  isProduction(): boolean {
    return this.config.app.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.config.app.environment === 'development';
  }

  isStaging(): boolean {
    return this.config.app.environment === 'staging';
  }

  // Feature flags
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  // Security checks
  shouldUseCertificatePinning(): boolean {
    return this.config.security.certificatePinning;
  }

  shouldDetectRoot(): boolean {
    return this.config.security.rootDetection;
  }

  shouldPreventDebugging(): boolean {
    return this.config.security.debugPrevention;
  }

  // API configuration
  getApiUrl(path = ''): string {
    return `${this.config.apiUrl}${path}`;
  }

  getRestApiUrl(path = ''): string {
    return `${this.config.restApiUrl}${path}`;
  }

  getWebSocketUrl(): string {
    return this.config.websocketUrl;
  }

  // Platform-specific configuration
  getPlatformConfig(): {
    bundleId: string;
    scheme: string;
    universalLink: string;
  } {
    const bundleId = Platform.OS === 'ios' 
      ? 'com.candlefish.security.dashboard'
      : 'com.candlefish.security.dashboard';

    const scheme = this.isDevelopment() 
      ? 'com.candlefish.security.dashboard.dev'
      : 'com.candlefish.security.dashboard';

    return {
      bundleId,
      scheme,
      universalLink: `https://${this.config.deepLinking.universalLinksDomain}`,
    };
  }

  // Logging configuration
  shouldLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.app.logLevel);
    const requestedLevelIndex = levels.indexOf(level);
    
    return requestedLevelIndex >= currentLevelIndex;
  }

  // Update configuration (for runtime feature flag updates)
  updateFeatureFlag(feature: keyof AppConfig['features'], enabled: boolean): void {
    this.config.features[feature] = enabled;
  }

  // Refresh secrets from AWS Secrets Manager
  async refreshSecrets(): Promise<void> {
    try {
      console.log('Refreshing secrets...');
      await mobileSecretsManager.forceRefresh();
      this.secretsConfig = await mobileSecretsManager.getAllSecrets();
      this.config = this.loadConfig();
      console.log('Secrets refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh secrets:', error);
      throw error;
    }
  }

  // Get secrets diagnostics
  async getSecretsDiagnostics() {
    return await mobileSecretsManager.getDiagnostics();
  }

  // Check if secrets are available
  hasSecrets(): boolean {
    return !!this.secretsConfig;
  }

  // Check if environment config is initialized
  isConfigInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const environmentConfig = EnvironmentConfig.getInstance();

// Export default config object for convenience
export const config = environmentConfig.getConfig();

export default environmentConfig;