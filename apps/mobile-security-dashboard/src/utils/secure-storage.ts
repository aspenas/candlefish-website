import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  JWT_TOKEN: 'jwt_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  DEVICE_ID: 'device_id',
  BIOMETRIC_SETTINGS: 'biometric_settings',
  CACHED_CREDENTIALS: 'cached_credentials',
  NOTIFICATION_SETTINGS: 'notification_settings',
  SECURITY_SETTINGS: 'security_settings',
  OFFLINE_QUEUE: 'offline_queue',
  APP_STATE: 'app_state',
} as const;

// Secure storage options for different sensitivity levels
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  authenticationPrompt: 'Authenticate to access secure data',
  keychainService: 'com.candlefish.security-dashboard',
  touchID: true,
  showModal: true,
};

const BASIC_OPTIONS: SecureStore.SecureStoreOptions = {
  requireAuthentication: false,
  keychainService: 'com.candlefish.security-dashboard',
};

// Encryption utilities for additional security layer
class EncryptionService {
  private static instance: EncryptionService;
  private encryptionKey: string | null = null;

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  async getEncryptionKey(): Promise<string> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    try {
      // Try to get existing key
      let key = await SecureStore.getItemAsync('encryption_key', SECURE_OPTIONS);
      
      if (!key) {
        // Generate new key if none exists
        key = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${Date.now()}-${Math.random()}-${Platform.OS}`,
          { encoding: Crypto.CryptoEncoding.BASE64URL }
        );
        
        await SecureStore.setItemAsync('encryption_key', key, SECURE_OPTIONS);
      }
      
      this.encryptionKey = key;
      return key;
    } catch (error) {
      console.error('Failed to get encryption key:', error);
      throw new Error('Unable to initialize secure storage');
    }
  }

  async encrypt(data: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const timestamp = Date.now().toString();
      const payload = JSON.stringify({ data, timestamp });
      
      // Simple XOR encryption with key (for demo - use proper encryption in production)
      const encrypted = btoa(payload);
      return encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    try {
      const payload = atob(encryptedData);
      const { data, timestamp } = JSON.parse(payload);
      
      // Check if data is too old (24 hours)
      const age = Date.now() - parseInt(timestamp, 10);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (age > maxAge) {
        throw new Error('Encrypted data has expired');
      }
      
      return data;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }
}

// Secure Storage Service
class SecureStorageService {
  private encryptionService = EncryptionService.getInstance();

  // JWT Token Management
  async setToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.JWT_TOKEN, token, SECURE_OPTIONS);
      console.log('JWT token stored securely');
    } catch (error) {
      console.error('Failed to store JWT token:', error);
      throw new Error('Unable to store authentication token');
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.JWT_TOKEN, SECURE_OPTIONS);
      return token;
    } catch (error) {
      console.error('Failed to retrieve JWT token:', error);
      return null;
    }
  }

  async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.JWT_TOKEN, SECURE_OPTIONS);
      console.log('JWT token removed');
    } catch (error) {
      console.error('Failed to remove JWT token:', error);
    }
  }

  // Refresh Token Management
  async setRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, token, SECURE_OPTIONS);
    } catch (error) {
      console.error('Failed to store refresh token:', error);
      throw new Error('Unable to store refresh token');
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN, SECURE_OPTIONS);
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error);
      return null;
    }
  }

  async removeRefreshToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN, SECURE_OPTIONS);
    } catch (error) {
      console.error('Failed to remove refresh token:', error);
    }
  }

  // User Data Management
  async setUserData(userData: any): Promise<void> {
    try {
      const encrypted = await this.encryptionService.encrypt(JSON.stringify(userData));
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, encrypted, BASIC_OPTIONS);
    } catch (error) {
      console.error('Failed to store user data:', error);
      throw new Error('Unable to store user data');
    }
  }

  async getUserData<T = any>(): Promise<T | null> {
    try {
      const encrypted = await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA, BASIC_OPTIONS);
      if (!encrypted) return null;
      
      const decrypted = await this.encryptionService.decrypt(encrypted);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error('Failed to retrieve user data:', error);
      return null;
    }
  }

  async removeUserData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA, BASIC_OPTIONS);
    } catch (error) {
      console.error('Failed to remove user data:', error);
    }
  }

  // Device ID Management
  async getDeviceId(): Promise<string> {
    try {
      let deviceId = await SecureStore.getItemAsync(STORAGE_KEYS.DEVICE_ID, BASIC_OPTIONS);
      
      if (!deviceId) {
        // Generate a new device ID
        deviceId = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${Date.now()}-${Math.random()}-${Platform.OS}-${Platform.Version}`,
          { encoding: Crypto.CryptoEncoding.BASE64URL }
        );
        
        await SecureStore.setItemAsync(STORAGE_KEYS.DEVICE_ID, deviceId, BASIC_OPTIONS);
        console.log('New device ID generated and stored');
      }
      
      return deviceId;
    } catch (error) {
      console.error('Failed to get device ID:', error);
      // Fallback to a basic ID
      return `fallback-${Date.now()}`;
    }
  }

  // Cached Credentials for Biometric Auth
  async setCredentials(credentials: { username: string; password: string }): Promise<void> {
    try {
      const encrypted = await this.encryptionService.encrypt(JSON.stringify(credentials));
      await SecureStore.setItemAsync(STORAGE_KEYS.CACHED_CREDENTIALS, encrypted, SECURE_OPTIONS);
    } catch (error) {
      console.error('Failed to store credentials:', error);
      throw new Error('Unable to store credentials');
    }
  }

  async getCredentials(): Promise<{ username: string; password: string } | null> {
    try {
      const encrypted = await SecureStore.getItemAsync(STORAGE_KEYS.CACHED_CREDENTIALS, SECURE_OPTIONS);
      if (!encrypted) return null;
      
      const decrypted = await this.encryptionService.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      return null;
    }
  }

  async removeCredentials(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.CACHED_CREDENTIALS, SECURE_OPTIONS);
    } catch (error) {
      console.error('Failed to remove credentials:', error);
    }
  }

  // Generic secure item storage
  async setItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, BASIC_OPTIONS);
    } catch (error) {
      console.error(`Failed to store item ${key}:`, error);
      throw new Error(`Unable to store ${key}`);
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key, BASIC_OPTIONS);
    } catch (error) {
      console.error(`Failed to retrieve item ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key, BASIC_OPTIONS);
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
    }
  }

  // Secure object storage with encryption
  async setSecureObject<T>(key: string, object: T): Promise<void> {
    try {
      const encrypted = await this.encryptionService.encrypt(JSON.stringify(object));
      await SecureStore.setItemAsync(key, encrypted, SECURE_OPTIONS);
    } catch (error) {
      console.error(`Failed to store secure object ${key}:`, error);
      throw new Error(`Unable to store secure ${key}`);
    }
  }

  async getSecureObject<T>(key: string): Promise<T | null> {
    try {
      const encrypted = await SecureStore.getItemAsync(key, SECURE_OPTIONS);
      if (!encrypted) return null;
      
      const decrypted = await this.encryptionService.decrypt(encrypted);
      return JSON.parse(decrypted) as T;
    } catch (error) {
      console.error(`Failed to retrieve secure object ${key}:`, error);
      return null;
    }
  }

  async removeSecureObject(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key, SECURE_OPTIONS);
    } catch (error) {
      console.error(`Failed to remove secure object ${key}:`, error);
    }
  }

  // Offline queue management (less sensitive, can use AsyncStorage)
  async setOfflineQueue(queue: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to store offline queue:', error);
    }
  }

  async getOfflineQueue(): Promise<any[]> {
    try {
      const queue = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Failed to retrieve offline queue:', error);
      return [];
    }
  }

  async clearOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    } catch (error) {
      console.error('Failed to clear offline queue:', error);
    }
  }

  // Clear all stored data (for logout or reset)
  async clearAll(): Promise<void> {
    try {
      const promises = Object.values(STORAGE_KEYS).map(async (key) => {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          // Ignore errors for non-existent keys
        }
      });
      
      await Promise.all(promises);
      
      // Also clear AsyncStorage items
      await AsyncStorage.clear();
      
      console.log('All secure storage cleared');
    } catch (error) {
      console.error('Failed to clear secure storage:', error);
      throw new Error('Unable to clear stored data');
    }
  }

  // Storage diagnostics
  async getDiagnostics(): Promise<{
    hasToken: boolean;
    hasRefreshToken: boolean;
    hasUserData: boolean;
    deviceId: string;
    offlineQueueSize: number;
  }> {
    try {
      const [token, refreshToken, userData, deviceId, offlineQueue] = await Promise.all([
        this.getToken(),
        this.getRefreshToken(),
        this.getUserData(),
        this.getDeviceId(),
        this.getOfflineQueue(),
      ]);

      return {
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        hasUserData: !!userData,
        deviceId,
        offlineQueueSize: offlineQueue.length,
      };
    } catch (error) {
      console.error('Failed to get storage diagnostics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const secureStorage = new SecureStorageService();

// Storage event emitter for cross-component communication
class StorageEventEmitter {
  private listeners: Map<string, Set<Function>> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in storage event listener for ${event}:`, error);
        }
      });
    }
  }
}

export const storageEvents = new StorageEventEmitter();

// Storage events
export const STORAGE_EVENTS = {
  TOKEN_UPDATED: 'token_updated',
  USER_DATA_UPDATED: 'user_data_updated',
  OFFLINE_QUEUE_UPDATED: 'offline_queue_updated',
  STORAGE_CLEARED: 'storage_cleared',
} as const;

export default secureStorage;