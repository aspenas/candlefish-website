import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';

// Types
interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  roles: string[];
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

interface LoginCredentials {
  email?: string;
  username?: string;
  password: string;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  csrf_token?: string;
  expires_in: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API configuration
const API_URL = import.meta.env.VITE_API_URL || 'https://5470-inventory.fly.dev/api/v1';

// Configure axios defaults
axios.defaults.withCredentials = true; // Enable cookies

// Create axios instance for auth requests
const authApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create axios instance for protected requests
const protectedApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// CSRF token management
let csrfToken: string | null = null;

// Get CSRF token from cookie
function getCSRFToken(): string | null {
  const name = 'csrf_token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const navigate = useNavigate();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshInProgressRef = useRef<Promise<void> | null>(null);

  // Setup axios interceptors
  useEffect(() => {
    // Request interceptor to add auth headers
    const requestInterceptor = protectedApi.interceptors.request.use(
      (config) => {
        // Add CSRF token for state-changing requests
        if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
          const token = getCSRFToken();
          if (token) {
            config.headers['X-CSRF-Token'] = token;
          }
        }
        
        // Add access token if available (from cookie, it's httpOnly)
        // The cookie will be sent automatically
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    const responseInterceptor = protectedApi.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        
        // Check if error is 401 and we haven't already tried to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          // Check if refresh is already in progress
          if (refreshInProgressRef.current) {
            await refreshInProgressRef.current;
            return protectedApi(originalRequest);
          }
          
          try {
            // Start refresh process
            refreshInProgressRef.current = refreshToken();
            await refreshInProgressRef.current;
            refreshInProgressRef.current = null;
            
            // Retry original request
            return protectedApi(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            refreshInProgressRef.current = null;
            await logout();
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );

    // Cleanup
    return () => {
      protectedApi.interceptors.request.eject(requestInterceptor);
      protectedApi.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Schedule token refresh
  const scheduleTokenRefresh = useCallback((expiresIn: number) => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Refresh 1 minute before expiry
    const refreshTime = (expiresIn - 60) * 1000;
    
    if (refreshTime > 0) {
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          await refreshToken();
        } catch (error) {
          console.error('Auto token refresh failed:', error);
        }
      }, refreshTime);
    }
  }, []);

  // Load user profile
  const loadUserProfile = useCallback(async () => {
    try {
      const response = await protectedApi.get('/auth/profile');
      setUser(response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      throw error;
    }
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await authApi.post('/auth/login', credentials);
      const data = response.data;
      
      // Store tokens and CSRF token
      setTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        csrf_token: data.csrf_token,
        expires_in: data.expires_in,
      });
      
      // Update CSRF token
      if (data.csrf_token) {
        csrfToken = data.csrf_token;
      }
      
      // Set user
      if (data.user) {
        setUser(data.user);
      } else {
        // Load user profile if not included in response
        await loadUserProfile();
      }
      
      // Schedule token refresh
      scheduleTokenRefresh(data.expires_in);
      
      toast.success('Logged in successfully');
      navigate('/');
    } catch (error: any) {
      console.error('Login failed:', error);
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate, loadUserProfile, scheduleTokenRefresh]);

  // Register function
  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const response = await authApi.post('/auth/register', data);
      const responseData = response.data;
      
      // Store tokens
      setTokens({
        access_token: responseData.access_token,
        refresh_token: responseData.refresh_token,
        csrf_token: responseData.csrf_token,
        expires_in: responseData.expires_in,
      });
      
      // Update CSRF token
      if (responseData.csrf_token) {
        csrfToken = responseData.csrf_token;
      }
      
      // Set user
      if (responseData.user) {
        setUser(responseData.user);
      } else {
        await loadUserProfile();
      }
      
      // Schedule token refresh
      scheduleTokenRefresh(responseData.expires_in);
      
      toast.success('Registration successful');
      navigate('/');
    } catch (error: any) {
      console.error('Registration failed:', error);
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [navigate, loadUserProfile, scheduleTokenRefresh]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Call logout endpoint
      await protectedApi.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state
      setUser(null);
      setTokens(null);
      csrfToken = null;
      
      // Clear refresh timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      
      // Navigate to login
      navigate('/login');
      toast.success('Logged out successfully');
    }
  }, [navigate]);

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      const response = await authApi.post('/auth/refresh');
      const data = response.data;
      
      // Update tokens
      setTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        csrf_token: data.csrf_token,
        expires_in: data.expires_in,
      });
      
      // Update CSRF token
      if (data.csrf_token) {
        csrfToken = data.csrf_token;
      }
      
      // Schedule next refresh
      scheduleTokenRefresh(data.expires_in);
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }, [scheduleTokenRefresh]);

  // Check if user has a specific role
  const hasRole = useCallback((role: string): boolean => {
    if (!user) return false;
    return user.roles.includes(role) || user.roles.includes('admin');
  }, [user]);

  // Check if user has any of the specified roles
  const hasAnyRole = useCallback((roles: string[]): boolean => {
    if (!user) return false;
    return roles.some(role => hasRole(role));
  }, [user, hasRole]);

  // Check authentication on mount - DISABLED for now
  useEffect(() => {
    // Skip authentication check for development
    setIsLoading(false);
    // Uncomment when auth backend is ready:
    // const checkAuth = async () => {
    //   setIsLoading(true);
    //   try {
    //     await loadUserProfile();
    //   } catch (error) {
    //     console.log('Not authenticated');
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // checkAuth();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export the protected API instance for use in other components
export { protectedApi };