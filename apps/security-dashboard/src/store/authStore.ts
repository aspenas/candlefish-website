import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types/security';
import { setAuthToken, clearAuthTokens, setOrganizationId } from '../lib/apollo-client';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  organizationId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tokenExpiry: number | null;
  lastActivity: number;
  permissions: string[];
  
  // Actions
  login: (token: string, refreshToken: string, user: User, organizationId?: string) => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  refreshAccessToken: () => Promise<boolean>;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  updateLastActivity: () => void;
  isTokenExpired: () => boolean;
  checkTokenValidity: () => boolean;
  setPermissions: (permissions: string[]) => void;
  hasPermission: (permission: string) => boolean;
}

// JWT helper functions
const parseJWT = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const getTokenExpiry = (token: string): number | null => {
  const payload = parseJWT(token);
  return payload?.exp ? payload.exp * 1000 : null;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      organizationId: null,
      isAuthenticated: false,
      isLoading: false,
      tokenExpiry: null,
      lastActivity: Date.now(),
      permissions: [],

      login: (token: string, refreshToken: string, user: User, organizationId?: string) => {
        const tokenExpiry = getTokenExpiry(token);
        const payload = parseJWT(token);
        const permissions = payload?.permissions || [];
        
        // Store tokens in localStorage for Apollo Client
        setAuthToken(token, refreshToken);
        if (organizationId) {
          setOrganizationId(organizationId);
        }
        
        set({
          user,
          token,
          refreshToken,
          organizationId,
          tokenExpiry,
          permissions,
          isAuthenticated: true,
          lastActivity: Date.now(),
        });
      },

      setUser: (user: User) => {
        set({
          user,
          isAuthenticated: true,
        });
      },

      setToken: (token: string) => {
        const tokenExpiry = getTokenExpiry(token);
        const payload = parseJWT(token);
        const permissions = payload?.permissions || [];
        
        setAuthToken(token);
        
        set({
          token,
          tokenExpiry,
          permissions,
          isAuthenticated: !!token,
        });
      },

      refreshAccessToken: async (): Promise<boolean> => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        set({ isLoading: true });

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (!response.ok) {
            throw new Error('Token refresh failed');
          }

          const data = await response.json();
          const { accessToken, refreshToken: newRefreshToken, user } = data;
          
          const tokenExpiry = getTokenExpiry(accessToken);
          const payload = parseJWT(accessToken);
          const permissions = payload?.permissions || [];

          setAuthToken(accessToken, newRefreshToken);

          set({
            token: accessToken,
            refreshToken: newRefreshToken,
            tokenExpiry,
            permissions,
            user: user || get().user,
            isAuthenticated: true,
            isLoading: false,
            lastActivity: Date.now(),
          });

          return true;
        } catch (error) {
          console.error('Token refresh failed:', error);
          get().logout();
          return false;
        }
      },

      logout: () => {
        clearAuthTokens();
        set({
          user: null,
          token: null,
          refreshToken: null,
          organizationId: null,
          tokenExpiry: null,
          permissions: [],
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      updateLastActivity: () => {
        set({ lastActivity: Date.now() });
      },

      isTokenExpired: () => {
        const { tokenExpiry } = get();
        if (!tokenExpiry) return true;
        
        // Consider token expired 5 minutes before actual expiry
        const bufferTime = 5 * 60 * 1000;
        return Date.now() > (tokenExpiry - bufferTime);
      },

      checkTokenValidity: () => {
        const { token, isTokenExpired, refreshAccessToken } = get();
        
        if (!token) return false;
        
        if (isTokenExpired()) {
          // Attempt to refresh the token
          refreshAccessToken();
          return false;
        }
        
        return true;
      },

      setPermissions: (permissions: string[]) => {
        set({ permissions });
      },

      hasPermission: (permission: string) => {
        const { permissions } = get();
        return permissions.includes(permission) || permissions.includes('admin');
      },
    }),
    {
      name: 'security-dashboard-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        organizationId: state.organizationId,
        tokenExpiry: state.tokenExpiry,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        lastActivity: state.lastActivity,
      }),
      // Rehydrate and validate token on app start
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          const isValid = !state.isTokenExpired();
          if (!isValid) {
            state.logout();
          } else {
            // Update Apollo client with existing token
            setAuthToken(state.token, state.refreshToken || undefined);
            if (state.organizationId) {
              setOrganizationId(state.organizationId);
            }
          }
        }
      },
    }
  )
);