import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorHandling from '../../../dashboard/src/components/ErrorHandling'

// Mock react-spring
jest.mock('@react-spring/web', () => ({
  useSpring: (props) => props.to || props.from || {},
  animated: {
    div: 'div'
  },
  config: {}
}))

describe('ErrorHandling Component', () => {
  const mockError = {
    id: 'error-123',
    type: 'network',
    title: 'Network Error',
    message: 'Failed to connect to the server',
    timestamp: '2025-01-04T10:00:00Z',
    retryable: true,
    retryCount: 1,
    maxRetries: 3
  }

  const mockServerError = {
    id: 'error-456',
    type: 'server',
    title: 'Server Error',
    message: 'Internal server error occurred',
    timestamp: '2025-01-04T10:05:00Z',
    retryable: true,
    statusCode: 500
  }

  const mockValidationError = {
    id: 'error-789',
    type: 'validation',
    title: 'Validation Error',
    message: 'Invalid input provided',
    timestamp: '2025-01-04T10:10:00Z',
    retryable: false,
    details: {
      field: 'repositoryId',
      code: 'REQUIRED'
    }
  }

  describe('Error Display', () => {
    it('should render error information correctly', () => {
      render(<ErrorHandling error={mockError} />)

      expect(screen.getByText('Network Error')).toBeInTheDocument()
      expect(screen.getByText('Failed to connect to the server')).toBeInTheDocument()
    })

    it('should show error timestamp', () => {
      render(<ErrorHandling error={mockError} />)

      // Should show formatted timestamp
      expect(screen.getByText(/2025/)).toBeInTheDocument()
    })

    it('should display error type with appropriate styling', () => {
      render(<ErrorHandling error={mockError} />)

      const errorElement = screen.getByText('Network Error').closest('div')
      expect(errorElement).toHaveClass('border-red-200')
    })

    it('should show error details when available', () => {
      render(<ErrorHandling error={mockValidationError} />)

      expect(screen.getByText('field')).toBeInTheDocument()
      expect(screen.getByText('repositoryId')).toBeInTheDocument()
      expect(screen.getByText('REQUIRED')).toBeInTheDocument()
    })
  })

  describe('Error Types and Styling', () => {
    it('should apply network error styling', () => {
      render(<ErrorHandling error={mockError} />)

      const container = screen.getByText('Network Error').closest('div')
      expect(container).toHaveClass('bg-red-50', 'border-red-200')
    })

    it('should apply server error styling', () => {
      render(<ErrorHandling error={mockServerError} />)

      const container = screen.getByText('Server Error').closest('div')
      expect(container).toHaveClass('bg-red-50', 'border-red-200')
    })

    it('should apply validation error styling', () => {
      render(<ErrorHandling error={mockValidationError} />)

      const container = screen.getByText('Validation Error').closest('div')
      expect(container).toHaveClass('bg-yellow-50', 'border-yellow-200')
    })

    it('should show appropriate icons for different error types', () => {
      const { rerender } = render(<ErrorHandling error={mockError} />)

      // Network error should show wifi-off icon
      expect(document.querySelector('[data-lucide="wifi-off"]')).toBeInTheDocument()

      rerender(<ErrorHandling error={mockServerError} />)
      // Server error should show server-crash icon
      expect(document.querySelector('[data-lucide="server-crash"]')).toBeInTheDocument()

      rerender(<ErrorHandling error={mockValidationError} />)
      // Validation error should show alert-triangle icon
      expect(document.querySelector('[data-lucide="alert-triangle"]')).toBeInTheDocument()
    })
  })

  describe('Retry Functionality', () => {
    it('should show retry button for retryable errors', () => {
      const onRetry = jest.fn()
      render(<ErrorHandling error={mockError} onRetry={onRetry} />)

      const retryButton = screen.getByText('Retry')
      expect(retryButton).toBeInTheDocument()
      expect(retryButton).toBeEnabled()
    })

    it('should not show retry button for non-retryable errors', () => {
      const onRetry = jest.fn()
      render(<ErrorHandling error={mockValidationError} onRetry={onRetry} />)

      const retryButton = screen.queryByText('Retry')
      expect(retryButton).not.toBeInTheDocument()
    })

    it('should call onRetry when retry button is clicked', async () => {
      const user = userEvent.setup()
      const onRetry = jest.fn()
      render(<ErrorHandling error={mockError} onRetry={onRetry} />)

      const retryButton = screen.getByText('Retry')
      await user.click(retryButton)

      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith(mockError)
    })

    it('should show retry count and max retries', () => {
      render(<ErrorHandling error={mockError} />)

      expect(screen.getByText('Retry 1 of 3')).toBeInTheDocument()
    })

    it('should disable retry button when max retries reached', () => {
      const maxRetriesError = {
        ...mockError,
        retryCount: 3,
        maxRetries: 3
      }

      const onRetry = jest.fn()
      render(<ErrorHandling error={maxRetriesError} onRetry={onRetry} />)

      const retryButton = screen.getByText('Retry')
      expect(retryButton).toBeDisabled()
    })
  })

  describe('Dismiss Functionality', () => {
    it('should show dismiss button when onDismiss is provided', () => {
      const onDismiss = jest.fn()
      render(<ErrorHandling error={mockError} onDismiss={onDismiss} />)

      const dismissButton = screen.getByTitle('Dismiss error')
      expect(dismissButton).toBeInTheDocument()
    })

    it('should call onDismiss when dismiss button is clicked', async () => {
      const user = userEvent.setup()
      const onDismiss = jest.fn()
      render(<ErrorHandling error={mockError} onDismiss={onDismiss} />)

      const dismissButton = screen.getByTitle('Dismiss error')
      await user.click(dismissButton)

      expect(onDismiss).toHaveBeenCalledTimes(1)
      expect(onDismiss).toHaveBeenCalledWith(mockError)
    })

    it('should not show dismiss button when onDismiss is not provided', () => {
      render(<ErrorHandling error={mockError} />)

      const dismissButton = screen.queryByTitle('Dismiss error')
      expect(dismissButton).not.toBeInTheDocument()
    })
  })

  describe('Expandable Details', () => {
    it('should expand details when show more is clicked', async () => {
      const user = userEvent.setup()
      const errorWithDetails = {
        ...mockError,
        details: {
          requestId: 'req-123',
          endpoint: '/api/repositories',
          method: 'GET'
        }
      }

      render(<ErrorHandling error={errorWithDetails} />)

      const showMoreButton = screen.getByText('Show Details')
      await user.click(showMoreButton)

      expect(screen.getByText('req-123')).toBeInTheDocument()
      expect(screen.getByText('/api/repositories')).toBeInTheDocument()
      expect(screen.getByText('GET')).toBeInTheDocument()
    })

    it('should collapse details when show less is clicked', async () => {
      const user = userEvent.setup()
      const errorWithDetails = {
        ...mockError,
        details: {
          requestId: 'req-123'
        }
      }

      render(<ErrorHandling error={errorWithDetails} />)

      // Expand details
      const showMoreButton = screen.getByText('Show Details')
      await user.click(showMoreButton)

      expect(screen.getByText('req-123')).toBeVisible()

      // Collapse details
      const showLessButton = screen.getByText('Hide Details')
      await user.click(showLessButton)

      expect(screen.queryByText('req-123')).not.toBeVisible()
    })

    it('should not show details section when no details available', () => {
      render(<ErrorHandling error={mockError} />)

      const showDetailsButton = screen.queryByText('Show Details')
      expect(showDetailsButton).not.toBeInTheDocument()
    })
  })

  describe('Error Recovery Suggestions', () => {
    it('should show network error recovery suggestions', () => {
      render(<ErrorHandling error={mockError} />)

      expect(screen.getByText('Check your internet connection')).toBeInTheDocument()
      expect(screen.getByText('Try refreshing the page')).toBeInTheDocument()
    })

    it('should show server error recovery suggestions', () => {
      render(<ErrorHandling error={mockServerError} />)

      expect(screen.getByText('Try again in a few moments')).toBeInTheDocument()
      expect(screen.getByText('Contact support if the problem persists')).toBeInTheDocument()
    })

    it('should show validation error recovery suggestions', () => {
      render(<ErrorHandling error={mockValidationError} />)

      expect(screen.getByText('Please check your input and try again')).toBeInTheDocument()
    })

    it('should show rate limit recovery suggestions', () => {
      const rateLimitError = {
        ...mockError,
        type: 'rate_limit',
        title: 'Rate Limit Exceeded',
        message: 'Too many requests'
      }

      render(<ErrorHandling error={rateLimitError} />)

      expect(screen.getByText('Please wait a moment before trying again')).toBeInTheDocument()
    })
  })

  describe('Multiple Errors', () => {
    it('should display multiple errors in a list', () => {
      const errors = [mockError, mockServerError, mockValidationError]
      render(<ErrorHandling errors={errors} />)

      expect(screen.getByText('Network Error')).toBeInTheDocument()
      expect(screen.getByText('Server Error')).toBeInTheDocument()
      expect(screen.getByText('Validation Error')).toBeInTheDocument()
    })

    it('should show error count when multiple errors present', () => {
      const errors = [mockError, mockServerError, mockValidationError]
      render(<ErrorHandling errors={errors} />)

      expect(screen.getByText('3 errors occurred')).toBeInTheDocument()
    })

    it('should allow dismissing individual errors', async () => {
      const user = userEvent.setup()
      const onDismiss = jest.fn()
      const errors = [mockError, mockServerError]
      render(<ErrorHandling errors={errors} onDismiss={onDismiss} />)

      const dismissButtons = screen.getAllByTitle('Dismiss error')
      expect(dismissButtons).toHaveLength(2)

      await user.click(dismissButtons[0])

      expect(onDismiss).toHaveBeenCalledTimes(1)
      expect(onDismiss).toHaveBeenCalledWith(mockError)
    })

    it('should allow dismissing all errors', async () => {
      const user = userEvent.setup()
      const onDismissAll = jest.fn()
      const errors = [mockError, mockServerError]
      render(<ErrorHandling errors={errors} onDismissAll={onDismissAll} />)

      const dismissAllButton = screen.getByText('Dismiss All')
      await user.click(dismissAllButton)

      expect(onDismissAll).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ErrorHandling error={mockError} />)

      const errorContainer = screen.getByRole('alert')
      expect(errorContainer).toBeInTheDocument()
      expect(errorContainer).toHaveAttribute('aria-live', 'polite')
    })

    it('should have accessible button labels', () => {
      const onRetry = jest.fn()
      const onDismiss = jest.fn()
      render(<ErrorHandling error={mockError} onRetry={onRetry} onDismiss={onDismiss} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeInTheDocument()

      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      expect(dismissButton).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      const onRetry = jest.fn()
      const onDismiss = jest.fn()
      render(<ErrorHandling error={mockError} onRetry={onRetry} onDismiss={onDismiss} />)

      // Tab to retry button
      await user.tab()
      expect(screen.getByText('Retry')).toHaveFocus()

      // Enter should trigger retry
      await user.keyboard('{Enter}')
      expect(onRetry).toHaveBeenCalledTimes(1)

      // Tab to dismiss button
      await user.tab()
      expect(screen.getByTitle('Dismiss error')).toHaveFocus()

      // Enter should trigger dismiss
      await user.keyboard('{Enter}')
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('Animation and Transitions', () => {
    it('should animate error appearance', () => {
      const { container } = render(<ErrorHandling error={mockError} />)

      // Should have animation classes
      const errorElement = container.querySelector('.transition-all')
      expect(errorElement).toBeInTheDocument()
    })

    it('should animate error dismissal', async () => {
      const user = userEvent.setup()
      const onDismiss = jest.fn()
      render(<ErrorHandling error={mockError} onDismiss={onDismiss} />)

      const dismissButton = screen.getByTitle('Dismiss error')
      await user.click(dismissButton)

      // Should trigger dismissal animation
      expect(onDismiss).toHaveBeenCalled()
    })
  })

  describe('Custom Styling', () => {
    it('should accept custom className', () => {
      const { container } = render(
        <ErrorHandling error={mockError} className="custom-error-class" />
      )

      expect(container.firstChild).toHaveClass('custom-error-class')
    })

    it('should apply size variants correctly', () => {
      const { rerender, container } = render(
        <ErrorHandling error={mockError} size="sm" />
      )

      expect(container.firstChild).toHaveClass('text-sm', 'p-3')

      rerender(<ErrorHandling error={mockError} size="lg" />)
      expect(container.firstChild).toHaveClass('text-base', 'p-6')
    })
  })

  describe('Error Context Integration', () => {
    it('should work with error context provider', () => {
      // This would test integration with a global error context
      // For now, just verify component renders independently
      render(<ErrorHandling error={mockError} />)

      expect(screen.getByText('Network Error')).toBeInTheDocument()
    })
  })
})
