import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const AuthButton: React.FC<AuthButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'large',
  icon,
  iconPosition = 'left',
  style,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const isDisabled = disabled || loading;

  // Get button styles based on variant
  const getButtonStyles = () => {
    const baseStyle = {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
      borderWidth: 0,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: isDisabled
            ? theme.colors.textSecondary + '50'
            : theme.colors.primary,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: isDisabled
            ? theme.colors.surface + '50'
            : theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: 1,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderColor: isDisabled
            ? theme.colors.textSecondary + '50'
            : theme.colors.primary,
          borderWidth: 2,
        };
      default:
        return baseStyle;
    }
  };

  // Get text color based on variant
  const getTextColor = () => {
    if (isDisabled) {
      return theme.colors.textSecondary;
    }

    switch (variant) {
      case 'primary':
        return theme.colors.surface;
      case 'secondary':
        return theme.colors.text;
      case 'outline':
        return theme.colors.primary;
      default:
        return theme.colors.surface;
    }
  };

  // Get size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 16,
          paddingVertical: 8,
          minHeight: 36,
        };
      case 'medium':
        return {
          paddingHorizontal: 20,
          paddingVertical: 12,
          minHeight: 44,
        };
      case 'large':
        return {
          paddingHorizontal: 24,
          paddingVertical: 16,
          minHeight: 52,
        };
      default:
        return {
          paddingHorizontal: 24,
          paddingVertical: 16,
          minHeight: 52,
        };
    }
  };

  const handlePressIn = () => {
    if (!isDisabled) {
      scale.value = withSpring(0.96);
      opacity.value = withTiming(0.8);
    }
  };

  const handlePressOut = () => {
    if (!isDisabled) {
      scale.value = withSpring(1);
      opacity.value = withTiming(1);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const buttonStyles = getButtonStyles();
  const sizeStyles = getSizeStyles();
  const textColor = getTextColor();

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={textColor}
        />
      );
    }

    const iconElement = icon && (
      <Ionicons
        name={icon}
        size={size === 'small' ? 16 : size === 'medium' ? 18 : 20}
        color={textColor}
        style={[
          iconPosition === 'left' ? styles.iconLeft : styles.iconRight,
        ]}
      />
    );

    return (
      <>
        {iconPosition === 'left' && iconElement}
        <Text style={[
          styles.text,
          { color: textColor },
          size === 'small' && styles.smallText,
          size === 'medium' && styles.mediumText,
        ]}>
          {title}
        </Text>
        {iconPosition === 'right' && iconElement}
      </>
    );
  };

  return (
    <AnimatedTouchableOpacity
      style={[
        styles.button,
        buttonStyles,
        sizeStyles,
        animatedStyle,
        style,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={1}
    >
      {renderContent()}
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mediumText: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
