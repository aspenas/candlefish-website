import * as SecureStore from 'expo-secure-store';
import * as Keychain from 'react-native-keychain';
import EncryptedStorage from 'react-native-encrypted-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

// Types
interface StorageOptions {
  requireAuthentication?: boolean;
  accessGroup?: string;
  encryption?: 'aes256' | 'aes128';
  fallbackToPlaintext?: boolean;
}

interface EncryptedData {
  data: string;
  iv: string;
  timestamp: number;
  version: string;
}

interface KeychainCredentials {
  username: string;
  password: string;
  server?: string;
}

interface SecureStorageCapabilities {
  hasSecureHardware: boolean;
  supportsBiometric: boolean;
  supportsKeychain: boolean;
  supportsEncryptedStorage: boolean;
}

class SecureStorageService {
  private static instance: SecureStorageService;
  private capabilities: SecureStorageCapabilities | null = null;
  private encryptionKey: string | null = null;
  
  // Storage priority order (most secure to least secure)
  private readonly STORAGE_PRIORITY = [
    'expo-secure-store',
    'react-native-keychain',
    'react-native-encrypted-storage',
    'async-storage'
  ];

  public static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Detect storage capabilities
      this.capabilities = await this.detectCapabilities();
      
      // Initialize encryption key if needed
      await this.initializeEncryptionKey();
      
      console.log('🔐 Secure storage initialized with capabilities:', this.capabilities);
    } catch (error) {
      console.error('Failed to initialize secure storage:', error);
      throw error;
    }
  }

  // Primary Storage Interface
  async setItem(key: string, value: string, options: StorageOptions = {}): Promise<void> {
    try {
      const storageMethod = await this.getBestStorageMethod(options);
      const processedValue = await this.preprocessValue(value, options);
      
      switch (storageMethod) {
        case 'expo-secure-store':
          await this.setExpoSecureStore(key, processedValue, options);
          break;
          
        case 'react-native-keychain':
          await this.setKeychain(key, processedValue, options);
          break;
          
        case 'react-native-encrypted-storage':
          await this.setEncryptedStorage(key, processedValue, options);
          break;
          
        case 'async-storage':
          await this.setAsyncStorage(key, processedValue, options);
          break;
          
        default:
          throw new Error('No secure storage method available');
      }
      
      // Log security event
      this.logSecurityEvent('SECURE_STORAGE_SET', {
        key: this.hashKey(key),
        method: storageMethod,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error(`Failed to store ${key}:`, error);
      throw error;
    }
  }

  async getItem(key: string, options: StorageOptions = {}): Promise<string | null> {
    try {
      const storageMethod = await this.getBestStorageMethod(options);
      let value: string | null = null;
      
      switch (storageMethod) {
        case 'expo-secure-store':
          value = await this.getExpoSecureStore(key, options);
          break;
          
        case 'react-native-keychain':
          value = await this.getKeychain(key, options);
          break;
          
        case 'react-native-encrypted-storage':
          value = await this.getEncryptedStorage(key, options);
          break;
          
        case 'async-storage':
          value = await this.getAsyncStorage(key, options);
          break;
          
        default:
          return null;
      }
      
      return value ? await this.postprocessValue(value, options) : null;
      
    } catch (error) {
      console.error(`Failed to retrieve ${key}:`, error);
      
      // Try fallback storage methods
      return await this.tryFallbackStorage(key, options);
    }
  }

  async removeItem(key: string, options: StorageOptions = {}): Promise<void> {
    try {
      const storageMethod = await this.getBestStorageMethod(options);
      
      switch (storageMethod) {
        case 'expo-secure-store':
          await SecureStore.deleteItemAsync(key);
          break;
          
        case 'react-native-keychain':
          await Keychain.resetInternetCredentials(key);
          break;
          
        case 'react-native-encrypted-storage':
          await EncryptedStorage.removeItem(key);
          break;
          
        case 'async-storage':
          await AsyncStorage.removeItem(key);
          break;
      }
      
      // Also try to remove from all other storage methods (cleanup)
      await this.cleanupAllStorageMethods(key);
      
      this.logSecurityEvent('SECURE_STORAGE_REMOVE', {
        key: this.hashKey(key),
        method: storageMethod,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const promises: Promise<void>[] = [];
      
      // Clear all storage methods
      if (this.capabilities?.supportsKeychain) {
        promises.push(
          Keychain.resetInternetCredentials('*').catch(() => {})
        );
      }
      
      if (this.capabilities?.supportsEncryptedStorage) {
        promises.push(EncryptedStorage.clear().catch(() => {}));
      }
      
      promises.push(AsyncStorage.clear().catch(() => {}));
      
      await Promise.allSettled(promises);
      
      this.logSecurityEvent('SECURE_STORAGE_CLEAR', {
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Failed to clear secure storage:', error);
      throw error;
    }
  }

  // Keychain-specific methods for credentials
  async setCredentials(server: string, username: string, password: string): Promise<void> {
    try {
      if (this.capabilities?.supportsKeychain) {
        await Keychain.setInternetCredentials(server, username, password, {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
          storage: Keychain.STORAGE_TYPE.KC,
        });
      } else {
        // Fallback to encrypted storage
        const credentials = { username, password, server };
        await this.setItem(`credentials_${server}`, JSON.stringify(credentials), {
          requireAuthentication: true
        });
      }
      
      this.logSecurityEvent('CREDENTIALS_STORED', {
        server: this.hashKey(server),
        username: this.hashKey(username),
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Failed to store credentials:', error);
      throw error;
    }
  }

  async getCredentials(server: string): Promise<KeychainCredentials | null> {
    try {
      if (this.capabilities?.supportsKeychain) {
        const credentials = await Keychain.getInternetCredentials(server);
        if (credentials && credentials.password) {
          return {
            username: credentials.username,
            password: credentials.password,
            server
          };
        }
      } else {
        // Fallback to encrypted storage
        const stored = await this.getItem(`credentials_${server}`, {
          requireAuthentication: true
        });
        if (stored) {
          return JSON.parse(stored);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to retrieve credentials:', error);
      return null;
    }
  }

  async removeCredentials(server: string): Promise<void> {
    try {
      if (this.capabilities?.supportsKeychain) {
        await Keychain.resetInternetCredentials(server);
      }
      
      // Also remove from fallback storage
      await this.removeItem(`credentials_${server}`);
      
      this.logSecurityEvent('CREDENTIALS_REMOVED', {
        server: this.hashKey(server),
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Failed to remove credentials:', error);
      throw error;
    }
  }

  // Storage Implementation Methods
  private async setExpoSecureStore(key: string, value: string, options: StorageOptions): Promise<void> {
    const secureStoreOptions: SecureStore.SecureStoreOptions = {};
    
    if (options.requireAuthentication) {
      secureStoreOptions.requireAuthentication = true;
      secureStoreOptions.authenticationPrompt = 'Authenticate to access secure data';
    }
    
    if (Platform.OS === 'ios' && options.accessGroup) {
      secureStoreOptions.keychainAccessGroup = options.accessGroup;
    }
    
    await SecureStore.setItemAsync(key, value, secureStoreOptions);
  }

  private async getExpoSecureStore(key: string, options: StorageOptions): Promise<string | null> {
    const secureStoreOptions: SecureStore.SecureStoreOptions = {};
    
    if (options.requireAuthentication) {
      secureStoreOptions.requireAuthentication = true;
      secureStoreOptions.authenticationPrompt = 'Authenticate to access secure data';
    }
    
    return await SecureStore.getItemAsync(key, secureStoreOptions);
  }

  private async setKeychain(key: string, value: string, options: StorageOptions): Promise<void> {
    const keychainOptions: Keychain.Options = {
      storage: Keychain.STORAGE_TYPE.KC,
    };
    
    if (options.requireAuthentication) {
      keychainOptions.accessControl = Keychain.ACCESS_CONTROL.BIOMETRY_ANY;
      keychainOptions.authenticationType = Keychain.AUTHENTICATION_TYPE.BIOMETRICS;
    }
    
    if (Platform.OS === 'ios' && options.accessGroup) {
      keychainOptions.accessGroup = options.accessGroup;
    }
    
    await Keychain.setInternetCredentials(key, key, value, keychainOptions);
  }

  private async getKeychain(key: string, options: StorageOptions): Promise<string | null> {
    const credentials = await Keychain.getInternetCredentials(key);
    return credentials ? credentials.password : null;
  }

  private async setEncryptedStorage(key: string, value: string, options: StorageOptions): Promise<void> {
    await EncryptedStorage.setItem(key, value);
  }

  private async getEncryptedStorage(key: string, options: StorageOptions): Promise<string | null> {
    return await EncryptedStorage.getItem(key);
  }

  private async setAsyncStorage(key: string, value: string, options: StorageOptions): Promise<void> {
    // For AsyncStorage, we need to encrypt the data ourselves
    const encryptedValue = await this.encryptData(value);
    await AsyncStorage.setItem(key, JSON.stringify(encryptedValue));
  }

  private async getAsyncStorage(key: string, options: StorageOptions): Promise<string | null> {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;
    
    try {
      const encryptedData: EncryptedData = JSON.parse(stored);
      return await this.decryptData(encryptedData);
    } catch (error) {
      // If decryption fails, try to return plain text (legacy support)
      if (options.fallbackToPlaintext) {
        return stored;
      }
      throw error;
    }
  }

  // Utility Methods
  private async getBestStorageMethod(options: StorageOptions): Promise<string> {
    if (!this.capabilities) {
      throw new Error('Secure storage not initialized');
    }
    
    for (const method of this.STORAGE_PRIORITY) {
      switch (method) {
        case 'expo-secure-store':
          if (this.capabilities.hasSecureHardware) return method;
          break;
        case 'react-native-keychain':
          if (this.capabilities.supportsKeychain) return method;
          break;
        case 'react-native-encrypted-storage':
          if (this.capabilities.supportsEncryptedStorage) return method;
          break;
        case 'async-storage':
          return method; // Always available as fallback
      }
    }
    
    throw new Error('No storage method available');
  }

  private async detectCapabilities(): Promise<SecureStorageCapabilities> {
    const capabilities: SecureStorageCapabilities = {
      hasSecureHardware: false,
      supportsBiometric: false,
      supportsKeychain: false,
      supportsEncryptedStorage: false
    };
    
    // Test Expo SecureStore
    try {
      await SecureStore.isAvailableAsync();
      capabilities.hasSecureHardware = true;
    } catch (error) {
      console.warn('Expo SecureStore not available:', error);
    }
    
    // Test Keychain
    try {
      await Keychain.getSupportedBiometryType();
      capabilities.supportsKeychain = true;
      capabilities.supportsBiometric = true;
    } catch (error) {
      console.warn('Keychain not available:', error);
    }
    
    // Test EncryptedStorage
    try {
      await EncryptedStorage.setItem('test', 'test');
      await EncryptedStorage.removeItem('test');
      capabilities.supportsEncryptedStorage = true;
    } catch (error) {
      console.warn('EncryptedStorage not available:', error);
    }
    
    return capabilities;
  }

  private async initializeEncryptionKey(): Promise<void> {
    try {
      // Try to get existing encryption key
      this.encryptionKey = await SecureStore.getItemAsync('encryption_key');
      
      if (!this.encryptionKey) {
        // Generate new encryption key
        this.encryptionKey = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${Date.now()}_${Math.random()}_security_app`
        );
        
        // Store the key securely
        await SecureStore.setItemAsync('encryption_key', this.encryptionKey);
      }
    } catch (error) {
      console.error('Failed to initialize encryption key:', error);
      // Fallback to a session-only key
      this.encryptionKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `session_${Date.now()}_${Math.random()}`
      );
    }
  }

  private async encryptData(data: string): Promise<EncryptedData> {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    
    const iv = await Crypto.getRandomBytesAsync(16);
    const ivString = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Simple encryption using crypto digest
    const encrypted = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${this.encryptionKey}${ivString}${data}`
    );
    
    return {
      data: encrypted,
      iv: ivString,
      timestamp: Date.now(),
      version: '1.0'
    };
  }

  private async decryptData(encryptedData: EncryptedData): Promise<string> {
    // Note: This is a simplified encryption scheme
    // In production, use proper AES encryption
    throw new Error('Decryption not implemented for this encryption scheme');
  }

  private async preprocessValue(value: string, options: StorageOptions): Promise<string> {
    // Add timestamp and version info
    const wrappedValue = {
      value,
      timestamp: Date.now(),
      version: '1.0'
    };
    
    return JSON.stringify(wrappedValue);
  }

  private async postprocessValue(value: string, options: StorageOptions): Promise<string> {
    try {
      const wrappedValue = JSON.parse(value);
      return wrappedValue.value || value;
    } catch (error) {
      // Return as-is if not wrapped
      return value;
    }
  }

  private async tryFallbackStorage(key: string, options: StorageOptions): Promise<string | null> {
    // Try all storage methods as fallback
    for (const method of this.STORAGE_PRIORITY) {
      try {
        let value: string | null = null;
        
        switch (method) {
          case 'expo-secure-store':
            value = await SecureStore.getItemAsync(key).catch(() => null);
            break;
          case 'react-native-keychain':
            const creds = await Keychain.getInternetCredentials(key).catch(() => null);
            value = creds ? creds.password : null;
            break;
          case 'react-native-encrypted-storage':
            value = await EncryptedStorage.getItem(key).catch(() => null);
            break;
          case 'async-storage':
            value = await AsyncStorage.getItem(key).catch(() => null);
            break;
        }
        
        if (value) {
          console.warn(`Found ${key} in fallback storage: ${method}`);
          return await this.postprocessValue(value, options);
        }
      } catch (error) {
        continue;
      }
    }
    
    return null;
  }

  private async cleanupAllStorageMethods(key: string): Promise<void> {
    const cleanupPromises = [
      SecureStore.deleteItemAsync(key).catch(() => {}),
      Keychain.resetInternetCredentials(key).catch(() => {}),
      EncryptedStorage.removeItem(key).catch(() => {}),
      AsyncStorage.removeItem(key).catch(() => {}),
    ];
    
    await Promise.allSettled(cleanupPromises);
  }

  private hashKey(key: string): string {
    // Simple hash for logging (don't log actual keys)
    return key.length > 10 ? `${key.substring(0, 3)}...${key.substring(key.length - 3)}` : '***';
  }

  private logSecurityEvent(event: string, data: any): void {
    console.log(`[SECURE STORAGE] ${event}:`, data);
  }

  // Public API
  getCapabilities(): SecureStorageCapabilities | null {
    return this.capabilities;
  }

  isInitialized(): boolean {
    return this.capabilities !== null && this.encryptionKey !== null;
  }
}

export const SecureStorage = SecureStorageService.getInstance();
export default SecureStorage;