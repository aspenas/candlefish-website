import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

// Components
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthButton } from '@/components/auth/AuthButton';
import { BiometricPrompt } from '@/components/auth/BiometricPrompt';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

// Services
import { AuthService } from '@/services/auth';
import { BiometricService } from '@/services/biometric';

// Hooks
import { useTheme } from '@/hooks/useTheme';

// Types
interface LoginFormData {
  email: string;
  password: string;
}

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Animation values
  const fadeIn = useSharedValue(0);
  const slideUp = useSharedValue(50);
  const logoScale = useSharedValue(0.8);

  useEffect(() => {
    // Initial animations
    fadeIn.value = withTiming(1, { duration: 800 });
    slideUp.value = withSpring(0);
    logoScale.value = withSpring(1);

    // Check biometric availability
    checkBiometricAvailability();
    checkStoredCredentials();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const isAvailable = await BiometricService.isAvailable();
      const isBiometricEnabled = await AuthService.isBiometricEnabled();
      setBiometricAvailable(isAvailable && isBiometricEnabled);
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
    }
  };

  const checkStoredCredentials = async () => {
    try {
      const authData = await AuthService.validateStoredAuth();
      if (authData) {
        // User is already authenticated, navigate to main app
        navigation.navigate('Main' as never);
      }
    } catch (error) {
      console.error('Failed to validate stored auth:', error);
    }
  };

  // Animated styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ translateY: slideUp.value }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form handlers
  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const authData = await AuthService.login(formData.email, formData.password);

      // Enable biometric authentication if requested
      if (rememberMe && await BiometricService.isAvailable()) {
        try {
          await AuthService.enableBiometric(authData.token);
        } catch (biometricError) {
          console.error('Failed to enable biometric auth:', biometricError);
          // Don't block login if biometric setup fails
        }
      }

      navigation.navigate('Main' as never);
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert(
        'Login Failed',
        error instanceof Error ? error.message : 'Please check your credentials and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setShowBiometricPrompt(false);

      const biometricResult = await BiometricService.authenticateForLogin();
      if (!biometricResult.success) {
        Alert.alert('Authentication Failed', biometricResult.error || 'Biometric authentication failed');
        return;
      }

      const credentials = await AuthService.getBiometricCredentials();
      if (!credentials) {
        Alert.alert('Error', 'No stored credentials found');
        return;
      }

      // Authenticate using stored token
      await AuthService.loginWithToken(credentials.token);
      navigation.navigate('Main' as never);
    } catch (error) {
      console.error('Biometric login failed:', error);
      Alert.alert(
        'Authentication Error',
        error instanceof Error ? error.message : 'Biometric authentication failed'
      );
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword' as never);
  };

  const handleSignUp = () => {
    navigation.navigate('Register' as never);
  };

  if (loading) {
    return <LoadingScreen message="Signing in..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.content, containerAnimatedStyle]}>
            {/* Logo */}
            <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
              <View style={[styles.logo, { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.logoText, { color: theme.colors.surface }]}>T</Text>
              </View>
              <Text style={[styles.appName, { color: theme.colors.text }]}>
                Tyler Setup
              </Text>
              <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
                Dashboard Analytics Platform
              </Text>
            </Animated.View>

            {/* Biometric login prompt */}
            {biometricAvailable && !showBiometricPrompt && (
              <TouchableOpacity
                style={[styles.biometricButton, { backgroundColor: theme.colors.surface }]}
                onPress={() => setShowBiometricPrompt(true)}
              >
                <Ionicons
                  name={Platform.OS === 'ios' ? 'finger-print' : 'fingerprint'}
                  size={24}
                  color={theme.colors.primary}
                />
                <Text style={[styles.biometricText, { color: theme.colors.primary }]}>
                  Use {BiometricService.getBiometricTypeDisplayName()}
                </Text>
              </TouchableOpacity>
            )}

            {/* Biometric prompt modal */}
            <BiometricPrompt
              visible={showBiometricPrompt}
              onSuccess={handleBiometricLogin}
              onCancel={() => setShowBiometricPrompt(false)}
              title="Sign In"
              subtitle="Use your biometric to sign in to Tyler Setup"
            />

            {/* Divider */}
            {biometricAvailable && (
              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>
                  or sign in with email
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              <AuthInput
                label="Email"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={errors.email}
                leftIcon="mail-outline"
              />

              <AuthInput
                label="Password"
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                placeholder="Enter your password"
                secureTextEntry
                autoComplete="password"
                error={errors.password}
                leftIcon="lock-closed-outline"
              />

              {/* Remember me & biometric */}
              {BiometricService.isAvailable() && (
                <TouchableOpacity
                  style={styles.rememberContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <Ionicons
                    name={rememberMe ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={[styles.rememberText, { color: theme.colors.text }]}>
                    Enable biometric login
                  </Text>
                </TouchableOpacity>
              )}

              <AuthButton
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                style={styles.loginButton}
              />

              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotPasswordButton}
              >
                <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
                  Forgot your password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign up link */}
            <View style={styles.signUpContainer}>
              <Text style={[styles.signUpText, { color: theme.colors.textSecondary }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text style={[styles.signUpLink, { color: theme.colors.primary }]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  biometricText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberText: {
    marginLeft: 12,
    fontSize: 16,
  },
  loginButton: {
    marginBottom: 16,
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  forgotPasswordText: {
    fontSize: 16,
    fontWeight: '500',
  },
  signUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
  },
  signUpText: {
    fontSize: 16,
  },
  signUpLink: {
    fontSize: 16,
    fontWeight: '600',
  },
});
