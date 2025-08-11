import Constants from 'expo-constants';

interface Config {
  // API Configuration
  graphql: {
    httpEndpoint: string;
    wsEndpoint: string;
  };

  // Authentication
  auth: {
    tokenKey: string;
    refreshTokenKey: string;
    organizationKey: string;
  };

  // App Configuration
  app: {
    name: string;
    version: string;
    bundleId: string;
    scheme: string;
  };

  // Feature Flags
  features: {
    offlineMode: boolean;
    pushNotifications: boolean;
    biometricAuth: boolean;
    cameraIntegration: boolean;
    performanceOptimization: boolean;
    analytics: boolean;
  };

  // Performance Settings
  performance: {
    maxCacheSize: number; // bytes
    maxConcurrentRequests: number;
    batchingWindowMs: number;
    lowBatteryThreshold: number; // percentage
  };

  // Collaboration Settings
  collaboration: {
    maxActiveUsers: number;
    presenceUpdateInterval: number; // ms
    typingIndicatorDelay: number; // ms
    autoSaveInterval: number; // ms
  };

  // File Upload Settings
  uploads: {
    maxFileSize: number; // bytes
    maxFiles: number;
    allowedTypes: string[];
    compressionQuality: number;
  };

  // Environment
  environment: 'development' | 'staging' | 'production';
}

// Environment-specific configurations
const environments = {
  development: {
    graphql: {
      httpEndpoint: 'http://localhost:4000/graphql',
      wsEndpoint: 'ws://localhost:4000/graphql',
    },
  },
  staging: {
    graphql: {
      httpEndpoint: 'https://staging-api.candlefish.ai/graphql',
      wsEndpoint: 'wss://staging-api.candlefish.ai/graphql',
    },
  },
  production: {
    graphql: {
      httpEndpoint: 'https://api.candlefish.ai/graphql',
      wsEndpoint: 'wss://api.candlefish.ai/graphql',
    },
  },
};

// Determine environment
const getEnvironment = (): 'development' | 'staging' | 'production' => {
  if (__DEV__) {
    return 'development';
  }

  const releaseChannel = Constants.expoConfig?.updates?.releaseChannel;

  if (releaseChannel === 'staging') {
    return 'staging';
  }

  return 'production';
};

const environment = getEnvironment();

// Base configuration
const baseConfig: Omit<Config, 'graphql'> = {
  auth: {
    tokenKey: '@candlefish/auth_token',
    refreshTokenKey: '@candlefish/refresh_token',
    organizationKey: '@candlefish/organization_id',
  },

  app: {
    name: 'Candlefish Collaboration',
    version: Constants.expoConfig?.version || '1.0.0',
    bundleId: Constants.expoConfig?.ios?.bundleIdentifier || 'com.candlefish.collaboration',
    scheme: 'candlefish-collaboration',
  },

  features: {
    offlineMode: true,
    pushNotifications: true,
    biometricAuth: true,
    cameraIntegration: true,
    performanceOptimization: true,
    analytics: environment === 'production',
  },

  performance: {
    maxCacheSize: 100 * 1024 * 1024, // 100MB
    maxConcurrentRequests: 6,
    batchingWindowMs: 100,
    lowBatteryThreshold: 20, // 20%
  },

  collaboration: {
    maxActiveUsers: 50,
    presenceUpdateInterval: 2000, // 2 seconds
    typingIndicatorDelay: 1000, // 1 second
    autoSaveInterval: 5000, // 5 seconds
  },

  uploads: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    allowedTypes: [
      'image/*',
      'application/pdf',
      'text/*',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    compressionQuality: 0.8,
  },

  environment,
};

// Export final configuration
export const config: Config = {
  ...baseConfig,
  ...environments[environment],
};

// Export individual config sections for convenience
export const { graphql, auth, app, features, performance, collaboration, uploads } = config;

// Development helpers
export const isDevelopment = environment === 'development';
export const isProduction = environment === 'production';
export const isStaging = environment === 'staging';

// Feature flags helper
export const isFeatureEnabled = (feature: keyof typeof features): boolean => {
  return features[feature];
};

// Debug configuration (development only)
if (isDevelopment) {
  console.log('📱 Candlefish Mobile Collaboration Config:', {
    environment,
    features: Object.entries(features).filter(([, enabled]) => enabled).map(([name]) => name),
    graphql: config.graphql,
  });
}

export default config;
