import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SyncProgressIndicator from '../../../dashboard/src/components/SyncProgressIndicator'

// Mock react-spring
jest.mock('@react-spring/web', () => ({
  useSpring: (props) => props.to || props.from || {},
  animated: {
    div: 'div'
  },
  config: {
    gentle: {}
  }
}))

describe('SyncProgressIndicator', () => {
  const baseSyncOperation = {
    id: 'sync-1',
    repositoryId: 'repo-1',
    startTime: '2025-01-04T10:00:00Z',
    logs: []
  }

  describe('Status Icons and States', () => {
    it('should show clock icon for pending status', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'pending',
        progress: 0
      }

      render(<SyncProgressIndicator operation={operation} />)

      const clockIcon = document.querySelector('.text-yellow-500')
      expect(clockIcon).toBeInTheDocument()
    })

    it('should show spinning refresh icon for running status', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 45
      }

      render(<SyncProgressIndicator operation={operation} />)

      const spinningIcon = document.querySelector('.text-blue-500.animate-spin')
      expect(spinningIcon).toBeInTheDocument()
    })

    it('should show check circle for completed status', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'completed',
        progress: 100,
        endTime: '2025-01-04T10:05:00Z'
      }

      render(<SyncProgressIndicator operation={operation} />)

      const checkIcon = document.querySelector('.text-green-500')
      expect(checkIcon).toBeInTheDocument()
    })

    it('should show alert circle for failed status', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'failed',
        progress: 25,
        error: 'Authentication failed',
        endTime: '2025-01-04T10:02:00Z'
      }

      render(<SyncProgressIndicator operation={operation} />)

      const alertIcon = document.querySelector('.text-red-500')
      expect(alertIcon).toBeInTheDocument()
    })

    it('should show X icon for cancelled status', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'cancelled',
        progress: 30,
        endTime: '2025-01-04T10:03:00Z'
      }

      render(<SyncProgressIndicator operation={operation} />)

      const xIcon = document.querySelector('.text-gray-500')
      expect(xIcon).toBeInTheDocument()
    })
  })

  describe('Progress Bar', () => {
    it('should display correct progress percentage', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 67
      }

      render(<SyncProgressIndicator operation={operation} />)

      expect(screen.getByText('67%')).toBeInTheDocument()
    })

    it('should handle 0% progress', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'pending',
        progress: 0
      }

      render(<SyncProgressIndicator operation={operation} />)

      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('should handle 100% progress', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'completed',
        progress: 100
      }

      render(<SyncProgressIndicator operation={operation} />)

      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('should clamp progress values outside 0-100 range', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 150 // Invalid progress
      }

      render(<SyncProgressIndicator operation={operation} />)

      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('Duration Calculation', () => {
    it('should calculate duration for completed operations', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'completed',
        progress: 100,
        startTime: '2025-01-04T10:00:00Z',
        endTime: '2025-01-04T10:02:30Z' // 2 minutes 30 seconds
      }

      render(<SyncProgressIndicator operation={operation} />)

      expect(screen.getByText(/2m 30s/)).toBeInTheDocument()
    })

    it('should calculate duration for running operations', () => {
      const now = new Date()
      const startTime = new Date(now.getTime() - 75000) // 1 minute 15 seconds ago

      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 50,
        startTime: startTime.toISOString()
      }

      render(<SyncProgressIndicator operation={operation} />)

      expect(screen.getByText(/1m 15s/)).toBeInTheDocument()
    })

    it('should format seconds-only duration correctly', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'completed',
        progress: 100,
        startTime: '2025-01-04T10:00:00Z',
        endTime: '2025-01-04T10:00:45Z' // 45 seconds
      }

      render(<SyncProgressIndicator operation={operation} />)

      expect(screen.getByText('45s')).toBeInTheDocument()
    })
  })

  describe('Error Display', () => {
    it('should show error message for failed operations', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'failed',
        progress: 30,
        error: 'Network timeout occurred'
      }

      render(<SyncProgressIndicator operation={operation} />)

      expect(screen.getByText('Network timeout occurred')).toBeInTheDocument()

      const errorContainer = screen.getByText('Network timeout occurred').closest('div')
      expect(errorContainer).toHaveClass('bg-red-50')
    })

    it('should not show error section for successful operations', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'completed',
        progress: 100
      }

      render(<SyncProgressIndicator operation={operation} />)

      const errorSection = document.querySelector('.bg-red-50')
      expect(errorSection).not.toBeInTheDocument()
    })
  })

  describe('Metadata Display', () => {
    it('should show files processed information', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 60,
        metadata: {
          filesProcessed: 12,
          totalFiles: 20,
          currentStep: 'Processing files'
        }
      }

      render(<SyncProgressIndicator operation={operation} />)

      expect(screen.getByText('12/20 files')).toBeInTheDocument()
    })

    it('should show current step for running operations', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 40,
        metadata: {
          currentStep: 'Creating symlinks'
        }
      }

      render(<SyncProgressIndicator operation={operation} />)

      expect(screen.getByText('Creating symlinks')).toBeInTheDocument()
    })

    it('should handle operations without metadata', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 50
      }

      render(<SyncProgressIndicator operation={operation} />)

      // Should not crash and should still show basic info
      expect(screen.getByText('50%')).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('should show cancel button for running operations', () => {
      const onCancel = jest.fn()
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 50
      }

      render(<SyncProgressIndicator operation={operation} onCancel={onCancel} />)

      const cancelButton = screen.getByTitle('Cancel sync')
      expect(cancelButton).toBeInTheDocument()
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = jest.fn()
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 50
      }

      render(<SyncProgressIndicator operation={operation} onCancel={onCancel} />)

      const cancelButton = screen.getByTitle('Cancel sync')
      await user.click(cancelButton)

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should show retry button for failed operations', () => {
      const onRetry = jest.fn()
      const operation = {
        ...baseSyncOperation,
        status: 'failed',
        progress: 25,
        error: 'Network error'
      }

      render(<SyncProgressIndicator operation={operation} onRetry={onRetry} />)

      const retryButton = screen.getByTitle('Retry sync')
      expect(retryButton).toBeInTheDocument()
    })

    it('should call onRetry when retry button is clicked', async () => {
      const user = userEvent.setup()
      const onRetry = jest.fn()
      const operation = {
        ...baseSyncOperation,
        status: 'failed',
        progress: 25,
        error: 'Network error'
      }

      render(<SyncProgressIndicator operation={operation} onRetry={onRetry} />)

      const retryButton = screen.getByTitle('Retry sync')
      await user.click(retryButton)

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('should not show action buttons when callbacks not provided', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 50
      }

      render(<SyncProgressIndicator operation={operation} />)

      const cancelButton = screen.queryByTitle('Cancel sync')
      const retryButton = screen.queryByTitle('Retry sync')

      expect(cancelButton).not.toBeInTheDocument()
      expect(retryButton).not.toBeInTheDocument()
    })
  })

  describe('Expandable Details', () => {
    it('should expand details when chevron is clicked', async () => {
      const user = userEvent.setup()
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 50,
        logs: [
          {
            timestamp: '2025-01-04T10:01:00Z',
            level: 'info',
            message: 'Starting sync process'
          }
        ]
      }

      render(<SyncProgressIndicator operation={operation} />)

      const expandButton = screen.getByRole('button')
      await user.click(expandButton)

      expect(screen.getByText('Activity Log')).toBeInTheDocument()
      expect(screen.getByText('Starting sync process')).toBeInTheDocument()
    })

    it('should start expanded when showDetails is true', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'completed',
        progress: 100,
        logs: [
          {
            timestamp: '2025-01-04T10:01:00Z',
            level: 'info',
            message: 'Sync completed'
          }
        ]
      }

      render(<SyncProgressIndicator operation={operation} showDetails={true} />)

      expect(screen.getByText('Activity Log')).toBeInTheDocument()
    })
  })

  describe('Log Display', () => {
    it('should display log entries with correct styling', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 50,
        logs: [
          {
            timestamp: '2025-01-04T10:01:00Z',
            level: 'info',
            message: 'Information message'
          },
          {
            timestamp: '2025-01-04T10:02:00Z',
            level: 'warning',
            message: 'Warning message'
          },
          {
            timestamp: '2025-01-04T10:03:00Z',
            level: 'error',
            message: 'Error message'
          }
        ]
      }

      render(<SyncProgressIndicator operation={operation} showDetails={true} />)

      expect(screen.getByText('Information message')).toBeInTheDocument()
      expect(screen.getByText('Warning message')).toBeInTheDocument()
      expect(screen.getByText('Error message')).toBeInTheDocument()

      // Check styling classes
      const infoLog = screen.getByText('Information message').closest('div')
      expect(infoLog).toHaveClass('text-blue-600')

      const warningLog = screen.getByText('Warning message').closest('div')
      expect(warningLog).toHaveClass('text-yellow-600')

      const errorLog = screen.getByText('Error message').closest('div')
      expect(errorLog).toHaveClass('text-red-600')
    })

    it('should format log timestamps correctly', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 50,
        logs: [
          {
            timestamp: '2025-01-04T10:01:00Z',
            level: 'info',
            message: 'Test message'
          }
        ]
      }

      render(<SyncProgressIndicator operation={operation} showDetails={true} />)

      // Should show formatted time (exact format depends on locale)
      const timeElement = document.querySelector('.font-mono.text-gray-500')
      expect(timeElement).toBeInTheDocument()
      expect(timeElement.textContent).toMatch(/\d+:\d+:\d+/)
    })

    it('should display log details when present', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 50,
        logs: [
          {
            timestamp: '2025-01-04T10:01:00Z',
            level: 'info',
            message: 'Detailed message',
            details: {
              fileName: 'test.md',
              size: 1024
            }
          }
        ]
      }

      render(<SyncProgressIndicator operation={operation} showDetails={true} />)

      expect(screen.getByText('"fileName": "test.md"')).toBeInTheDocument()
      expect(screen.getByText('"size": 1024')).toBeInTheDocument()
    })

    it('should limit logs to last 10 entries', () => {
      const logs = Array.from({ length: 15 }, (_, i) => ({
        timestamp: `2025-01-04T10:${String(i).padStart(2, '0')}:00Z`,
        level: 'info',
        message: `Log entry ${i + 1}`
      }))

      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 50,
        logs
      }

      render(<SyncProgressIndicator operation={operation} showDetails={true} />)

      // Should only show last 10 entries (6-15)
      expect(screen.getByText('Log entry 15')).toBeInTheDocument()
      expect(screen.getByText('Log entry 6')).toBeInTheDocument()
      expect(screen.queryByText('Log entry 5')).not.toBeInTheDocument()
      expect(screen.queryByText('Log entry 1')).not.toBeInTheDocument()
    })
  })

  describe('Step Indicator', () => {
    it('should show step indicator for running operations with current step', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 60,
        metadata: {
          currentStep: 'Processing files'
        }
      }

      render(<SyncProgressIndicator operation={operation} showDetails={true} />)

      expect(screen.getByText('Current step: Processing files')).toBeInTheDocument()
    })

    it('should highlight current step in step indicator', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 60,
        metadata: {
          currentStep: 'Processing files'
        }
      }

      render(<SyncProgressIndicator operation={operation} showDetails={true} />)

      const processingStep = screen.getByText('Processing files')
      expect(processingStep).toHaveClass('font-medium', 'text-claude-600')
    })
  })

  describe('Real-time Progress Simulation', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should simulate progress updates for running operations', async () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 50
      }

      render(<SyncProgressIndicator operation={operation} />)

      // Initial progress
      expect(screen.getByText('50%')).toBeInTheDocument()

      // Advance timers to trigger progress simulation
      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        const progressText = screen.getByText(/%/)
        const progressValue = parseInt(progressText.textContent)
        expect(progressValue).toBeGreaterThanOrEqual(50)
      })
    })

    it('should not simulate progress for completed operations', async () => {
      const operation = {
        ...baseSyncOperation,
        status: 'completed',
        progress: 100
      }

      render(<SyncProgressIndicator operation={operation} />)

      expect(screen.getByText('100%')).toBeInTheDocument()

      // Advance timers
      jest.advanceTimersByTime(5000)

      // Progress should remain at 100%
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for buttons', () => {
      const onCancel = jest.fn()
      const onRetry = jest.fn()
      const operation = {
        ...baseSyncOperation,
        status: 'failed',
        progress: 25,
        error: 'Test error'
      }

      render(<SyncProgressIndicator operation={operation} onCancel={onCancel} onRetry={onRetry} />)

      const retryButton = screen.getByTitle('Retry sync')
      expect(retryButton).toHaveAttribute('title', 'Retry sync')
    })

    it('should have proper heading structure in expanded view', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 50,
        logs: [{ timestamp: '2025-01-04T10:01:00Z', level: 'info', message: 'Test' }]
      }

      render(<SyncProgressIndicator operation={operation} showDetails={true} />)

      const logHeading = screen.getByText('Activity Log')
      expect(logHeading.tagName).toBe('H4')
    })
  })

  describe('Custom CSS Classes', () => {
    it('should apply custom className', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 50
      }

      const { container } = render(
        <SyncProgressIndicator operation={operation} className="custom-class" />
      )

      const indicator = container.firstChild
      expect(indicator).toHaveClass('custom-class')
    })

    it('should apply glass effect styling', () => {
      const operation = {
        ...baseSyncOperation,
        status: 'running',
        progress: 50
      }

      const { container } = render(<SyncProgressIndicator operation={operation} />)

      const indicator = container.firstChild
      expect(indicator).toHaveClass('glass', 'rounded-lg')
    })
  })
})
