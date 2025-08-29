import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { biometricService } from '@/services/biometric';

interface BiometricCapabilities {
  available: boolean;
  enabled: boolean;
  supportedTypes: string[];
  enrolledLevel: number;
}

interface UseBiometricReturn {
  isAvailable: boolean;
  isEnabled: boolean;
  isAuthenticated: boolean;
  supportedTypes: string[];
  authenticate: (reason?: string) => Promise<{ success: boolean; error?: string }>;
  enable: () => Promise<boolean>;
  disable: () => Promise<boolean>;
  checkCapabilities: () => Promise<BiometricCapabilities>;
}

export const useBiometric = (): UseBiometricReturn => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [supportedTypes, setSupportedTypes] = useState<string[]>([]);

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async (): Promise<void> => {
    try {
      const capabilities = await biometricService.checkCapabilities();
      setIsAvailable(capabilities.available);
      setIsEnabled(capabilities.enabled);
      setSupportedTypes(capabilities.supportedTypes);
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
    }
  };

  const authenticate = useCallback(async (reason?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!isAvailable) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      if (!isEnabled) {
        return {
          success: false,
          error: 'Biometric authentication is not enabled for this app',
        };
      }

      const result = await biometricService.authenticate(
        reason || 'Please verify your identity'
      );

      if (result.success) {
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Authentication failed',
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during authentication',
      };
    }
  }, [isAvailable, isEnabled]);

  const enable = useCallback(async (): Promise<boolean> => {
    try {
      if (!isAvailable) {
        Alert.alert(
          'Biometric Authentication Unavailable',
          'Your device does not support biometric authentication or it is not set up in device settings.'
        );
        return false;
      }

      // First authenticate to confirm user identity
      const authResult = await authenticate('Please verify your identity to enable biometric authentication');
      if (!authResult.success) {
        return false;
      }

      // Enable biometric authentication
      const success = await biometricService.enableBiometrics();
      if (success) {
        setIsEnabled(true);
        Alert.alert(
          'Biometric Authentication Enabled',
          'You can now use biometric authentication to sign in to the app.'
        );
      }

      return success;
    } catch (error) {
      console.error('Error enabling biometric authentication:', error);
      Alert.alert(
        'Error',
        'Failed to enable biometric authentication. Please try again.'
      );
      return false;
    }
  }, [isAvailable, authenticate]);

  const disable = useCallback(async (): Promise<boolean> => {
    try {
      const success = await biometricService.disableBiometrics();
      if (success) {
        setIsEnabled(false);
        setIsAuthenticated(false);
        Alert.alert(
          'Biometric Authentication Disabled',
          'You will need to use your password to sign in to the app.'
        );
      }

      return success;
    } catch (error) {
      console.error('Error disabling biometric authentication:', error);
      Alert.alert(
        'Error',
        'Failed to disable biometric authentication. Please try again.'
      );
      return false;
    }
  }, []);

  const checkCapabilities = useCallback(async (): Promise<BiometricCapabilities> => {
    try {
      const capabilities = await biometricService.checkCapabilities();
      
      // Update local state
      setIsAvailable(capabilities.available);
      setIsEnabled(capabilities.enabled);
      setSupportedTypes(capabilities.supportedTypes);
      
      return capabilities;
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      throw error;
    }
  }, []);

  return {
    isAvailable,
    isEnabled,
    isAuthenticated,
    supportedTypes,
    authenticate,
    enable,
    disable,
    checkCapabilities,
  };
};

export default useBiometric;