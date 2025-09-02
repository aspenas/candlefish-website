/**
 * @fileoverview Candlefish Claude Config SDK - Main Entry Point
 * @version 2.0.0
 * @author Candlefish AI <https://candlefish.ai>
 * @repository https://github.com/candlefish-ai/claude-config
 * @homepage https://candlefish.ai
 */

// Export the main client
export {
  CandlefishConfigClient,
  CandlefishConfigError,
  createClientWithApiKey,
  createClientWithOAuth2
} from './client';

// Export all types
export * from './types';

// Export React hooks (optional, only if React is available)
export {
  ConfigClientProvider,
  useConfigProfile,
  useConfigProfiles,
  useConfigWebSocket,
  useConfigHealth
} from './hooks';

// Export utilities
export { CandlefishUtils } from './utils';

// Re-export specific utilities for convenience
export {
  validateProfile,
  isValidSemVer,
  compareSemVer,
  mergeConfigs,
  sanitizeProfile,
  generateProfileId,
  formatError,
  debounce,
  throttle,
  deepClone,
  profileToShareable,
  formatTimestamp
} from './utils';

/**
 * SDK Version
 */
export const SDK_VERSION = '2.0.0';

/**
 * Default export - the main client class
 */
export { CandlefishConfigClient as default } from './client';