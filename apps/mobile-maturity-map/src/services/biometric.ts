import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export interface BiometricCapabilities {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  securityLevel: LocalAuthentication.SecurityLevel;
}

export class BiometricService {
  /**
   * Check if biometric authentication is available on this device
   */
  static async getCapabilities(): Promise<BiometricCapabilities> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();

    return {
      hasHardware,
      isEnrolled,
      supportedTypes,
      securityLevel,
    };
  }

  /**
   * Check if biometric authentication is enabled for this app
   */
  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await SecureStore.getItemAsync('biometric_enabled');
      return enabled === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Enable biometric authentication for the app
   */
  static async enableBiometric(fallbackPin?: string): Promise<void> {
    const capabilities = await this.getCapabilities();
    
    if (!capabilities.hasHardware) {
      throw new Error('Biometric hardware not available');
    }
    
    if (!capabilities.isEnrolled) {
      throw new Error('No biometric credentials enrolled');
    }

    // Test biometric authentication first
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enable biometric authentication',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    if (!result.success) {
      throw new Error('Biometric authentication test failed');
    }

    // Store biometric preference
    await SecureStore.setItemAsync('biometric_enabled', 'true');
    
    // Store fallback PIN if provided
    if (fallbackPin) {
      await SecureStore.setItemAsync('biometric_fallback_pin', fallbackPin);
    }
  }

  /**
   * Disable biometric authentication for the app
   */
  static async disableBiometric(): Promise<void> {
    await SecureStore.deleteItemAsync('biometric_enabled');
    await SecureStore.deleteItemAsync('biometric_fallback_pin');
  }

  /**
   * Authenticate using biometric or device credentials
   */
  static async authenticate(options?: {
    promptMessage?: string;
    cancelLabel?: string;
    fallbackLabel?: string;
    requireBiometric?: boolean;
  }): Promise<LocalAuthentication.LocalAuthenticationResult> {
    const {
      promptMessage = 'Authenticate to continue',
      cancelLabel = 'Cancel',
      fallbackLabel = 'Use PIN',
      requireBiometric = false,
    } = options || {};

    const capabilities = await this.getCapabilities();
    
    if (!capabilities.hasHardware) {
      throw new Error('Biometric hardware not available');
    }

    const authOptions: LocalAuthentication.LocalAuthenticationOptions = {
      promptMessage,
      cancelLabel,
      disableDeviceFallback: requireBiometric,
    };

    // Add fallback label only if device supports it
    if (!requireBiometric && capabilities.supportedTypes.length > 0) {
      authOptions.fallbackLabel = fallbackLabel;
    }

    return await LocalAuthentication.authenticateAsync(authOptions);
  }

  /**
   * Get a user-friendly description of available biometric types
   */
  static getBiometricTypeDescription(types: LocalAuthentication.AuthenticationType[]): string {
    const descriptions = types.map(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'Fingerprint';
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'Face ID';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'Iris';
        default:
          return 'Biometric';
      }
    });

    if (descriptions.length === 0) {
      return 'Device credentials';
    } else if (descriptions.length === 1) {
      return descriptions[0];
    } else if (descriptions.length === 2) {
      return descriptions.join(' or ');
    } else {
      return descriptions.slice(0, -1).join(', ') + ', or ' + descriptions[descriptions.length - 1];
    }
  }

  /**
   * Quick authentication for app unlock
   */
  static async quickAuth(): Promise<boolean> {
    try {
      const isEnabled = await this.isBiometricEnabled();
      if (!isEnabled) {
        return false;
      }

      const capabilities = await this.getCapabilities();
      if (!capabilities.hasHardware || !capabilities.isEnrolled) {
        return false;
      }

      const result = await this.authenticate({
        promptMessage: 'Unlock Candlefish Maturity Map',
        requireBiometric: false,
      });

      return result.success;
    } catch (error) {
      console.error('Quick auth failed:', error);
      return false;
    }
  }

  /**
   * Authenticate for sensitive operations
   */
  static async authenticateForSensitiveOperation(operationName: string): Promise<boolean> {
    try {
      const result = await this.authenticate({
        promptMessage: `Authenticate to ${operationName}`,
        requireBiometric: false,
      });

      if (!result.success && result.error === 'UserCancel') {
        return false;
      }

      if (!result.success) {
        throw new Error(result.error || 'Authentication failed');
      }

      return true;
    } catch (error) {
      console.error('Sensitive operation auth failed:', error);
      return false;
    }
  }

  /**
   * Check if PIN fallback is available
   */
  static async hasFallbackPin(): Promise<boolean> {
    try {
      const pin = await SecureStore.getItemAsync('biometric_fallback_pin');
      return !!pin;
    } catch {
      return false;
    }
  }

  /**
   * Verify PIN fallback
   */
  static async verifyFallbackPin(pin: string): Promise<boolean> {
    try {
      const storedPin = await SecureStore.getItemAsync('biometric_fallback_pin');
      return storedPin === pin;
    } catch {
      return false;
    }
  }
}