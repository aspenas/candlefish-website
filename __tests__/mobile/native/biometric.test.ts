import { BiometricService } from '../../../apps/mobile-dashboard/src/services/biometric';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock LocalAuthentication
jest.mock('expo-local-authentication', () => ({
  isAvailableAsync: jest.fn(),
  getAvailableAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
    PASSCODE: 4,
  },
  AuthenticationResult: {
    SUCCESS: 'success',
    CANCEL: 'cancel',
    LOCKOUT: 'lockout',
    USER_FALLBACK: 'user_fallback',
    SYSTEM_CANCEL: 'system_cancel',
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
}));

describe('BiometricService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the singleton instance
    BiometricService['instance'] = undefined;
  });

  describe('Initialize', () => {
    it('should initialize successfully when biometrics are available', async () => {
      // Arrange
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.getAvailableAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      // Act
      await BiometricService.initialize();

      // Assert
      expect(LocalAuthentication.hasHardwareAsync).toHaveBeenCalled();
      expect(LocalAuthentication.isEnrolledAsync).toHaveBeenCalled();
      expect(LocalAuthentication.getAvailableAuthenticationTypesAsync).toHaveBeenCalled();
    });

    it('should handle initialization when biometrics are not available', async () => {
      // Arrange
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.getAvailableAuthenticationTypesAsync as jest.Mock).mockResolvedValue([]);

      // Act
      await BiometricService.initialize();

      // Assert
      expect(LocalAuthentication.hasHardwareAsync).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      // Arrange
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockRejectedValue(
        new Error('Hardware check failed')
      );

      // Act & Assert
      await expect(BiometricService.initialize()).resolves.not.toThrow();
    });
  });

  describe('Availability Check', () => {
    it('should return availability when all features are supported', async () => {
      // Arrange
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.getAvailableAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      // Act
      const availability = await BiometricService.checkAvailability();

      // Assert
      expect(availability).toEqual({
        isAvailable: true,
        supportedTypes: ['Fingerprint', 'Face ID'],
        isEnrolled: true,
      });
    });

    it('should return unavailable when hardware is not present', async () => {
      // Arrange
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);

      // Act
      const availability = await BiometricService.checkAvailability();

      // Assert
      expect(availability).toEqual({
        isAvailable: false,
        supportedTypes: [],
        isEnrolled: false,
      });
    });

    it('should return unavailable when no biometrics are enrolled', async () => {
      // Arrange
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);

      // Act
      const availability = await BiometricService.checkAvailability();

      // Assert
      expect(availability).toEqual({
        isAvailable: false,
        supportedTypes: [],
        isEnrolled: false,
      });
    });

    it('should map authentication types correctly', async () => {
      // Arrange
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.getAvailableAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
        LocalAuthentication.AuthenticationType.IRIS,
      ]);

      // Act
      const availability = await BiometricService.checkAvailability();

      // Assert
      expect(availability.supportedTypes).toContain('Fingerprint');
      expect(availability.supportedTypes).toContain('Face ID');
      expect(availability.supportedTypes).toContain('Iris');
    });
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      // Set up biometrics as available
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.getAvailableAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      await BiometricService.initialize();
    });

    it('should authenticate successfully', async () => {
      // Arrange
      const promptMessage = 'Please verify your identity';
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });

      // Act
      const result = await BiometricService.authenticate(promptMessage);

      // Assert
      expect(result.success).toBe(true);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage,
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
      });
    });

    it('should handle user cancellation', async () => {
      // Arrange
      const promptMessage = 'Please verify your identity';
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      // Act
      const result = await BiometricService.authenticate(promptMessage);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication was cancelled by user');
    });

    it('should handle system cancellation', async () => {
      // Arrange
      const promptMessage = 'Please verify your identity';
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'system_cancel',
      });

      // Act
      const result = await BiometricService.authenticate(promptMessage);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication was cancelled by system');
    });

    it('should handle biometric lockout', async () => {
      // Arrange
      const promptMessage = 'Please verify your identity';
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'lockout',
      });

      // Act
      const result = await BiometricService.authenticate(promptMessage);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Too many failed attempts, biometric authentication is temporarily disabled');
    });

    it('should handle fallback to device passcode', async () => {
      // Arrange
      const promptMessage = 'Please verify your identity';
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
        error: 'user_fallback',
      });

      // Act
      const result = await BiometricService.authenticate(promptMessage);

      // Assert
      expect(result.success).toBe(true);
      expect(result.usedFallback).toBe(true);
    });

    it('should fail when biometrics are not available', async () => {
      // Arrange
      // Mock unavailable biometrics
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      await BiometricService.initialize();

      // Act
      const result = await BiometricService.authenticate('Test prompt');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Biometric authentication is not available on this device');
    });

    it('should handle authentication errors gracefully', async () => {
      // Arrange
      const promptMessage = 'Please verify your identity';
      (LocalAuthentication.authenticateAsync as jest.Mock).mockRejectedValue(
        new Error('Authentication service error')
      );

      // Act
      const result = await BiometricService.authenticate(promptMessage);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication service error');
    });

    it('should use custom options when provided', async () => {
      // Arrange
      const promptMessage = 'Custom prompt message';
      const options = {
        disableDeviceFallback: true,
        cancelLabel: 'Close',
        fallbackLabel: 'Use PIN',
      };

      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });

      // Act
      await BiometricService.authenticate(promptMessage, options);

      // Assert
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage,
        disableDeviceFallback: true,
        cancelLabel: 'Close',
        fallbackLabel: 'Use PIN',
      });
    });
  });

  describe('Settings Management', () => {
    beforeEach(async () => {
      await BiometricService.initialize();
    });

    it('should enable biometric authentication', async () => {
      // Arrange
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Act
      await BiometricService.enableBiometricAuth();

      // Assert
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'biometric_enabled',
        'true'
      );
    });

    it('should disable biometric authentication', async () => {
      // Arrange
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Act
      await BiometricService.disableBiometricAuth();

      // Assert
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'biometric_enabled',
        'false'
      );
    });

    it('should check if biometric auth is enabled', async () => {
      // Arrange
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      // Act
      const isEnabled = await BiometricService.isBiometricAuthEnabled();

      // Assert
      expect(isEnabled).toBe(true);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('biometric_enabled');
    });

    it('should return false when biometric setting is not set', async () => {
      // Arrange
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      // Act
      const isEnabled = await BiometricService.isBiometricAuthEnabled();

      // Assert
      expect(isEnabled).toBe(false);
    });

    it('should handle storage errors gracefully', async () => {
      // Arrange
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage access failed')
      );

      // Act
      const isEnabled = await BiometricService.isBiometricAuthEnabled();

      // Assert
      expect(isEnabled).toBe(false);
    });
  });

  describe('Biometric Type Detection', () => {
    it('should return correct biometric type name for Touch ID', async () => {
      // Arrange
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.getAvailableAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      // Act
      const typeName = await BiometricService.getBiometricTypeName();

      // Assert
      expect(typeName).toBe('Touch ID');
    });

    it('should return correct biometric type name for Face ID', async () => {
      // Arrange
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.getAvailableAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      // Act
      const typeName = await BiometricService.getBiometricTypeName();

      // Assert
      expect(typeName).toBe('Face ID');
    });

    it('should return generic name for multiple types', async () => {
      // Arrange
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.getAvailableAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      // Act
      const typeName = await BiometricService.getBiometricTypeName();

      // Assert
      expect(typeName).toBe('Fingerprint or Face');
    });

    it('should return default name when no biometrics are available', async () => {
      // Arrange
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);

      // Act
      const typeName = await BiometricService.getBiometricTypeName();

      // Assert
      expect(typeName).toBe('Biometric Authentication');
    });
  });

  describe('App Usage Validation', () => {
    beforeEach(async () => {
      // Set up biometrics as available
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.getAvailableAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      await BiometricService.initialize();
    });

    it('should return true when biometrics can be used for app', async () => {
      // Arrange
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      // Act
      const result = await BiometricService.canUseBiometricForApp();

      // Assert
      expect(result.canUse).toBe(true);
      expect(result.reason).toBe('Biometric authentication is available and enabled');
    });

    it('should return false when biometrics are not available', async () => {
      // Arrange
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      await BiometricService.initialize();

      // Act
      const result = await BiometricService.canUseBiometricForApp();

      // Assert
      expect(result.canUse).toBe(false);
      expect(result.reason).toBe('Biometric authentication is not available on this device');
    });

    it('should return false when biometrics are not enabled in app', async () => {
      // Arrange
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('false');

      // Act
      const result = await BiometricService.canUseBiometricForApp();

      // Assert
      expect(result.canUse).toBe(false);
      expect(result.reason).toBe('Biometric authentication is disabled in app settings');
    });

    it('should return false when no biometrics are enrolled', async () => {
      // Arrange
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      await BiometricService.initialize();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      // Act
      const result = await BiometricService.canUseBiometricForApp();

      // Assert
      expect(result.canUse).toBe(false);
      expect(result.reason).toBe('No biometric credentials are enrolled on this device');
    });
  });

  describe('Setup Flow', () => {
    beforeEach(async () => {
      // Set up biometrics as available
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.getAvailableAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      await BiometricService.initialize();
    });

    it('should successfully set up biometric authentication', async () => {
      // Arrange
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });

      // Act
      const result = await BiometricService.promptForBiometricSetup();

      // Assert
      expect(result).toBe(true);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Test biometric authentication to enable this feature',
        disableDeviceFallback: false,
      });
    });

    it('should fail setup when biometrics cannot be used', async () => {
      // Arrange
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      await BiometricService.initialize();

      // Act
      const result = await BiometricService.promptForBiometricSetup();

      // Assert
      expect(result).toBe(false);
    });

    it('should fail setup when authentication test fails', async () => {
      // Arrange
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      // Act
      const result = await BiometricService.promptForBiometricSetup();

      // Assert
      expect(result).toBe(false);
    });

    it('should handle setup errors gracefully', async () => {
      // Arrange
      (LocalAuthentication.authenticateAsync as jest.Mock).mockRejectedValue(
        new Error('Setup failed')
      );

      // Act
      const result = await BiometricService.promptForBiometricSetup();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Security Considerations', () => {
    it('should not allow authentication with invalid prompt', async () => {
      // Arrange
      const emptyPrompt = '';

      // Act & Assert
      await expect(
        BiometricService.authenticate(emptyPrompt)
      ).rejects.toThrow('Prompt message is required');
    });

    it('should enforce minimum security level', async () => {
      // Arrange
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.getAvailableAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.PASSCODE, // Only passcode, not secure enough
      ]);

      await BiometricService.initialize();

      // Act
      const availability = await BiometricService.checkAvailability();

      // Assert
      expect(availability.isAvailable).toBe(false);
    });

    it('should clear sensitive data on multiple failed attempts', async () => {
      // Arrange
      const service = BiometricService.getInstance();

      // Simulate multiple failed attempts
      for (let i = 0; i < 5; i++) {
        (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
          success: false,
          error: 'biometric_failed',
        });

        await BiometricService.authenticate('Test prompt');
      }

      // Act
      const result = await BiometricService.canUseBiometricForApp();

      // Assert
      // After multiple failures, biometric auth should be temporarily disabled
      expect(result.canUse).toBe(false);
      expect(result.reason).toBe('Too many failed authentication attempts');
    });
  });

  describe('Platform-Specific Behavior', () => {
    it('should handle iOS-specific authentication options', async () => {
      // Arrange
      const mockPlatform = require('react-native').Platform;
      mockPlatform.OS = 'ios';

      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.getAvailableAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      await BiometricService.initialize();

      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });

      // Act
      await BiometricService.authenticate('iOS Face ID prompt');

      // Assert
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'iOS Face ID prompt',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
      });
    });

    it('should handle Android-specific authentication options', async () => {
      // Arrange
      const mockPlatform = require('react-native').Platform;
      mockPlatform.OS = 'android';

      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.getAvailableAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      await BiometricService.initialize();

      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: true,
      });

      // Act
      await BiometricService.authenticate('Android fingerprint prompt');

      // Assert
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Android fingerprint prompt',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Passcode',
      });
    });
  });
});
