import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';

// Slices
import authSlice from './slices/authSlice';
import organizationSlice from './slices/organizationSlice';
import dashboardSlice from './slices/dashboardSlice';
import offlineSlice from './slices/offlineSlice';
import notificationSlice from './slices/notificationSlice';
import uiSlice from './slices/uiSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'organization', 'offline', 'ui'], // Only persist these reducers
  blacklist: ['dashboard', 'notification'], // Don't persist real-time data
};

const rootReducer = combineReducers({
  auth: authSlice,
  organization: organizationSlice,
  dashboard: dashboardSlice,
  offline: offlineSlice,
  notification: notificationSlice,
  ui: uiSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['register'],
      },
    }),
  devTools: __DEV__,
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
