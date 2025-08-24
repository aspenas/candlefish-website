import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Import reducers
import authReducer from './slices/authSlice';
import inventoryReducer from './slices/inventorySlice';
import appReducer from './slices/appSlice';
import syncReducer from './slices/syncSlice';

// Persist config
const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth', 'app'], // Only persist auth and app state
  blacklist: ['inventory', 'sync'], // Don't persist inventory (comes from SQLite) or sync state
};

const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['biometricEnabled', 'lastActivity'], // Only persist certain auth fields
};

const appPersistConfig = {
  key: 'app',
  storage: AsyncStorage,
  whitelist: ['theme', 'language', 'settings'], // Persist app preferences
};

// Combine reducers
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  inventory: inventoryReducer, // Not persisted - data comes from SQLite
  app: persistReducer(appPersistConfig, appReducer),
  sync: syncReducer, // Not persisted - runtime state only
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['app.networkState'],
      },
    }),
  devTools: __DEV__,
});

// Create persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Helper functions
export const getIsAuthenticated = (state: RootState): boolean => state.auth.isAuthenticated;
export const getCurrentUser = (state: RootState) => state.auth.user;
export const getAuthToken = (state: RootState) => state.auth.token;
export const getInventoryItems = (state: RootState) => state.inventory.items;
export const getInventoryStats = (state: RootState) => ({
  totalItems: state.inventory.totalItems,
  totalValue: state.inventory.totalValue,
  lowStockCount: state.inventory.lowStockItems.length,
});
export const getAppTheme = (state: RootState) => state.app.theme;
export const getNetworkStatus = (state: RootState) => state.app.networkState.isConnected;
export const getSyncStatus = (state: RootState) => state.sync.status;

// Action creators for common operations
export const clearPersistedState = () => {
  return async (dispatch: AppDispatch) => {
    await persistor.purge();
    await persistor.flush();
  };
};

export default store;
