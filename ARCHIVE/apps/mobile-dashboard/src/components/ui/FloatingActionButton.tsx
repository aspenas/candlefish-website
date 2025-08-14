import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: number;
  backgroundColor?: string;
  iconColor?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onPress,
  icon = 'add',
  size = 56,
  backgroundColor,
  iconColor,
  style,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const elevation = useSharedValue(4);

  const defaultBackgroundColor = backgroundColor || theme.colors.primary;
  const defaultIconColor = iconColor || theme.colors.surface;

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
    elevation.value = withTiming(8);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    elevation.value = withTiming(4);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    elevation: elevation.value,
  }));

  return (
    <AnimatedTouchableOpacity
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: disabled
            ? theme.colors.textSecondary + '50'
            : defaultBackgroundColor,
          shadowColor: theme.dark ? '#000000' : '#000000',
        },
        animatedStyle,
        style,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon}
        size={size * 0.4}
        color={disabled ? theme.colors.textSecondary : defaultIconColor}
      />
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
