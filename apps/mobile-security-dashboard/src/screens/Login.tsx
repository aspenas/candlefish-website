import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Paragraph,
  Card,
  Checkbox,
  useTheme,
  Surface,
  Text,
  IconButton,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { CommonActions } from '@react-navigation/native';

// Services
import { biometricService } from '@/services/biometric';
import { authService } from '@/services/auth';
import { secureStorage } from '@/utils/secure-storage';

// Hooks
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

// Types
interface LoginFormData {
  username: string;
  password: string;
  rememberMe: boolean;
}

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { login, isLoading } = useAuth();
  const { isConnected } = useNetworkStatus();

  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    initializeBiometrics();
    loadSavedCredentials();
  }, []);

  const initializeBiometrics = async () => {
    try {
      const capabilities = await biometricService.checkCapabilities();
      setBiometricsAvailable(capabilities.available);
      setBiometricsEnabled(capabilities.enabled);
    } catch (error) {
      console.error('Error checking biometrics:', error);
    }
  };

  const loadSavedCredentials = async () => {
    try {
      const savedUsername = await secureStorage.getItem('saved_username');
      if (savedUsername) {
        setFormData(prev => ({
          ...prev,
          username: savedUsername,
          rememberMe: true,
        }));
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    if (!isConnected) {
      Alert.alert(
        'No Internet Connection',
        'Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login({
        username: formData.username,
        password: formData.password,
      });

      if (result.success) {
        // Save credentials if remember me is checked
        if (formData.rememberMe) {
          await secureStorage.setItem('saved_username', formData.username);
        } else {
          await secureStorage.removeItem('saved_username');
        }

        // Navigate to main app
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'MainApp' }],
          })
        );
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Login Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const result = await biometricService.authenticate('Please verify your identity');
      
      if (result.success) {
        // Get saved credentials for biometric login
        const savedCredentials = await secureStorage.getCredentials();
        
        if (savedCredentials) {
          const loginResult = await login(savedCredentials);
          
          if (loginResult.success) {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'MainApp' }],
              })
            );
          } else {
            Alert.alert(
              'Authentication Failed',
              'Saved credentials are invalid. Please login manually.'
            );
          }
        } else {
          Alert.alert(
            'No Saved Credentials',
            'Please login manually to enable biometric authentication.'
          );
        }
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      Alert.alert(
        'Authentication Error',
        'Biometric authentication failed. Please try again.'
      );
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Contact your system administrator to reset your password.',
      [{ text: 'OK' }]
    );
  };

  const handleFieldChange = (field: keyof LoginFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {/* Logo and Title */}
            <View style={styles.header}>
              <Surface style={[styles.logoContainer, { backgroundColor: theme.colors.primary }]}>
                <MaterialCommunityIcons 
                  name="shield-check" 
                  size={48} 
                  color={theme.colors.onPrimary} 
                />
              </Surface>
              <Title style={styles.title}>Security Dashboard</Title>
              <Paragraph style={styles.subtitle}>
                Secure access to Candlefish.ai security platform
              </Paragraph>
            </View>

            {/* Login Form */}
            <Card style={styles.formCard}>
              <Card.Content style={styles.formContent}>
                <View style={styles.form}>
                  {/* Username Field */}
                  <TextInput
                    label="Username"
                    value={formData.username}
                    onChangeText={(text) => handleFieldChange('username', text)}
                    mode="outlined"
                    left={<TextInput.Icon icon="account" />}
                    error={!!errors.username}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="username"
                    autoComplete="username"
                    style={styles.input}
                  />
                  <HelperText type="error" visible={!!errors.username}>
                    {errors.username}
                  </HelperText>

                  {/* Password Field */}
                  <TextInput
                    label="Password"
                    value={formData.password}
                    onChangeText={(text) => handleFieldChange('password', text)}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    left={<TextInput.Icon icon="lock" />}
                    right={
                      <TextInput.Icon 
                        icon={showPassword ? "eye-off" : "eye"}
                        onPress={() => setShowPassword(!showPassword)}
                      />
                    }
                    error={!!errors.password}
                    textContentType="password"
                    autoComplete="current-password"
                    style={styles.input}
                  />
                  <HelperText type="error" visible={!!errors.password}>
                    {errors.password}
                  </HelperText>

                  {/* Remember Me */}
                  <View style={styles.checkboxContainer}>
                    <Checkbox
                      status={formData.rememberMe ? 'checked' : 'unchecked'}
                      onPress={() => handleFieldChange('rememberMe', !formData.rememberMe)}
                    />
                    <Text style={styles.checkboxLabel}>Remember username</Text>
                  </View>

                  {/* Login Button */}
                  <Button
                    mode="contained"
                    onPress={handleLogin}
                    loading={isSubmitting}
                    disabled={isSubmitting || !isConnected}
                    style={styles.loginButton}
                    contentStyle={styles.loginButtonContent}
                  >
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                  </Button>

                  {/* Biometric Login */}
                  {biometricsAvailable && biometricsEnabled && (
                    <>
                      <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                      </View>

                      <Button
                        mode="outlined"
                        onPress={handleBiometricLogin}
                        icon="fingerprint"
                        style={styles.biometricButton}
                        contentStyle={styles.biometricButtonContent}
                      >
                        Use Biometric Login
                      </Button>
                    </>
                  )}

                  {/* Forgot Password */}
                  <Button
                    mode="text"
                    onPress={handleForgotPassword}
                    style={styles.forgotButton}
                  >
                    Forgot Password?
                  </Button>
                </View>
              </Card.Content>
            </Card>

            {/* Network Status */}
            {!isConnected && (
              <Card style={[styles.statusCard, { backgroundColor: theme.colors.errorContainer }]}>
                <Card.Content style={styles.statusContent}>
                  <MaterialCommunityIcons 
                    name="wifi-off" 
                    size={24} 
                    color={theme.colors.onErrorContainer} 
                  />
                  <Text style={[styles.statusText, { color: theme.colors.onErrorContainer }]}>
                    No internet connection
                  </Text>
                </Card.Content>
              </Card>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Paragraph style={styles.footerText}>
                Candlefish.ai Security Platform v1.0.0
              </Paragraph>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  formCard: {
    marginBottom: 16,
    elevation: 4,
  },
  formContent: {
    paddingVertical: 8,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 4,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 16,
  },
  loginButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  loginButtonContent: {
    height: 48,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 12,
    opacity: 0.7,
  },
  biometricButton: {
    marginBottom: 8,
  },
  biometricButtonContent: {
    height: 48,
  },
  forgotButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  statusCard: {
    marginBottom: 16,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  statusText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.5,
    textAlign: 'center',
  },
});

export default LoginScreen;