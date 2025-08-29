import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { 
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics 
} from 'react-native-safe-area-context';
import {
  Platform,
  StatusBar,
  Alert,
  AppState,
  AppStateStatus
} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
import DashboardScreen from './src/screens/DashboardScreen';
import ValuationsScreen from './src/screens/ValuationsScreen';
import CameraScreen from './src/screens/CameraScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import ItemDetailScreen from './src/screens/ItemDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AuthScreen from './src/screens/AuthScreen';

// Services
import { OfflineQueueService } from './src/services/offline-queue';
import { LocationThreatService } from './src/services/location-threat';
import { SecurityService } from './src/services/security';
import { PerformanceService } from './src/services/performance';

// Providers
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider, useAuth } from './src/providers/AuthProvider';
import { ThemeProvider, useTheme } from './src/providers/ThemeProvider';
import { OfflineProvider } from './src/providers/OfflineProvider';

// Types
import { RootStackParamList, TabParamList } from './src/types/navigation';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

const TabNavigator = () => {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;
          
          switch (route.name) {
            case 'Dashboard':
              iconName = 'dashboard';
              break;
            case 'Valuations':
              iconName = 'attach-money';
              break;
            case 'Camera':
              iconName = 'camera-alt';
              break;
            case 'Scanner':
              iconName = 'qr-code-scanner';
              break;
            case 'Inventory':
              iconName = 'inventory';
              break;
            default:
              iconName = 'home';
          }
          
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Valuations" 
        component={ValuationsScreen}
        options={{ title: 'Valuations' }}
      />
      <Tab.Screen 
        name="Camera" 
        component={CameraScreen}
        options={{ 
          title: 'Camera',
          tabBarStyle: { display: 'none' } // Hide tab bar on camera screen
        }}
      />
      <Tab.Screen 
        name="Scanner" 
        component={ScannerScreen}
        options={{ 
          title: 'Scanner',
          tabBarStyle: { display: 'none' } // Hide tab bar on scanner screen
        }}
      />
      <Tab.Screen 
        name="Inventory" 
        component={InventoryScreen}
        options={{ title: 'Inventory' }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  if (isLoading) {
    // Show loading screen while checking authentication
    return null;
  }

  return (
    <NavigationContainer
      theme={{
        dark: theme.mode === 'dark',
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.text,
          border: theme.colors.border,
          notification: theme.colors.accent,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen 
            name="Auth" 
            component={AuthScreen}
            options={{ 
              headerShown: false,
              animationTypeForReplace: 'push'
            }}
          />
        ) : (
          <>
            <Stack.Screen 
              name="Main" 
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="ItemDetail" 
              component={ItemDetailScreen}
              options={({ route }) => ({ 
                title: route.params?.itemName || 'Item Details',
                headerBackTitleVisible: false
              })}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App: React.FC = () => {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize services
        await SecurityService.initialize();
        await PerformanceService.initialize();
        await OfflineQueueService.initialize();
        
        // Initialize location-based threat detection
        if (Platform.OS !== 'web') {
          await LocationThreatService.initialize();
        }

        // Set up app state handling for background sync
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
          if (nextAppState === 'active') {
            // App has come to the foreground, sync data
            OfflineQueueService.processQueue();
          }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        
        setAppIsReady(true);

        // Cleanup
        return () => {
          subscription?.remove();
        };
      } catch (error) {
        console.error('Failed to initialize app:', error);
        Alert.alert(
          'Initialization Error',
          'The app failed to initialize properly. Some features may not work correctly.',
          [{ text: 'OK' }]
        );
        setAppIsReady(true); // Still allow app to load
      }
    };

    initializeApp();
  }, []);

  if (!appIsReady) {
    return null; // Or a loading screen
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <OfflineProvider>
              <SafeAreaView style={{ flex: 1 }}>
                <StatusBar
                  barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
                  backgroundColor="#000"
                />
                <AppNavigator />
                <Toast />
              </SafeAreaView>
            </OfflineProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
};

export default App;