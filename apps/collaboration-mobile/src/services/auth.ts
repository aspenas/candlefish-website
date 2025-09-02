/**
 * Authentication Service
 * Handles JWT tokens, biometric authentication, and secure storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import ReactNativeBiometrics from 'react-native-biometrics';
import { Platform } from 'react-native';
import Config from '@/constants/config';
import { User } from '@/types';

const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true,
});

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  biometricEnabled?: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  signature?: string;
}

/**
 * Store auth tokens securely
 */
export const storeAuthTokens = async (tokens: AuthTokens): Promise<void> => {
  try {
    await Keychain.setInternetCredentials(
      Config.AUTH_TOKEN_KEY,
      'collaboration_user',
      JSON.stringify(tokens),
      {
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE,
        authenticationType: Keychain.AUTHENTICATION_TYPE.DEVICE_PASSCODE_OR_BIOMETRICS,
        accessGroup: Platform.OS === 'ios' ? Config.BUNDLE_ID : undefined,
      }
    );
  } catch (error) {
    console.error('Failed to store auth tokens:', error);
    // Fallback to AsyncStorage if Keychain fails
    await AsyncStorage.setItem(Config.AUTH_TOKEN_KEY, JSON.stringify(tokens));
  }
};

/**
 * Get auth tokens from secure storage
 */
export const getAuthTokens = async (): Promise<AuthTokens | null> => {
  try {
    const credentials = await Keychain.getInternetCredentials(Config.AUTH_TOKEN_KEY);
    if (credentials && credentials.password) {
      return JSON.parse(credentials.password);
    }
  } catch (error) {
    console.error('Failed to get auth tokens from Keychain:', error);
    // Fallback to AsyncStorage
    try {
      const tokens = await AsyncStorage.getItem(Config.AUTH_TOKEN_KEY);
      return tokens ? JSON.parse(tokens) : null;
    } catch (fallbackError) {
      console.error('Failed to get auth tokens from AsyncStorage:', fallbackError);
    }
  }
  return null;
};

/**
 * Get current access token
 */
export const getAuthToken = async (): Promise<string | null> => {
  const tokens = await getAuthTokens();
  if (!tokens) return null;
  
  // Check if token is expired
  if (Date.now() >= tokens.expiresAt) {
    const refreshedTokens = await refreshAuthToken();
    return refreshedTokens?.accessToken || null;
  }
  
  return tokens.accessToken;
};

/**
 * Clear all auth tokens
 */
export const clearAuthTokens = async (): Promise<void> => {
  try {
    await Keychain.resetInternetCredentials(Config.AUTH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear tokens from Keychain:', error);
  }
  
  try {
    await AsyncStorage.multiRemove([
      Config.AUTH_TOKEN_KEY,
      Config.REFRESH_TOKEN_KEY,
      Config.USER_DATA_KEY,
    ]);
  } catch (error) {
    console.error('Failed to clear tokens from AsyncStorage:', error);
  }
};

/**
 * Store user data
 */
export const storeUserData = async (user: User): Promise<void> => {
  try {
    await AsyncStorage.setItem(Config.USER_DATA_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to store user data:', error);
  }
};

/**
 * Get user data
 */
export const getUserData = async (): Promise<User | null> => {
  try {
    const userData = await AsyncStorage.getItem(Config.USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
};

/**
 * Clear user data
 */
export const clearUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(Config.USER_DATA_KEY);
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
};

/**
 * Refresh auth token
 */
export const refreshAuthToken = async (): Promise<AuthTokens | null> => {
  try {
    const tokens = await getAuthTokens();
    if (!tokens?.refreshToken) {
      return null;
    }

    const response = await fetch(`${Config.API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: tokens.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const newTokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + (data.expiresIn * 1000),
    };

    await storeAuthTokens(newTokens);
    return newTokens;
  } catch (error) {
    console.error('Failed to refresh auth token:', error);
    // Clear invalid tokens
    await clearAuthTokens();
    return null;
  }
};

/**
 * Check if biometric authentication is available
 */
export const isBiometricAvailable = async (): Promise<{
  available: boolean;
  biometryType?: string;
}> => {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    return { available, biometryType };
  } catch (error) {
    console.error('Failed to check biometric availability:', error);
    return { available: false };
  }
};

/**
 * Create biometric key pair
 */
export const createBiometricKey = async (): Promise<boolean> => {
  try {
    const { available } = await rnBiometrics.isSensorAvailable();
    if (!available) return false;

    const { success } = await rnBiometrics.createKeys();
    return success;
  } catch (error) {
    console.error('Failed to create biometric key:', error);
    return false;
  }
};

/**
 * Delete biometric key
 */
export const deleteBiometricKey = async (): Promise<boolean> => {
  try {
    const { success } = await rnBiometrics.deleteKeys();
    return success;
  } catch (error) {
    console.error('Failed to delete biometric key:', error);
    return false;
  }
};

/**
 * Authenticate with biometrics
 */
export const authenticateWithBiometrics = async (
  promptMessage: string = 'Authenticate to access your documents'
): Promise<BiometricAuthResult> => {
  try {
    const { available } = await rnBiometrics.isSensorAvailable();
    if (!available) {
      return { success: false, error: 'Biometric authentication not available' };
    }

    const epochTimeSeconds = Math.round(new Date().getTime() / 1000).toString();
    const payload = `${epochTimeSeconds}_biometric_auth`;

    const { success, signature } = await rnBiometrics.createSignature({
      promptMessage,
      payload,
    });

    if (success && signature) {
      return { success: true, signature };
    } else {
      return { success: false, error: 'Biometric authentication failed' };
    }
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Login with email and password
 */
export const login = async (credentials: LoginCredentials): Promise<{
  success: boolean;
  user?: User;
  tokens?: AuthTokens;
  error?: string;
}> => {
  try {
    const response = await fetch(`${Config.API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
          appVersion: Config.APP_VERSION,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Login failed',
      };
    }

    const tokens: AuthTokens = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + (data.expiresIn * 1000),
    };

    await storeAuthTokens(tokens);
    await storeUserData(data.user);

    // Set up biometric authentication if requested
    if (credentials.biometricEnabled && Config.FEATURES.BIOMETRIC_AUTH) {
      await createBiometricKey();
    }

    return {
      success: true,
      user: data.user,
      tokens,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};

/**
 * Logout
 */
export const logout = async (): Promise<void> => {
  try {
    const tokens = await getAuthTokens();
    if (tokens?.accessToken) {
      // Notify server about logout
      fetch(`${Config.API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      }).catch(() => {
        // Ignore logout request failures
      });
    }
  } catch (error) {
    console.error('Logout request error:', error);
  } finally {
    // Always clear local data
    await clearAuthTokens();
    await clearUserData();
    await deleteBiometricKey();
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const tokens = await getAuthTokens();
  return !!tokens && Date.now() < tokens.expiresAt;
};

/**
 * Get current user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  if (!(await isAuthenticated())) {
    return null;
  }
  return getUserData();
};