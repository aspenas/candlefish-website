import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useSelector } from 'react-redux';

import { RootState } from '@/store';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { linking } from './linking';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const [isReady, setIsReady] = useState(false);
  const { isAuthenticated, hasCompletedOnboarding } = useSelector((state: RootState) => ({
    isAuthenticated: state.auth.isAuthenticated,
    hasCompletedOnboarding: state.auth.user?.hasCompletedOnboarding ?? false,
  }));

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return null;
  }

  const getInitialRouteName = () => {
    if (!isAuthenticated) return 'Auth';
    if (!hasCompletedOnboarding) return 'Onboarding';
    return 'Main';
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName={getInitialRouteName()}
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        <Stack.Screen name="Main" component={MainNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}