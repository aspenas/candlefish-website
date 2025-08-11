import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/hooks/useTheme';
import { BiometricService } from '@/services/biometric';

interface BiometricPromptProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  title: string;
  subtitle: string;
}

export const BiometricPrompt: React.FC<BiometricPromptProps> = ({
  visible,
  onSuccess,
  onCancel,
  title,
  subtitle,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Animate in
      scale.value = withSpring(1);
      opacity.value = withTiming(1);

      // Automatically trigger biometric authentication
      setTimeout(() => {
        authenticateWithBiometric();
      }, 300);
    } else {
      // Animate out
      scale.value = withSpring(0);
      opacity.value = withTiming(0);
    }
  }, [visible]);

  const authenticateWithBiometric = async () => {
    try {
      const result = await BiometricService.authenticateForLogin();

      if (result.success) {
        runOnJS(onSuccess)();
      } else {
        runOnJS(onCancel)();
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      runOnJS(onCancel)();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getBiometricIcon = () => {
    if (Platform.OS === 'ios') {
      return 'finger-print';
    }
    return 'fingerprint';
  };

  const getBiometricTitle = () => {
    return BiometricService.getBiometricTypeDisplayName();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <BlurView intensity={20} style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onCancel}
          activeOpacity={1}
        >
          <Animated.View
            style={[
              styles.promptContainer,
              { backgroundColor: theme.colors.surface },
              animatedStyle,
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                {title}
              </Text>
              <TouchableOpacity
                onPress={onCancel}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <View style={[
                styles.biometricIconContainer,
                { backgroundColor: theme.colors.primary + '20' }
              ]}>
                <Ionicons
                  name={getBiometricIcon()}
                  size={64}
                  color={theme.colors.primary}
                />
              </View>

              <Text style={[styles.biometricTitle, { color: theme.colors.text }]}>
                {getBiometricTitle()}
              </Text>

              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {subtitle}
              </Text>

              <View style={styles.instructions}>
                <Text style={[styles.instructionText, { color: theme.colors.textSecondary }]}>
                  {Platform.OS === 'ios'
                    ? 'Touch the sensor or look at your device'
                    : 'Place your finger on the sensor'
                  }
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { backgroundColor: theme.colors.background }
                ]}
                onPress={onCancel}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.fallbackButton,
                  { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => {
                  onCancel(); // Close modal and fallback to password
                }}
              >
                <Text style={[styles.fallbackButtonText, { color: theme.colors.surface }]}>
                  Use Password
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  promptContainer: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
  },
  biometricIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  biometricTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  instructions: {
    paddingHorizontal: 16,
  },
  instructionText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  fallbackButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  fallbackButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
