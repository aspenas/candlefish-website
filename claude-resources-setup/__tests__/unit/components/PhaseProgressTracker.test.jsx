/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { mockPhases, mockUsers } from '../../mocks/data.js'

// Mock the PhaseProgressTracker component
const PhaseProgressTracker = ({
  phase,
  users = [],
  onUserClick,
  onRefresh,
  showDetailed = false,
  autoRefresh = false,
  refreshInterval = 30000
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [lastUpdated, setLastUpdated] = React.useState(new Date())

  React.useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(async () => {
        if (onRefresh) {
          setIsRefreshing(true)
          await onRefresh()
          setIsRefreshing(false)
          setLastUpdated(new Date())
        }
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval, onRefresh])

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true)
      await onRefresh()
      setIsRefreshing(false)
      setLastUpdated(new Date())
    }
  }

  const getProgressColor = (rate) => {
    if (rate >= 90) return 'success'
    if (rate >= 70) return 'warning'
    return 'danger'
  }

  const getTimeRemaining = () => {
    if (!phase.endDate) return null
    const now = new Date()
    const end = new Date(phase.endDate)
    const diff = end - now

    if (diff <= 0) return 'Overdue'

    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return `${days} day${days === 1 ? '' : 's'} remaining`
  }

  if (!phase) {
    return (
      <div data-testid="phase-progress-tracker-empty" className="empty-state">
        No phase data available
      </div>
    )
  }

  return (
    <div
      data-testid="phase-progress-tracker"
      className={`progress-tracker ${phase.status}`}
    >
      <div className="tracker-header">
        <div className="phase-info">
          <h3 data-testid="phase-name">{phase.name}</h3>
          <span
            className={`status-badge ${phase.status}`}
            data-testid="phase-status"
          >
            {phase.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        <div className="tracker-actions">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            data-testid="refresh-button"
            className="refresh-btn"
            aria-label="Refresh progress data"
          >
            {isRefreshing ? '⟳' : '↻'} Refresh
          </button>

          {autoRefresh && (
            <div className="auto-refresh-indicator" data-testid="auto-refresh-indicator">
              🔄 Auto-refresh enabled
            </div>
          )}
        </div>
      </div>

      <div className="progress-overview">
        <div className="progress-metrics">
          <div className="metric-card">
            <div className="metric-value" data-testid="completion-rate">
              {phase.metrics.completionRate}%
            </div>
            <div className="metric-label">Completion Rate</div>
          </div>

          <div className="metric-card">
            <div className="metric-value" data-testid="user-count">
              {phase.completedUsers.length}/{phase.targetUsers.length}
            </div>
            <div className="metric-label">Users Completed</div>
          </div>

          <div className="metric-card">
            <div className="metric-value" data-testid="avg-time">
              {phase.metrics.avgOnboardingTime}d
            </div>
            <div className="metric-label">Avg Time</div>
          </div>

          <div className="metric-card">
            <div className="metric-value" data-testid="satisfaction-score">
              {phase.metrics.userSatisfaction}/5
            </div>
            <div className="metric-label">Satisfaction</div>
          </div>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar">
            <div
              className={`progress-fill ${getProgressColor(phase.metrics.completionRate)}`}
              style={{ width: `${phase.metrics.completionRate}%` }}
              data-testid="progress-fill"
            />
          </div>
          <div className="progress-text">
            <span>{phase.metrics.completionRate}% Complete</span>
            <span data-testid="time-remaining">{getTimeRemaining()}</span>
          </div>
        </div>
      </div>

      {showDetailed && (
        <div className="detailed-progress" data-testid="detailed-progress">
          <div className="success-criteria">
            <h4>Success Criteria</h4>
            <div className="criteria-grid">
              <div className={`criteria-item ${
                phase.metrics.completionRate >= phase.successCriteria.minCompletionRate
                  ? 'met' : 'not-met'
              }`}>
                <span className="criteria-label">Min Completion Rate</span>
                <span className="criteria-value">
                  {phase.metrics.completionRate}% / {phase.successCriteria.minCompletionRate}%
                </span>
                <span className="criteria-status" data-testid="completion-criteria-status">
                  {phase.metrics.completionRate >= phase.successCriteria.minCompletionRate ? '✓' : '✗'}
                </span>
              </div>

              <div className={`criteria-item ${
                phase.metrics.errorRate <= phase.successCriteria.maxErrorRate
                  ? 'met' : 'not-met'
              }`}>
                <span className="criteria-label">Max Error Rate</span>
                <span className="criteria-value">
                  {phase.metrics.errorRate}% / {phase.successCriteria.maxErrorRate}%
                </span>
                <span className="criteria-status" data-testid="error-criteria-status">
                  {phase.metrics.errorRate <= phase.successCriteria.maxErrorRate ? '✓' : '✗'}
                </span>
              </div>

              <div className={`criteria-item ${
                phase.metrics.avgOnboardingTime <= phase.successCriteria.targetDuration
                  ? 'met' : 'not-met'
              }`}>
                <span className="criteria-label">Target Duration</span>
                <span className="criteria-value">
                  {phase.metrics.avgOnboardingTime}d / {phase.successCriteria.targetDuration}d
                </span>
                <span className="criteria-status" data-testid="duration-criteria-status">
                  {phase.metrics.avgOnboardingTime <= phase.successCriteria.targetDuration ? '✓' : '✗'}
                </span>
              </div>
            </div>
          </div>

          <div className="user-progress-list">
            <h4>User Progress</h4>
            <div className="user-list">
              {phase.targetUsers.map(userId => {
                const user = users.find(u => u.id === userId)
                const isCompleted = phase.completedUsers.includes(userId)
                const userProgress = user?.onboardingStatus

                return (
                  <div
                    key={userId}
                    className={`user-progress-item ${isCompleted ? 'completed' : 'in-progress'}`}
                    onClick={() => onUserClick && onUserClick(userId)}
                    role={onUserClick ? 'button' : undefined}
                    tabIndex={onUserClick ? 0 : undefined}
                    data-testid={`user-progress-${userId}`}
                  >
                    <div className="user-info">
                      <span className="user-name">{user?.username || userId}</span>
                      <span className="user-status">
                        {isCompleted ? 'Completed' : userProgress?.status || 'Pending'}
                      </span>
                    </div>

                    <div className="user-metrics">
                      {userProgress && (
                        <>
                          <span className="progress-percentage">
                            {userProgress.progress || 0}%
                          </span>
                          <span className="current-step">
                            Step {userProgress.currentStep || 1}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="user-indicator">
                      {isCompleted ? '✓' : userProgress?.status === 'in_progress' ? '⏳' : '⏸'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="tracker-footer">
        <div className="last-updated" data-testid="last-updated">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>

        {phase.status === 'in_progress' && (
          <div className="phase-timeline">
            <span>Started: {new Date(phase.startDate).toLocaleDateString()}</span>
            <span>Expected End: {new Date(phase.endDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}

describe('PhaseProgressTracker', () => {
  const mockOnUserClick = jest.fn()
  const mockOnRefresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render phase progress tracker with basic information', () => {
      const phase = mockPhases[1] // In-progress phase

      render(
        <PhaseProgressTracker
          phase={phase}
          users={mockUsers}
        />
      )

      expect(screen.getByTestId('phase-progress-tracker')).toBeInTheDocument()
      expect(screen.getByTestId('phase-name')).toHaveTextContent('Development Team')
      expect(screen.getByTestId('phase-status')).toHaveTextContent('IN PROGRESS')
    })

    it('should display correct progress metrics', () => {
      const phase = mockPhases[1]

      render(
        <PhaseProgressTracker
          phase={phase}
          users={mockUsers}
        />
      )

      expect(screen.getByTestId('completion-rate')).toHaveTextContent('40%')
      expect(screen.getByTestId('user-count')).toHaveTextContent('2/5')
      expect(screen.getByTestId('avg-time')).toHaveTextContent('3.2d')
      expect(screen.getByTestId('satisfaction-score')).toHaveTextContent('4.6/5')
    })

    it('should render empty state when no phase provided', () => {
      render(<PhaseProgressTracker phase={null} />)

      expect(screen.getByTestId('phase-progress-tracker-empty')).toBeInTheDocument()
      expect(screen.getByText('No phase data available')).toBeInTheDocument()
    })

    it('should show progress bar with correct width and color', () => {
      const phase = mockPhases[1] // 40% completion

      render(
        <PhaseProgressTracker
          phase={phase}
          users={mockUsers}
        />
      )

      const progressFill = screen.getByTestId('progress-fill')
      expect(progressFill).toHaveStyle({ width: '40%' })
      expect(progressFill).toHaveClass('danger') // Less than 70%
    })

    it('should display time remaining correctly', () => {
      const futurePhase = {
        ...mockPhases[1],
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days from now
      }

      render(
        <PhaseProgressTracker
          phase={futurePhase}
          users={mockUsers}
        />
      )

      expect(screen.getByTestId('time-remaining')).toHaveTextContent('5 days remaining')
    })

    it('should show overdue status for past end date', () => {
      const overduePhase = {
        ...mockPhases[1],
        endDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      }

      render(
        <PhaseProgressTracker
          phase={overduePhase}
          users={mockUsers}
        />
      )

      expect(screen.getByTestId('time-remaining')).toHaveTextContent('Overdue')
    })
  })

  describe('Detailed View', () => {
    it('should show detailed progress when showDetailed is true', () => {
      const phase = mockPhases[1]

      render(
        <PhaseProgressTracker
          phase={phase}
          users={mockUsers}
          showDetailed={true}
        />
      )

      expect(screen.getByTestId('detailed-progress')).toBeInTheDocument()
      expect(screen.getByText('Success Criteria')).toBeInTheDocument()
      expect(screen.getByText('User Progress')).toBeInTheDocument()
    })

    it('should display success criteria with correct status indicators', () => {
      const phase = mockPhases[0] // Completed phase with good metrics

      render(
        <PhaseProgressTracker
          phase={phase}
          users={mockUsers}
          showDetailed={true}
        />
      )

      expect(screen.getByTestId('completion-criteria-status')).toHaveTextContent('✓')
      expect(screen.getByTestId('error-criteria-status')).toHaveTextContent('✓')
      expect(screen.getByTestId('duration-criteria-status')).toHaveTextContent('✓')
    })

    it('should show failed criteria with X indicator', () => {
      const failingPhase = {
        ...mockPhases[1],
        metrics: {
          ...mockPhases[1].metrics,
          completionRate: 30, // Below 85% requirement
          errorRate: 15, // Above 10% limit
          avgOnboardingTime: 20 // Above 14 day target
        }
      }

      render(
        <PhaseProgressTracker
          phase={failingPhase}
          users={mockUsers}
          showDetailed={true}
        />
      )

      expect(screen.getByTestId('completion-criteria-status')).toHaveTextContent('✗')
      expect(screen.getByTestId('error-criteria-status')).toHaveTextContent('✗')
      expect(screen.getByTestId('duration-criteria-status')).toHaveTextContent('✗')
    })

    it('should display user progress list with correct indicators', () => {
      const phase = mockPhases[1]

      render(
        <PhaseProgressTracker
          phase={phase}
          users={mockUsers}
          showDetailed={true}
          onUserClick={mockOnUserClick}
        />
      )

      // Check that users are displayed
      phase.targetUsers.forEach(userId => {
        expect(screen.getByTestId(`user-progress-${userId}`)).toBeInTheDocument()
      })

      // Check completed user has checkmark
      const completedUser = screen.getByTestId(`user-progress-${phase.completedUsers[0]}`)
      expect(completedUser).toHaveClass('completed')
      expect(completedUser).toHaveTextContent('✓')
    })

    it('should handle user click events', async () => {
      const user = userEvent.setup()
      const phase = mockPhases[1]

      render(
        <PhaseProgressTracker
          phase={phase}
          users={mockUsers}
          showDetailed={true}
          onUserClick={mockOnUserClick}
        />
      )

      const userItem = screen.getByTestId(`user-progress-${phase.targetUsers[0]}`)
      await user.click(userItem)

      expect(mockOnUserClick).toHaveBeenCalledWith(phase.targetUsers[0])
    })

    it('should show user progress details', () => {
      const phase = mockPhases[1]

      render(
        <PhaseProgressTracker
          phase={phase}
          users={mockUsers}
          showDetailed={true}
        />
      )

      // Find user with onboarding status
      const userWithProgress = mockUsers.find(u => u.onboardingStatus?.status === 'in_progress')
      if (userWithProgress) {
        const userItem = screen.getByTestId(`user-progress-${userWithProgress.id}`)
        expect(userItem).toHaveTextContent(`${userWithProgress.onboardingStatus.progress}%`)
        expect(userItem).toHaveTextContent(`Step ${userWithProgress.onboardingStatus.currentStep}`)
      }
    })
  })

  describe('Refresh Functionality', () => {
    it('should handle manual refresh', async () => {
      const user = userEvent.setup()
      mockOnRefresh.mockResolvedValue()

      render(
        <PhaseProgressTracker
          phase={mockPhases[1]}
          onRefresh={mockOnRefresh}
        />
      )

      const refreshButton = screen.getByTestId('refresh-button')
      await user.click(refreshButton)

      expect(mockOnRefresh).toHaveBeenCalledTimes(1)
    })

    it('should disable refresh button while refreshing', async () => {
      const user = userEvent.setup()
      let resolveRefresh
      const refreshPromise = new Promise(resolve => {
        resolveRefresh = resolve
      })
      mockOnRefresh.mockReturnValue(refreshPromise)

      render(
        <PhaseProgressTracker
          phase={mockPhases[1]}
          onRefresh={mockOnRefresh}
        />
      )

      const refreshButton = screen.getByTestId('refresh-button')

      // Start refresh
      await user.click(refreshButton)
      expect(refreshButton).toBeDisabled()
      expect(refreshButton).toHaveTextContent('⟳ Refresh')

      // Complete refresh
      resolveRefresh()
      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled()
        expect(refreshButton).toHaveTextContent('↻ Refresh')
      })
    })

    it('should show auto-refresh indicator when enabled', () => {
      render(
        <PhaseProgressTracker
          phase={mockPhases[1]}
          autoRefresh={true}
          onRefresh={mockOnRefresh}
        />
      )

      expect(screen.getByTestId('auto-refresh-indicator')).toBeInTheDocument()
      expect(screen.getByText('🔄 Auto-refresh enabled')).toBeInTheDocument()
    })

    it('should auto-refresh at specified intervals', async () => {
      mockOnRefresh.mockResolvedValue()

      render(
        <PhaseProgressTracker
          phase={mockPhases[1]}
          autoRefresh={true}
          refreshInterval={5000}
          onRefresh={mockOnRefresh}
        />
      )

      // Fast-forward time to trigger auto-refresh
      jest.advanceTimersByTime(5000)

      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalledTimes(1)
      })

      // Fast-forward again
      jest.advanceTimersByTime(5000)

      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalledTimes(2)
      })
    })

    it('should update last updated timestamp after refresh', async () => {
      const user = userEvent.setup()
      mockOnRefresh.mockResolvedValue()

      const { container } = render(
        <PhaseProgressTracker
          phase={mockPhases[1]}
          onRefresh={mockOnRefresh}
        />
      )

      const initialTime = screen.getByTestId('last-updated').textContent

      // Wait a moment and refresh
      jest.advanceTimersByTime(1000)

      const refreshButton = screen.getByTestId('refresh-button')
      await user.click(refreshButton)

      await waitFor(() => {
        const newTime = screen.getByTestId('last-updated').textContent
        expect(newTime).not.toBe(initialTime)
      })
    })
  })

  describe('Progress Color Coding', () => {
    it('should use success color for high completion rates', () => {
      const highCompletionPhase = {
        ...mockPhases[0],
        metrics: {
          ...mockPhases[0].metrics,
          completionRate: 95
        }
      }

      render(
        <PhaseProgressTracker phase={highCompletionPhase} />
      )

      const progressFill = screen.getByTestId('progress-fill')
      expect(progressFill).toHaveClass('success')
    })

    it('should use warning color for medium completion rates', () => {
      const mediumCompletionPhase = {
        ...mockPhases[0],
        metrics: {
          ...mockPhases[0].metrics,
          completionRate: 75
        }
      }

      render(
        <PhaseProgressTracker phase={mediumCompletionPhase} />
      )

      const progressFill = screen.getByTestId('progress-fill')
      expect(progressFill).toHaveClass('warning')
    })

    it('should use danger color for low completion rates', () => {
      const lowCompletionPhase = {
        ...mockPhases[0],
        metrics: {
          ...mockPhases[0].metrics,
          completionRate: 45
        }
      }

      render(
        <PhaseProgressTracker phase={lowCompletionPhase} />
      )

      const progressFill = screen.getByTestId('progress-fill')
      expect(progressFill).toHaveClass('danger')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels on interactive elements', () => {
      render(
        <PhaseProgressTracker
          phase={mockPhases[1]}
          onRefresh={mockOnRefresh}
        />
      )

      const refreshButton = screen.getByTestId('refresh-button')
      expect(refreshButton).toHaveAttribute('aria-label', 'Refresh progress data')
    })

    it('should make user items keyboard accessible when clickable', () => {
      render(
        <PhaseProgressTracker
          phase={mockPhases[1]}
          users={mockUsers}
          showDetailed={true}
          onUserClick={mockOnUserClick}
        />
      )

      const userItems = screen.getAllByRole('button')
      userItems.forEach(item => {
        if (item.dataset.testid && item.dataset.testid.startsWith('user-progress-')) {
          expect(item).toHaveAttribute('tabIndex', '0')
        }
      })
    })

    it('should not make user items focusable when not clickable', () => {
      render(
        <PhaseProgressTracker
          phase={mockPhases[1]}
          users={mockUsers}
          showDetailed={true}
        />
      )

      const userItems = screen.getAllByTestId(/user-progress-/)
      userItems.forEach(item => {
        expect(item).not.toHaveAttribute('tabIndex')
        expect(item).not.toHaveAttribute('role', 'button')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle missing user data gracefully', () => {
      const phase = mockPhases[1]

      render(
        <PhaseProgressTracker
          phase={phase}
          users={[]} // No user data
          showDetailed={true}
        />
      )

      // Should still render user items, just with limited info
      phase.targetUsers.forEach(userId => {
        const userItem = screen.getByTestId(`user-progress-${userId}`)
        expect(userItem).toBeInTheDocument()
        expect(userItem).toHaveTextContent(userId) // Fallback to user ID
      })
    })

    it('should handle refresh failures gracefully', async () => {
      const user = userEvent.setup()
      mockOnRefresh.mockRejectedValue(new Error('Refresh failed'))

      render(
        <PhaseProgressTracker
          phase={mockPhases[1]}
          onRefresh={mockOnRefresh}
        />
      )

      const refreshButton = screen.getByTestId('refresh-button')

      // Should not crash when refresh fails
      await user.click(refreshButton)

      expect(mockOnRefresh).toHaveBeenCalled()
      expect(refreshButton).not.toBeDisabled() // Should re-enable after failure
    })

    it('should handle malformed phase data', () => {
      const malformedPhase = {
        name: 'Test Phase',
        status: 'in_progress',
        metrics: {}, // Missing metrics
        targetUsers: null,
        completedUsers: undefined
      }

      render(
        <PhaseProgressTracker phase={malformedPhase} />
      )

      // Should render without crashing
      expect(screen.getByTestId('phase-progress-tracker')).toBeInTheDocument()
      expect(screen.getByText('Test Phase')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should handle large user lists efficiently', () => {
      const manyUsers = Array.from({ length: 1000 }, (_, i) => ({
        id: `user-${i}`,
        username: `user${i}`,
        onboardingStatus: {
          status: 'in_progress',
          progress: Math.floor(Math.random() * 100)
        }
      }))

      const phaseWithManyUsers = {
        ...mockPhases[1],
        targetUsers: manyUsers.map(u => u.id),
        completedUsers: manyUsers.slice(0, 500).map(u => u.id)
      }

      const startTime = performance.now()

      render(
        <PhaseProgressTracker
          phase={phaseWithManyUsers}
          users={manyUsers}
          showDetailed={true}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(2000) // Less than 2 seconds
    })

    it('should cleanup auto-refresh interval on unmount', () => {
      const { unmount } = render(
        <PhaseProgressTracker
          phase={mockPhases[1]}
          autoRefresh={true}
          refreshInterval={1000}
          onRefresh={mockOnRefresh}
        />
      )

      // Unmount component
      unmount()

      // Fast-forward time - should not call refresh after unmount
      jest.advanceTimersByTime(5000)
      expect(mockOnRefresh).not.toHaveBeenCalled()
    })
  })
})
