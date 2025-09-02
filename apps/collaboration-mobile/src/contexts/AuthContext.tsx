/**
 * Authentication Context
 * Manages user authentication state and biometric authentication
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  login, 
  logout as authLogout, 
  getCurrentUser, 
  isAuthenticated as checkAuthenticated,
  authenticateWithBiometrics,
  isBiometricAvailable,
  LoginCredentials,
} from '@/services/auth';
import { User, BiometricAuthResult } from '@/types';
import Config from '@/constants/config';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  login: (credentials: LoginCredentials) => Promise<{
    success: boolean;
    error?: string;
  }>;
  logout: () => Promise<void>;
  authenticateWithBiometrics: () => Promise<BiometricAuthResult>;
  enableBiometrics: () => Promise<boolean>;
  disableBiometrics: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  /**
   * Initialize authentication state
   */
  useEffect(() => {
    initializeAuth();
    checkBiometricAvailability();
  }, []);

  /**
   * Handle app state changes for biometric lock
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [biometricEnabled, isAuthenticated]);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      const authenticated = await checkAuthenticated();
      
      if (authenticated) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
        
        // Check if biometrics is enabled
        const biometricEnabledFlag = await AsyncStorage.getItem('biometric_enabled');
        setBiometricEnabled(biometricEnabledFlag === 'true');
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const checkBiometricAvailability = async () => {
    if (Config.FEATURES.BIOMETRIC_AUTH) {
      const { available } = await isBiometricAvailable();
      setBiometricAvailable(available);
    }
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, check if biometric auth is needed
      if (biometricEnabled && isAuthenticated) {
        promptBiometricAuth();
      }
    }
    setAppState(nextAppState);
  };

  const promptBiometricAuth = () => {
    if (!biometricAvailable) return;

    setTimeout(() => {
      Alert.alert(
        'Authentication Required',
        'Please authenticate to continue using the app',
        [
          {
            text: 'Use Biometrics',
            onPress: async () => {
              const result = await authenticateWithBiometricsInternal();
              if (!result.success) {
                // If biometric fails, logout user
                await handleLogout();
              }
            },
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: () => handleLogout(),
          },
        ],
        { cancelable: false }
      );
    }, 500); // Small delay to ensure UI is ready
  };

  const handleLogin = async (credentials: LoginCredentials): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      setIsLoading(true);
      const result = await login(credentials);
      
      if (result.success && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
        
        if (credentials.biometricEnabled && biometricAvailable) {
          await AsyncStorage.setItem('biometric_enabled', 'true');
          setBiometricEnabled(true);
        }
      }
      
      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return {
        success: false,
        error: message,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authLogout();
      setUser(null);
      setIsAuthenticated(false);
      setBiometricEnabled(false);
      await AsyncStorage.removeItem('biometric_enabled');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const authenticateWithBiometricsInternal = async (): Promise<BiometricAuthResult> => {
    if (!biometricAvailable) {
      return { 
        success: false, 
        error: 'Biometric authentication not available' 
      };
    }

    return authenticateWithBiometrics('Authenticate to access your documents');
  };

  const enableBiometrics = async (): Promise<boolean> => {
    try {
      if (!biometricAvailable) return false;
      
      const result = await authenticateWithBiometricsInternal();
      if (result.success) {
        await AsyncStorage.setItem('biometric_enabled', 'true');
        setBiometricEnabled(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to enable biometrics:', error);
      return false;
    }
  };

  const disableBiometrics = async (): Promise<boolean> => {
    try {
      await AsyncStorage.removeItem('biometric_enabled');
      setBiometricEnabled(false);
      return true;
    } catch (error) {
      console.error('Failed to disable biometrics:', error);
      return false;
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    biometricEnabled,
    biometricAvailable,
    login: handleLogin,
    logout: handleLogout,
    authenticateWithBiometrics: authenticateWithBiometricsInternal,
    enableBiometrics,
    disableBiometrics,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};