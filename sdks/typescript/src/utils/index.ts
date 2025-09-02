/**
 * @fileoverview Utility functions for Candlefish Claude Config SDK
 * @version 2.0.0
 * @author Candlefish AI <https://candlefish.ai>
 */

import { ConfigProfile, ConfigValidationError, ServiceTier } from '../types';

/**
 * Validate a configuration profile structure
 */
export function validateProfile(profile: Partial<ConfigProfile>): ConfigValidationError | null {
  const errors: string[] = [];

  if (!profile.name) {
    errors.push('Profile name is required');
  }

  if (!profile.version) {
    errors.push('Profile version is required');
  } else if (!isValidSemVer(profile.version)) {
    errors.push('Profile version must be a valid semantic version (e.g., 1.0.0)');
  }

  if (profile.name && profile.name.length > 100) {
    errors.push('Profile name must be 100 characters or less');
  }

  if (profile.description && profile.description.length > 500) {
    errors.push('Profile description must be 500 characters or less');
  }

  if (errors.length > 0) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Profile validation failed',
      details: errors
    };
  }

  return null;
}

/**
 * Check if a string is a valid semantic version
 */
export function isValidSemVer(version: string): boolean {
  const semVerRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
  return semVerRegex.test(version);
}

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareSemVer(v1: string, v2: string): number {
  const parseVersion = (version: string) => {
    const parts = version.split('-')[0].split('.').map(Number);
    return parts;
  };

  const parts1 = parseVersion(v1);
  const parts2 = parseVersion(v2);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}

/**
 * Deep merge two configuration objects
 */
export function mergeConfigs<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        result[key] = mergeConfigs(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Check if a value is a plain object
 */
function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Sanitize profile data for safe storage/transmission
 */
export function sanitizeProfile(profile: ConfigProfile): ConfigProfile {
  const sanitized = { ...profile };

  // Remove any potential XSS vectors from string fields
  if (sanitized.name) {
    sanitized.name = sanitizeString(sanitized.name);
  }

  if (sanitized.description) {
    sanitized.description = sanitizeString(sanitized.description);
  }

  // Recursively sanitize settings object
  if (sanitized.settings) {
    sanitized.settings = sanitizeObject(sanitized.settings);
  }

  return sanitized;
}

/**
 * Sanitize a string by removing potentially dangerous characters
 */
function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? sanitizeString(item) : 
          isObject(item) ? sanitizeObject(item) : item
        );
      } else if (isObject(value)) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Generate a unique profile ID
 */
export function generateProfileId(prefix = 'profile'): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${randomPart}`;
}

/**
 * Format error message for display
 */
export function formatError(error: Error | ConfigValidationError): string {
  if ('code' in error) {
    const validationError = error as ConfigValidationError;
    let message = validationError.message;
    
    if (validationError.details && validationError.details.length > 0) {
      message += ':\n' + validationError.details.map(detail => `• ${detail}`).join('\n');
    }
    
    return message;
  }

  return error.message;
}

/**
 * Check if we're running in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * Check if we're running in a Node.js environment
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions && process.versions.node;
}

/**
 * Debounce function for API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func.apply(null, args);
    }, wait);
  };
}

/**
 * Throttle function for frequent API calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Calculate rate limit compliance
 */
export function isWithinRateLimit(
  tier: ServiceTier,
  requestCount: number,
  timeWindowMs: number = 60000 // 1 minute
): boolean {
  const limits = {
    [ServiceTier.Free]: 10,
    [ServiceTier.Pro]: 100,
    [ServiceTier.Enterprise]: 1000
  };

  const limit = limits[tier];
  const requestsPerMinute = (requestCount / timeWindowMs) * 60000;
  
  return requestsPerMinute <= limit;
}

/**
 * Create a retry function with exponential backoff
 */
export function createRetryFunction<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): () => Promise<T> {
  return async () => {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  };
}

/**
 * Deep clone an object (for immutable operations)
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepClone) as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * Convert profile to a shareable format (removes sensitive data)
 */
export function profileToShareable(profile: ConfigProfile): Partial<ConfigProfile> {
  const shareable = deepClone(profile);
  
  // Remove potentially sensitive metadata
  if (shareable.metadata) {
    delete shareable.metadata.owner;
    delete shareable.metadata.analytics;
  }

  // Remove sensitive settings
  if (shareable.settings?.security) {
    delete shareable.settings.security;
  }

  return shareable;
}

/**
 * Validate environment for WebSocket support
 */
export function supportsWebSocket(): boolean {
  if (isBrowser()) {
    return 'WebSocket' in window;
  }
  
  if (isNode()) {
    try {
      require('ws');
      return true;
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string | number, locale = 'en-US'): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Export utility functions as a namespace
 */
export const CandlefishUtils = {
  validateProfile,
  isValidSemVer,
  compareSemVer,
  mergeConfigs,
  sanitizeProfile,
  generateProfileId,
  formatError,
  isBrowser,
  isNode,
  debounce,
  throttle,
  isWithinRateLimit,
  createRetryFunction,
  deepClone,
  profileToShareable,
  supportsWebSocket,
  formatTimestamp
};