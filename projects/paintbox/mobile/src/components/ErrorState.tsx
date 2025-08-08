/**
 * Error State Component
 * Displays error messages with retry options
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  showRetry?: boolean;
  icon?: string;
}

export default function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again later',
  onRetry,
  showRetry = false,
  icon = 'alert-circle'
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Error Icon */}
        <MaterialCommunityIcons
          name={icon}
          size={64}
          color={theme.colors.error}
          style={styles.icon}
        />

        {/* Error Title */}
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          {title}
        </Text>

        {/* Error Description */}
        <Text
          variant="bodyMedium"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          {description}
        </Text>

        {/* Retry Button */}
        {showRetry && onRetry && (
          <Button
            mode="contained"
            onPress={onRetry}
            style={styles.retryButton}
            contentStyle={styles.retryButtonContent}
            icon="refresh"
          >
            Try Again
          </Button>
        )}
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
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  retryButton: {
    minWidth: 120,
  },
  retryButtonContent: {
    paddingVertical: 4,
  },
});
