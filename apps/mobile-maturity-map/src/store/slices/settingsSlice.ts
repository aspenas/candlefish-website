import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SettingsState {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  biometricEnabled: boolean;
  notifications: {
    enabled: boolean;
    assessmentUpdates: boolean;
    syncNotifications: boolean;
    reminders: boolean;
    marketing: boolean;
  };
  sync: {
    autoSync: boolean;
    syncOnWifiOnly: boolean;
    backgroundSync: boolean;
  };
  performance: {
    imageQuality: 'low' | 'medium' | 'high';
    autoOptimizeImages: boolean;
    enableAnimations: boolean;
    preloadContent: boolean;
  };
  privacy: {
    analytics: boolean;
    crashReporting: boolean;
    usageStatistics: boolean;
  };
}

const initialState: SettingsState = {
  theme: 'auto',
  language: 'en',
  biometricEnabled: false,
  notifications: {
    enabled: true,
    assessmentUpdates: true,
    syncNotifications: true,
    reminders: true,
    marketing: false,
  },
  sync: {
    autoSync: true,
    syncOnWifiOnly: false,
    backgroundSync: true,
  },
  performance: {
    imageQuality: 'medium',
    autoOptimizeImages: true,
    enableAnimations: true,
    preloadContent: true,
  },
  privacy: {
    analytics: true,
    crashReporting: true,
    usageStatistics: true,
  },
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateSettings: (state, action: PayloadAction<Partial<SettingsState>>) => {
      return { ...state, ...action.payload };
    },
    
    updateNotificationSettings: (state, action: PayloadAction<Partial<SettingsState['notifications']>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    
    updateSyncSettings: (state, action: PayloadAction<Partial<SettingsState['sync']>>) => {
      state.sync = { ...state.sync, ...action.payload };
    },
    
    updatePerformanceSettings: (state, action: PayloadAction<Partial<SettingsState['performance']>>) => {
      state.performance = { ...state.performance, ...action.payload };
    },
    
    updatePrivacySettings: (state, action: PayloadAction<Partial<SettingsState['privacy']>>) => {
      state.privacy = { ...state.privacy, ...action.payload };
    },
    
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.theme = action.payload;
    },
    
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    
    setBiometricEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricEnabled = action.payload;
    },
    
    resetToDefaults: () => {
      return initialState;
    },
  },
});

export const {
  updateSettings,
  updateNotificationSettings,
  updateSyncSettings,
  updatePerformanceSettings,
  updatePrivacySettings,
  setTheme,
  setLanguage,
  setBiometricEnabled,
  resetToDefaults,
} = settingsSlice.actions;

export default settingsSlice.reducer;