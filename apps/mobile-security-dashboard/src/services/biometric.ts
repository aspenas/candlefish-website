// Biometric Authentication Service for Security Dashboard
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Types
export interface BiometricCapabilities {
  isAvailable: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  isEnrolled: boolean;
  securityLevel: 'none' | 'biometric' | 'passcode' | 'both';
}

export interface BiometricAuthOptions {
  promptMessage?: string;
  subPrompt?: string;
  cancelLabel?: string;
  fallbackLabel?: string;
  disableDeviceFallback?: boolean;
  requireConfirmation?: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: string;
  warning?: string;
}

export interface BiometricSettings {
  enabled: boolean;
  authOnLaunch: boolean;
  authOnResumeFromBackground: boolean;
  authForCriticalActions: boolean;
  lockTimeout: number; // minutes
  maxFailedAttempts: number;
}

class BiometricService {
  private static instance: BiometricService;
  private capabilities: BiometricCapabilities | null = null;
  private settings: BiometricSettings | null = null;
  private isLocked: boolean = false;
  private failedAttempts: number = 0;
  private lockTimeoutTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  private async initialize(): Promise<void> {
    try {
      await this.loadSettings();
      await this.checkCapabilities();
    } catch (error) {
      console.error('Failed to initialize biometric service:', error);
    }
  }

  // Check device biometric capabilities
  async checkCapabilities(): Promise<BiometricCapabilities> {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      let securityLevel: BiometricCapabilities['securityLevel'] = 'none';

      if (isEnrolled && supportedTypes.length > 0) {
        if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ||
            supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT) ||
            supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          securityLevel = 'biometric';
        }
      } else if (await LocalAuthentication.getEnrolledLevelAsync() > 0) {
        securityLevel = 'passcode';
      }

      this.capabilities = {
        isAvailable,
        supportedTypes,
        isEnrolled,
        securityLevel,
      };

      return this.capabilities;
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
      this.capabilities = {
        isAvailable: false,
        supportedTypes: [],
        isEnrolled: false,
        securityLevel: 'none',
      };
      return this.capabilities;
    }
  }

  // Get biometric type description
  getBiometricTypeDescription(): string {
    if (!this.capabilities) return 'Biometric Authentication';

    const { supportedTypes } = this.capabilities;

    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Authentication';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris Recognition';
    }

    return 'Biometric Authentication';
  }

  // Perform biometric authentication
  async authenticate(options: BiometricAuthOptions = {}): Promise<BiometricAuthResult> {
    try {
      if (this.isLocked) {
        return {
          success: false,
          error: 'Authentication is temporarily locked due to too many failed attempts',
        };
      }

      if (!this.capabilities?.isAvailable || !this.capabilities?.isEnrolled) {
        return {
          success: false,
          error: 'Biometric authentication is not available or not set up on this device',
        };
      }

      const biometricType = this.getBiometricTypeDescription();

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options.promptMessage || `Use ${biometricType} to access Security Dashboard`,
        subPrompt: options.subPrompt || 'Secure access to security monitoring data',
        cancelLabel: options.cancelLabel || 'Cancel',
        fallbackLabel: options.fallbackLabel || 'Use Passcode',
        disableDeviceFallback: options.disableDeviceFallback || false,
        requireConfirmation: options.requireConfirmation || false,
      });

      if (result.success) {
        this.failedAttempts = 0;
        this.clearLockTimeout();

        // Log successful authentication
        await this.logAuthenticationEvent('success', biometricType);

        return {
          success: true,
          biometricType,
        };
      } else {
        this.handleFailedAuthentication();

        let error = 'Authentication failed';
        if (result.error === 'user_cancel') {
          error = 'Authentication was cancelled by user';
        } else if (result.error === 'system_cancel') {
          error = 'Authentication was cancelled by system';
        } else if (result.error === 'not_available') {
          error = 'Biometric authentication is not available';
        } else if (result.error === 'not_enrolled') {
          error = 'No biometric credentials are enrolled';
        } else if (result.error === 'lockout') {
          error = 'Too many failed attempts. Please wait before trying again.';
        }

        await this.logAuthenticationEvent('failed', biometricType, error);

        return {
          success: false,
          error,
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred during authentication',
      };
    }
  }

  // Handle failed authentication attempts
  private handleFailedAuthentication(): void {
    this.failedAttempts++;

    const maxAttempts = this.settings?.maxFailedAttempts || 3;

    if (this.failedAttempts >= maxAttempts) {
      this.lockAuthentication();
    }
  }

  // Lock authentication temporarily
  private lockAuthentication(): void {
    this.isLocked = true;
    const lockDuration = 5 * 60 * 1000; // 5 minutes

    this.lockTimeoutTimer = setTimeout(() => {
      this.isLocked = false;
      this.failedAttempts = 0;
    }, lockDuration);
  }

  // Clear lock timeout
  private clearLockTimeout(): void {
    if (this.lockTimeoutTimer) {
      clearTimeout(this.lockTimeoutTimer);
      this.lockTimeoutTimer = null;
    }
  }

  // Quick authentication for critical actions
  async authenticateForAction(actionName: string): Promise<BiometricAuthResult> {
    const options: BiometricAuthOptions = {
      promptMessage: `Authenticate to ${actionName}`,
      subPrompt: 'This action requires security verification',
      requireConfirmation: true,
    };

    return this.authenticate(options);
  }

  // Check if biometric auth is required for an action
  shouldRequireAuthForAction(actionType: 'critical' | 'standard' | 'view'): boolean {
    if (!this.settings?.enabled) return false;

    switch (actionType) {
      case 'critical':
        return this.settings.authForCriticalActions;
      case 'standard':
        return false; // Usually don't require auth for standard actions
      case 'view':
        return false; // Usually don't require auth for viewing
      default:
        return false;
    }
  }

  // Settings management
  async loadSettings(): Promise<BiometricSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem('biometric_settings');

      this.settings = settingsJson
        ? JSON.parse(settingsJson)
        : this.getDefaultSettings();

      return this.settings;
    } catch (error) {
      console.error('Error loading biometric settings:', error);
      this.settings = this.getDefaultSettings();
      return this.settings;
    }
  }

  async saveSettings(settings: Partial<BiometricSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...settings } as BiometricSettings;
      await AsyncStorage.setItem('biometric_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Error saving biometric settings:', error);
    }
  }

  private getDefaultSettings(): BiometricSettings {
    return {
      enabled: false,
      authOnLaunch: true,
      authOnResumeFromBackground: true,
      authForCriticalActions: true,
      lockTimeout: 15, // 15 minutes
      maxFailedAttempts: 3,
    };
  }

  // Enable/disable biometric authentication
  async enableBiometricAuth(): Promise<BiometricAuthResult> {
    const capabilities = await this.checkCapabilities();

    if (!capabilities.isAvailable || !capabilities.isEnrolled) {
      return {
        success: false,
        error: 'Biometric authentication is not available or not set up on this device',
      };
    }

    // Test authentication before enabling
    const authResult = await this.authenticate({
      promptMessage: 'Enable biometric authentication for Security Dashboard',
      subPrompt: 'This will secure your access to security data',
    });

    if (authResult.success) {
      await this.saveSettings({ enabled: true });
      return { success: true };
    } else {
      return authResult;
    }
  }

  async disableBiometricAuth(): Promise<void> {
    await this.saveSettings({ enabled: false });
    this.clearStoredCredentials();
  }

  // Credential storage for offline access
  async storeCredentials(token: string, userId: string): Promise<void> {
    if (!this.settings?.enabled) return;

    try {
      await SecureStore.setItemAsync('auth_token_biometric', token);
      await SecureStore.setItemAsync('user_id_biometric', userId);
    } catch (error) {
      console.error('Error storing biometric credentials:', error);
    }
  }

  async getStoredCredentials(): Promise<{ token: string; userId: string } | null> {
    if (!this.settings?.enabled) return null;

    try {
      const token = await SecureStore.getItemAsync('auth_token_biometric');
      const userId = await SecureStore.getItemAsync('user_id_biometric');

      if (token && userId) {
        return { token, userId };
      }

      return null;
    } catch (error) {
      console.error('Error retrieving biometric credentials:', error);
      return null;
    }
  }

  async clearStoredCredentials(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('auth_token_biometric');
      await SecureStore.deleteItemAsync('user_id_biometric');
    } catch (error) {
      console.error('Error clearing biometric credentials:', error);
    }
  }

  // Authentication logging for security audit
  private async logAuthenticationEvent(
    type: 'success' | 'failed',
    method: string,
    error?: string
  ): Promise<void> {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        type,
        method,
        error,
        platform: Platform.OS,
      };

      const existingLogs = await AsyncStorage.getItem('biometric_auth_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];

      logs.push(logEntry);

      // Keep only last 100 entries
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }

      await AsyncStorage.setItem('biometric_auth_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Error logging authentication event:', error);
    }
  }

  // Get current settings
  getSettings(): BiometricSettings | null {
    return this.settings;
  }

  // Get capabilities
  getCapabilities(): BiometricCapabilities | null {
    return this.capabilities;
  }

  // Check if authentication is currently locked
  isAuthenticationLocked(): boolean {
    return this.isLocked;
  }

  // Get failed attempts count
  getFailedAttemptsCount(): number {
    return this.failedAttempts;
  }
}

// Export singleton instance
export const biometricService = BiometricService.getInstance();

// Hook for React components
export const useBiometric = () => {
  const [capabilities, setCapabilities] = React.useState<BiometricCapabilities | null>(null);
  const [settings, setSettings] = React.useState<BiometricSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const initializeBiometric = async () => {
      try {
        const [caps, setts] = await Promise.all([
          biometricService.checkCapabilities(),
          biometricService.loadSettings(),
        ]);

        setCapabilities(caps);
        setSettings(setts);
      } catch (error) {
        console.error('Error initializing biometric service:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeBiometric();
  }, []);

  const authenticate = async (options?: BiometricAuthOptions): Promise<BiometricAuthResult> => {
    return biometricService.authenticate(options);
  };

  const enableBiometric = async (): Promise<BiometricAuthResult> => {
    const result = await biometricService.enableBiometricAuth();
    if (result.success) {
      const newSettings = await biometricService.loadSettings();
      setSettings(newSettings);
    }
    return result;
  };

  const disableBiometric = async (): Promise<void> => {
    await biometricService.disableBiometricAuth();
    const newSettings = await biometricService.loadSettings();
    setSettings(newSettings);
  };

  const updateSettings = async (newSettings: Partial<BiometricSettings>): Promise<void> => {
    await biometricService.saveSettings(newSettings);
    const updatedSettings = await biometricService.loadSettings();
    setSettings(updatedSettings);
  };

  return {
    capabilities,
    settings,
    isLoading,
    authenticate,
    enableBiometric,
    disableBiometric,
    updateSettings,
    authenticateForAction: biometricService.authenticateForAction.bind(biometricService),
    shouldRequireAuthForAction: biometricService.shouldRequireAuthForAction.bind(biometricService),
    getBiometricTypeDescription: biometricService.getBiometricTypeDescription.bind(biometricService),
  };
};

export default biometricService;
