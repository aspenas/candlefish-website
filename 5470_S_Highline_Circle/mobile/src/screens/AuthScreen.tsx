import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';

const AuthScreen: React.FC = () => {
  const { theme } = useTheme();
  const { login, authenticateWithBiometric, checkBiometricAvailability } = useAuth();
  const styles = createStyles(theme);
  
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('demo123');
  const [isLoading, setIsLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showBiometric, setShowBiometric] = useState(true);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const available = await checkBiometricAvailability();
    setBiometricAvailable(available);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password.trim());
    } catch (error) {
      Alert.alert(
        'Login Failed',
        error instanceof Error ? error.message : 'An error occurred during login'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const success = await authenticateWithBiometric();
      if (success) {
        // Biometric auth succeeded, but we still need credentials for first login
        // In a real app, you might have stored credentials securely
        await handleLogin();
      }
    } catch (error) {
      Alert.alert(
        'Biometric Authentication Failed',
        'Please use your email and password to log in.'
      );
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Icon name="inventory" size={64} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Item Valuation</Text>
          <Text style={styles.subtitle}>Secure access to your valuations</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Icon name="email" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={theme.colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={theme.colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Icon name="login" size={20} color="white" style={styles.buttonIcon} />
                <Text style={styles.loginButtonText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Biometric Authentication */}
          {biometricAvailable && showBiometric && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricAuth}
                disabled={isLoading}
              >
                <Icon name="fingerprint" size={24} color={theme.colors.primary} />
                <Text style={styles.biometricText}>Use Biometric Authentication</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Demo Info */}
          <View style={styles.demoInfo}>
            <Icon name="info" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.demoText}>
              Demo credentials are pre-filled. Tap "Sign In" to continue.
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Features</Text>
          
          <View style={styles.feature}>
            <Icon name="camera-alt" size={20} color={theme.colors.accent} />
            <Text style={styles.featureText}>AI-powered photo valuations</Text>
          </View>
          
          <View style={styles.feature}>
            <Icon name="qr-code-scanner" size={20} color={theme.colors.accent} />
            <Text style={styles.featureText}>Barcode & QR scanning</Text>
          </View>
          
          <View style={styles.feature}>
            <Icon name="cloud-off" size={20} color={theme.colors.accent} />
            <Text style={styles.featureText}>Offline-first functionality</Text>
          </View>
          
          <View style={styles.feature}>
            <Icon name="security" size={20} color={theme.colors.accent} />
            <Text style={styles.featureText}>Secure biometric authentication</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: theme.fontSize.xl * 1.5,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: theme.spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    paddingVertical: theme.spacing.md,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: theme.colors.textSecondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonIcon: {
    marginRight: theme.spacing.xs,
  },
  loginButtonText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  biometricButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  biometricText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    marginLeft: theme.spacing.sm,
  },
  demoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.info + '20',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.md,
  },
  demoText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  featuresContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  featuresTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  featureText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
});

export default AuthScreen;