// Environment variable utilities with validation and type safety

interface EnvironmentConfig {
  // Application
  environment: 'development' | 'staging' | 'production';
  isDevelopment: boolean;
  isProduction: boolean;

  // API
  apiUrl: string;
  apiTimeout: number;

  // Analytics and Monitoring
  gaTrackingId?: string;
  sentryDsn?: string;

  // Feature Flags
  enableAnalytics: boolean;
  enableSentry: boolean;
  enablePWA: boolean;
  enableServiceWorker: boolean;
  enablePerformanceMonitoring: boolean;

  // Security
  cspNonce?: string;
  allowedOrigins: string[];

  // External Services
  figmaAccessToken?: string;
  figmaFileKey?: string;

  // Build Configuration
  buildMode: string;
  enableSourcemap: boolean;
  enableMinify: boolean;

  // Development Tools
  enableReactDevTools: boolean;
  enableHotReload: boolean;
}

// Helper function to parse boolean environment variables
const parseBoolean = (value: string | undefined, defaultValue = false): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};

// Helper function to parse array environment variables
const parseArray = (value: string | undefined, delimiter = ','): string[] => {
  if (!value) return [];
  return value.split(delimiter).map(item => item.trim()).filter(Boolean);
};

// Helper function to validate required environment variables
const validateRequired = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
};

// Parse and validate environment configuration
export const env: EnvironmentConfig = {
  // Application
  environment: (import.meta.env.VITE_ENVIRONMENT as 'development' | 'staging' | 'production') || 'development',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,

  // API
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),

  // Analytics and Monitoring
  gaTrackingId: import.meta.env.VITE_GA_MEASUREMENT_ID,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,

  // Feature Flags
  enableAnalytics: parseBoolean(import.meta.env.VITE_ENABLE_ANALYTICS, true),
  enableSentry: parseBoolean(import.meta.env.VITE_ENABLE_SENTRY, true),
  enablePWA: parseBoolean(import.meta.env.VITE_ENABLE_PWA, true),
  enableServiceWorker: parseBoolean(import.meta.env.VITE_ENABLE_SERVICE_WORKER, true),
  enablePerformanceMonitoring: parseBoolean(import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING, true),

  // Security
  cspNonce: import.meta.env.VITE_CSP_NONCE,
  allowedOrigins: parseArray(import.meta.env.VITE_ALLOWED_ORIGINS, ','),

  // External Services
  figmaAccessToken: import.meta.env.VITE_FIGMA_ACCESS_TOKEN,
  figmaFileKey: import.meta.env.VITE_FIGMA_FILE_KEY,

  // Build Configuration
  buildMode: import.meta.env.VITE_BUILD_MODE || 'development',
  enableSourcemap: parseBoolean(import.meta.env.VITE_SOURCEMAP, !import.meta.env.PROD),
  enableMinify: parseBoolean(import.meta.env.VITE_MINIFY, import.meta.env.PROD),

  // Development Tools
  enableReactDevTools: parseBoolean(import.meta.env.VITE_REACT_DEVTOOLS, import.meta.env.DEV),
  enableHotReload: parseBoolean(import.meta.env.VITE_HOT_RELOAD, import.meta.env.DEV),
};

// Validation for production environment
if (env.isProduction) {
  const requiredInProduction = [
    { value: env.sentryDsn, name: 'VITE_SENTRY_DSN' },
    { value: env.gaTrackingId, name: 'VITE_GA_MEASUREMENT_ID' },
  ];

  for (const { value, name } of requiredInProduction) {
    if (!value && env.enableAnalytics) {
      console.warn(`Warning: ${name} is not set in production environment`);
    }
  }
}

// Export individual environment checks for convenience
export const isDevelopment = env.isDevelopment;
export const isProduction = env.isProduction;
export const isStaging = env.environment === 'staging';

// Environment-specific utilities
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = env.apiUrl.endsWith('/') ? env.apiUrl.slice(0, -1) : env.apiUrl;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

export const shouldEnableFeature = (feature: keyof Pick<EnvironmentConfig, 'enableAnalytics' | 'enableSentry' | 'enablePWA' | 'enableServiceWorker' | 'enablePerformanceMonitoring'>): boolean => {
  return env[feature];
};

// Debug helper for development
if (env.isDevelopment) {
  console.log('Environment Configuration:', env);
}

export default env;
