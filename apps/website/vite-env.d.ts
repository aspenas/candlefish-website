/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_ENVIRONMENT: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_DEBUG: string
  readonly VITE_AUTH_ENABLED: string
  readonly VITE_PUBLIC_URL: string
  readonly VITE_ENABLE_MSW: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_MAX_RETRIES: string
  readonly VITE_RETRY_DELAY: string
  readonly VITE_CACHE_DURATION: string
  readonly VITE_PERFORMANCE_MONITORING: string
  readonly VITE_USE_MOCK_DATA: string
  readonly VITE_LOG_LEVEL: string
  readonly VITE_FEATURE_FLAGS: string
  readonly VITE_DEPLOYMENT_ENV: string
  readonly VITE_AUTH_DOMAIN: string
  readonly VITE_AUTH_CLIENT_ID: string
  readonly VITE_AUTH_REDIRECT_URI: string
  readonly VITE_AUTH_SCOPE: string
  readonly VITE_ANALYTICS_GA_ID: string
  readonly VITE_ANALYTICS_GTM_ID: string
  readonly VITE_FIGMA_TOKEN: string
  readonly VITE_FIGMA_FILE_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
