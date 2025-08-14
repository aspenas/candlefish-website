import * as SecureStore from 'expo-secure-store';
import { User } from '@/types/graphql';
import { apolloClient } from './apollo';
import { LOGIN_MUTATION, REFRESH_TOKEN_MUTATION, LOGOUT_MUTATION, GET_CURRENT_USER } from '@/graphql/auth';

interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

interface BiometricCredentials {
  token: string;
  userId: string;
}

export class AuthService {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private static readonly BIOMETRIC_TOKEN_KEY = 'biometric_token';
  private static readonly USER_KEY = 'user_data';

  static async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: LOGIN_MUTATION,
        variables: { email, password },
      });

      if (data?.login) {
        const { user, token, refreshToken } = data.login;

        // Store tokens securely
        await Promise.all([
          SecureStore.setItemAsync(this.TOKEN_KEY, token),
          SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, refreshToken),
          SecureStore.setItemAsync(this.USER_KEY, JSON.stringify(user)),
        ]);

        return { user, token, refreshToken };
      }

      throw new Error('Invalid login response');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  }

  static async loginWithToken(token: string): Promise<AuthResponse> {
    try {
      // Set the token in Apollo Client headers
      apolloClient.setLink(
        apolloClient.link.concat(
          // Add auth header middleware
        )
      );

      const { data } = await apolloClient.query({
        query: GET_CURRENT_USER,
        fetchPolicy: 'network-only',
      });

      if (data?.currentUser) {
        const user = data.currentUser;

        // Store user data
        await SecureStore.setItemAsync(this.USER_KEY, JSON.stringify(user));

        return {
          user,
          token,
          refreshToken: await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY) || ''
        };
      }

      throw new Error('Invalid token');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Token login failed');
    }
  }

  static async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const { data } = await apolloClient.mutate({
        mutation: REFRESH_TOKEN_MUTATION,
        variables: { refreshToken },
      });

      if (data?.refreshToken) {
        const { user, token, refreshToken: newRefreshToken } = data.refreshToken;

        // Update stored tokens
        await Promise.all([
          SecureStore.setItemAsync(this.TOKEN_KEY, token),
          SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, newRefreshToken),
          SecureStore.setItemAsync(this.USER_KEY, JSON.stringify(user)),
        ]);

        return { user, token, refreshToken: newRefreshToken };
      }

      throw new Error('Invalid refresh token response');
    } catch (error) {
      // Clear stored tokens if refresh fails
      await this.clearStoredAuth();
      throw new Error(error instanceof Error ? error.message : 'Token refresh failed');
    }
  }

  static async logout(): Promise<void> {
    try {
      const token = await SecureStore.getItemAsync(this.TOKEN_KEY);

      if (token) {
        // Notify server about logout
        await apolloClient.mutate({
          mutation: LOGOUT_MUTATION,
          errorPolicy: 'ignore', // Don't fail if server is unreachable
        });
      }
    } catch (error) {
      // Continue with local logout even if server logout fails
      console.warn('Server logout failed:', error);
    } finally {
      await this.clearStoredAuth();

      // Clear Apollo Client cache
      await apolloClient.clearStore();
    }
  }

  static async getStoredToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(this.TOKEN_KEY);
  }

  static async getStoredRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
  }

  static async getStoredUser(): Promise<User | null> {
    try {
      const userData = await SecureStore.getItemAsync(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to parse stored user data:', error);
      return null;
    }
  }

  static async enableBiometric(token: string): Promise<void> {
    try {
      const user = await this.getStoredUser();
      if (!user) {
        throw new Error('No user data available');
      }

      const biometricCredentials: BiometricCredentials = {
        token,
        userId: user.id,
      };

      await SecureStore.setItemAsync(
        this.BIOMETRIC_TOKEN_KEY,
        JSON.stringify(biometricCredentials),
        {
          requireAuthentication: true,
          authenticationPrompt: 'Authenticate to enable biometric login',
        }
      );
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to enable biometric login');
    }
  }

  static async disableBiometric(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.BIOMETRIC_TOKEN_KEY);
    } catch (error) {
      // Ignore errors when deleting non-existent items
      if (!error.message?.includes('not found')) {
        throw error;
      }
    }
  }

  static async getBiometricCredentials(): Promise<BiometricCredentials | null> {
    try {
      const credentials = await SecureStore.getItemAsync(this.BIOMETRIC_TOKEN_KEY);
      return credentials ? JSON.parse(credentials) : null;
    } catch (error) {
      console.error('Failed to get biometric credentials:', error);
      return null;
    }
  }

  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const credentials = await this.getBiometricCredentials();
      return credentials !== null;
    } catch (error) {
      return false;
    }
  }

  private static async clearStoredAuth(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(this.TOKEN_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(this.REFRESH_TOKEN_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(this.USER_KEY).catch(() => {}),
    ]);
  }

  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    return token !== null;
  }

  static async validateStoredAuth(): Promise<AuthResponse | null> {
    try {
      const [token, refreshToken, user] = await Promise.all([
        this.getStoredToken(),
        this.getStoredRefreshToken(),
        this.getStoredUser(),
      ]);

      if (!token || !refreshToken || !user) {
        return null;
      }

      // Try to use the current token first
      try {
        return await this.loginWithToken(token);
      } catch (error) {
        // If current token fails, try to refresh
        try {
          return await this.refreshToken(refreshToken);
        } catch (refreshError) {
          // Both tokens failed, clear auth
          await this.clearStoredAuth();
          return null;
        }
      }
    } catch (error) {
      console.error('Auth validation failed:', error);
      return null;
    }
  }
}
