import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingScreenProps {
  message?: string;
  showLogo?: boolean;
  transparent?: boolean;
}

const { width, height } = Dimensions.get('window');

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  showLogo = true,
  transparent = false,
}) => {
  const { colorScheme } = useSelector((state: RootState) => state.ui);
  const isDarkMode = colorScheme === 'dark';

  // Animation values
  const pulseAnimation = useSharedValue(0);
  const rotateAnimation = useSharedValue(0);

  React.useEffect(() => {
    pulseAnimation.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      true
    );

    rotateAnimation.value = withRepeat(
      withTiming(360, { duration: 2000 }),
      -1,
      false
    );
  }, []);

  // Animated styles
  const pulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnimation.value, [0, 1], [1, 1.1]);
    const opacity = interpolate(pulseAnimation.value, [0, 1], [0.8, 1]);

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const rotateStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateAnimation.value}deg` }],
    };
  });

  const colors = {
    background: transparent
      ? 'transparent'
      : isDarkMode ? '#000000' : '#FFFFFF',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    secondaryText: isDarkMode ? '#8E8E93' : '#8E8E93',
    accent: '#007AFF',
    gradientStart: isDarkMode ? '#007AFF' : '#007AFF',
    gradientEnd: isDarkMode ? '#5AC8FA' : '#5AC8FA',
  };

  if (transparent) {
    return (
      <View style={[styles.transparentContainer]}>
        <View style={[styles.loadingCard, { backgroundColor: colors.background }]}>
          <Animated.View style={[styles.logoContainer, pulseStyle]}>
            <Animated.View style={[rotateStyle]}>
              <ActivityIndicator size="large" color={colors.accent} />
            </Animated.View>
          </Animated.View>

          <Text style={[styles.message, { color: colors.text }]}>
            {message}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[colors.gradientStart + '10', colors.background]}
      style={styles.container}
    >
      <View style={styles.content}>
        {showLogo && (
          <Animated.View style={[styles.logoContainer, pulseStyle]}>
            {/* Logo placeholder - replace with actual logo */}
            <View style={[styles.logo, { backgroundColor: colors.accent }]}>
              <Text style={[styles.logoText, { color: '#FFFFFF' }]}>C</Text>
            </View>
          </Animated.View>
        )}

        <Animated.View style={[styles.spinnerContainer, rotateStyle]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </Animated.View>

        <Text style={[styles.message, { color: colors.text }]}>
          {message}
        </Text>

        <View style={styles.dotsContainer}>
          <Dot delay={0} color={colors.accent} />
          <Dot delay={200} color={colors.accent} />
          <Dot delay={400} color={colors.accent} />
        </View>
      </View>
    </LinearGradient>
  );
};

// Animated dot component
interface DotProps {
  delay: number;
  color: string;
}

const Dot: React.FC<DotProps> = ({ delay, color }) => {
  const animation = useSharedValue(0);

  React.useEffect(() => {
    animation.value = withRepeat(
      withTiming(1, { duration: 600 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animation.value,
      [0, 1],
      [0.8, 1.2]
    );

    const opacity = interpolate(
      animation.value,
      [0, 1],
      [0.5, 1]
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transparentContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  loadingCard: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
    width: width * 0.8,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  spinnerContainer: {
    marginVertical: 20,
  },
  message: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});
