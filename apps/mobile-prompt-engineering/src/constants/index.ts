import { Dimensions } from 'react-native';

// Screen dimensions
export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

// API Configuration
export const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api'
  : 'https://candlefish.ai/api';

export const WEBSOCKET_URL = __DEV__
  ? 'ws://localhost:3000/ws'
  : 'wss://candlefish.ai/ws';

// Prompt Engineering Constants
export const PROMPT_CATEGORIES = [
  'code-review',
  'test-generation',
  'documentation',
  'error-diagnosis',
  'security-analysis',
  'performance-optimization',
  'refactoring',
  'migration',
  'api-design',
  'architecture',
  'deployment',
  'monitoring',
  'incident-response'
] as const;

export const MODEL_PROVIDERS = [
  'anthropic',
  'openai',
  'together',
  'fireworks',
  'local',
  'custom'
] as const;

export const POPULAR_MODELS = {
  anthropic: [
    'claude-opus-4-1-20250805',
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307'
  ],
  openai: [
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-3.5-turbo'
  ],
  together: [
    'meta-llama/Llama-2-70b-chat-hf',
    'mistralai/Mixtral-8x7B-Instruct-v0.1'
  ],
  fireworks: [
    'accounts/fireworks/models/llama-v2-70b-chat'
  ]
};

// Cache Configuration
export const CACHE_KEYS = {
  USER_SETTINGS: '@candlefish:user_settings',
  TEMPLATES: '@candlefish:templates',
  EXECUTIONS: '@candlefish:executions',
  OFFLINE_QUEUE: '@candlefish:offline_queue',
  MODEL_CONFIGS: '@candlefish:model_configs',
  QUICK_ACTIONS: '@candlefish:quick_actions',
  VOICE_COMMANDS: '@candlefish:voice_commands'
} as const;

// Animation durations
export const ANIMATION_DURATION = {
  FAST: 200,
  MEDIUM: 300,
  SLOW: 500
} as const;

// Haptic feedback types
export const HAPTIC_TYPES = {
  LIGHT: 'light',
  MEDIUM: 'medium', 
  HEAVY: 'heavy',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
} as const;

// Voice commands
export const VOICE_COMMANDS = [
  {
    trigger: 'create prompt',
    action: 'CREATE_PROMPT',
    description: 'Create a new prompt template'
  },
  {
    trigger: 'run test',
    action: 'RUN_TEST',
    description: 'Execute prompt test'
  },
  {
    trigger: 'show metrics',
    action: 'SHOW_METRICS',
    description: 'Display performance metrics'
  },
  {
    trigger: 'open settings',
    action: 'OPEN_SETTINGS',
    description: 'Navigate to settings'
  }
] as const;

// Quick Actions
export const DEFAULT_QUICK_ACTIONS = [
  {
    id: 'voice-prompt',
    title: 'Voice Prompt',
    subtitle: 'Create with speech-to-text',
    icon: 'mic',
    color: '#007AFF'
  },
  {
    id: 'camera-ocr',
    title: 'Scan Text',
    subtitle: 'Extract text from camera',
    icon: 'camera',
    color: '#34C759'
  },
  {
    id: 'quick-test',
    title: 'Quick Test',
    subtitle: 'Test last template',
    icon: 'flash',
    color: '#FF9500'
  },
  {
    id: 'clipboard-prompt',
    title: 'From Clipboard',
    subtitle: 'Use clipboard content',
    icon: 'clipboard',
    color: '#5856D6'
  }
] as const;

// Default swipe actions
export const DEFAULT_SWIPE_ACTIONS = {
  LEFT: [
    {
      id: 'duplicate',
      title: 'Duplicate',
      icon: 'copy',
      color: '#FFFFFF',
      backgroundColor: '#007AFF'
    },
    {
      id: 'share',
      title: 'Share',
      icon: 'share',
      color: '#FFFFFF',
      backgroundColor: '#34C759'
    }
  ],
  RIGHT: [
    {
      id: 'edit',
      title: 'Edit',
      icon: 'pencil',
      color: '#FFFFFF',
      backgroundColor: '#FF9500'
    },
    {
      id: 'delete',
      title: 'Delete',
      icon: 'trash',
      color: '#FFFFFF',
      backgroundColor: '#FF3B30'
    }
  ]
} as const;

// Network timeouts
export const NETWORK_TIMEOUT = {
  FAST: 5000,      // 5s for quick operations
  MEDIUM: 15000,   // 15s for normal operations  
  SLOW: 60000      // 60s for heavy operations
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 10000,
  MULTIPLIER: 2
} as const;

// File size limits
export const FILE_LIMITS = {
  IMAGE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  AUDIO_MAX_SIZE: 25 * 1024 * 1024, // 25MB
  DOCUMENT_MAX_SIZE: 50 * 1024 * 1024 // 50MB
} as const;

// OCR configuration
export const OCR_CONFIG = {
  SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'pdf'],
  MAX_PAGES: 10,
  CONFIDENCE_THRESHOLD: 0.7
} as const;

// Push notification categories
export const NOTIFICATION_CATEGORIES = {
  EXECUTION_COMPLETE: 'execution_complete',
  ERROR_ALERT: 'error_alert',
  DAILY_DIGEST: 'daily_digest',
  TEMPLATE_SHARED: 'template_shared'
} as const;