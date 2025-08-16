/**
 * React Hook for JWT Authentication
 * Provides JWT auth functionality within React components
 */

import { useState, useEffect, useCallback } from 'react';
import { jwtAuthClient, TokenResponse, LoginCredentials, RegisterData } from './jwt-auth-client';
import { TokenPayload } from '@candlefish/jwt-auth';

interface UseJWTAuthResult {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: TokenPayload | null;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useJWTAuth(): UseJWTAuthResult {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<TokenPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Check if user has valid token
        const tokenPayload = await jwtAuthClient.verifyToken();
        
        if (tokenPayload) {
          setIsAuthenticated(true);
          setUser(tokenPayload);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const tokens = await jwtAuthClient.login(credentials);
      
      // Verify the new token to get user data
      const tokenPayload = await jwtAuthClient.verifyToken();
      
      if (tokenPayload) {
        setIsAuthenticated(true);
        setUser(tokenPayload);
      } else {
        throw new Error('Failed to verify token after login');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      setIsAuthenticated(false);
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (userData: RegisterData) => {
    setIsLoading(true);
    setError(null);

    try {
      const tokens = await jwtAuthClient.register(userData);
      
      // Verify the new token to get user data
      const tokenPayload = await jwtAuthClient.verifyToken();
      
      if (tokenPayload) {
        setIsAuthenticated(true);
        setUser(tokenPayload);
      } else {
        throw new Error('Failed to verify token after registration');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      setIsAuthenticated(false);
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await jwtAuthClient.logout();
    } catch (err) {
      console.error('Logout error:', err);
      // Continue with logout even if API call fails
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  // Refresh token function
  const refresh = useCallback(async () => {
    setError(null);

    try {
      await jwtAuthClient.refresh();
      
      // Verify the new token to get updated user data
      const tokenPayload = await jwtAuthClient.verifyToken();
      
      if (tokenPayload) {
        setIsAuthenticated(true);
        setUser(tokenPayload);
      } else {
        throw new Error('Failed to verify token after refresh');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Token refresh failed';
      setError(errorMessage);
      setIsAuthenticated(false);
      setUser(null);
      throw err;
    }
  }, []);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isAuthenticated,
    isLoading,
    user,
    error,
    login,
    register,
    logout,
    refresh,
    clearError,
  };
}

// Hook for making authenticated API calls
export function useAuthenticatedFetch() {
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      return await jwtAuthClient.authenticatedFetch(url, options);
    } catch (error) {
      console.error('Authenticated fetch failed:', error);
      throw error;
    }
  }, []);

  return authenticatedFetch;
}