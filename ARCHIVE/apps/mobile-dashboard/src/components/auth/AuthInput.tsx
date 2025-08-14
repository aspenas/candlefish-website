import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

interface AuthInputProps extends TextInputProps {
  label: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: any;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  secureTextEntry,
  ...textInputProps
}) => {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);

  const focusAnimation = useSharedValue(0);
  const errorAnimation = useSharedValue(0);

  React.useEffect(() => {
    focusAnimation.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused]);

  React.useEffect(() => {
    errorAnimation.value = withTiming(error ? 1 : 0, { duration: 200 });
  }, [error]);

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      focusAnimation.value,
      [0, 1],
      [theme.colors.border, theme.colors.primary]
    );

    const errorBorderColor = interpolateColor(
      errorAnimation.value,
      [0, 1],
      [borderColor, theme.colors.error]
    );

    return {
      borderColor: errorBorderColor,
      borderWidth: focusAnimation.value === 1 ? 2 : 1,
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    const labelColor = interpolateColor(
      focusAnimation.value,
      [0, 1],
      [theme.colors.textSecondary, theme.colors.primary]
    );

    const errorLabelColor = interpolateColor(
      errorAnimation.value,
      [0, 1],
      [labelColor, theme.colors.error]
    );

    return {
      color: errorLabelColor,
    };
  });

  const handleFocus = () => {
    setIsFocused(true);
    textInputProps.onFocus?.({} as any);
  };

  const handleBlur = () => {
    setIsFocused(false);
    textInputProps.onBlur?.({} as any);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Animated.Text style={[styles.label, animatedLabelStyle]}>
        {label}
      </Animated.Text>

      <Animated.View style={[
        styles.inputContainer,
        { backgroundColor: theme.colors.surface },
        animatedBorderStyle,
      ]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={isFocused ? theme.colors.primary : theme.colors.textSecondary}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          {...textInputProps}
          style={[
            styles.input,
            { color: theme.colors.text },
            leftIcon && styles.inputWithLeftIcon,
            (rightIcon || secureTextEntry) && styles.inputWithRightIcon,
          ]}
          placeholderTextColor={theme.colors.textSecondary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry && !showPassword}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.rightIconButton}
          >
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIconButton}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {error && (
        <Animated.View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle"
            size={16}
            color={theme.colors.error}
            style={styles.errorIcon}
          />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error}
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  inputWithLeftIcon: {
    marginLeft: 12,
  },
  inputWithRightIcon: {
    marginRight: 12,
  },
  leftIcon: {
    marginRight: 0,
  },
  rightIconButton: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  errorIcon: {
    marginRight: 6,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
});
