import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Operator } from '@/types/assessment';

interface AuthState {
  isAuthenticated: boolean;
  user: Operator | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  biometricEnabled: boolean;
  hasCompletedOnboarding: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  loading: false,
  error: null,
  biometricEnabled: false,
  hasCompletedOnboarding: false,
};

// Async thunks for authentication
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    try {
      // Mock API call - replace with actual authentication
      const response = await mockApiLogin(email, password);
      
      // Store tokens securely
      await SecureStore.setItemAsync('access_token', response.token);
      await SecureStore.setItemAsync('refresh_token', response.refreshToken);
      
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: { email: string; password: string; name: string; companyName?: string }) => {
    try {
      // Mock API call - replace with actual registration
      const response = await mockApiRegister(userData);
      
      // Store tokens securely
      await SecureStore.setItemAsync('access_token', response.token);
      await SecureStore.setItemAsync('refresh_token', response.refreshToken);
      
      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  // Clear stored tokens
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
  
  return null;
});

export const restoreSession = createAsyncThunk('auth/restoreSession', async () => {
  try {
    const token = await SecureStore.getItemAsync('access_token');
    const refreshToken = await SecureStore.getItemAsync('refresh_token');
    
    if (!token) {
      throw new Error('No stored session');
    }
    
    // Validate token with API and get user data
    const user = await mockApiValidateToken(token);
    
    return { user, token, refreshToken };
  } catch (error) {
    // Clear invalid tokens
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    throw error;
  }
});

export const enableBiometric = createAsyncThunk(
  'auth/enableBiometric',
  async ({ pin }: { pin: string }) => {
    try {
      // Check if biometric is available
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) {
        throw new Error('Biometric authentication not available');
      }
      
      // Store PIN securely for biometric fallback
      await SecureStore.setItemAsync('biometric_pin', pin);
      
      return true;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Biometric setup failed');
    }
  }
);

export const authenticateBiometric = createAsyncThunk(
  'auth/authenticateBiometric',
  async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your assessments',
        cancelLabel: 'Use PIN',
        fallbackLabel: 'Use PIN',
      });
      
      if (!result.success) {
        throw new Error('Biometric authentication failed');
      }
      
      // Get stored session
      const token = await SecureStore.getItemAsync('access_token');
      if (!token) {
        throw new Error('No stored session');
      }
      
      const user = await mockApiValidateToken(token);
      return { user, token };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Authentication failed');
    }
  }
);

// Mock API functions - replace with actual API calls
async function mockApiLogin(email: string, password: string) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (email === 'demo@candlefish.ai' && password === 'demo123') {
    return {
      user: {
        id: '1',
        name: 'Demo User',
        email: 'demo@candlefish.ai',
        tier: 'PROFESSIONAL',
        companyName: 'Demo Company',
        industry: 'TECHNOLOGY',
        permissions: ['read', 'write'],
        quotas: {
          maxAssessments: 50,
          maxDocuments: 200,
          maxTokensPerMonth: 100000,
          maxStorageGB: 10,
          maxConcurrentProcessing: 5,
        },
        usage: {
          assessmentsUsed: 12,
          documentsUsed: 48,
          tokensUsed: 25000,
          storageUsedGB: 2.5,
          currentProcessing: 1,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        assessments: [],
        solutions: [],
        reports: [],
        integrations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Operator,
      token: 'mock_access_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
    };
  }
  
  throw new Error('Invalid credentials');
}

async function mockApiRegister(userData: { email: string; password: string; name: string; companyName?: string }) {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    user: {
      id: Date.now().toString(),
      name: userData.name,
      email: userData.email,
      tier: 'STARTER',
      companyName: userData.companyName,
      permissions: ['read', 'write'],
      quotas: {
        maxAssessments: 5,
        maxDocuments: 20,
        maxTokensPerMonth: 10000,
        maxStorageGB: 1,
        maxConcurrentProcessing: 1,
      },
      usage: {
        assessmentsUsed: 0,
        documentsUsed: 0,
        tokensUsed: 0,
        storageUsedGB: 0,
        currentProcessing: 0,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      assessments: [],
      solutions: [],
      reports: [],
      integrations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Operator,
    token: 'mock_access_token_' + Date.now(),
    refreshToken: 'mock_refresh_token_' + Date.now(),
  };
}

async function mockApiValidateToken(token: string) {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (token.startsWith('mock_access_token_')) {
    return {
      id: '1',
      name: 'Demo User',
      email: 'demo@candlefish.ai',
      tier: 'PROFESSIONAL',
      companyName: 'Demo Company',
      industry: 'TECHNOLOGY',
      permissions: ['read', 'write'],
      quotas: {
        maxAssessments: 50,
        maxDocuments: 200,
        maxTokensPerMonth: 100000,
        maxStorageGB: 10,
        maxConcurrentProcessing: 5,
      },
      usage: {
        assessmentsUsed: 12,
        documentsUsed: 48,
        tokensUsed: 25000,
        storageUsedGB: 2.5,
        currentProcessing: 1,
        resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      assessments: [],
      solutions: [],
      reports: [],
      integrations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Operator;
  }
  
  throw new Error('Invalid token');
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    
    updateUser: (state, action: PayloadAction<Partial<Operator>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    
    completeOnboarding: (state) => {
      state.hasCompletedOnboarding = true;
      if (state.user) {
        state.user = { ...state.user, hasCompletedOnboarding: true };
      }
    },
    
    setBiometricEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricEnabled = action.payload;
    },
  },
  
  extraReducers: (builder) => {
    builder
      // Login
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
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
        state.hasCompletedOnboarding = false; // New users need onboarding
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Registration failed';
      })
      
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.biometricEnabled = false;
        state.hasCompletedOnboarding = false;
        state.error = null;
      })
      
      // Restore session
      .addCase(restoreSession.pending, (state) => {
        state.loading = true;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.hasCompletedOnboarding = action.payload.user.hasCompletedOnboarding || true;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
      })
      
      // Biometric authentication
      .addCase(enableBiometric.fulfilled, (state) => {
        state.biometricEnabled = true;
      })
      .addCase(authenticateBiometric.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      });
  },
});

export const { clearError, updateUser, completeOnboarding, setBiometricEnabled } = authSlice.actions;

export default authSlice.reducer;