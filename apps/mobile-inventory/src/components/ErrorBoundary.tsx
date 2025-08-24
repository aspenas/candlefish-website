import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: string, retry: () => void) => ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo: errorInfo.componentStack,
    });

    // Log to crash reporting service in production
    if (!__DEV__) {
      // TODO: Report to crash analytics service like Crashlytics
      console.log('Production error logged:', { error, errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleCopyError = async () => {
    const errorDetails = `
Error: ${this.state.error?.message || 'Unknown error'}
Stack: ${this.state.error?.stack || 'No stack trace'}
Component Stack: ${this.state.errorInfo || 'No component stack'}
Timestamp: ${new Date().toISOString()}
    `.trim();

    await Clipboard.setStringAsync(errorDetails);
    Toast.show({
      type: 'success',
      text1: 'Error details copied to clipboard',
      text2: 'You can now paste this information when reporting the issue',
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback && this.state.error) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo || '',
          this.handleRetry
        );
      }

      // Default error UI
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning" size={64} color="#FF6B6B" />
            </View>

            <Text style={styles.title}>Oops! Something went wrong</Text>

            <Text style={styles.subtitle}>
              The app encountered an unexpected error. This has been logged and we'll look into it.
            </Text>

            <View style={styles.errorContainer}>
              <ScrollView style={styles.errorScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.errorTitle}>Error Details:</Text>
                <Text style={styles.errorText}>
                  {this.state.error?.message || 'Unknown error occurred'}
                </Text>

                {__DEV__ && (
                  <>
                    <Text style={styles.errorTitle}>Stack Trace:</Text>
                    <Text style={styles.errorText}>
                      {this.state.error?.stack || 'No stack trace available'}
                    </Text>

                    {this.state.errorInfo && (
                      <>
                        <Text style={styles.errorTitle}>Component Stack:</Text>
                        <Text style={styles.errorText}>
                          {this.state.errorInfo}
                        </Text>
                      </>
                    )}
                  </>
                )}
              </ScrollView>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.copyButton} onPress={this.handleCopyError}>
                <Ionicons name="copy" size={20} color="#007AFF" />
                <Text style={styles.copyButtonText}>Copy Error Details</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.helpText}>
              If this problem persists, please contact support with the error details above.
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 30,
    width: '100%',
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  errorScroll: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
    marginBottom: 10,
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  copyButton: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    gap: 8,
  },
  copyButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
});

export default ErrorBoundary;
