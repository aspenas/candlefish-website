import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApolloError } from '@apollo/client';

// Hooks
import { useTheme } from '@/hooks/useTheme';

interface ErrorViewProps {
  error: ApolloError | Error;
  onRetry?: () => void;
  showRetry?: boolean;
  title?: string;
  message?: string;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  error,
  onRetry,
  showRetry = true,
  title,
  message,
}) => {
  const { theme } = useTheme();

  const getErrorDetails = () => {
    if (title && message) {
      return { title, message };
    }

    // Handle Apollo errors
    if ('networkError' in error && error.networkError) {
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
      };
    }

    if ('graphQLErrors' in error && error.graphQLErrors?.length > 0) {
      const graphQLError = error.graphQLErrors[0];
      return {
        title: 'Server Error',
        message: graphQLError.message || 'An error occurred while processing your request.',
      };
    }

    // Handle general errors
    if (error.message.includes('Network request failed')) {
      return {
        title: 'Network Error',
        message: 'Unable to reach the server. Please check your internet connection.',
      };
    }

    if (error.message.includes('timeout')) {
      return {
        title: 'Request Timeout',
        message: 'The request took too long to complete. Please try again.',
      };
    }

    return {
      title: 'Something went wrong',
      message: error.message || 'An unexpected error occurred.',
    };
  };

  const { title: errorTitle, message: errorMessage } = getErrorDetails();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.error + '20' }]}>
          <Ionicons
            name="alert-circle"
            size={48}
            color={theme.colors.error}
          />
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]}>
          {errorTitle}
        </Text>

        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          {errorMessage}
        </Text>

        {showRetry && onRetry && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleRetry}
          >
            <Ionicons
              name="refresh"
              size={20}
              color={theme.colors.surface}
              style={styles.retryIcon}
            />
            <Text style={[styles.retryText, { color: theme.colors.surface }]}>
              Try Again
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
