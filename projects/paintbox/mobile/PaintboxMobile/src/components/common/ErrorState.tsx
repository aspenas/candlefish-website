import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ApolloError } from '@apollo/client';

interface ErrorStateProps {
  error: ApolloError | Error | string;
  onRetry?: () => void;
  title?: string;
  showDetails?: boolean;
  fullScreen?: boolean;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  title = 'Something went wrong',
  showDetails = false,
  fullScreen = true,
}) => {
  const getErrorMessage = (): string => {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error instanceof ApolloError) {
      if (error.networkError) {
        return 'Network connection error. Please check your internet connection.';
      }
      if (error.graphQLErrors?.length > 0) {
        return error.graphQLErrors[0].message;
      }
      return error.message;
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  };

  const getErrorDetails = (): string => {
    if (typeof error === 'string') {
      return '';
    }
    
    if (error instanceof ApolloError) {
      const details = [];
      
      if (error.networkError) {
        details.push(`Network: ${error.networkError.message}`);
      }
      
      if (error.graphQLErrors?.length > 0) {
        error.graphQLErrors.forEach((err, index) => {
          details.push(`GraphQL ${index + 1}: ${err.message}`);
        });
      }
      
      return details.join('\n');
    }
    
    if (error instanceof Error && error.stack) {
      return error.stack;
    }
    
    return JSON.stringify(error, null, 2);
  };

  const isNetworkError = error instanceof ApolloError && error.networkError;
  const containerStyle = fullScreen ? styles.fullScreenContainer : styles.inlineContainer;

  return (
    <View style={containerStyle}>
      <View style={styles.content}>
        <Icon 
          name={isNetworkError ? 'cloud-offline' : 'alert-circle'} 
          size={64} 
          color="#EF4444" 
          style={styles.icon}
        />
        
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{getErrorMessage()}</Text>
        
        {showDetails && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Error Details:</Text>
            <Text style={styles.details}>{getErrorDetails()}</Text>
          </View>
        )}
        
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Icon name="refresh" size={20} color="white" style={styles.retryIcon} />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
        
        {isNetworkError && (
          <View style={styles.networkTip}>
            <Icon name="bulb" size={16} color="#F59E0B" style={styles.tipIcon} />
            <Text style={styles.tipText}>
              Offline? Your data is cached and will sync when connected.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  inlineContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  detailsContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    width: '100%',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  details: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  networkTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipIcon: {
    marginRight: 6,
  },
  tipText: {
    fontSize: 14,
    color: '#92400E',
    flex: 1,
  },
});

export default ErrorState;