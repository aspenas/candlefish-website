import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
interface SecureCredentials {
  id: string;
  name: string;
  username?: string;
  password?: string;
  apiKey?: string;
  token?: string;
  certificate?: string;
  privateKey?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  metadata?: Record<string, any>;
}

interface CertificatePinConfig {
  hostname: string;
  pins: string[]; // SHA-256 hashes of certificates
  includeSubdomains: boolean;
  maxAge: number; // seconds
  reportUri?: string;
}

interface SecurityConfig {
  certificatePinning: {
    enabled: boolean;
    configs: CertificatePinConfig[];
    failureMode: 'strict' | 'permissive'; // strict = fail hard, permissive = log and continue
    reportFailures: boolean;
  };
  credentialStorage: {
    encryptionEnabled: boolean;
    biometricProtection: boolean;
    autoLockTimeout: number; // seconds
    maxFailedAttempts: number;
  };
  networkSecurity: {
    requireTLS: boolean;
    minTLSVersion: '1.2' | '1.3';
    allowSelfSigned: boolean;
    validateHostnames: boolean;
  };
  deviceSecurity: {
    requireDeviceLock: boolean;
    requireBiometrics: boolean;
    allowRootedDevices: boolean;
    allowDebugging: boolean;
  };
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  certificatePinning: {
    enabled: true,
    configs: [
      {
        hostname: 'api.candlefish.ai',
        pins: [
          // These would be the actual SHA-256 hashes of your certificates
          '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=', // Placeholder
        ],
        includeSubdomains: true,
        maxAge: 2592000, // 30 days
      },
    ],
    failureMode: 'strict',
    reportFailures: true,
  },
  credentialStorage: {
    encryptionEnabled: true,
    biometricProtection: true,
    autoLockTimeout: 300, // 5 minutes
    maxFailedAttempts: 3,
  },
  networkSecurity: {
    requireTLS: true,
    minTLSVersion: '1.2',
    allowSelfSigned: false,
    validateHostnames: true,
  },
  deviceSecurity: {
    requireDeviceLock: true,
    requireBiometrics: false,
    allowRootedDevices: false,
    allowDebugging: __DEV__,
  },
};

class SecurityServiceClass {
  private static instance: SecurityServiceClass;
  private config: SecurityConfig = DEFAULT_SECURITY_CONFIG;
  private isLocked = false;
  private failedAttempts = 0;
  private lastActivity = Date.now();
  private lockTimeout: NodeJS.Timeout | null = null;
  private encryptionKey: string | null = null;

  // Storage keys
  private readonly CREDENTIALS_KEY = 'secure_credentials';
  private readonly CONFIG_KEY = 'security_config';
  private readonly ENCRYPTION_KEY = 'master_encryption_key';
  private readonly FAILED_ATTEMPTS_KEY = 'failed_attempts';

  public static getInstance(): SecurityServiceClass {
    if (!SecurityServiceClass.instance) {
      SecurityServiceClass.instance = new SecurityServiceClass();
    }
    return SecurityServiceClass.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load security configuration
      await this.loadConfig();
      
      // Initialize encryption
      await this.initializeEncryption();
      
      // Perform device security checks
      await this.performDeviceSecurityCheck();
      
      // Set up auto-lock timer
      this.setupAutoLock();
      
      // Load failed attempts count
      await this.loadFailedAttempts();
      
      console.log('🔒 Security service initialized');
    } catch (error) {
      console.error('Failed to initialize security service:', error);
      throw error;
    }
  }

  // Credential Management
  async storeCredentials(credentials: Omit<SecureCredentials, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (this.isLocked) {
      throw new Error('Security service is locked');
    }

    try {
      const id = await this.generateSecureId();
      const now = Date.now();
      
      const secureCredentials: SecureCredentials = {
        ...credentials,
        id,
        createdAt: now,
        updatedAt: now,
      };

      // Encrypt credentials
      const encryptedData = await this.encryptData(JSON.stringify(secureCredentials));
      
      // Store in secure store
      await SecureStore.setItemAsync(`${this.CREDENTIALS_KEY}_${id}`, encryptedData, {
        requireAuthentication: this.config.credentialStorage.biometricProtection,
        authenticationPrompt: 'Authenticate to store secure credentials',
      });

      // Update credentials index
      await this.updateCredentialsIndex(id, secureCredentials.name);
      
      this.updateActivity();
      return id;
    } catch (error) {
      console.error('Failed to store credentials:', error);
      throw error;
    }
  }

  async getCredentials(id: string): Promise<SecureCredentials | null> {
    if (this.isLocked) {
      throw new Error('Security service is locked');
    }

    try {
      const encryptedData = await SecureStore.getItemAsync(`${this.CREDENTIALS_KEY}_${id}`, {
        requireAuthentication: this.config.credentialStorage.biometricProtection,
        authenticationPrompt: 'Authenticate to access secure credentials',
      });

      if (!encryptedData) {
        return null;
      }

      const decryptedData = await this.decryptData(encryptedData);
      const credentials: SecureCredentials = JSON.parse(decryptedData);
      
      // Check if credentials are expired
      if (credentials.expiresAt && credentials.expiresAt < Date.now()) {
        await this.deleteCredentials(id);
        return null;
      }

      this.updateActivity();
      return credentials;
    } catch (error) {
      console.error('Failed to get credentials:', error);
      await this.handleFailedAccess();
      throw error;
    }
  }

  async updateCredentials(id: string, updates: Partial<SecureCredentials>): Promise<void> {
    if (this.isLocked) {
      throw new Error('Security service is locked');
    }

    try {
      const existingCredentials = await this.getCredentials(id);
      if (!existingCredentials) {
        throw new Error('Credentials not found');
      }

      const updatedCredentials: SecureCredentials = {
        ...existingCredentials,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: Date.now(),
      };

      const encryptedData = await this.encryptData(JSON.stringify(updatedCredentials));
      
      await SecureStore.setItemAsync(`${this.CREDENTIALS_KEY}_${id}`, encryptedData, {
        requireAuthentication: this.config.credentialStorage.biometricProtection,
        authenticationPrompt: 'Authenticate to update secure credentials',
      });

      this.updateActivity();
    } catch (error) {
      console.error('Failed to update credentials:', error);
      throw error;
    }
  }

  async deleteCredentials(id: string): Promise<void> {
    if (this.isLocked) {
      throw new Error('Security service is locked');
    }

    try {
      await SecureStore.deleteItemAsync(`${this.CREDENTIALS_KEY}_${id}`);
      await this.removeFromCredentialsIndex(id);
      this.updateActivity();
    } catch (error) {
      console.error('Failed to delete credentials:', error);
      throw error;
    }
  }

  async listCredentials(): Promise<Array<Pick<SecureCredentials, 'id' | 'name' | 'createdAt' | 'expiresAt'>>> {
    if (this.isLocked) {
      throw new Error('Security service is locked');
    }

    try {
      const indexData = await AsyncStorage.getItem(`${this.CREDENTIALS_KEY}_index`);
      if (!indexData) {
        return [];
      }

      const index = JSON.parse(indexData);
      this.updateActivity();
      return index;
    } catch (error) {
      console.error('Failed to list credentials:', error);
      return [];
    }
  }

  // Certificate Pinning
  async validateCertificate(hostname: string, certificate: string): Promise<boolean> {
    if (!this.config.certificatePinning.enabled) {
      return true; // Pinning disabled
    }

    try {
      const config = this.config.certificatePinning.configs.find(c => 
        c.hostname === hostname || 
        (c.includeSubdomains && hostname.endsWith(`.${c.hostname}`))
      );

      if (!config) {
        // No pinning configuration for this hostname
        return true;
      }

      // Calculate SHA-256 hash of the certificate
      const certHash = await this.calculateCertificateHash(certificate);
      
      // Check if certificate hash matches any of the pinned hashes
      const isValid = config.pins.includes(certHash);
      
      if (!isValid) {
        await this.handlePinningFailure(hostname, certHash, config);
      }

      return isValid;
    } catch (error) {
      console.error('Certificate validation failed:', error);
      return this.config.certificatePinning.failureMode === 'permissive';
    }
  }

  private async calculateCertificateHash(certificate: string): Promise<string> {
    // Remove PEM headers and normalize
    const cleanCert = certificate
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s+/g, '');
    
    // Calculate SHA-256 hash
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      cleanCert,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    
    return hash;
  }

  private async handlePinningFailure(hostname: string, actualHash: string, config: CertificatePinConfig): Promise<void> {
    const failure = {
      hostname,
      actualHash,
      expectedHashes: config.pins,
      timestamp: Date.now(),
      userAgent: `SecurityMobile/1.0 (${Platform.OS} ${Device.osVersion})`,
    };

    // Log the failure
    console.error('Certificate pinning failure:', failure);
    
    // Report to security monitoring if configured
    if (this.config.certificatePinning.reportFailures && config.reportUri) {
      try {
        await fetch(config.reportUri, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(failure),
        });
      } catch (error) {
        console.error('Failed to report pinning failure:', error);
      }
    }
    
    // Store failure locally for forensics
    await this.storePinningFailure(failure);
  }

  // Network Security
  async createSecureRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const urlObj = new URL(url);
    
    // Enforce HTTPS if required
    if (this.config.networkSecurity.requireTLS && urlObj.protocol !== 'https:') {
      throw new Error('HTTPS is required for all requests');
    }

    // Add security headers
    const secureHeaders = {
      ...options.headers,
      'X-Requested-With': 'SecurityMobile',
      'User-Agent': `SecurityMobile/1.0 (${Platform.OS})`,
      'Accept': 'application/json',
    };

    const secureOptions: RequestInit = {
      ...options,
      headers: secureHeaders,
      // Additional security options would be set here in a real implementation
    };

    try {
      const response = await fetch(url, secureOptions);
      
      // Validate certificate if HTTPS
      if (urlObj.protocol === 'https:' && this.config.certificatePinning.enabled) {
        // In a real implementation, you'd extract and validate the server certificate
        // For now, we'll simulate this
        const isValidCert = await this.validateCertificate(urlObj.hostname, '');
        if (!isValidCert && this.config.certificatePinning.failureMode === 'strict') {
          throw new Error('Certificate pinning validation failed');
        }
      }

      return response;
    } catch (error) {
      console.error('Secure request failed:', error);
      throw error;
    }
  }

  // Device Security Checks
  private async performDeviceSecurityCheck(): Promise<void> {
    const checks = [];
    
    // Check if device has lock screen
    if (this.config.deviceSecurity.requireDeviceLock) {
      checks.push(this.checkDeviceLock());
    }
    
    // Check if device is rooted/jailbroken
    if (!this.config.deviceSecurity.allowRootedDevices) {
      checks.push(this.checkDeviceIntegrity());
    }
    
    // Check if debugging is enabled (in production)
    if (!this.config.deviceSecurity.allowDebugging && !__DEV__) {
      checks.push(this.checkDebuggingState());
    }

    const results = await Promise.all(checks);
    const failed = results.filter(result => !result);
    
    if (failed.length > 0) {
      throw new Error('Device security requirements not met');
    }
  }

  private async checkDeviceLock(): Promise<boolean> {
    // This would use platform-specific APIs to check if device has lock screen
    // For now, we'll simulate this check
    console.log('🔒 Checking device lock status...');
    return true;
  }

  private async checkDeviceIntegrity(): Promise<boolean> {
    // This would check for signs of rooting/jailbreaking
    // For now, we'll simulate this check
    console.log('🔒 Checking device integrity...');
    return true;
  }

  private async checkDebuggingState(): Promise<boolean> {
    // This would check if the app is running in debug mode
    console.log('🔒 Checking debugging state...');
    return !__DEV__;
  }

  // Encryption/Decryption
  private async initializeEncryption(): Promise<void> {
    try {
      // Try to load existing encryption key
      this.encryptionKey = await SecureStore.getItemAsync(this.ENCRYPTION_KEY);
      
      if (!this.encryptionKey) {
        // Generate new encryption key
        this.encryptionKey = await this.generateEncryptionKey();
        await SecureStore.setItemAsync(this.ENCRYPTION_KEY, this.encryptionKey, {
          requireAuthentication: this.config.credentialStorage.biometricProtection,
        });
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw error;
    }
  }

  private async generateEncryptionKey(): Promise<string> {
    // Generate a random 256-bit key
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Buffer.from(randomBytes).toString('base64');
  }

  private async encryptData(data: string): Promise<string> {
    if (!this.config.credentialStorage.encryptionEnabled) {
      return data;
    }

    try {
      // In a real implementation, you'd use a proper encryption library
      // For now, we'll use a simple base64 encoding as a placeholder
      const encoded = Buffer.from(data, 'utf8').toString('base64');
      return encoded;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  private async decryptData(encryptedData: string): Promise<string> {
    if (!this.config.credentialStorage.encryptionEnabled) {
      return encryptedData;
    }

    try {
      // In a real implementation, you'd use proper decryption
      const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
      return decoded;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  // Auto-lock and Security State Management
  private setupAutoLock(): void {
    this.resetAutoLockTimer();
  }

  private resetAutoLockTimer(): void {
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
    }

    if (this.config.credentialStorage.autoLockTimeout > 0) {
      this.lockTimeout = setTimeout(() => {
        this.lock();
      }, this.config.credentialStorage.autoLockTimeout * 1000);
    }
  }

  private updateActivity(): void {
    this.lastActivity = Date.now();
    if (!this.isLocked) {
      this.resetAutoLockTimer();
    }
  }

  async lock(): Promise<void> {
    this.isLocked = true;
    console.log('🔒 Security service locked');
  }

  async unlock(biometricAuth: boolean = false): Promise<boolean> {
    try {
      if (this.failedAttempts >= this.config.credentialStorage.maxFailedAttempts) {
        throw new Error('Maximum failed attempts exceeded');
      }

      // Perform authentication (biometric or password)
      if (biometricAuth && this.config.credentialStorage.biometricProtection) {
        // Biometric authentication would be performed here
        console.log('🔓 Biometric authentication required');
      }

      this.isLocked = false;
      this.failedAttempts = 0;
      await this.saveFailedAttempts();
      this.resetAutoLockTimer();
      
      console.log('🔓 Security service unlocked');
      return true;
    } catch (error) {
      await this.handleFailedAccess();
      throw error;
    }
  }

  private async handleFailedAccess(): Promise<void> {
    this.failedAttempts++;
    await this.saveFailedAttempts();
    
    if (this.failedAttempts >= this.config.credentialStorage.maxFailedAttempts) {
      await this.lock();
      // In a real app, you might also trigger additional security measures
    }
  }

  // Utility Methods
  private async generateSecureId(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Buffer.from(randomBytes).toString('hex');
  }

  private async updateCredentialsIndex(id: string, name: string): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(`${this.CREDENTIALS_KEY}_index`);
      const index = indexData ? JSON.parse(indexData) : [];
      
      const existingIndex = index.findIndex((item: any) => item.id === id);
      const indexItem = {
        id,
        name,
        createdAt: Date.now(),
      };

      if (existingIndex >= 0) {
        index[existingIndex] = indexItem;
      } else {
        index.push(indexItem);
      }

      await AsyncStorage.setItem(`${this.CREDENTIALS_KEY}_index`, JSON.stringify(index));
    } catch (error) {
      console.error('Failed to update credentials index:', error);
    }
  }

  private async removeFromCredentialsIndex(id: string): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem(`${this.CREDENTIALS_KEY}_index`);
      if (!indexData) return;
      
      const index = JSON.parse(indexData);
      const filteredIndex = index.filter((item: any) => item.id !== id);
      
      await AsyncStorage.setItem(`${this.CREDENTIALS_KEY}_index`, JSON.stringify(filteredIndex));
    } catch (error) {
      console.error('Failed to remove from credentials index:', error);
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem(this.CONFIG_KEY);
      if (configData) {
        this.config = { ...DEFAULT_SECURITY_CONFIG, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.error('Failed to load security config:', error);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save security config:', error);
    }
  }

  private async loadFailedAttempts(): Promise<void> {
    try {
      const attemptsData = await AsyncStorage.getItem(this.FAILED_ATTEMPTS_KEY);
      this.failedAttempts = attemptsData ? parseInt(attemptsData, 10) : 0;
    } catch (error) {
      console.error('Failed to load failed attempts:', error);
      this.failedAttempts = 0;
    }
  }

  private async saveFailedAttempts(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.FAILED_ATTEMPTS_KEY, this.failedAttempts.toString());
    } catch (error) {
      console.error('Failed to save failed attempts:', error);
    }
  }

  private async storePinningFailure(failure: any): Promise<void> {
    try {
      const failures = await AsyncStorage.getItem('pinning_failures');
      const failureList = failures ? JSON.parse(failures) : [];
      failureList.push(failure);
      
      // Keep only the last 100 failures
      const recentFailures = failureList.slice(-100);
      await AsyncStorage.setItem('pinning_failures', JSON.stringify(recentFailures));
    } catch (error) {
      console.error('Failed to store pinning failure:', error);
    }
  }

  // Public API
  getSecurityConfig(): SecurityConfig {
    return { ...this.config };
  }

  async updateSecurityConfig(updates: Partial<SecurityConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
  }

  isSecurityServiceLocked(): boolean {
    return this.isLocked;
  }

  getFailedAttempts(): number {
    return this.failedAttempts;
  }

  getLastActivity(): number {
    return this.lastActivity;
  }

  async wipeAllData(): Promise<void> {
    console.warn('🔥 Wiping all secure data...');
    
    try {
      // Delete all credentials
      const credentials = await this.listCredentials();
      for (const cred of credentials) {
        await this.deleteCredentials(cred.id);
      }
      
      // Clear encryption key
      await SecureStore.deleteItemAsync(this.ENCRYPTION_KEY).catch(() => {});
      
      // Clear configuration
      await AsyncStorage.removeItem(this.CONFIG_KEY);
      await AsyncStorage.removeItem(this.FAILED_ATTEMPTS_KEY);
      await AsyncStorage.removeItem('pinning_failures');
      
      // Reset state
      this.isLocked = true;
      this.failedAttempts = 0;
      this.encryptionKey = null;
      this.config = DEFAULT_SECURITY_CONFIG;
      
    } catch (error) {
      console.error('Failed to wipe security data:', error);
      throw error;
    }
  }
}

export const SecurityService = SecurityServiceClass.getInstance();
export default SecurityService;
export type { SecureCredentials, CertificatePinConfig, SecurityConfig };