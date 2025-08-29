import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence 
} from 'react-native-reanimated';

import { SecurityTheme } from '../../theme/SecurityTheme';

interface LoadingScreenProps {
  message?: string;
  subtitle?: string;
  showIcon?: boolean;
  iconName?: string;
  color?: string;
}

export default function LoadingScreen({
  message = 'Loading...',
  subtitle,
  showIcon = true,
  iconName = 'shield-check',
  color = SecurityTheme.colors.primary[500],
}: LoadingScreenProps) {
  
  // Animation values
  const iconScale = useSharedValue(1);
  const iconOpacity = useSharedValue(1);
  
  React.useEffect(() => {
    // Pulse animation for the icon
    iconScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
    
    iconOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: iconOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {showIcon && (
          <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
            <MaterialCommunityIcons 
              name={iconName as any} 
              size={80} 
              color={color} 
            />
          </Animated.View>
        )}
        
        <Text style={styles.message}>{message}</Text>
        
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
        
        <View style={styles.spinnerContainer}>
          <ActivityIndicator 
            size="large" 
            color={color}
            animating={true}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SecurityTheme.colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SecurityTheme.spacing.lg,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    marginBottom: SecurityTheme.spacing.xl,
    padding: SecurityTheme.spacing.lg,
    borderRadius: SecurityTheme.borderRadius.full,
    backgroundColor: SecurityTheme.colors.background.secondary,
    ...SecurityTheme.shadows.lg,
  },
  message: {
    fontSize: SecurityTheme.typography.sizes['2xl'],
    fontWeight: SecurityTheme.typography.weights.semibold,
    color: SecurityTheme.colors.text.primary,
    textAlign: 'center',
    marginBottom: SecurityTheme.spacing.sm,
  },
  subtitle: {
    fontSize: SecurityTheme.typography.sizes.base,
    color: SecurityTheme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: SecurityTheme.typography.lineHeights.normal * SecurityTheme.typography.sizes.base,
    marginBottom: SecurityTheme.spacing.xl,
  },
  spinnerContainer: {
    marginTop: SecurityTheme.spacing.lg,
  },
});