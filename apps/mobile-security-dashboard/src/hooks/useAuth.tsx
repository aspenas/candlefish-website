import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Services
import { secureStorage } from '@/utils/secure-storage';
import { biometricService } from '@/services/biometric';
import { apolloClient } from '@/services/api';
import { crashReporting } from '@/services/crashReporting';

// Types
interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER';
  permissions: string[];
  lastLoginAt: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  checkBiometricLogin: () => Promise<boolean>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check existing authentication on app start
  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const token = await secureStorage.getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Validate token by fetching user data
      const userData = await secureStorage.getUserData<User>();
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
        
        // Try to refresh the token in the background
        refreshToken().catch(console.error);
      } else {
        // Token exists but no user data, try to fetch
        await fetchUserProfile();
      }
    } catch (error) {
      console.error('Error checking existing auth:', error);
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserProfile = async (): Promise<void> => {
    try {
      // In a real implementation, this would be a GraphQL query
      const mockUser: User = {
        id: '1',
        name: 'Security Analyst',
        email: 'analyst@candlefish.ai',
        role: 'ANALYST',
        permissions: ['read:alerts', 'write:incidents', 'read:analytics'],
        lastLoginAt: new Date().toISOString(),
      };
      
      setUser(mockUser);
      setIsAuthenticated(true);
      
      // Cache user data
      await secureStorage.setUserData(mockUser);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  };

  const login = useCallback(async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      // Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        return {
          success: false,
          error: 'No internet connection available',
        };
      }

      // Simulate API login call (replace with actual GraphQL mutation)
      const response = await simulateLogin(credentials);
      
      if (response.success) {
        // Store tokens securely
        await secureStorage.setToken(response.token);
        if (response.refreshToken) {
          await secureStorage.setRefreshToken(response.refreshToken);
        }
        
        // Store user data
        setUser(response.user);
        setIsAuthenticated(true);
        await secureStorage.setUserData(response.user);
        
        // Check if biometric auth should be enabled
        const biometricCapabilities = await biometricService.checkCapabilities();
        if (biometricCapabilities.available && !biometricCapabilities.enabled) {
          // Optionally prompt user to enable biometric auth
        }
        
        return { success: true };
      } else {
        return {
          success: false,
          error: response.error || 'Invalid credentials',
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      crashReporting.recordError(error);
      
      return {
        success: false,
        error: 'An unexpected error occurred during login',
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Clear Apollo cache
      await apolloClient.clearStore();
      
      // Clear all stored data
      await clearAuth();
      
      Alert.alert('Signed Out', 'You have been successfully signed out.');
    } catch (error) {
      console.error('Logout error:', error);
      crashReporting.recordError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAuth = async (): Promise<void> => {
    try {
      await secureStorage.removeToken();
      await secureStorage.removeRefreshToken();
      await secureStorage.removeUserData();
      await secureStorage.removeCredentials();
      
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error clearing auth:', error);
    }
  };

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshTokenValue = await secureStorage.getRefreshToken();
      if (!refreshTokenValue) {
        return false;
      }

      // Simulate token refresh (replace with actual API call)
      const response = await simulateTokenRefresh(refreshTokenValue);
      
      if (response.success) {
        await secureStorage.setToken(response.token);
        if (response.refreshToken) {
          await secureStorage.setRefreshToken(response.refreshToken);
        }
        
        return true;
      } else {
        // Refresh failed, clear auth
        await clearAuth();
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      await clearAuth();
      return false;
    }
  }, []);

  const checkBiometricLogin = useCallback(async (): Promise<boolean> => {
    try {
      const capabilities = await biometricService.checkCapabilities();
      if (!capabilities.enabled) {
        return false;
      }

      const result = await biometricService.authenticate('Please verify your identity to sign in');
      if (!result.success) {
        return false;
      }

      // Get cached credentials
      const credentials = await secureStorage.getCredentials();
      if (!credentials) {
        Alert.alert(
          'Setup Required',
          'Please sign in with your password first to enable biometric authentication.'
        );
        return false;
      }

      // Attempt login with cached credentials
      const loginResult = await login(credentials);
      return loginResult.success;
    } catch (error) {
      console.error('Biometric login error:', error);
      return false;
    }
  }, [login]);

  const updateUser = useCallback((userData: Partial<User>): void => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      secureStorage.setUserData(updatedUser).catch(console.error);
    }
  }, [user]);

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
    checkBiometricLogin,
    updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Mock API functions (replace with actual GraphQL calls)
const simulateLogin = async (credentials: LoginCredentials): Promise<{
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  error?: string;
}> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock validation
  if (credentials.username.length < 3 || credentials.password.length < 6) {
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  // Mock success response
  return {
    success: true,
    user: {
      id: '1',
      name: 'Tyler Smith',
      email: credentials.username.includes('@') ? credentials.username : 'tyler@candlefish.ai',
      role: credentials.username.includes('admin') ? 'ADMIN' : 'ANALYST',
      permissions: ['read:alerts', 'write:incidents', 'read:analytics'],
      lastLoginAt: new Date().toISOString(),
    },
    token: `mock_jwt_token_${Date.now()}`,
    refreshToken: `mock_refresh_token_${Date.now()}`,
  };
};

const simulateTokenRefresh = async (refreshToken: string): Promise<{
  success: boolean;
  token?: string;
  refreshToken?: string;
}> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    token: `refreshed_jwt_token_${Date.now()}`,
    refreshToken: `refreshed_refresh_token_${Date.now()}`,
  };
};

export default AuthProvider;