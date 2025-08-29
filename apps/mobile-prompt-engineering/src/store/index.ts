import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';

import authSlice from './slices/authSlice';
import templatesSlice from './slices/templatesSlice';
import executionsSlice from './slices/executionsSlice';
import settingsSlice from './slices/settingsSlice';
import modelsSlice from './slices/modelsSlice';
import offlineSlice from './slices/offlineSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'settings', 'templates'], // Only persist these slices
};

const rootReducer = combineReducers({
  auth: authSlice,
  templates: templatesSlice,
  executions: executionsSlice,
  settings: settingsSlice,
  models: modelsSlice,
  offline: offlineSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;