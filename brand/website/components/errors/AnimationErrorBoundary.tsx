'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AnimationErrorBoundaryProps } from '../../types/animation'

interface AnimationErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

export class AnimationErrorBoundary extends Component<
  AnimationErrorBoundaryProps,
  AnimationErrorBoundaryState
> {
  private maxRetries = 3
  private retryTimeouts: NodeJS.Timeout[] = []

  constructor(props: AnimationErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<AnimationErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AnimationErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Report error to parent
    this.props.onError?.(error, errorInfo)

    // Auto-retry for certain types of errors
    if (this.shouldAutoRetry(error)) {
      this.scheduleRetry()
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
  }

  private shouldAutoRetry(error: Error): boolean {
    const retryableErrors = [
      'Canvas context lost',
      'WebGL context lost',
      'Failed to initialize',
      'Animation frame error'
    ]
    
    return retryableErrors.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase())
    ) && this.state.retryCount < this.maxRetries
  }

  private scheduleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) return

    const delay = Math.pow(2, this.state.retryCount) * 1000 // Exponential backoff
    
    const timeout = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    }, delay)

    this.retryTimeouts.push(timeout)
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1
    })
  }

  private handleReport = () => {
    const { error, errorInfo } = this.state
    
    // Here you could send error to logging service
    const errorReport = {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    console.log('Error report:', errorReport)
    
    // Copy to clipboard for easy reporting
    navigator.clipboard?.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Error report copied to clipboard')
      })
      .catch(() => {
        console.log('Could not copy to clipboard')
      })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error fallback UI
      return (
        <div className="candlefish-error-boundary">
          <div
            className="w-full h-64 bg-[#3A3A60] flex flex-col items-center justify-center relative overflow-hidden"
            role="alert"
            aria-live="polite"
          >
            {/* Background pattern */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M30 10 L50 50 L10 50 Z' fill='none' stroke='%23FFB347' stroke-width='1' opacity='0.3'/%3E%3C/svg%3E")`,
                backgroundSize: '60px 60px'
              }}
            />
            
            {/* Error content */}
            <div className="relative z-10 text-center p-6 max-w-md">
              <div className="mb-4">
                <svg 
                  className="mx-auto h-12 w-12 text-[#FFB347]" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
              
              <h3 className="text-lg font-light text-[#F8F8F2] mb-2">
                Animation Temporarily Unavailable
              </h3>
              
              <p className="text-sm text-[#E0E1DD] mb-6 leading-relaxed">
                {this.state.retryCount > 0 
                  ? `Attempted ${this.state.retryCount} time${this.state.retryCount !== 1 ? 's' : ''}. `
                  : ''
                }
                The bioluminescent animation encountered an error and cannot be displayed.
              </p>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {this.state.retryCount < this.maxRetries && (
                  <button
                    onClick={this.handleRetry}
                    className="px-4 py-2 bg-[#3FD3C6] text-[#0D1B2A] rounded hover:bg-[#3FD3C6]/90 transition-colors text-sm font-medium"
                  >
                    Try Again
                  </button>
                )}
                
                <button
                  onClick={this.handleReport}
                  className="px-4 py-2 border border-[#415A77] text-[#415A77] rounded hover:text-[#F8F8F2] hover:border-[#F8F8F2] transition-colors text-sm"
                >
                  Report Issue
                </button>
              </div>

              {/* Technical details (collapsed by default) */}
              <details className="mt-6 text-left">
                <summary className="text-xs text-[#415A77] cursor-pointer hover:text-[#E0E1DD]">
                  Technical Details
                </summary>
                <div className="mt-2 p-3 bg-black/20 rounded text-xs text-[#E0E1DD] font-mono">
                  <div className="mb-2">
                    <strong>Error:</strong> {this.state.error?.message}
                  </div>
                  {this.state.error?.stack && (
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                        {this.state.error.stack.slice(0, 200)}
                        {this.state.error.stack.length > 200 ? '...' : ''}
                      </pre>
                    </div>
                  )}
                  <div className="text-[#415A77] text-xs">
                    Retry count: {this.state.retryCount}/{this.maxRetries}
                  </div>
                </div>
              </details>
            </div>

            {/* Subtle animation for visual interest */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-[#FFB347] rounded-full opacity-20"
                  style={{
                    left: `${20 + i * 15}%`,
                    top: `${30 + (i % 2) * 40}%`,
                    animation: `float 3s ease-in-out infinite ${i * 0.5}s`
                  }}
                />
              ))}
            </div>
          </div>

          <style jsx>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px) opacity(0.2); }
              50% { transform: translateY(-10px) opacity(0.4); }
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for functional components to access error boundary context
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const handleError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  // Throw error to be caught by error boundary
  if (error) {
    throw error
  }

  return { handleError, resetError }
}

// Higher-order component for easier usage
export const withErrorBoundary = (
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) => {
  return function ErrorBoundaryHOC<P extends object>(
    Component: React.ComponentType<P>
  ): React.FC<P> {
    return function WrappedComponent(props: P) {
      return (
        <AnimationErrorBoundary fallback={fallback} onError={onError}>
          <Component {...props} />
        </AnimationErrorBoundary>
      )
    }
  }
}