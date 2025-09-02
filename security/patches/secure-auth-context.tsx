/**
 * Secure Authentication Context Implementation
 * Fixes critical security vulnerabilities in token storage and session management
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  userId: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  csrfToken: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  checkPermission: (permission: string) => boolean;
  validateSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Security configuration
const SECURITY_CONFIG = {
  sessionTimeout: 15 * 60 * 1000, // 15 minutes
  refreshInterval: 14 * 60 * 1000, // 14 minutes
  maxRetries: 3,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
};

export function SecureAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const router = useRouter();

  // Initialize CSRF token
  useEffect(() => {
    fetchCsrfToken();
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    validateAndRefreshSession();
  }, []);

  // Set up session management
  useEffect(() => {
    if (user) {
      // Set session timeout
      const timeout = setTimeout(() => {
        handleSessionTimeout();
      }, SECURITY_CONFIG.sessionTimeout);
      setSessionTimeout(timeout);

      // Set up refresh interval
      const refreshInterval = setInterval(() => {
        refreshSession();
      }, SECURITY_CONFIG.refreshInterval);

      // Set up activity monitoring
      const handleActivity = () => {
        resetSessionTimeout();
      };

      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keypress', handleActivity);
      window.addEventListener('click', handleActivity);
      window.addEventListener('scroll', handleActivity);

      return () => {
        if (timeout) clearTimeout(timeout);
        clearInterval(refreshInterval);
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('keypress', handleActivity);
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('scroll', handleActivity);
      };
    }
  }, [user]);

  const fetchCsrfToken = async () => {
    try {
      const response = await fetch('/api/auth/csrf-token', {
        credentials: 'include',
      });
      const data = await response.json();
      setCsrfToken(data.csrfToken);
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  };

  const validateAndRefreshSession = async () => {
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include', // Important for httpOnly cookies
      });

      if (response.ok) {
        const data = await response.json();
        setUser({
          userId: data.user.id,
          username: data.user.username,
          email: data.user.email,
          role: data.user.role,
          permissions: data.user.permissions || [],
        });
        setCsrfToken(data.csrfToken);
      } else if (response.status === 401) {
        // Session expired or invalid
        await handleLogout();
      }
    } catch (error) {
      console.error('Session validation failed:', error);
      await handleLogout();
    } finally {
      setIsLoading(false);
    }
  };

  const resetSessionTimeout = () => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      const timeout = setTimeout(() => {
        handleSessionTimeout();
      }, SECURITY_CONFIG.sessionTimeout);
      setSessionTimeout(timeout);
    }
  };

  const handleSessionTimeout = async () => {
    // Show warning before logout
    const continueSession = window.confirm(
      'Your session is about to expire. Do you want to continue?'
    );
    
    if (continueSession) {
      await refreshSession();
    } else {
      await handleLogout();
    }
  };

  const checkLockout = (): boolean => {
    const lockoutEnd = localStorage.getItem('auth_lockout_end');
    if (lockoutEnd) {
      const endTime = parseInt(lockoutEnd, 10);
      if (Date.now() < endTime) {
        setIsLockedOut(true);
        return true;
      } else {
        localStorage.removeItem('auth_lockout_end');
        setIsLockedOut(false);
      }
    }
    return false;
  };

  const login = async (username: string, password: string) => {
    // Check if account is locked
    if (checkLockout()) {
      throw new Error('Account temporarily locked due to multiple failed login attempts');
    }

    // Validate input
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    // Sanitize input
    const sanitizedUsername = username.trim().toLowerCase();
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include', // Important for httpOnly cookies
        body: JSON.stringify({
          username: sanitizedUsername,
          password,
          fingerprint: await generateDeviceFingerprint(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Track failed attempts
        const attempts = loginAttempts + 1;
        setLoginAttempts(attempts);

        if (attempts >= SECURITY_CONFIG.maxRetries) {
          // Lock account
          const lockoutEnd = Date.now() + SECURITY_CONFIG.lockoutDuration;
          localStorage.setItem('auth_lockout_end', lockoutEnd.toString());
          setIsLockedOut(true);
          setLoginAttempts(0);
          throw new Error('Account locked due to multiple failed attempts');
        }

        throw new Error(data.message || 'Login failed');
      }

      // Reset failed attempts on successful login
      setLoginAttempts(0);
      localStorage.removeItem('auth_lockout_end');

      // Update user state
      setUser({
        userId: data.user.id,
        username: data.user.username,
        email: data.user.email,
        role: data.user.role,
        permissions: data.user.permissions || [],
      });

      // Update CSRF token
      setCsrfToken(data.csrfToken);

      // Redirect based on role
      if (data.user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      // Log security event
      await logSecurityEvent({
        type: 'LOGIN_FAILED',
        username: sanitizedUsername,
        ip: await getClientIP(),
        userAgent: navigator.userAgent,
      });
      
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      if (csrfToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear user state
      setUser(null);
      setCsrfToken(null);
      
      // Clear session timeout
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        setSessionTimeout(null);
      }
      
      // Redirect to login
      router.push('/login');
    }
  };

  const logout = async () => {
    await handleLogout();
  };

  const refreshSession = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Session refresh failed');
      }

      const data = await response.json();
      
      // Update CSRF token
      setCsrfToken(data.csrfToken);
      
      // Update user if provided
      if (data.user) {
        setUser({
          userId: data.user.id,
          username: data.user.username,
          email: data.user.email,
          role: data.user.role,
          permissions: data.user.permissions || [],
        });
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      await handleLogout();
    }
  };

  const validateSession = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
      });

      return response.ok;
    } catch {
      return false;
    }
  };

  const checkPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    // Check specific permissions
    return user.permissions.includes(permission);
  };

  // Helper functions
  const generateDeviceFingerprint = async (): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
    
    const dataURL = canvas.toDataURL();
    const hash = await crypto.subtle.digest('SHA-256', 
      new TextEncoder().encode(dataURL + navigator.userAgent)
    );
    
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const logSecurityEvent = async (event: any) => {
    try {
      await fetch('/api/security/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        csrfToken,
        login,
        logout,
        refreshSession,
        checkPermission,
        validateSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SecureAuthProvider');
  }
  return context;
}

// Protected route wrapper
export function ProtectedRoute({ 
  children, 
  requiredPermission,
  fallback = '/unauthorized' 
}: { 
  children: React.ReactNode;
  requiredPermission?: string;
  fallback?: string;
}) {
  const { user, isLoading, checkPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (requiredPermission && !checkPermission(requiredPermission)) {
        router.push(fallback);
      }
    }
  }, [user, isLoading, requiredPermission]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user || (requiredPermission && !checkPermission(requiredPermission))) {
    return null;
  }

  return <>{children}</>;
}