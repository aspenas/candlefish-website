import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/types/graphql';
import { AuthService } from '@/services/auth';
import { BiometricService } from '@/services/biometric';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  refreshToken: string | null;
  biometricEnabled: boolean;
  isFirstLaunch: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  token: null,
  refreshToken: null,
  biometricEnabled: false,
  isFirstLaunch: true,
};

// Async thunks
export const loginWithCredentials = createAsyncThunk(
  'auth/loginWithCredentials',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const result = await AuthService.login(email, password);
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed');
    }
  }
);

export const loginWithBiometric = createAsyncThunk(
  'auth/loginWithBiometric',
  async (_, { rejectWithValue }) => {
    try {
      const isAvailable = await BiometricService.isAvailable();
      if (!isAvailable) {
        throw new Error('Biometric authentication not available');
      }

      const result = await BiometricService.authenticate();
      if (!result.success) {
        throw new Error(result.error || 'Biometric authentication failed');
      }

      // Get stored credentials
      const credentials = await AuthService.getBiometricCredentials();
      if (!credentials) {
        throw new Error('No biometric credentials found');
      }

      return await AuthService.loginWithToken(credentials.token);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Biometric login failed');
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      if (!state.auth.refreshToken) {
        throw new Error('No refresh token available');
      }
      return await AuthService.refreshToken(state.auth.refreshToken);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Token refresh failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await AuthService.logout();
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Logout failed');
    }
  }
);

export const enableBiometric = createAsyncThunk(
  'auth/enableBiometric',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      if (!state.auth.token) {
        throw new Error('No active session');
      }

      const isAvailable = await BiometricService.isAvailable();
      if (!isAvailable) {
        throw new Error('Biometric authentication not available');
      }

      await AuthService.enableBiometric(state.auth.token);
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to enable biometric');
    }
  }
);

export const disableBiometric = createAsyncThunk(
  'auth/disableBiometric',
  async (_, { rejectWithValue }) => {
    try {
      await AuthService.disableBiometric();
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to disable biometric');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFirstLaunch: (state, action: PayloadAction<boolean>) => {
      state.isFirstLaunch = action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login with credentials
      .addCase(loginWithCredentials.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithCredentials.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
      })
      .addCase(loginWithCredentials.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })

      // Login with biometric
      .addCase(loginWithBiometric.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithBiometric.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
      })
      .addCase(loginWithBiometric.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Refresh token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.biometricEnabled = false;
        state.error = null;
      })

      // Enable biometric
      .addCase(enableBiometric.fulfilled, (state) => {
        state.biometricEnabled = true;
      })
      .addCase(enableBiometric.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // Disable biometric
      .addCase(disableBiometric.fulfilled, (state) => {
        state.biometricEnabled = false;
      })
      .addCase(disableBiometric.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setFirstLaunch, updateUser } = authSlice.actions;
export default authSlice.reducer;
