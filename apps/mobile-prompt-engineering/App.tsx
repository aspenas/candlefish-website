import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import FlashMessage from 'react-native-flash-message';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import * as LocalAuthentication from 'expo-local-authentication';

import AppNavigator from '@/navigation/AppNavigator';
import { store, persistor } from '@/store';
import { useAppTheme } from '@/hooks/useAppTheme';
import { lightTheme, darkTheme } from '@/constants/theme';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { initializeApp } from '@/services/appService';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Create query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

// Custom fonts configuration
const customFonts = {
  'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
  'Inter-Medium': require('./assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
  'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
  'JetBrainsMono-Regular': require('./assets/fonts/JetBrainsMono-Regular.ttf'),
  'JetBrainsMono-Medium': require('./assets/fonts/JetBrainsMono-Medium.ttf'),
  'JetBrainsMono-Bold': require('./assets/fonts/JetBrainsMono-Bold.ttf'),
};

interface AppContentProps {
  onLayoutRootView: () => void;
}

function AppContent({ onLayoutRootView }: AppContentProps) {
  const { theme, isDarkMode } = useAppTheme();
  
  const paperTheme = isDarkMode ? darkTheme : lightTheme;
  
  return (
    <GestureHandlerRootView 
      style={{ flex: 1 }} 
      onLayout={onLayoutRootView}
    >
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <StatusBar style={isDarkMode ? 'light' : 'dark'} />
          <AppNavigator />
          <FlashMessage position="top" />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts
        await Font.loadAsync(customFonts);
        
        // Initialize app services
        await initializeApp();
        
        // Check biometric availability
        const biometricSupported = await LocalAuthentication.hasHardwareAsync();
        const biometricEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        console.log('Biometric support:', { biometricSupported, biometricEnrolled });
        
        // Simulate minimum loading time for better UX
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = React.useCallback(async () => {
    if (appIsReady) {
      // Hide the splash screen once the app is ready
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return <LoadingScreen />;
  }

  return (
    <ReduxProvider store={store}>
      <PersistGate loading={<LoadingScreen />} persistor={persistor}>
        <QueryClientProvider client={queryClient}>
          <AppContent onLayoutRootView={onLayoutRootView} />
        </QueryClientProvider>
      </PersistGate>
    </ReduxProvider>
  );
}