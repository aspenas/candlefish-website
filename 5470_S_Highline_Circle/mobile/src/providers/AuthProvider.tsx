import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Biometric authentication
import TouchID from 'react-native-touch-id';

// Services
import { SecurityService } from '../services/security';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  preferences: {
    biometricAuth: boolean;
    autoLockTimeout: number;
    requireAuthForSensitiveData: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  checkBiometricAvailability: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoLockTimer, setAutoLockTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    // Set up auto-lock when user is authenticated
    if (user?.preferences?.autoLockTimeout && user.preferences.autoLockTimeout > 0) {
      setupAutoLock(user.preferences.autoLockTimeout);
    }

    return () => {
      if (autoLockTimer) {
        clearTimeout(autoLockTimer);
      }
    };
  }, [user]);

  const initializeAuth = async () => {
    try {
      // Check for stored authentication
      const storedAuth = await AsyncStorage.getItem('@user_auth');
      const storedUser = await AsyncStorage.getItem('@user_data');

      if (storedAuth && storedUser) {
        const authData = JSON.parse(storedAuth);
        const userData = JSON.parse(storedUser);

        // Check if auth token is still valid
        if (authData.expiresAt > Date.now()) {
          // Check if biometric auth is enabled and available
          if (userData.preferences?.biometricAuth) {
            const biometricAvailable = await checkBiometricAvailability();
            if (biometricAvailable) {
              const biometricSuccess = await authenticateWithBiometric();
              if (biometricSuccess) {
                setUser(userData);
              }
            } else {
              // Biometric not available, fall back to stored auth
              setUser(userData);
            }
          } else {
            setUser(userData);
          }
        } else {
          // Auth expired, clear storage
          await clearStoredAuth();
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      await clearStoredAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);

      // Mock API call - replace with actual authentication
      const response = await mockAuthenticateUser(email, password);
      
      if (response.success) {
        const userData: User = {
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          avatar: response.user.avatar,
          preferences: {
            biometricAuth: false, // Default to false, user can enable later
            autoLockTimeout: 15, // 15 minutes default
            requireAuthForSensitiveData: true,
          },
        };

        // Store authentication data
        const authData = {
          token: response.token,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        };

        await AsyncStorage.setItem('@user_auth', JSON.stringify(authData));
        await AsyncStorage.setItem('@user_data', JSON.stringify(userData));

        setUser(userData);

        // Log security event
        await SecurityService.logEvent({
          type: 'LOGIN',
          severity: 'LOW',
          description: 'User logged in successfully',
          metadata: { email, timestamp: new Date().toISOString() },
        });
      } else {
        throw new Error(response.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Log failed login attempt
      await SecurityService.logEvent({
        type: 'LOGIN',
        severity: 'MEDIUM',
        description: 'Failed login attempt',
        metadata: { email, error: error.message, timestamp: new Date().toISOString() },
      });

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (user) {
        // Log security event
        await SecurityService.logEvent({
          type: 'LOGOUT',
          severity: 'LOW',
          description: 'User logged out',
          metadata: { userId: user.id, timestamp: new Date().toISOString() },
        });
      }

      await clearStoredAuth();
      setUser(null);

      if (autoLockTimer) {
        clearTimeout(autoLockTimer);
        setAutoLockTimer(null);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      const biometricType = await TouchID.isSupported();
      
      if (!biometricType) {
        return false;
      }

      await TouchID.authenticate('Authenticate to access your valuations', {
        title: 'Authentication Required',
        subtitle: 'Use your biometric to access the app',
        cancelText: 'Cancel',
        fallbackText: 'Use Passcode',
        unifiedErrors: false,
        passcodeFallback: true,
      });

      // Log successful biometric authentication
      await SecurityService.logEvent({
        type: 'BIOMETRIC_AUTH',
        severity: 'LOW',
        description: 'Biometric authentication successful',
        metadata: { 
          biometricType: biometricType.toString(), 
          timestamp: new Date().toISOString() 
        },
      });

      return true;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      
      // Log failed biometric authentication
      await SecurityService.logEvent({
        type: 'BIOMETRIC_AUTH',
        severity: 'MEDIUM',
        description: 'Biometric authentication failed',
        metadata: { 
          error: error.message, 
          timestamp: new Date().toISOString() 
        },
      });

      return false;
    }
  };

  const checkBiometricAvailability = async (): Promise<boolean> => {
    try {
      const biometricType = await TouchID.isSupported();
      return biometricType !== false;
    } catch (error) {
      return false;
    }
  };

  const setupAutoLock = (timeoutMinutes: number) => {
    if (autoLockTimer) {
      clearTimeout(autoLockTimer);
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const timer = setTimeout(() => {
      Alert.alert(
        'Session Expired',
        'For security, you have been logged out due to inactivity.',
        [{ text: 'OK', onPress: logout }]
      );
    }, timeoutMs);

    setAutoLockTimer(timer);
  };

  const clearStoredAuth = async () => {
    await Promise.all([
      AsyncStorage.removeItem('@user_auth'),
      AsyncStorage.removeItem('@user_data'),
    ]);
  };

  // Mock authentication function - replace with actual API call
  const mockAuthenticateUser = async (email: string, password: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock validation
    if (email === 'demo@example.com' && password === 'demo123') {
      return {
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: '1',
          name: 'Demo User',
          email: 'demo@example.com',
          avatar: null,
        },
      };
    } else {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    authenticateWithBiometric,
    checkBiometricAvailability,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};