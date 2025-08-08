import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

interface BiometricResult {
  success: boolean;
  error?: string;
  biometryType?: string;
}

interface BiometricAvailability {
  isAvailable: boolean;
  supportedTypes: string[];
  isEnrolled: boolean;
}

export class BiometricService {
  private static instance: BiometricService;

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  static async initialize(): Promise<void> {
    // Initialize the service
    BiometricService.getInstance();
  }

  static async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  static async getAvailabilityDetails(): Promise<BiometricAvailability> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      const typeNames = supportedTypes.map(type => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'Fingerprint';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'Face ID';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'Iris';
          default:
            return 'Unknown';
        }
      });

      return {
        isAvailable: hasHardware && isEnrolled,
        supportedTypes: typeNames,
        isEnrolled,
      };
    } catch (error) {
      console.error('Error getting biometric details:', error);
      return {
        isAvailable: false,
        supportedTypes: [],
        isEnrolled: false,
      };
    }
  }

  static async authenticate(
    reason?: string,
    fallbackLabel?: string
  ): Promise<BiometricResult> {
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const biometryType = this.getBiometryTypeString(supportedTypes);

      const defaultReason = `Use ${biometryType} to authenticate`;
      const authReason = reason || defaultReason;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: authReason,
        fallbackLabel: fallbackLabel || 'Use Password',
        disableDeviceFallback: false,
        requireConfirmation: false,
      });

      if (result.success) {
        return {
          success: true,
          biometryType,
        };
      } else {
        return {
          success: false,
          error: this.getErrorMessage(result.error),
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  static async authenticateForLogin(): Promise<BiometricResult> {
    return this.authenticate(
      'Authenticate to sign in to Candlefish Analytics',
      'Enter Password'
    );
  }

  static async authenticateForSensitiveAction(action: string): Promise<BiometricResult> {
    return this.authenticate(
      `Authenticate to ${action}`,
      'Use Password'
    );
  }

  private static getBiometryTypeString(types: LocalAuthentication.AuthenticationType[]): string {
    if (Platform.OS === 'ios') {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Touch ID';
      }
    } else {
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face Recognition';
      }
    }
    return 'Biometric';
  }

  private static getErrorMessage(error?: string): string {
    if (!error) return 'Authentication failed';

    // Map common error messages to user-friendly ones
    const errorMap: Record<string, string> = {
      'UserCancel': 'Authentication was cancelled',
      'UserFallback': 'Fallback authentication selected',
      'SystemCancel': 'Authentication was cancelled by system',
      'PasscodeNotSet': 'Device passcode is not set',
      'BiometryNotAvailable': 'Biometric authentication is not available',
      'BiometryNotEnrolled': 'No biometric identities are enrolled',
      'BiometryLockout': 'Biometric authentication is locked out',
      'AuthenticationFailed': 'Authentication failed - please try again',
      'InvalidContext': 'Authentication context is invalid',
      'NotInteractive': 'Authentication cannot be interactive',
      'TouchIDNotAvailable': 'Touch ID is not available',
      'TouchIDNotEnrolled': 'Touch ID is not enrolled',
      'TouchIDLockout': 'Touch ID is locked out',
      'FaceIDNotAvailable': 'Face ID is not available',
      'FaceIDNotEnrolled': 'Face ID is not enrolled',
      'FaceIDLockout': 'Face ID is locked out',
    };

    return errorMap[error] || error;
  }

  static async canUseBiometricForApp(): Promise<{
    canUse: boolean;
    reason?: string;
  }> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return {
          canUse: false,
          reason: 'This device does not support biometric authentication',
        };
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        return {
          canUse: false,
          reason: 'No biometric identities are enrolled on this device',
        };
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (supportedTypes.length === 0) {
        return {
          canUse: false,
          reason: 'No supported biometric authentication types found',
        };
      }

      return { canUse: true };
    } catch (error) {
      console.error('Error checking biometric capability:', error);
      return {
        canUse: false,
        reason: 'Unable to check biometric capability',
      };
    }
  }

  static getBiometricTypeDisplayName(): string {
    if (Platform.OS === 'ios') {
      return 'Face ID or Touch ID';
    } else {
      return 'Fingerprint or Face';
    }
  }

  static async promptForBiometricSetup(): Promise<boolean> {
    try {
      const { canUse, reason } = await this.canUseBiometricForApp();

      if (!canUse) {
        console.log('Cannot set up biometric authentication:', reason);
        return false;
      }

      // Test authentication to ensure it works
      const result = await this.authenticate(
        'Test biometric authentication to enable this feature',
        'Cancel'
      );

      return result.success;
    } catch (error) {
      console.error('Error setting up biometric authentication:', error);
      return false;
    }
  }
}
