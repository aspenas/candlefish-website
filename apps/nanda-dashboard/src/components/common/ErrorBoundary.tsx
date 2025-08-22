import { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Call the optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-slate-800 rounded-lg border border-red-500/30"
        >
          <div className="flex items-center gap-3 mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
            <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
          </div>

          <p className="text-slate-300 text-center mb-6 max-w-md">
            An error occurred in the Living Agent Ecosystem. This might be due to network issues
            or a temporary glitch in the agent simulation.
          </p>

          {this.state.error && (
            <details className="mb-6 w-full max-w-md">
              <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300 mb-2">
                Show error details
              </summary>
              <div className="bg-slate-900 p-3 rounded text-xs font-mono text-red-300 overflow-auto max-h-32">
                <div className="font-semibold mb-1">{this.state.error.name}</div>
                <div className="mb-2">{this.state.error.message}</div>
                {this.state.error.stack && (
                  <div className="text-slate-500 text-xs">
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}...
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>

            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
            >
              Reload Page
            </button>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
