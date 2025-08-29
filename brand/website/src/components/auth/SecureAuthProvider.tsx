/**
 * Secure Authentication Provider
 * Production-ready authentication with JWT, httpOnly cookies, and AWS Secrets Manager
 * SECURITY LEVEL: CRITICAL
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole, UserPermissions, JWTPayload } from '@/lib/auth/jwt-manager';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: UserPermissions;
  lastLogin?: Date;
  mfaEnabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  checkPermission: (permission: keyof UserPermissions) => boolean;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  enableMFA: () => Promise<{ qrCode: string; secret: string }>;
  verifyMFA: (code: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session check interval (5 minutes)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;

// Token refresh threshold (5 minutes before expiry)
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000;

export function SecureAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionCheckTimer, setSessionCheckTimer] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();

  /**
   * Initialize authentication state
   */
  useEffect(() => {
    initializeAuth();

    // Set up session monitoring
    const timer = setInterval(checkSession, SESSION_CHECK_INTERVAL);
    setSessionCheckTimer(timer);

    // Cleanup on unmount
    return () => {
      if (timer) clearInterval(timer);
    };
  }, []);

  /**
   * Initialize authentication from cookies
   */
  const initializeAuth = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser({
            id: data.user.sub,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            permissions: data.user.permissions,
            lastLogin: new Date(data.user.lastLogin || Date.now()),
            mfaEnabled: data.user.mfaEnabled || false,
          });
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check session validity and refresh if needed
   */
  const checkSession = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Session invalid, logout
        await logout();
      } else {
        const data = await response.json();
        
        // Check if token needs refresh
        const expiresIn = data.expiresIn * 1000; // Convert to milliseconds
        if (expiresIn < TOKEN_REFRESH_THRESHOLD) {
          await refreshSession();
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    }
  };

  /**
   * Secure login with MFA support
   */
  const login = async (email: string, password: string, mfaCode?: string) => {
    setIsLoading(true);
    
    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Make login request
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest', // CSRF protection
        },
        body: JSON.stringify({
          email,
          password,
          mfaCode,
          fingerprint: await generateFingerprint(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 429) {
          throw new Error('Too many login attempts. Please try again later.');
        } else if (response.status === 401) {
          if (data.mfaRequired) {
            throw new Error('MFA_REQUIRED');
          }
          throw new Error('Invalid email or password');
        } else {
          throw new Error(data.message || 'Login failed');
        }
      }

      // Set user data
      setUser({
        id: data.user.sub,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
        permissions: data.user.permissions,
        lastLogin: new Date(),
        mfaEnabled: data.user.mfaEnabled || false,
      });

      // Log security event
      logSecurityEvent('LOGIN_SUCCESS', { email });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Log security event
      logSecurityEvent('LOGIN_FAILED', { email, error: error.message });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Secure logout
   */
  const logout = async () => {
    try {
      // Clear session on server
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Log security event
      if (user) {
        logSecurityEvent('LOGOUT', { email: user.email });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state
      setUser(null);
      
      // Clear session timer
      if (sessionCheckTimer) {
        clearInterval(sessionCheckTimer);
        setSessionCheckTimer(null);
      }
      
      // Redirect to login
      router.push('/login');
    }
  };

  /**
   * Refresh authentication token
   */
  const refreshSession = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Session refresh failed');
      }

      const data = await response.json();
      
      // Update user data if provided
      if (data.user) {
        setUser(prevUser => ({
          ...prevUser!,
          ...data.user,
        }));
      }

      console.log('Session refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh session:', error);
      // Session refresh failed, logout user
      await logout();
    }
  };

  /**
   * Check user permission
   */
  const checkPermission = useCallback((permission: keyof UserPermissions): boolean => {
    if (!user || !user.permissions) return false;
    return user.permissions[permission] === true;
  }, [user]);

  /**
   * Update user profile
   */
  const updateProfile = async (updates: Partial<User>) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Profile update failed');
      }

      const data = await response.json();
      
      // Update local user state
      setUser(prevUser => ({
        ...prevUser!,
        ...data.user,
      }));

      // Log security event
      logSecurityEvent('PROFILE_UPDATED', { email: user.email, changes: Object.keys(updates) });
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  /**
   * Enable MFA for user
   */
  const enableMFA = async (): Promise<{ qrCode: string; secret: string }> => {
    if (!user) throw new Error('Not authenticated');

    try {
      const response = await fetch('/api/auth/mfa/enable', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to enable MFA');
      }

      const data = await response.json();
      
      // Log security event
      logSecurityEvent('MFA_ENABLED', { email: user.email });
      
      return {
        qrCode: data.qrCode,
        secret: data.secret,
      };
    } catch (error) {
      console.error('Failed to enable MFA:', error);
      throw error;
    }
  };

  /**
   * Verify MFA code
   */
  const verifyMFA = async (code: string): Promise<boolean> => {
    if (!user) throw new Error('Not authenticated');

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      
      if (data.verified) {
        // Update user MFA status
        setUser(prevUser => ({
          ...prevUser!,
          mfaEnabled: true,
        }));
        
        // Log security event
        logSecurityEvent('MFA_VERIFIED', { email: user.email });
      }
      
      return data.verified;
    } catch (error) {
      console.error('Failed to verify MFA:', error);
      return false;
    }
  };

  /**
   * Generate browser fingerprint for additional security
   */
  const generateFingerprint = async (): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'unknown';

    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
    
    const dataURL = canvas.toDataURL();
    
    // Combine with other browser properties
    const fingerprint = {
      canvas: dataURL,
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    };
    
    // Hash the fingerprint
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(fingerprint));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  /**
   * Log security events
   */
  const logSecurityEvent = async (event: string, metadata: Record<string, any>) => {
    try {
      await fetch('/api/security/events', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshSession,
        checkPermission,
        updateProfile,
        enableMFA,
        verifyMFA,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a SecureAuthProvider');
  }
  return context;
}

/**
 * HOC for protecting routes
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission?: keyof UserPermissions
) {
  return function ProtectedComponent(props: P) {
    const { isAuthenticated, isLoading, checkPermission } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/login');
      } else if (requiredPermission && !checkPermission(requiredPermission)) {
        router.push('/unauthorized');
      }
    }, [isAuthenticated, isLoading, requiredPermission]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    if (requiredPermission && !checkPermission(requiredPermission)) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Unauthorized</h1>
            <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}