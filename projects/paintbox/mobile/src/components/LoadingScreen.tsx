/**
 * Loading Screen Component
 * Displayed during app initialization
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading System Analyzer...' }: LoadingScreenProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      
      {/* App Icon or Animation */}
      <View style={styles.iconContainer}>
        <ActivityIndicator 
          size="large" 
          color={theme.colors.primary} 
          style={styles.spinner}
        />
      </View>

      {/* App Title */}
      <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
        System Analyzer
      </Text>

      {/* Loading Message */}
      <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
        {message}
      </Text>

      {/* Loading Dots Animation */}
      <View style={styles.dotsContainer}>
        <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
        <View style={[styles.dot, { backgroundColor: theme.colors.primary, opacity: 0.7 }]} />
        <View style={[styles.dot, { backgroundColor: theme.colors.primary, opacity: 0.4 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 32,
  },
  spinner: {
    transform: [{ scale: 1.5 }],
  },
  title: {
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});