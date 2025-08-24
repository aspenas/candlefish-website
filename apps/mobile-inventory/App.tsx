import React, { useEffect, useCallback } from 'react';
import { StatusBar, Platform, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ApolloProvider } from '@apollo/client';
import { NavigationContainer } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import Toast from 'react-native-toast-message';

// Store
import { store, persistor } from './src/store';

// Services
import { client } from './src/graphql/client';
import { initDatabase } from './src/database/schema';
import { notificationService } from './src/services/NotificationService';
import { biometricAuthService } from './src/services/BiometricAuthService';

// Redux actions
import { initializeAuth } from './src/store/slices/authSlice';
import { initializeApp, updateNetworkState, setBackgroundTime } from './src/store/slices/appSlice';
import { checkNetworkAndSync, setOnlineStatus } from './src/store/slices/syncSlice';

// Components
import RootNavigator from './src/navigation/RootNavigator';
import LoadingScreen from './src/components/LoadingScreen';
import ErrorBoundary from './src/components/ErrorBoundary';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isAppReady, setIsAppReady] = React.useState(false);
  const [appState, setAppState] = React.useState(AppState.currentState);

  // Initialize app
  const initializeApplication = useCallback(async () => {
    try {
      console.log('Starting app initialization...');

      // Initialize database
      await initDatabase();
      console.log('Database initialized');

      // Initialize services
      await Promise.all([
        notificationService.initialize(),
        biometricAuthService.initialize(),
      ]);
      console.log('Services initialized');

      // Initialize Redux store
      store.dispatch(initializeApp());
      store.dispatch(initializeAuth());

      console.log('Store initialized');

      // Set up network monitoring
      const unsubscribe = NetInfo.addEventListener(state => {
        const networkState = {
          isConnected: state.isConnected ?? false,
          isInternetReachable: state.isInternetReachable ?? false,
          type: state.type,
          isWiFi: state.type === 'wifi',
          isCellular: state.type === 'cellular',
        };

        store.dispatch(updateNetworkState(networkState));
        store.dispatch(setOnlineStatus(networkState.isConnected));

        // Trigger sync when network is restored
        if (networkState.isConnected) {
          store.dispatch(checkNetworkAndSync());
        }
      });

      // Configure screen orientation (portrait only for now)
      if (Platform.OS !== 'web') {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }

      console.log('App initialization completed');
      return unsubscribe;

    } catch (error) {
      console.error('App initialization failed:', error);
      throw error;
    }
  }, []);

  // Handle app state changes
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    const isGoingBackground = appState.match(/active|foreground/) && nextAppState === 'background';
    const isComingForeground = appState === 'background' && nextAppState === 'active';

    if (isGoingBackground) {
      // App is going to background
      store.dispatch(setBackgroundTime(new Date().toISOString()));
      console.log('App went to background');
    } else if (isComingForeground) {
      // App is coming to foreground
      store.dispatch(setBackgroundTime(null));

      // Check for sync when app comes back to foreground
      store.dispatch(checkNetworkAndSync());

      console.log('App came to foreground');
    }

    setAppState(nextAppState);
  }, [appState]);

  useEffect(() => {
    let networkUnsubscribe: (() => void) | undefined;

    const initApp = async () => {
      try {
        networkUnsubscribe = await initializeApplication();
        setIsAppReady(true);

        // Hide splash screen after a short delay to ensure smooth transition
        setTimeout(() => {
          SplashScreen.hideAsync();
        }, 500);

      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsAppReady(true); // Show error state
        SplashScreen.hideAsync();
      }
    };

    initApp();

    // Set up app state listener
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      networkUnsubscribe?.();
      appStateSubscription?.remove();
    };
  }, [initializeApplication, handleAppStateChange]);

  if (!isAppReady) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Provider store={store}>
            <PersistGate loading={<LoadingScreen />} persistor={persistor}>
              <ApolloProvider client={client}>
                <StatusBar
                  barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
                  backgroundColor={Platform.OS === 'android' ? '#007AFF' : undefined}
                  translucent={Platform.OS === 'android'}
                />
                <NavigationContainer>
                  <RootNavigator />
                </NavigationContainer>
                <Toast />
              </ApolloProvider>
            </PersistGate>
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
