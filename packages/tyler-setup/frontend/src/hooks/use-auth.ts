import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useSubscription } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  LOGIN_MUTATION,
  LOGOUT_MUTATION,
  ME_QUERY,
  REFRESH_TOKEN_QUERY,
  USER_STATUS_CHANGED_SUBSCRIPTION,
} from '@/lib/graphql/auth';
import { clearCache } from '@/lib/apollo';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER' | 'CONTRACTOR';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  fullName: string;
  initials: string;
  profile: {
    displayName: string;
    avatar?: string;
    preferences: Record<string, any>;
    timezone: string;
    lastActivity: string;
  };
  stats?: {
    totalLogins: number;
    lastLoginDaysAgo?: number;
    createdUsersCount: number;
    invitedContractorsCount: number;
    secretsAccessedCount: number;
    activityScore: number;
  };
}

interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Query current user
  const {
    data: meData,
    loading: meLoading,
    error: meError,
    refetch: refetchMe,
  } = useQuery(ME_QUERY, {
    skip: !localStorage.getItem('token'),
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  });

  // Login mutation
  const [loginMutation, { loading: loginLoading }] = useMutation(LOGIN_MUTATION, {
    errorPolicy: 'all',
    onCompleted: (data) => {
      if (data.login.success && data.login.token) {
        localStorage.setItem('token', data.login.token);
        if (data.login.refreshToken) {
          localStorage.setItem('refreshToken', data.login.refreshToken);
        }

        setAuthState({
          user: data.login.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        toast({
          title: 'Welcome back!',
          description: 'You have been successfully logged in.',
        });

        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: data.login.message || 'Login failed',
        }));
      }
    },
    onError: (error) => {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
    },
  });

  // Logout mutation
  const [logoutMutation] = useMutation(LOGOUT_MUTATION, {
    errorPolicy: 'all',
    onCompleted: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      clearCache();

      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      navigate('/login');

      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    },
  });

  // Refresh token mutation
  const [refreshTokenMutation] = useMutation(REFRESH_TOKEN_QUERY, {
    errorPolicy: 'all',
    onCompleted: (data) => {
      if (data.refreshToken.success && data.refreshToken.token) {
        localStorage.setItem('token', data.refreshToken.token);
        if (data.refreshToken.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken.refreshToken);
        }

        setAuthState({
          user: data.refreshToken.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        logout();
      }
    },
    onError: () => {
      logout();
    },
  });

  // Subscribe to user status changes
  useSubscription(USER_STATUS_CHANGED_SUBSCRIPTION, {
    variables: { userId: authState.user?.id },
    skip: !authState.user,
    onData: ({ data }) => {
      if (data.data?.userStatusChanged) {
        setAuthState(prev => ({
          ...prev,
          user: data.data.userStatusChanged,
        }));

        // If user is suspended, log them out
        if (data.data.userStatusChanged.status === 'SUSPENDED') {
          toast({
            title: 'Account Suspended',
            description: 'Your account has been suspended. Please contact an administrator.',
            variant: 'destructive',
          });
          logout();
        }
      }
    },
  });

  // Login function
  const login = useCallback(async (input: LoginInput) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await loginMutation({ variables: { input } });
    } catch (error) {
      // Error handled in mutation onError
    }
  }, [loginMutation]);

  // Logout function
  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await logoutMutation({
        variables: { refreshToken },
      });
    } catch (error) {
      // Even if logout fails, clear local state
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      clearCache();

      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      navigate('/login');
    }
  }, [logoutMutation, navigate]);

  // Refresh token function
  const refreshToken = useCallback(async () => {
    const token = localStorage.getItem('refreshToken');
    if (!token) {
      logout();
      return;
    }

    try {
      await refreshTokenMutation({ variables: { token } });
    } catch (error) {
      logout();
    }
  }, [refreshTokenMutation, logout]);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      await refetchMe();
    } catch (error) {
      // Try to refresh token
      await refreshToken();
    }
  }, [refetchMe, refreshToken]);

  // Update auth state when me query changes
  useEffect(() => {
    if (meData?.me) {
      setAuthState({
        user: meData.me,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } else if (meError && !meLoading) {
      // Try to refresh token once
      const hasTriedRefresh = sessionStorage.getItem('hasTriedRefresh');
      if (!hasTriedRefresh) {
        sessionStorage.setItem('hasTriedRefresh', 'true');
        refreshToken();
      } else {
        sessionStorage.removeItem('hasTriedRefresh');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: meError.message,
        });
      }
    } else if (!localStorage.getItem('token')) {
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, [meData, meError, meLoading, refreshToken]);

  // Initialize auth check on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!authState.isAuthenticated) return;

    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const exp = payload.exp * 1000;
          const now = Date.now();

          // Refresh 5 minutes before expiry
          if (exp - now < 5 * 60 * 1000) {
            refreshToken();
          }
        } catch (error) {
          // Invalid token, refresh
          refreshToken();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [authState.isAuthenticated, refreshToken]);

  // Helper functions
  const hasRole = useCallback((role: string) => {
    return authState.user?.role === role;
  }, [authState.user]);

  const hasAnyRole = useCallback((roles: string[]) => {
    return roles.includes(authState.user?.role || '');
  }, [authState.user]);

  const isAdmin = useCallback(() => {
    return authState.user?.role === 'ADMIN';
  }, [authState.user]);

  const canAccess = useCallback((resource: string, action: string) => {
    if (!authState.user) return false;

    // Admin can do everything
    if (authState.user.role === 'ADMIN') return true;

    // Define resource-based permissions
    const permissions: Record<string, Record<string, string[]>> = {
      users: {
        read: ['ADMIN', 'USER'],
        create: ['ADMIN'],
        update: ['ADMIN'],
        delete: ['ADMIN'],
      },
      contractors: {
        read: ['ADMIN'],
        create: ['ADMIN'],
        update: ['ADMIN'],
        delete: ['ADMIN'],
      },
      secrets: {
        read: ['ADMIN', 'USER'],
        create: ['ADMIN'],
        update: ['ADMIN'],
        delete: ['ADMIN'],
      },
      audit: {
        read: ['ADMIN'],
      },
    };

    const resourcePermissions = permissions[resource];
    if (!resourcePermissions) return false;

    const actionPermissions = resourcePermissions[action];
    if (!actionPermissions) return false;

    return actionPermissions.includes(authState.user.role);
  }, [authState.user]);

  return {
    // State
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading || meLoading || loginLoading,
    error: authState.error,

    // Actions
    login,
    logout,
    refreshToken,
    checkAuth,

    // Helpers
    hasRole,
    hasAnyRole,
    isAdmin,
    canAccess,
  };
};
