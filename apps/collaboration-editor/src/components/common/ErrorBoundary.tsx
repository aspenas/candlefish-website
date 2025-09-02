'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon, BugIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'react-hot-toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  isDetailsOpen: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      isDetailsOpen: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      errorInfo,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Report error to monitoring service
    this.reportError(error, errorInfo);

    // Show toast notification
    toast.error('Something went wrong. Please try refreshing the page.');
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In a real app, send to error tracking service like Sentry
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: localStorage.getItem('userId') || 'anonymous',
      };

      console.error('Error Report:', errorReport);
      
      // Mock API call to error reporting service
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport),
      // });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
        isDetailsOpen: false,
      });
      toast.success(`Retrying... (${this.retryCount}/${this.maxRetries})`);
    } else {
      toast.error('Maximum retry attempts reached. Please refresh the page.');
    }
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private toggleDetails = () => {
    this.setState(prev => ({
      isDetailsOpen: !prev.isDetailsOpen,
    }));
  };

  private getErrorSeverity = (error: Error): 'low' | 'medium' | 'high' | 'critical' => {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection')
    ) {
      return 'medium';
    }

    if (
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 'high';
    }

    if (
      message.includes('memory') ||
      message.includes('recursion') ||
      stack.includes('maximum call stack')
    ) {
      return 'critical';
    }

    return 'medium';
  };

  private getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  private getErrorSuggestions = (error: Error): string[] => {
    const message = error.message.toLowerCase();
    const suggestions: string[] = [];

    if (message.includes('network') || message.includes('fetch')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Try refreshing the page');
      suggestions.push('Contact support if the problem persists');
    } else if (message.includes('permission') || message.includes('unauthorized')) {
      suggestions.push('You may need to log in again');
      suggestions.push('Check if you have the necessary permissions');
      suggestions.push('Contact your administrator');
    } else if (message.includes('not found') || message.includes('404')) {
      suggestions.push('The requested resource may have been moved or deleted');
      suggestions.push('Check the URL and try again');
      suggestions.push('Go back to the home page');
    } else {
      suggestions.push('Try refreshing the page');
      suggestions.push('Clear your browser cache and cookies');
      suggestions.push('Try using a different browser');
      suggestions.push('Contact support with the error ID if the problem persists');
    }

    return suggestions;
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId, isDetailsOpen } = this.state;
      const { fallback, showErrorDetails = true } = this.props;

      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const severity = error ? this.getErrorSeverity(error) : 'medium';
      const suggestions = error ? this.getErrorSuggestions(error) : [];

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto mb-4 p-3 bg-red-50 rounded-full w-fit">
                <AlertTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Oops! Something went wrong
              </CardTitle>
              <CardDescription className="text-gray-600">
                We're sorry, but an unexpected error has occurred. Don't worry, we've been notified and are working on a fix.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Error Details</h3>
                  <Badge className={this.getSeverityColor(severity)}>
                    {severity.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Error ID:</span>{' '}
                    <code className="bg-white px-2 py-1 rounded border font-mono text-xs">
                      {errorId}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium">Time:</span>{' '}
                    {new Date().toLocaleString()}
                  </div>
                  {error?.message && (
                    <div>
                      <span className="font-medium">Message:</span>{' '}
                      <code className="bg-white px-2 py-1 rounded border text-xs">
                        {error.message}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">What you can try:</h3>
                <ul className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1"
                  disabled={this.retryCount >= this.maxRetries}
                >
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  {this.retryCount >= this.maxRetries 
                    ? 'Max Retries Reached' 
                    : `Retry (${this.retryCount}/${this.maxRetries})`
                  }
                </Button>
                
                <Button
                  variant="outline"
                  onClick={this.handleRefresh}
                  className="flex-1"
                >
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  <HomeIcon className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {/* Technical Details (Collapsible) */}
              {showErrorDetails && (error || errorInfo) && (
                <Collapsible open={isDetailsOpen} onOpenChange={this.toggleDetails}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full">
                      <BugIcon className="h-4 w-4 mr-2" />
                      {isDetailsOpen ? 'Hide' : 'Show'} Technical Details
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                      {error?.stack && (
                        <div className="mb-4">
                          <div className="text-yellow-400 font-bold mb-2">Stack Trace:</div>
                          <pre className="whitespace-pre-wrap">{error.stack}</pre>
                        </div>
                      )}
                      
                      {errorInfo?.componentStack && (
                        <div>
                          <div className="text-yellow-400 font-bold mb-2">Component Stack:</div>
                          <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Support Contact */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Need Help?</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      If this error persists, please contact our support team with the error ID: {errorId}
                    </p>
                    <div className="mt-2">
                      <Button variant="link" size="sm" className="p-0 h-auto text-blue-600">
                        Contact Support
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different components

export class NetworkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      isDetailsOpen: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Only catch network-related errors
    if (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('connection')
    ) {
      return {
        hasError: true,
        error,
        errorId: `network_error_${Date.now()}`,
      };
    }
    
    // Let other errors bubble up
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Network error caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangleIcon className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="font-medium text-yellow-900">Connection Error</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Unable to connect to the server. Please check your internet connection and try again.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Partial<Props>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default ErrorBoundary;