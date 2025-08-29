// Error Tracking Configuration for Security Dashboard

interface ErrorContext {
  userId?: string;
  sessionId?: string;
  route?: string;
  userAgent?: string;
  timestamp?: string;
  buildVersion?: string;
  environment?: string;
}

interface ErrorBoundaryInfo {
  componentStack?: string;
  errorBoundary?: string;
}

interface CustomError extends Error {
  context?: ErrorContext;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  fingerprint?: string;
}

class ErrorTracker {
  private isEnabled: boolean;
  private endpoint: string;
  private context: ErrorContext;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor() {
    this.isEnabled = import.meta.env.VITE_ENABLE_ERROR_TRACKING === 'true';
    this.endpoint = import.meta.env.VITE_ERROR_ENDPOINT || '/api/v1/errors';
    
    this.context = {
      buildVersion: import.meta.env.VITE_BUILD_VERSION || 'unknown',
      environment: import.meta.env.VITE_ENV || 'development',
      userAgent: navigator.userAgent,
      sessionId: this.generateSessionId(),
    };

    if (this.isEnabled) {
      this.initializeErrorTracking();
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeErrorTracking() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript'
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(new Error(event.reason), {
        message: 'Unhandled Promise Rejection',
        type: 'promise'
      });
    });

    // CSP violation handler
    document.addEventListener('securitypolicyviolation', (event) => {
      this.captureError(new Error('CSP Violation'), {
        message: `CSP Violation: ${event.violatedDirective}`,
        blockedURI: event.blockedURI,
        documentURI: event.documentURI,
        type: 'csp'
      });
    });
  }

  public setContext(newContext: Partial<ErrorContext>) {
    this.context = { ...this.context, ...newContext };
  }

  public setUser(userId: string) {
    this.context.userId = userId;
  }

  public captureError(
    error: Error | CustomError, 
    extra: Record<string, any> = {},
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    if (!this.isEnabled) {
      console.error('Error captured (tracking disabled):', error, extra);
      return;
    }

    const errorData = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      severity,
      timestamp: new Date().toISOString(),
      context: {
        ...this.context,
        route: window.location.pathname,
        timestamp: new Date().toISOString()
      },
      extra,
      fingerprint: this.generateFingerprint(error, extra)
    };

    this.sendError(errorData);
  }

  public captureException(error: Error, context?: Partial<ErrorContext>) {
    if (context) {
      const originalContext = { ...this.context };
      this.setContext(context);
      this.captureError(error, {}, 'high');
      this.context = originalContext;
    } else {
      this.captureError(error, {}, 'high');
    }
  }

  public captureMessage(
    message: string, 
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    extra: Record<string, any> = {}
  ) {
    if (!this.isEnabled) {
      console.log(`Message captured (${level}):`, message, extra);
      return;
    }

    const messageData = {
      message,
      level,
      timestamp: new Date().toISOString(),
      context: {
        ...this.context,
        route: window.location.pathname,
        timestamp: new Date().toISOString()
      },
      extra
    };

    this.sendMessage(messageData);
  }

  // React Error Boundary integration
  public captureErrorBoundary(error: Error, errorInfo: ErrorBoundaryInfo) {
    this.captureError(error, {
      type: 'error-boundary',
      componentStack: errorInfo.componentStack,
      errorBoundary: errorInfo.errorBoundary
    }, 'critical');
  }

  // Performance error tracking
  public capturePerformanceError(metricName: string, value: number, threshold: number) {
    if (value > threshold) {
      this.captureMessage(
        `Performance threshold exceeded: ${metricName}`,
        'warning',
        {
          metricName,
          value,
          threshold,
          type: 'performance'
        }
      );
    }
  }

  // API error tracking
  public captureApiError(
    url: string, 
    status: number, 
    response: any,
    requestData?: any
  ) {
    const severity = this.getApiErrorSeverity(status);
    
    this.captureError(new Error(`API Error: ${status}`), {
      type: 'api',
      url,
      status,
      response: typeof response === 'string' ? response : JSON.stringify(response),
      requestData: requestData ? JSON.stringify(requestData) : undefined
    }, severity);
  }

  private getApiErrorSeverity(status: number): 'low' | 'medium' | 'high' | 'critical' {
    if (status >= 500) return 'critical';
    if (status >= 400) return 'high';
    if (status >= 300) return 'medium';
    return 'low';
  }

  private generateFingerprint(error: Error, extra: Record<string, any>): string {
    const components = [
      error.name,
      error.message?.split('\n')[0], // First line of message
      extra.type || 'unknown',
      this.context.route || 'unknown'
    ];
    
    return btoa(components.join('|')).substring(0, 16);
  }

  private async sendError(errorData: any, retryCount = 0) {
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
        keepalive: true
      });
    } catch (error) {
      if (retryCount < this.maxRetries) {
        setTimeout(() => {
          this.sendError(errorData, retryCount + 1);
        }, this.retryDelay * Math.pow(2, retryCount));
      } else {
        console.error('Failed to send error after retries:', error);
        // Store in localStorage as fallback
        this.storeErrorLocally(errorData);
      }
    }
  }

  private async sendMessage(messageData: any) {
    const messageEndpoint = import.meta.env.VITE_MESSAGE_ENDPOINT || '/api/v1/messages';
    
    try {
      await fetch(messageEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
        keepalive: true
      });
    } catch (error) {
      console.warn('Failed to send message:', error);
    }
  }

  private storeErrorLocally(errorData: any) {
    try {
      const stored = localStorage.getItem('error_tracker_queue') || '[]';
      const queue = JSON.parse(stored);
      queue.push(errorData);
      
      // Keep only last 50 errors
      if (queue.length > 50) {
        queue.splice(0, queue.length - 50);
      }
      
      localStorage.setItem('error_tracker_queue', JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to store error locally:', e);
    }
  }

  // Send any queued errors when connectivity is restored
  public flushQueue() {
    try {
      const stored = localStorage.getItem('error_tracker_queue');
      if (stored) {
        const queue = JSON.parse(stored);
        queue.forEach((errorData: any) => this.sendError(errorData));
        localStorage.removeItem('error_tracker_queue');
      }
    } catch (e) {
      console.error('Failed to flush error queue:', e);
    }
  }

  // Get current context for debugging
  public getContext(): ErrorContext {
    return { ...this.context };
  }

  // Enable/disable tracking
  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}

// Create singleton instance
export const errorTracker = new ErrorTracker();

// React Error Boundary component
export const createErrorBoundary = (fallbackComponent: React.ComponentType<any>) => {
  return class ErrorBoundary extends React.Component<
    React.PropsWithChildren<{}>,
    { hasError: boolean }
  > {
    constructor(props: React.PropsWithChildren<{}>) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      errorTracker.captureErrorBoundary(error, {
        componentStack: errorInfo.componentStack,
        errorBoundary: 'SecurityDashboardErrorBoundary'
      });
    }

    render() {
      if (this.state.hasError) {
        return React.createElement(fallbackComponent);
      }

      return this.props.children;
    }
  };
};

export type { ErrorContext, CustomError };