import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Paragraph,
  Surface,
  useTheme,
  IconButton,
  HelperText,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/hooks/useAuth';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { spacing, typography } from '@/constants/theme';

const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const { login, authenticateWithBiometric, biometricSupported, biometricEnrolled, loading } = useAuth();
  const { triggerHaptic } = useHapticFeedback();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    // Try biometric authentication if available
    if (biometricSupported && biometricEnrolled) {
      tryBiometricAuth();
    }
  }, [biometricSupported, biometricEnrolled]);

  const tryBiometricAuth = async () => {
    try {
      const success = await authenticateWithBiometric();
      if (success) {
        triggerHaptic('success');
      }
    } catch (error) {
      console.warn('Biometric authentication failed:', error);
    }
  };

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      triggerHaptic('error');
      return;
    }

    triggerHaptic('light');
    
    try {
      const result = await login({ email, password });
      if (result.success) {
        triggerHaptic('success');
      } else {
        triggerHaptic('error');
      }
    } catch (error) {
      triggerHaptic('error');
    }
  };

  const handleBiometricLogin = async () => {
    triggerHaptic('light');
    await tryBiometricAuth();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryContainer]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Title style={[styles.title, { color: theme.colors.onPrimary }]}>
                Welcome Back
              </Title>
              <Paragraph style={[styles.subtitle, { color: theme.colors.onPrimary }]}>
                Sign in to access your prompt engineering workspace
              </Paragraph>
            </View>

            <Surface style={[styles.loginCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.formContainer}>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={!!errors.email}
                  style={styles.input}
                  left={<TextInput.Icon icon="email-outline" />}
                />
                <HelperText type="error" visible={!!errors.email}>
                  {errors.email}
                </HelperText>

                <TextInput
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  error={!!errors.password}
                  style={styles.input}
                  left={<TextInput.Icon icon="lock-outline" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
                <HelperText type="error" visible={!!errors.password}>
                  {errors.password}
                </HelperText>

                <Button
                  mode="contained"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={loading}
                  style={styles.loginButton}
                  contentStyle={styles.buttonContent}
                >
                  Sign In
                </Button>

                {biometricSupported && biometricEnrolled && (
                  <>
                    <View style={styles.divider}>
                      <Paragraph style={[styles.dividerText, { color: theme.colors.onSurfaceVariant }]}>
                        or
                      </Paragraph>
                    </View>

                    <Button
                      mode="outlined"
                      onPress={handleBiometricLogin}
                      disabled={loading}
                      style={styles.biometricButton}
                      contentStyle={styles.buttonContent}
                      icon={Platform.OS === 'ios' ? 'face-recognition' : 'fingerprint'}
                    >
                      {Platform.OS === 'ios' ? 'Use Face ID' : 'Use Fingerprint'}
                    </Button>
                  </>
                )}
              </View>
            </Surface>

            <View style={styles.footer}>
              <Paragraph style={[styles.footerText, { color: theme.colors.onPrimary }]}>
                Candlefish AI • Prompt Engineering Platform
              </Paragraph>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.headlineLarge,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLarge,
    textAlign: 'center',
    opacity: 0.9,
  },
  loginCard: {
    borderRadius: 24,
    elevation: 8,
    marginBottom: spacing.xl,
  },
  formContainer: {
    padding: spacing.xl,
  },
  input: {
    marginBottom: spacing.xs,
    backgroundColor: 'transparent',
  },
  loginButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  divider: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerText: {
    ...typography.bodySmall,
    opacity: 0.6,
  },
  biometricButton: {
    marginBottom: spacing.md,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    ...typography.bodySmall,
    opacity: 0.7,
    textAlign: 'center',
  },
});

export default LoginScreen;