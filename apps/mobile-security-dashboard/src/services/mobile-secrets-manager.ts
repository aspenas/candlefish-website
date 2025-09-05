/**
 * Mobile Secrets Manager
 * Secure integration with AWS Secrets Manager for mobile applications
 * Replaces hardcoded API keys with secure runtime retrieval
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { secureStorage } from '../utils/secure-storage';

// Types for different secret categories
export interface FirebaseSecrets {
  apiKey: string;
  messagingSenderId: string;
  appId: string;
}

export interface NotificationSecrets {
  fcmServerKey: string;
  apnsKeyId: string;
  apnsTeamId: string;
}

export interface AnalyticsSecrets {
  mixpanelToken: string;
  sentryDsn: string;
}

export interface SecretsConfig {
  firebase: FirebaseSecrets;
  notifications: NotificationSecrets;
  analytics: AnalyticsSecrets;
}

// Cache duration (15 minutes)
const CACHE_DURATION = 15 * 60 * 1000;
const CACHE_KEY_PREFIX = 'secrets_cache_';
const LAST_FETCH_KEY = 'secrets_last_fetch';

class MobileSecretsManager {
  private static instance: MobileSecretsManager;
  private cache: Map<string, any> = new Map();
  private lastFetch: number = 0;
  private awsRegion: string;
  private secretsNamespace: string;

  private constructor() {
    // Get AWS configuration from environment
    this.awsRegion = this.getEnvVar('EXPO_PUBLIC_AWS_REGION', 'us-east-1');
    this.secretsNamespace = this.getEnvVar(
      'EXPO_PUBLIC_SECRETS_NAMESPACE', 
      'candlefish/mobile/security-dashboard'
    );
  }

  static getInstance(): MobileSecretsManager {
    if (!MobileSecretsManager.instance) {
      MobileSecretsManager.instance = new MobileSecretsManager();
    }
    return MobileSecretsManager.instance;
  }

  private getEnvVar(key: string, defaultValue = ''): string {
    if (process.env[key]) {
      return process.env[key];
    }
    if (Constants.expoConfig?.extra?.[key]) {
      return Constants.expoConfig.extra[key];
    }
    return defaultValue;
  }

  /**
   * Initialize the secrets manager
   * This should be called early in app lifecycle
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Mobile Secrets Manager...');
      
      // Load cached secrets first for offline capability
      await this.loadFromCache();
      
      // Check if we need to refresh secrets
      const shouldRefresh = await this.shouldRefreshSecrets();
      
      if (shouldRefresh) {
        await this.refreshSecrets();
      }
      
      console.log('Mobile Secrets Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Mobile Secrets Manager:', error);
      throw new Error('Secrets Manager initialization failed');
    }
  }

  /**
   * Get Firebase configuration secrets
   */
  async getFirebaseSecrets(): Promise<FirebaseSecrets> {
    return this.getSecrets('firebase');
  }

  /**
   * Get push notification secrets
   */
  async getNotificationSecrets(): Promise<NotificationSecrets> {
    return this.getSecrets('notifications');
  }

  /**
   * Get analytics secrets
   */
  async getAnalyticsSecrets(): Promise<AnalyticsSecrets> {
    return this.getSecrets('analytics');
  }

  /**
   * Get all secrets configuration
   */
  async getAllSecrets(): Promise<SecretsConfig> {
    const [firebase, notifications, analytics] = await Promise.all([
      this.getFirebaseSecrets(),
      this.getNotificationSecrets(),
      this.getAnalyticsSecrets(),
    ]);

    return {
      firebase,
      notifications,
      analytics,
    };
  }

  /**
   * Generic method to get secrets by category
   */
  private async getSecrets<T>(category: string): Promise<T> {
    try {
      // Try cache first
      if (this.cache.has(category)) {
        return this.cache.get(category);
      }

      // Load from secure storage
      const cached = await secureStorage.getSecureObject<T>(`${CACHE_KEY_PREFIX}${category}`);
      if (cached) {
        this.cache.set(category, cached);
        return cached;
      }

      // If no cached secrets, try to fetch fresh ones
      await this.refreshSecrets();
      
      if (this.cache.has(category)) {
        return this.cache.get(category);
      }

      throw new Error(`No secrets found for category: ${category}`);
    } catch (error) {
      console.error(`Failed to get secrets for ${category}:`, error);
      throw error;
    }
  }

  /**
   * Refresh secrets from AWS Secrets Manager
   */
  private async refreshSecrets(): Promise<void> {
    try {
      console.log('Refreshing secrets from AWS Secrets Manager...');

      // In a real implementation, this would use AWS SDK to fetch from Secrets Manager
      // For now, we'll use a secure API endpoint that handles AWS authentication
      const secrets = await this.fetchSecretsFromAPI();
      
      // Cache secrets in memory and secure storage
      await this.cacheSecrets(secrets);
      
      // Update last fetch timestamp
      this.lastFetch = Date.now();
      await secureStorage.setItem(LAST_FETCH_KEY, this.lastFetch.toString());
      
      console.log('Secrets refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh secrets:', error);
      
      // If refresh fails, check if we have cached secrets to fall back on
      if (this.cache.size === 0) {
        throw new Error('No secrets available and refresh failed');
      }
      
      console.warn('Using cached secrets due to refresh failure');
    }
  }

  /**
   * Fetch secrets from secure API endpoint
   * This endpoint handles AWS Secrets Manager authentication server-side
   */
  private async fetchSecretsFromAPI(): Promise<SecretsConfig> {
    const apiUrl = this.getEnvVar('EXPO_PUBLIC_API_URL');
    const endpoint = `${apiUrl}/mobile/secrets`;

    try {
      // Get device authentication token
      const token = await secureStorage.getToken();
      if (!token) {
        throw new Error('Authentication token required');
      }

      // Generate request signature for additional security
      const timestamp = Date.now().toString();
      const deviceId = await secureStorage.getDeviceId();
      const signature = await this.generateRequestSignature(timestamp, deviceId);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Device-ID': deviceId,
          'X-Timestamp': timestamp,
          'X-Signature': signature,
          'X-Platform': Platform.OS,
          'X-App-Version': Constants.expoConfig?.version || '1.0.0',
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`API response error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API returned failure');
      }

      return data.secrets as SecretsConfig;
    } catch (error) {
      console.error('Failed to fetch secrets from API:', error);
      throw error;
    }
  }

  /**
   * Generate request signature for API security
   */
  private async generateRequestSignature(timestamp: string, deviceId: string): Promise<string> {
    const payload = `${timestamp}:${deviceId}:${Platform.OS}`;
    const signature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      payload,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return signature;
  }

  /**
   * Cache secrets securely
   */
  private async cacheSecrets(secrets: SecretsConfig): Promise<void> {
    try {
      // Update in-memory cache
      this.cache.set('firebase', secrets.firebase);
      this.cache.set('notifications', secrets.notifications);
      this.cache.set('analytics', secrets.analytics);

      // Update secure storage cache
      await Promise.all([
        secureStorage.setSecureObject(`${CACHE_KEY_PREFIX}firebase`, secrets.firebase),
        secureStorage.setSecureObject(`${CACHE_KEY_PREFIX}notifications`, secrets.notifications),
        secureStorage.setSecureObject(`${CACHE_KEY_PREFIX}analytics`, secrets.analytics),
      ]);

      console.log('Secrets cached successfully');
    } catch (error) {
      console.error('Failed to cache secrets:', error);
      throw error;
    }
  }

  /**
   * Load secrets from cache
   */
  private async loadFromCache(): Promise<void> {
    try {
      // Load last fetch timestamp
      const lastFetchStr = await secureStorage.getItem(LAST_FETCH_KEY);
      if (lastFetchStr) {
        this.lastFetch = parseInt(lastFetchStr, 10);
      }

      // Load cached secrets
      const [firebase, notifications, analytics] = await Promise.all([
        secureStorage.getSecureObject<FirebaseSecrets>(`${CACHE_KEY_PREFIX}firebase`),
        secureStorage.getSecureObject<NotificationSecrets>(`${CACHE_KEY_PREFIX}notifications`),
        secureStorage.getSecureObject<AnalyticsSecrets>(`${CACHE_KEY_PREFIX}analytics`),
      ]);

      if (firebase) this.cache.set('firebase', firebase);
      if (notifications) this.cache.set('notifications', notifications);
      if (analytics) this.cache.set('analytics', analytics);

      console.log(`Loaded ${this.cache.size} secret categories from cache`);
    } catch (error) {
      console.error('Failed to load secrets from cache:', error);
    }
  }

  /**
   * Check if secrets need to be refreshed
   */
  private async shouldRefreshSecrets(): Promise<boolean> {
    // Always refresh if no cached secrets
    if (this.cache.size === 0) {
      return true;
    }

    // Check cache age
    const age = Date.now() - this.lastFetch;
    return age > CACHE_DURATION;
  }

  /**
   * Force refresh secrets (useful for testing or explicit refresh)
   */
  async forceRefresh(): Promise<void> {
    this.lastFetch = 0;
    await this.refreshSecrets();
  }

  /**
   * Clear all cached secrets
   */
  async clearCache(): Promise<void> {
    try {
      this.cache.clear();
      
      await Promise.all([
        secureStorage.removeSecureObject(`${CACHE_KEY_PREFIX}firebase`),
        secureStorage.removeSecureObject(`${CACHE_KEY_PREFIX}notifications`),
        secureStorage.removeSecureObject(`${CACHE_KEY_PREFIX}analytics`),
        secureStorage.removeItem(LAST_FETCH_KEY),
      ]);

      console.log('Secrets cache cleared');
    } catch (error) {
      console.error('Failed to clear secrets cache:', error);
    }
  }

  /**
   * Get cache diagnostics
   */
  async getDiagnostics(): Promise<{
    cacheSize: number;
    lastFetch: number;
    cacheAge: number;
    isStale: boolean;
    categories: string[];
  }> {
    return {
      cacheSize: this.cache.size,
      lastFetch: this.lastFetch,
      cacheAge: Date.now() - this.lastFetch,
      isStale: await this.shouldRefreshSecrets(),
      categories: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const mobileSecretsManager = MobileSecretsManager.getInstance();

// Convenience functions
export const getFirebaseSecrets = () => mobileSecretsManager.getFirebaseSecrets();
export const getNotificationSecrets = () => mobileSecretsManager.getNotificationSecrets();
export const getAnalyticsSecrets = () => mobileSecretsManager.getAnalyticsSecrets();
export const getAllSecrets = () => mobileSecretsManager.getAllSecrets();

export default mobileSecretsManager;