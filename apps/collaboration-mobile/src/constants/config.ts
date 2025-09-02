/**
 * Configuration constants for the Collaboration Mobile App
 */

export default {
  // API Endpoints
  GRAPHQL_HTTP_ENDPOINT: __DEV__ 
    ? 'http://localhost:4000/graphql'
    : 'https://api.candlefish.ai/collaboration/graphql',
  
  GRAPHQL_WS_ENDPOINT: __DEV__
    ? 'ws://localhost:4000/graphql'
    : 'wss://api.candlefish.ai/collaboration/graphql',
  
  API_BASE_URL: __DEV__
    ? 'http://localhost:4000'
    : 'https://api.candlefish.ai',
  
  // NANDA AI Integration
  NANDA_ENDPOINT: __DEV__
    ? 'http://localhost:8000'
    : 'https://nanda.candlefish.ai',
  
  // Authentication
  AUTH_TOKEN_KEY: '@collaboration_auth_token',
  REFRESH_TOKEN_KEY: '@collaboration_refresh_token',
  USER_DATA_KEY: '@collaboration_user_data',
  BIOMETRIC_KEY: 'collaboration_biometric_key',
  
  // Push Notifications
  FCM_SENDER_ID: '1234567890',
  APNS_BUNDLE_ID: 'ai.candlefish.collaboration',
  
  // Cache Settings
  CACHE_SIZE_LIMIT: 50 * 1024 * 1024, // 50MB
  OFFLINE_QUEUE_LIMIT: 1000,
  SYNC_RETRY_ATTEMPTS: 3,
  SYNC_RETRY_DELAY: 1000, // 1 second
  
  // Document Settings
  DOCUMENT_AUTO_SAVE_DELAY: 2000, // 2 seconds
  PRESENCE_UPDATE_INTERVAL: 1000, // 1 second
  CURSOR_SYNC_THROTTLE: 100, // 100ms
  
  // Performance
  VIRTUAL_LIST_ITEM_HEIGHT: 80,
  IMAGE_CACHE_SIZE: 100,
  PREFETCH_DOCUMENTS_COUNT: 10,
  
  // Feature Flags
  FEATURES: {
    BIOMETRIC_AUTH: true,
    OFFLINE_MODE: true,
    PUSH_NOTIFICATIONS: true,
    AI_SUGGESTIONS: true,
    COLLABORATIVE_EDITING: true,
    DOCUMENT_SHARING: true,
    VERSION_HISTORY: true,
    COMMENTS: true,
    FILE_ATTACHMENTS: true,
    SEARCH: true,
  },
  
  // App Metadata
  APP_NAME: 'Collaboration Mobile',
  APP_VERSION: '0.1.0',
  BUNDLE_ID: 'ai.candlefish.collaboration.mobile',
};