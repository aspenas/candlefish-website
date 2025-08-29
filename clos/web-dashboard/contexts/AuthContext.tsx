'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  userId: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  checkPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        refreshToken();
      }, 14 * 60 * 1000); // Refresh every 14 minutes (token expires in 15)

      return () => clearInterval(interval);
    }
  }, [user]);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3501/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser({
          userId: data.data.id,
          username: data.data.username,
          email: data.data.email,
          role: data.data.role,
        });
      } else {
        // Try to refresh token
        await refreshToken();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await fetch('http://localhost:3501/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Login failed');
    }

    // Store tokens
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);

    // Get user info
    await checkAuth();
  };

  const logout = async () => {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      try {
        await fetch('http://localhost:3501/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    // Clear tokens and user
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    
    // Redirect to login
    router.push('/login');
  };

  const refreshToken = async () => {
    const refresh = localStorage.getItem('refreshToken');
    if (!refresh) {
      setUser(null);
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:3501/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refresh }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      router.push('/login');
    }
  };

  const checkPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    // Define role permissions
    const permissions: Record<string, string[]> = {
      user: ['read', 'write', 'restart_own'],
      viewer: ['read'],
    };
    
    return permissions[user.role]?.includes(permission) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshToken,
        checkPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}