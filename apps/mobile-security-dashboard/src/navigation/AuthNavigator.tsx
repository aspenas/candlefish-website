import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';

// Screens
import LoginScreen from '@/screens/Login';

// Types
export type AuthStackParamList = {
  Login: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  const colorScheme = useColorScheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: colorScheme === 'dark' ? '#0a0a0a' : '#fafafa',
        },
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{
          title: 'Sign In',
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;