import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { validateStoredAuth } from '@/store/slices/authSlice';

// Navigators
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';

// Screens
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  Loading: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading, isFirstLaunch } = useSelector((state: RootState) => state.auth);
  const [isValidatingAuth, setIsValidatingAuth] = React.useState(true);

  useEffect(() => {
    const validateAuth = async () => {
      try {
        // Validate stored authentication on app startup
        await dispatch(validateStoredAuth()).unwrap();
      } catch (error) {
        console.log('No valid stored auth found');
      } finally {
        setIsValidatingAuth(false);
      }
    };

    validateAuth();
  }, [dispatch]);

  // Show loading screen while validating authentication
  if (isValidatingAuth || isLoading) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Loading" component={LoadingScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Disable swipe back for root navigator
      }}
    >
      {isFirstLaunch ? (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingNavigator}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
      ) : !isAuthenticated ? (
        <Stack.Screen
          name="Auth"
          component={AuthNavigator}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
      ) : (
        <Stack.Screen
          name="Main"
          component={MainNavigator}
          options={{
            animationTypeForReplace: 'push',
          }}
        />
      )}
    </Stack.Navigator>
  );
};
