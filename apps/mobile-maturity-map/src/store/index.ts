import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, createMigrate } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';

import authSlice from './slices/authSlice';
import assessmentsSlice from './slices/assessmentsSlice';
import documentsSlice from './slices/documentsSlice';
import syncSlice from './slices/syncSlice';
import networkSlice from './slices/networkSlice';
import notificationsSlice from './slices/notificationsSlice';
import settingsSlice from './slices/settingsSlice';

// Migration configs for handling app updates
const migrations = {
  0: (state: any) => {
    // Initial migration
    return {
      ...state,
    };
  },
  1: (state: any) => {
    // Version 1 migration - add new fields if needed
    return {
      ...state,
      settings: {
        ...state.settings,
        biometricEnabled: false,
        notificationsEnabled: true,
      },
    };
  },
};

const rootReducer = combineReducers({
  auth: authSlice,
  assessments: assessmentsSlice,
  documents: documentsSlice,
  sync: syncSlice,
  network: networkSlice,
  notifications: notificationsSlice,
  settings: settingsSlice,
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  migrate: createMigrate(migrations, { debug: __DEV__ }),
  whitelist: ['auth', 'assessments', 'documents', 'settings'], // Only persist certain slices
  blacklist: ['network', 'sync'], // Don't persist network status and sync state
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: __DEV__,
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;