import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useAppSelector, useAppDispatch } from './redux';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  preferences?: {
    theme: 'light' | 'dark' | 'auto';
    biometricEnabled: boolean;
  };
}

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, loading } = useAppSelector((state) => state.auth);
  
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      setBiometricSupported(hasHardware);
      setBiometricEnrolled(isEnrolled);
    } catch (error) {
      console.error('Failed to check biometric support:', error);
    }
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      if (!biometricSupported || !biometricEnrolled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Candlefish Prompt Engineering',
        fallbackLabel: 'Use Passcode',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        // Retrieve stored user session
        const storedUser = await SecureStore.getItemAsync('user_session');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          dispatch({ 
            type: 'auth/setUser', 
            payload: userData 
          });
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    dispatch({ type: 'auth/loginStart' });
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: AuthUser = {
        id: '1',
        name: 'Prompt Engineer',
        email: credentials.email,
        preferences: {
          theme: 'auto',
          biometricEnabled: true
        }
      };

      // Store user session securely
      await SecureStore.setItemAsync('user_session', JSON.stringify(mockUser));
      
      dispatch({ 
        type: 'auth/loginSuccess', 
        payload: mockUser 
      });

      return { success: true };
    } catch (error) {
      dispatch({ 
        type: 'auth/loginFailure', 
        payload: 'Login failed. Please try again.' 
      });
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('user_session');
      dispatch({ type: 'auth/logout' });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const updateUserPreferences = async (preferences: Partial<AuthUser['preferences']>) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      preferences: {
        ...user.preferences,
        ...preferences
      }
    };

    try {
      await SecureStore.setItemAsync('user_session', JSON.stringify(updatedUser));
      dispatch({ 
        type: 'auth/updateUser', 
        payload: updatedUser 
      });
    } catch (error) {
      console.error('Failed to update user preferences:', error);
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    biometricSupported,
    biometricEnrolled,
    login,
    logout,
    authenticateWithBiometric,
    updateUserPreferences,
    checkBiometricSupport
  };
};