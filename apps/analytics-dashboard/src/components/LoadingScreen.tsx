import React from 'react'

interface LoadingScreenProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  fullScreen?: boolean
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  size = 'md',
  fullScreen = true,
}) => {
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-background'
    : 'flex items-center justify-center p-8'

  const spinnerSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  return (
    <div className={containerClasses} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative">
          <div
            className={`${spinnerSizes[size]} border-4 border-muted border-t-primary rounded-full animate-spin`}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
          </div>
        </div>

        {/* Message */}
        <div className={`${textSizes[size]} text-muted-foreground font-medium`}>
          {message}
        </div>
      </div>

      {/* Screen reader only text */}
      <span className="sr-only">Loading content, please wait.</span>
    </div>
  )
}

// Simple spinner component for inline use
export const Spinner: React.FC<{
  size?: 'sm' | 'md' | 'lg'
  className?: string
}> = ({ size = 'md', className = '' }) => {
  const spinnerSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <div
      className={`${spinnerSizes[size]} border-2 border-muted border-t-primary rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}
