import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MobileSettings } from '@/types';

interface SettingsState {
  settings: MobileSettings;
  loading: boolean;
  error: string | null;
}

const initialSettings: MobileSettings = {
  auth: {
    biometricEnabled: true,
    autoLockTimeout: 300000, // 5 minutes
  },
  models: {
    defaultProvider: 'anthropic',
    defaultModel: 'claude-opus-4-1-20250805',
    preferredModels: [
      'claude-opus-4-1-20250805',
      'claude-3-5-sonnet-20241022',
      'gpt-4o',
    ],
  },
  ui: {
    theme: 'auto',
    hapticFeedback: true,
    soundEnabled: true,
    fontSize: 'medium',
  },
  sync: {
    autoSync: true,
    syncOnWifiOnly: false,
    syncInterval: 300000, // 5 minutes
  },
  privacy: {
    cacheEnabled: true,
    analyticsEnabled: true,
    crashReportingEnabled: true,
  },
  notifications: {
    enabled: true,
    executionComplete: true,
    errorAlerts: true,
    dailyDigest: false,
  },
};

const initialState: SettingsState = {
  settings: initialSettings,
  loading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<MobileSettings>>) => {
      state.settings = {
        ...state.settings,
        ...action.payload,
      };
    },
    updateAuthSettings: (state, action: PayloadAction<Partial<MobileSettings['auth']>>) => {
      state.settings.auth = {
        ...state.settings.auth,
        ...action.payload,
      };
    },
    updateModelSettings: (state, action: PayloadAction<Partial<MobileSettings['models']>>) => {
      state.settings.models = {
        ...state.settings.models,
        ...action.payload,
      };
    },
    updateUISettings: (state, action: PayloadAction<Partial<MobileSettings['ui']>>) => {
      state.settings.ui = {
        ...state.settings.ui,
        ...action.payload,
      };
    },
    updateSyncSettings: (state, action: PayloadAction<Partial<MobileSettings['sync']>>) => {
      state.settings.sync = {
        ...state.settings.sync,
        ...action.payload,
      };
    },
    updatePrivacySettings: (state, action: PayloadAction<Partial<MobileSettings['privacy']>>) => {
      state.settings.privacy = {
        ...state.settings.privacy,
        ...action.payload,
      };
    },
    updateNotificationSettings: (state, action: PayloadAction<Partial<MobileSettings['notifications']>>) => {
      state.settings.notifications = {
        ...state.settings.notifications,
        ...action.payload,
      };
    },
    resetSettings: (state) => {
      state.settings = initialSettings;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  updateSettings,
  updateAuthSettings,
  updateModelSettings,
  updateUISettings,
  updateSyncSettings,
  updatePrivacySettings,
  updateNotificationSettings,
  resetSettings,
  setLoading,
  setError,
} = settingsSlice.actions;

export default settingsSlice.reducer;