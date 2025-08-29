import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, typography } from '@/constants/theme';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...' 
}) => {
  const theme = useTheme();

  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.primaryContainer]}
      style={styles.container}
    >
      <View style={styles.content}>
        <ActivityIndicator 
          size="large" 
          color={theme.colors.onPrimary}
          style={styles.spinner}
        />
        <Text 
          style={[
            styles.message, 
            { color: theme.colors.onPrimary }
          ]}
        >
          {message}
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  spinner: {
    marginBottom: spacing.lg,
  },
  message: {
    ...typography.bodyLarge,
    textAlign: 'center',
    opacity: 0.9,
  },
});

export default LoadingScreen;