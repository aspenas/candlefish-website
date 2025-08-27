import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ApolloProvider } from '@apollo/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { store, persistor } from '@/store';
import { apolloClient } from '@/services/apollo';
import { AppNavigator } from '@/navigation/AppNavigator';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { NotificationProvider } from '@/services/notifications';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate loading={<LoadingScreen />} persistor={persistor}>
          <ApolloProvider client={apolloClient}>
            <SafeAreaProvider>
              <NotificationProvider>
                <StatusBar style="light" backgroundColor="#0D1B2A" />
                <AppNavigator />
              </NotificationProvider>
            </SafeAreaProvider>
          </ApolloProvider>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
}