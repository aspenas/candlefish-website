import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector, useAppDispatch } from '../store';
import { checkNetworkAndSync } from '../store/slices/syncSlice';

// Stack Navigators
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OnboardingNavigator from './OnboardingNavigator';

// Screens
import SplashScreen from '../screens/SplashScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const dispatch = useAppDispatch();

  // Get app state
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
  const isFirstLaunch = useAppSelector(state => state.app.isFirstLaunch);
  const appLoading = useAppSelector(state => state.app.loading);
  const authLoading = useAppSelector(state => state.auth.loading);

  // Determine initial route
  const getInitialRouteName = (): keyof RootStackParamList => {
    if (appLoading || authLoading) {
      return 'Splash';
    }

    if (isFirstLaunch) {
      return 'Onboarding';
    }

    if (!isAuthenticated) {
      return 'Auth';
    }

    return 'Main';
  };

  useEffect(() => {
    // Start periodic sync check when authenticated
    if (isAuthenticated && !appLoading && !authLoading) {
      dispatch(checkNetworkAndSync());

      // Set up periodic sync (every 5 minutes when app is active)
      const syncInterval = setInterval(() => {
        dispatch(checkNetworkAndSync());
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(syncInterval);
    }
  }, [isAuthenticated, appLoading, authLoading, dispatch]);

  return (
    <Stack.Navigator
      initialRouteName={getInitialRouteName()}
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      {(appLoading || authLoading) && (
        <Stack.Screen
          name="Splash"
          component={SplashScreen}
          options={{ gestureEnabled: false }}
        />
      )}

      {isFirstLaunch && (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingNavigator}
          options={{ gestureEnabled: false }}
        />
      )}

      {!isAuthenticated && !isFirstLaunch && (
        <Stack.Screen
          name="Auth"
          component={AuthNavigator}
          options={{ gestureEnabled: false }}
        />
      )}

      {isAuthenticated && (
        <Stack.Screen
          name="Main"
          component={MainNavigator}
        />
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
