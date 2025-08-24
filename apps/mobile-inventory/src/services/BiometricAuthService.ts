import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  securityLevel: LocalAuthentication.SecurityLevel;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: LocalAuthentication.AuthenticationType;
}

export interface AuthCredentials {
  username: string;
  token: string;
  refreshToken: string;
  expiresAt: string;
}

const SECURE_STORE_KEYS = {
  CREDENTIALS: 'biometric_credentials',
  BIOMETRIC_ENABLED: 'biometric_auth_enabled',
  PIN_BACKUP: 'pin_backup_enabled',
  PIN_HASH: 'pin_hash',
  FAILED_ATTEMPTS: 'failed_attempts',
  LOCKOUT_UNTIL: 'lockout_until',
} as const;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export class BiometricAuthService {
  private static instance: BiometricAuthService;
  private capabilities: BiometricCapabilities | null = null;

  static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.capabilities = await this.checkBiometricCapabilities();
      console.log('Biometric capabilities:', this.capabilities);
    } catch (error) {
      console.error('Failed to initialize biometric auth service:', error);
    }
  }

  private async checkBiometricCapabilities(): Promise<BiometricCapabilities> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

      const isAvailable = hasHardware && isEnrolled && supportedTypes.length > 0;

      return {
        isAvailable,
        hasHardware,
        isEnrolled,
        supportedTypes,
        securityLevel,
      };
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      return {
        isAvailable: false,
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        securityLevel: LocalAuthentication.SecurityLevel.NONE,
      };
    }
  }

  getCapabilities(): BiometricCapabilities | null {
    return this.capabilities;
  }

  async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem(SECURE_STORE_KEYS.BIOMETRIC_ENABLED);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking biometric enabled status:', error);
      return false;
    }
  }

  async enableBiometricAuth(credentials: AuthCredentials): Promise<boolean> {
    try {
      if (!this.capabilities?.isAvailable) {
        throw new Error('Biometric authentication is not available on this device');
      }

      // First, test biometric authentication
      const authResult = await this.authenticateWithBiometric();
      if (!authResult.success) {
        return false;
      }

      // Store encrypted credentials
      const credentialsJson = JSON.stringify(credentials);
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.CREDENTIALS, credentialsJson, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to enable biometric login',
      });

      // Mark biometric auth as enabled
      await AsyncStorage.setItem(SECURE_STORE_KEYS.BIOMETRIC_ENABLED, 'true');

      console.log('Biometric authentication enabled successfully');
      return true;
    } catch (error) {
      console.error('Failed to enable biometric authentication:', error);
      return false;
    }
  }

  async disableBiometricAuth(): Promise<void> {
    try {
      // Remove stored credentials
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.CREDENTIALS);

      // Mark biometric auth as disabled
      await AsyncStorage.setItem(SECURE_STORE_KEYS.BIOMETRIC_ENABLED, 'false');

      console.log('Biometric authentication disabled');
    } catch (error) {
      console.error('Failed to disable biometric authentication:', error);
    }
  }

  async authenticateWithBiometric(
    promptMessage: string = 'Authenticate to access your inventory'
  ): Promise<BiometricAuthResult> {
    try {
      if (!this.capabilities?.isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available',
        };
      }

      // Check if account is locked out
      const isLockedOut = await this.isAccountLockedOut();
      if (isLockedOut) {
        const lockoutEndTime = await this.getLockoutEndTime();
        const remainingTime = Math.ceil((lockoutEndTime - Date.now()) / (1000 * 60));
        return {
          success: false,
          error: `Account locked. Try again in ${remainingTime} minutes.`,
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Reset failed attempts on successful authentication
        await this.resetFailedAttempts();

        return {
          success: true,
          biometricType: this.getPrimaryBiometricType(),
        };
      } else {
        // Handle failed authentication
        await this.handleFailedAttempt();

        return {
          success: false,
          error: result.error || 'Authentication failed',
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: 'Authentication error occurred',
      };
    }
  }

  async getStoredCredentials(): Promise<AuthCredentials | null> {
    try {
      const isBiometricEnabled = await this.isBiometricEnabled();
      if (!isBiometricEnabled) {
        return null;
      }

      const credentialsJson = await SecureStore.getItemAsync(SECURE_STORE_KEYS.CREDENTIALS, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to access your credentials',
      });

      if (!credentialsJson) {
        return null;
      }

      return JSON.parse(credentialsJson) as AuthCredentials;
    } catch (error) {
      console.error('Failed to retrieve stored credentials:', error);
      return null;
    }
  }

  async updateStoredCredentials(credentials: AuthCredentials): Promise<boolean> {
    try {
      const isBiometricEnabled = await this.isBiometricEnabled();
      if (!isBiometricEnabled) {
        return false;
      }

      const credentialsJson = JSON.stringify(credentials);
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.CREDENTIALS, credentialsJson, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to update your credentials',
      });

      return true;
    } catch (error) {
      console.error('Failed to update stored credentials:', error);
      return false;
    }
  }

  private getPrimaryBiometricType(): LocalAuthentication.AuthenticationType {
    if (!this.capabilities?.supportedTypes.length) {
      return LocalAuthentication.AuthenticationType.FINGERPRINT;
    }

    // Prioritize Face ID over Touch ID/Fingerprint
    if (this.capabilities.supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION;
    }

    return this.capabilities.supportedTypes[0];
  }

  getBiometricTypeLabel(type?: LocalAuthentication.AuthenticationType): string {
    const biometricType = type || this.getPrimaryBiometricType();

    switch (biometricType) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'Iris Scan';
      default:
        return 'Biometric Authentication';
    }
  }

  async showBiometricSetupPrompt(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.capabilities?.hasHardware) {
        Alert.alert(
          'Biometric Authentication Unavailable',
          'This device does not support biometric authentication.',
          [{ text: 'OK', onPress: () => resolve(false) }]
        );
        return;
      }

      if (!this.capabilities.isEnrolled) {
        Alert.alert(
          'No Biometric Data Found',
          `Please set up ${this.getBiometricTypeLabel()} in your device settings first.`,
          [
            { text: 'Cancel', onPress: () => resolve(false) },
            { text: 'Settings', onPress: () => resolve(false) }, // TODO: Open settings
          ]
        );
        return;
      }

      Alert.alert(
        'Enable Biometric Login',
        `Use ${this.getBiometricTypeLabel()} for quick and secure access to your inventory?`,
        [
          { text: 'Not Now', onPress: () => resolve(false) },
          { text: 'Enable', onPress: () => resolve(true) },
        ]
      );
    });
  }

  // PIN backup functionality
  async enablePINBackup(pin: string): Promise<boolean> {
    try {
      const pinHash = await this.hashPIN(pin);
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.PIN_HASH, pinHash);
      await AsyncStorage.setItem(SECURE_STORE_KEYS.PIN_BACKUP, 'true');
      return true;
    } catch (error) {
      console.error('Failed to enable PIN backup:', error);
      return false;
    }
  }

  async authenticateWithPIN(pin: string): Promise<boolean> {
    try {
      const storedHash = await SecureStore.getItemAsync(SECURE_STORE_KEYS.PIN_HASH);
      if (!storedHash) {
        return false;
      }

      const inputHash = await this.hashPIN(pin);
      const isValid = inputHash === storedHash;

      if (isValid) {
        await this.resetFailedAttempts();
      } else {
        await this.handleFailedAttempt();
      }

      return isValid;
    } catch (error) {
      console.error('PIN authentication error:', error);
      return false;
    }
  }

  private async hashPIN(pin: string): Promise<string> {
    // Simple hash function - in production, use a proper cryptographic hash
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  // Account lockout functionality
  private async handleFailedAttempt(): Promise<void> {
    try {
      const failedAttempts = await this.getFailedAttempts();
      const newAttempts = failedAttempts + 1;

      await AsyncStorage.setItem(SECURE_STORE_KEYS.FAILED_ATTEMPTS, newAttempts.toString());

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockoutUntil = Date.now() + LOCKOUT_DURATION;
        await AsyncStorage.setItem(SECURE_STORE_KEYS.LOCKOUT_UNTIL, lockoutUntil.toString());

        Alert.alert(
          'Account Locked',
          `Too many failed attempts. Account locked for ${LOCKOUT_DURATION / (60 * 1000)} minutes.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error handling failed attempt:', error);
    }
  }

  private async resetFailedAttempts(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SECURE_STORE_KEYS.FAILED_ATTEMPTS);
      await AsyncStorage.removeItem(SECURE_STORE_KEYS.LOCKOUT_UNTIL);
    } catch (error) {
      console.error('Error resetting failed attempts:', error);
    }
  }

  private async getFailedAttempts(): Promise<number> {
    try {
      const attempts = await AsyncStorage.getItem(SECURE_STORE_KEYS.FAILED_ATTEMPTS);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      console.error('Error getting failed attempts:', error);
      return 0;
    }
  }

  private async isAccountLockedOut(): Promise<boolean> {
    try {
      const lockoutUntil = await AsyncStorage.getItem(SECURE_STORE_KEYS.LOCKOUT_UNTIL);
      if (!lockoutUntil) {
        return false;
      }

      const lockoutTime = parseInt(lockoutUntil, 10);
      return Date.now() < lockoutTime;
    } catch (error) {
      console.error('Error checking lockout status:', error);
      return false;
    }
  }

  private async getLockoutEndTime(): Promise<number> {
    try {
      const lockoutUntil = await AsyncStorage.getItem(SECURE_STORE_KEYS.LOCKOUT_UNTIL);
      return lockoutUntil ? parseInt(lockoutUntil, 10) : 0;
    } catch (error) {
      console.error('Error getting lockout end time:', error);
      return 0;
    }
  }

  async clearAllAuthData(): Promise<void> {
    try {
      // Remove all stored authentication data
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.CREDENTIALS);
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.PIN_HASH);

      await AsyncStorage.multiRemove([
        SECURE_STORE_KEYS.BIOMETRIC_ENABLED,
        SECURE_STORE_KEYS.PIN_BACKUP,
        SECURE_STORE_KEYS.FAILED_ATTEMPTS,
        SECURE_STORE_KEYS.LOCKOUT_UNTIL,
      ]);

      console.log('All authentication data cleared');
    } catch (error) {
      console.error('Failed to clear authentication data:', error);
    }
  }
}

export const biometricAuthService = BiometricAuthService.getInstance();
