import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Appearance, ColorSchemeName } from 'react-native';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  isWiFi: boolean;
  isCellular: boolean;
}

interface AppSettings {
  enableNotifications: boolean;
  lowStockThreshold: number;
  autoSync: boolean;
  cacheSize: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  biometricPromptEnabled: boolean;
  sessionTimeout: number; // minutes
  defaultView: 'grid' | 'list';
  sortBy: 'name' | 'date' | 'quantity' | 'value';
  sortOrder: 'asc' | 'desc';
}

interface AppState {
  theme: ColorSchemeName;
  language: string;
  networkState: NetworkState;
  settings: AppSettings;
  isFirstLaunch: boolean;
  lastUpdated: string;
  cacheSize: number;
  backgroundTime: string | null;
  isInBackground: boolean;
  orientation: 'portrait' | 'landscape';
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  keyboardHeight: number;
  loading: boolean;
  error: string | null;
}

const defaultSettings: AppSettings = {
  enableNotifications: true,
  lowStockThreshold: 10,
  autoSync: true,
  cacheSize: 50, // MB
  soundEnabled: true,
  vibrationEnabled: true,
  biometricPromptEnabled: true,
  sessionTimeout: 30, // minutes
  defaultView: 'list',
  sortBy: 'name',
  sortOrder: 'asc',
};

const initialState: AppState = {
  theme: Appearance.getColorScheme(),
  language: 'en',
  networkState: {
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
    isWiFi: false,
    isCellular: false,
  },
  settings: defaultSettings,
  isFirstLaunch: true,
  lastUpdated: new Date().toISOString(),
  cacheSize: 0,
  backgroundTime: null,
  isInBackground: false,
  orientation: 'portrait',
  safeAreaInsets: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  keyboardHeight: 0,
  loading: false,
  error: null,
};

// Async thunks
export const initializeApp = createAsyncThunk(
  'app/initialize',
  async () => {
    // Check if first launch
    const hasLaunchedBefore = await AsyncStorage.getItem('has_launched_before');
    const isFirstLaunch = hasLaunchedBefore !== 'true';

    if (isFirstLaunch) {
      await AsyncStorage.setItem('has_launched_before', 'true');
    }

    // Load saved settings
    const savedSettings = await AsyncStorage.getItem('app_settings');
    const settings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;

    // Get initial network state
    const networkState = await NetInfo.fetch();
    const networkStateFormatted: NetworkState = {
      isConnected: networkState.isConnected ?? false,
      isInternetReachable: networkState.isInternetReachable ?? false,
      type: networkState.type,
      isWiFi: networkState.type === 'wifi',
      isCellular: networkState.type === 'cellular',
    };

    // Get current theme
    const theme = Appearance.getColorScheme();

    return {
      isFirstLaunch,
      settings,
      networkState: networkStateFormatted,
      theme,
    };
  }
);

export const updateSettings = createAsyncThunk(
  'app/updateSettings',
  async (newSettings: Partial<AppSettings>) => {
    const savedSettings = await AsyncStorage.getItem('app_settings');
    const currentSettings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;
    const updatedSettings = { ...currentSettings, ...newSettings };

    await AsyncStorage.setItem('app_settings', JSON.stringify(updatedSettings));
    return updatedSettings;
  }
);

export const calculateCacheSize = createAsyncThunk(
  'app/calculateCacheSize',
  async () => {
    try {
      // This is a simplified cache size calculation
      // In a real app, you'd calculate the actual cache size
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      // Convert bytes to MB
      return Math.round(totalSize / (1024 * 1024) * 100) / 100;
    } catch (error) {
      console.error('Error calculating cache size:', error);
      return 0;
    }
  }
);

export const clearCache = createAsyncThunk(
  'app/clearCache',
  async () => {
    try {
      // Clear only cache-related items, not important data
      const keysToKeep = [
        'auth_token',
        'refresh_token',
        'token_expires_at',
        'user_data',
        'has_launched_before',
        'app_settings',
        'notification_settings',
        'biometric_credentials',
      ];

      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));

      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }
);

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ColorSchemeName>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    updateNetworkState: (state, action: PayloadAction<NetworkState>) => {
      state.networkState = action.payload;
    },
    setBackgroundTime: (state, action: PayloadAction<string | null>) => {
      state.backgroundTime = action.payload;
      state.isInBackground = action.payload !== null;
    },
    setOrientation: (state, action: PayloadAction<'portrait' | 'landscape'>) => {
      state.orientation = action.payload;
    },
    setSafeAreaInsets: (state, action: PayloadAction<{
      top: number;
      right: number;
      bottom: number;
      left: number;
    }>) => {
      state.safeAreaInsets = action.payload;
    },
    setKeyboardHeight: (state, action: PayloadAction<number>) => {
      state.keyboardHeight = action.payload;
    },
    updateLastActivity: (state) => {
      state.lastUpdated = new Date().toISOString();
    },
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    updateSingleSetting: (state, action: PayloadAction<{
      key: keyof AppSettings;
      value: any;
    }>) => {
      const { key, value } = action.payload;
      state.settings[key] = value;

      // Save to AsyncStorage
      AsyncStorage.setItem('app_settings', JSON.stringify(state.settings)).catch(
        error => console.error('Error saving setting:', error)
      );
    },
  },
  extraReducers: (builder) => {
    // Initialize app
    builder
      .addCase(initializeApp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeApp.fulfilled, (state, action) => {
        state.loading = false;
        state.isFirstLaunch = action.payload.isFirstLaunch;
        state.settings = action.payload.settings;
        state.networkState = action.payload.networkState;
        state.theme = action.payload.theme;
      })
      .addCase(initializeApp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to initialize app';
      });

    // Update settings
    builder
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update settings';
      });

    // Calculate cache size
    builder
      .addCase(calculateCacheSize.fulfilled, (state, action) => {
        state.cacheSize = action.payload;
      });

    // Clear cache
    builder
      .addCase(clearCache.pending, (state) => {
        state.loading = true;
      })
      .addCase(clearCache.fulfilled, (state) => {
        state.loading = false;
        state.cacheSize = 0;
      })
      .addCase(clearCache.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to clear cache';
      });
  },
});

export const {
  setTheme,
  setLanguage,
  updateNetworkState,
  setBackgroundTime,
  setOrientation,
  setSafeAreaInsets,
  setKeyboardHeight,
  updateLastActivity,
  clearError,
  setLoading,
  updateSingleSetting,
} = appSlice.actions;

export default appSlice.reducer;
