/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the component tree and displays a fallback UI
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-paintbox-background flex items-center justify-center p-4 safe-area-inset">
          <div className="max-w-md w-full paintbox-card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="text-2xl font-bold text-paintbox-text mb-3">
              Oops! Something went wrong
            </h2>

            <p className="text-paintbox-text-muted mb-8 leading-relaxed">
              Don't worry - this happens sometimes. The error has been logged and our team will look into it.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-6">
                <summary className="cursor-pointer text-sm font-medium text-paintbox-text mb-3 hover:text-paintbox-brand transition-colors">
                  🔧 Developer Details
                </summary>
                <div className="bg-paintbox-background rounded-lg p-4 border border-paintbox-border text-xs">
                  <pre className="whitespace-pre-wrap text-red-600 font-mono">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="whitespace-pre-wrap text-paintbox-text-muted mt-3 font-mono">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="space-y-3">
              <button
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-paintbox-brand to-paintbox-accent text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-paintbox-text border border-paintbox-border rounded-lg hover:bg-paintbox-background transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full text-sm text-paintbox-text-muted hover:text-paintbox-brand transition-colors"
              >
                Refresh the page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary;
