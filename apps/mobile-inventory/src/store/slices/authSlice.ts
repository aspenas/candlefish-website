import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { biometricAuthService, AuthCredentials, BiometricAuthResult } from '../../services/BiometricAuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { client } from '../../graphql/client';
import { gql } from '@apollo/client';

// GraphQL mutations for authentication
const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      refreshToken
      expiresAt
      user {
        id
        email
        username
        fullName
        role
        avatar
        permissions
      }
    }
  }
`;

const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      token
      refreshToken
      expiresAt
      user {
        id
        email
        username
        fullName
        role
        avatar
        permissions
      }
    }
  }
`;

interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  role: string;
  avatar?: string;
  permissions: string[];
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  loading: boolean;
  error: string | null;
  biometricEnabled: boolean;
  biometricCapabilities: any | null;
  sessionExpired: boolean;
  lastActivity: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  expiresAt: null,
  loading: false,
  error: null,
  biometricEnabled: false,
  biometricCapabilities: null,
  sessionExpired: false,
  lastActivity: null,
};

// Async thunks
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async () => {
    // Initialize biometric service
    await biometricAuthService.initialize();

    const capabilities = biometricAuthService.getCapabilities();
    const biometricEnabled = await biometricAuthService.isBiometricEnabled();

    // Check for stored credentials
    let storedCredentials: AuthCredentials | null = null;
    if (biometricEnabled) {
      storedCredentials = await biometricAuthService.getStoredCredentials();
    } else {
      // Check for regular stored auth
      const [token, refreshToken, expiresAt, userJson] = await Promise.all([
        AsyncStorage.getItem('auth_token'),
        AsyncStorage.getItem('refresh_token'),
        AsyncStorage.getItem('token_expires_at'),
        AsyncStorage.getItem('user_data'),
      ]);

      if (token && refreshToken && userJson) {
        storedCredentials = {
          username: '',
          token,
          refreshToken,
          expiresAt: expiresAt || '',
        };
      }
    }

    return {
      capabilities,
      biometricEnabled,
      storedCredentials,
    };
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const result = await client.mutate({
      mutation: LOGIN_MUTATION,
      variables: { email, password },
    });

    if (!result.data?.login) {
      throw new Error('Login failed');
    }

    const { token, refreshToken, expiresAt, user } = result.data.login;

    // Store credentials
    await Promise.all([
      AsyncStorage.setItem('auth_token', token),
      AsyncStorage.setItem('refresh_token', refreshToken),
      AsyncStorage.setItem('token_expires_at', expiresAt),
      AsyncStorage.setItem('user_data', JSON.stringify(user)),
    ]);

    return {
      token,
      refreshToken,
      expiresAt,
      user,
    };
  }
);

export const loginWithBiometric = createAsyncThunk(
  'auth/loginWithBiometric',
  async () => {
    // Authenticate with biometric
    const authResult = await biometricAuthService.authenticateWithBiometric();

    if (!authResult.success) {
      throw new Error(authResult.error || 'Biometric authentication failed');
    }

    // Get stored credentials
    const credentials = await biometricAuthService.getStoredCredentials();
    if (!credentials) {
      throw new Error('No stored credentials found');
    }

    // Check if token is still valid
    const expiresAt = new Date(credentials.expiresAt);
    const now = new Date();
    const isExpired = now >= expiresAt;

    if (isExpired) {
      // Refresh token
      const result = await client.mutate({
        mutation: REFRESH_TOKEN_MUTATION,
        variables: { refreshToken: credentials.refreshToken },
      });

      if (!result.data?.refreshToken) {
        throw new Error('Token refresh failed');
      }

      const { token, refreshToken, expiresAt: newExpiresAt, user } = result.data.refreshToken;

      // Update stored credentials
      const newCredentials: AuthCredentials = {
        username: credentials.username,
        token,
        refreshToken,
        expiresAt: newExpiresAt,
      };

      await biometricAuthService.updateStoredCredentials(newCredentials);

      return {
        token,
        refreshToken,
        expiresAt: newExpiresAt,
        user,
      };
    } else {
      // Token is still valid, get user data
      const userData = await AsyncStorage.getItem('user_data');
      const user = userData ? JSON.parse(userData) : null;

      return {
        token: credentials.token,
        refreshToken: credentials.refreshToken,
        expiresAt: credentials.expiresAt,
        user,
      };
    }
  }
);

export const refreshAuthToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { auth: AuthState };
    const { refreshToken } = state.auth;

    if (!refreshToken) {
      return rejectWithValue('No refresh token available');
    }

    try {
      const result = await client.mutate({
        mutation: REFRESH_TOKEN_MUTATION,
        variables: { refreshToken },
      });

      if (!result.data?.refreshToken) {
        throw new Error('Token refresh failed');
      }

      const { token, refreshToken: newRefreshToken, expiresAt, user } = result.data.refreshToken;

      // Update stored credentials
      await Promise.all([
        AsyncStorage.setItem('auth_token', token),
        AsyncStorage.setItem('refresh_token', newRefreshToken),
        AsyncStorage.setItem('token_expires_at', expiresAt),
        AsyncStorage.setItem('user_data', JSON.stringify(user)),
      ]);

      // Update biometric credentials if enabled
      const biometricEnabled = await biometricAuthService.isBiometricEnabled();
      if (biometricEnabled) {
        const credentials: AuthCredentials = {
          username: user.username,
          token,
          refreshToken: newRefreshToken,
          expiresAt,
        };
        await biometricAuthService.updateStoredCredentials(credentials);
      }

      return {
        token,
        refreshToken: newRefreshToken,
        expiresAt,
        user,
      };
    } catch (error) {
      return rejectWithValue('Token refresh failed');
    }
  }
);

export const enableBiometric = createAsyncThunk(
  'auth/enableBiometric',
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState };
    const { user, token, refreshToken, expiresAt } = state.auth;

    if (!user || !token || !refreshToken || !expiresAt) {
      throw new Error('No authentication data available');
    }

    const credentials: AuthCredentials = {
      username: user.username,
      token,
      refreshToken,
      expiresAt,
    };

    const success = await biometricAuthService.enableBiometricAuth(credentials);
    if (!success) {
      throw new Error('Failed to enable biometric authentication');
    }

    return true;
  }
);

export const disableBiometric = createAsyncThunk(
  'auth/disableBiometric',
  async () => {
    await biometricAuthService.disableBiometricAuth();
    return true;
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    // Clear all stored auth data
    await Promise.all([
      AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'token_expires_at', 'user_data']),
      biometricAuthService.clearAllAuthData(),
    ]);

    // Reset Apollo Client cache
    await client.resetStore();

    return true;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSessionExpired: (state, action: PayloadAction<boolean>) => {
      state.sessionExpired = action.payload;
      if (action.payload) {
        state.isAuthenticated = false;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
    updateLastActivity: (state) => {
      state.lastActivity = new Date().toISOString();
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        // Update stored user data
        AsyncStorage.setItem('user_data', JSON.stringify(state.user));
      }
    },
  },
  extraReducers: (builder) => {
    // Initialize auth
    builder
      .addCase(initializeAuth.fulfilled, (state, action) => {
        const { capabilities, biometricEnabled, storedCredentials } = action.payload;
        state.biometricCapabilities = capabilities;
        state.biometricEnabled = biometricEnabled;

        if (storedCredentials) {
          state.token = storedCredentials.token;
          state.refreshToken = storedCredentials.refreshToken;
          state.expiresAt = storedCredentials.expiresAt;
          state.isAuthenticated = true;
          // Note: User data will be loaded separately or from stored data
        }
      });

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.expiresAt = action.payload.expiresAt;
        state.sessionExpired = false;
        state.lastActivity = new Date().toISOString();
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
        state.isAuthenticated = false;
      });

    // Biometric login
    builder
      .addCase(loginWithBiometric.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithBiometric.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.expiresAt = action.payload.expiresAt;
        state.sessionExpired = false;
        state.lastActivity = new Date().toISOString();
      })
      .addCase(loginWithBiometric.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Biometric login failed';
      });

    // Refresh token
    builder
      .addCase(refreshAuthToken.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.expiresAt = action.payload.expiresAt;
        state.sessionExpired = false;
        state.lastActivity = new Date().toISOString();
      })
      .addCase(refreshAuthToken.rejected, (state) => {
        state.isAuthenticated = false;
        state.sessionExpired = true;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.expiresAt = null;
      });

    // Enable biometric
    builder
      .addCase(enableBiometric.fulfilled, (state) => {
        state.biometricEnabled = true;
      })
      .addCase(enableBiometric.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to enable biometric authentication';
      });

    // Disable biometric
    builder
      .addCase(disableBiometric.fulfilled, (state) => {
        state.biometricEnabled = false;
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.expiresAt = null;
        state.sessionExpired = false;
        state.biometricEnabled = false;
        state.lastActivity = null;
        state.error = null;
        state.loading = false;
      });
  },
});

export const {
  setSessionExpired,
  clearError,
  updateLastActivity,
  updateUser,
} = authSlice.actions;

export default authSlice.reducer;
