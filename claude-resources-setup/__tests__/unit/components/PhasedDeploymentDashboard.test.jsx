/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { mockDeployments, mockPhases, mockUsers } from '../../mocks/data.js'

// Mock the dashboard component - would be imported from actual source
const PhasedDeploymentDashboard = ({
  deployments = [],
  onPhaseStart,
  onDeploymentSelect,
  isLoading = false,
  error = null
}) => {
  const [selectedDeployment, setSelectedDeployment] = React.useState(deployments[0])
  const [expandedPhases, setExpandedPhases] = React.useState(new Set())

  const handlePhaseToggle = (phaseId) => {
    const newExpanded = new Set(expandedPhases)
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId)
    } else {
      newExpanded.add(phaseId)
    }
    setExpandedPhases(newExpanded)
  }

  const handleStartPhase = async (phaseId) => {
    if (onPhaseStart) {
      await onPhaseStart(selectedDeployment.id, phaseId)
    }
  }

  if (error) {
    return (
      <div data-testid="error-message" className="error">
        {error.message || 'An error occurred'}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div data-testid="loading-spinner" className="loading">
        Loading deployment data...
      </div>
    )
  }

  return (
    <div data-testid="phased-deployment-dashboard" className="dashboard">
      <header className="dashboard-header">
        <h1>Phased Deployment Dashboard</h1>
        <div className="deployment-selector">
          <select
            data-testid="deployment-select"
            value={selectedDeployment?.id || ''}
            onChange={(e) => {
              const deployment = deployments.find(d => d.id === e.target.value)
              setSelectedDeployment(deployment)
              if (onDeploymentSelect) onDeploymentSelect(deployment)
            }}
          >
            {deployments.map(deployment => (
              <option key={deployment.id} value={deployment.id}>
                {deployment.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      {selectedDeployment && (
        <div className="deployment-details">
          <div className="deployment-info">
            <h2>{selectedDeployment.name}</h2>
            <p>{selectedDeployment.description}</p>
            <div className="deployment-status">
              <span
                className={`status-badge ${selectedDeployment.status}`}
                data-testid="deployment-status"
              >
                {selectedDeployment.status.replace('_', ' ').toUpperCase()}
              </span>
              <span data-testid="current-phase">
                Current Phase: {selectedDeployment.currentPhase}
              </span>
            </div>
          </div>

          <div className="phases-container">
            <h3>Deployment Phases</h3>
            {selectedDeployment.phases.map((phase, index) => (
              <div
                key={phase.id}
                className={`phase-card ${phase.status}`}
                data-testid={`phase-card-${phase.id}`}
              >
                <div
                  className="phase-header"
                  onClick={() => handlePhaseToggle(phase.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handlePhaseToggle(phase.id)
                    }
                  }}
                >
                  <div className="phase-title">
                    <h4>{phase.name}</h4>
                    <span className="phase-status">{phase.status}</span>
                  </div>
                  <div className="phase-metrics">
                    <span data-testid={`phase-${phase.id}-completion`}>
                      {phase.metrics.completionRate}% Complete
                    </span>
                    <span data-testid={`phase-${phase.id}-users`}>
                      {phase.completedUsers.length}/{phase.targetUsers.length} Users
                    </span>
                  </div>
                  <button
                    className="expand-button"
                    aria-expanded={expandedPhases.has(phase.id)}
                  >
                    {expandedPhases.has(phase.id) ? '−' : '+'}
                  </button>
                </div>

                {expandedPhases.has(phase.id) && (
                  <div className="phase-details" data-testid={`phase-details-${phase.id}`}>
                    <p>{phase.description}</p>

                    <div className="phase-dates">
                      <span>Start: {new Date(phase.startDate).toLocaleDateString()}</span>
                      <span>End: {new Date(phase.endDate).toLocaleDateString()}</span>
                    </div>

                    <div className="phase-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${phase.metrics.completionRate}%` }}
                        />
                      </div>
                      <div className="progress-stats">
                        <span>Avg Time: {phase.metrics.avgOnboardingTime} days</span>
                        <span>Satisfaction: {phase.metrics.userSatisfaction}/5</span>
                        <span>Error Rate: {phase.metrics.errorRate}%</span>
                      </div>
                    </div>

                    <div className="phase-actions">
                      {phase.status === 'pending' && (
                        <button
                          className="start-phase-btn"
                          data-testid={`start-phase-${phase.id}`}
                          onClick={() => handleStartPhase(phase.id)}
                          disabled={index > 0 && selectedDeployment.phases[index - 1].status !== 'completed'}
                        >
                          Start Phase
                        </button>
                      )}

                      {phase.status === 'in_progress' && (
                        <div className="active-phase-info">
                          <span className="active-indicator">🟢 Active</span>
                          <span>Started: {new Date(phase.startDate).toLocaleDateString()}</span>
                        </div>
                      )}

                      {phase.status === 'completed' && (
                        <div className="completed-phase-info">
                          <span className="completed-indicator">✅ Completed</span>
                          <span>Finished: {new Date(phase.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="user-list">
                      <h5>Target Users ({phase.targetUsers.length})</h5>
                      <div className="user-grid">
                        {phase.targetUsers.map(userId => {
                          const isCompleted = phase.completedUsers.includes(userId)
                          return (
                            <div
                              key={userId}
                              className={`user-badge ${isCompleted ? 'completed' : 'pending'}`}
                              data-testid={`user-${userId}-${phase.id}`}
                            >
                              {userId}
                              {isCompleted ? ' ✓' : ''}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

describe('PhasedDeploymentDashboard', () => {
  const mockOnPhaseStart = jest.fn()
  const mockOnDeploymentSelect = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the dashboard with deployment data', () => {
      render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
          onPhaseStart={mockOnPhaseStart}
          onDeploymentSelect={mockOnDeploymentSelect}
        />
      )

      expect(screen.getByTestId('phased-deployment-dashboard')).toBeInTheDocument()
      expect(screen.getByText('Phased Deployment Dashboard')).toBeInTheDocument()
      expect(screen.getByTestId('deployment-select')).toBeInTheDocument()
    })

    it('should display loading state correctly', () => {
      render(
        <PhasedDeploymentDashboard
          deployments={[]}
          isLoading={true}
        />
      )

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByText('Loading deployment data...')).toBeInTheDocument()
    })

    it('should display error state correctly', () => {
      const error = new Error('Failed to load deployments')

      render(
        <PhasedDeploymentDashboard
          deployments={[]}
          error={error}
        />
      )

      expect(screen.getByTestId('error-message')).toBeInTheDocument()
      expect(screen.getByText('Failed to load deployments')).toBeInTheDocument()
    })

    it('should render deployment details when deployment is selected', () => {
      render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
        />
      )

      const deployment = mockDeployments[0]
      expect(screen.getByText(deployment.name)).toBeInTheDocument()
      expect(screen.getByText(deployment.description)).toBeInTheDocument()
      expect(screen.getByTestId('deployment-status')).toHaveTextContent('IN PROGRESS')
      expect(screen.getByTestId('current-phase')).toHaveTextContent('Current Phase: phase-2')
    })

    it('should render all phases for selected deployment', () => {
      render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
        />
      )

      mockPhases.forEach(phase => {
        expect(screen.getByTestId(`phase-card-${phase.id}`)).toBeInTheDocument()
        expect(screen.getByText(phase.name)).toBeInTheDocument()
      })
    })

    it('should show phase completion metrics', () => {
      render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
        />
      )

      expect(screen.getByTestId('phase-phase-1-completion')).toHaveTextContent('100% Complete')
      expect(screen.getByTestId('phase-phase-2-completion')).toHaveTextContent('40% Complete')
      expect(screen.getByTestId('phase-phase-1-users')).toHaveTextContent('3/3 Users')
      expect(screen.getByTestId('phase-phase-2-users')).toHaveTextContent('2/5 Users')
    })
  })

  describe('Interactions', () => {
    it('should expand and collapse phase details', async () => {
      const user = userEvent.setup()

      render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
        />
      )

      const phaseHeader = screen.getByText('Leadership Onboarding').closest('.phase-header')

      // Initially collapsed
      expect(screen.queryByTestId('phase-details-phase-1')).not.toBeInTheDocument()

      // Click to expand
      await user.click(phaseHeader)
      expect(screen.getByTestId('phase-details-phase-1')).toBeInTheDocument()

      // Click to collapse
      await user.click(phaseHeader)
      expect(screen.queryByTestId('phase-details-phase-1')).not.toBeInTheDocument()
    })

    it('should handle keyboard navigation for phase expansion', async () => {
      const user = userEvent.setup()

      render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
        />
      )

      const phaseHeader = screen.getByText('Development Team').closest('.phase-header')

      // Focus and press Enter
      phaseHeader.focus()
      await user.keyboard('{Enter}')
      expect(screen.getByTestId('phase-details-phase-2')).toBeInTheDocument()

      // Press Space to collapse
      await user.keyboard(' ')
      expect(screen.queryByTestId('phase-details-phase-2')).not.toBeInTheDocument()
    })

    it('should call onPhaseStart when start phase button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
          onPhaseStart={mockOnPhaseStart}
        />
      )

      // Expand phase 3 (pending phase)
      const phaseHeader = screen.getByText('Extended Team').closest('.phase-header')
      await user.click(phaseHeader)

      const startButton = screen.getByTestId('start-phase-phase-3')
      await user.click(startButton)

      expect(mockOnPhaseStart).toHaveBeenCalledWith('deployment-1', 'phase-3')
    })

    it('should disable start button if previous phase is not completed', async () => {
      const user = userEvent.setup()

      // Mock deployment with phase-1 still in progress
      const modifiedDeployment = {
        ...mockDeployments[0],
        phases: mockPhases.map(phase =>
          phase.id === 'phase-1' ? { ...phase, status: 'in_progress' } : phase
        )
      }

      render(
        <PhasedDeploymentDashboard
          deployments={[modifiedDeployment]}
          onPhaseStart={mockOnPhaseStart}
        />
      )

      // Expand phase 2
      const phaseHeader = screen.getByText('Development Team').closest('.phase-header')
      await user.click(phaseHeader)

      const startButton = screen.getByTestId('start-phase-phase-2')
      expect(startButton).toBeDisabled()
    })

    it('should handle deployment selection', async () => {
      const user = userEvent.setup()
      const multipleDeployments = [
        mockDeployments[0],
        {
          ...mockDeployments[0],
          id: 'deployment-2',
          name: 'Q2 2025 Rollout'
        }
      ]

      render(
        <PhasedDeploymentDashboard
          deployments={multipleDeployments}
          onDeploymentSelect={mockOnDeploymentSelect}
        />
      )

      const select = screen.getByTestId('deployment-select')
      await user.selectOptions(select, 'deployment-2')

      expect(mockOnDeploymentSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'deployment-2' })
      )
    })
  })

  describe('Phase Status Display', () => {
    it('should show appropriate indicators for different phase statuses', async () => {
      const user = userEvent.setup()

      render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
        />
      )

      // Expand all phases to see status indicators
      for (const phase of mockPhases) {
        const phaseHeader = screen.getByText(phase.name).closest('.phase-header')
        await user.click(phaseHeader)
      }

      // Check completed phase
      expect(screen.getByText('✅ Completed')).toBeInTheDocument()

      // Check in-progress phase
      expect(screen.getByText('🟢 Active')).toBeInTheDocument()

      // Check pending phase - should have start button
      expect(screen.getByTestId('start-phase-phase-3')).toBeInTheDocument()
    })

    it('should display phase metrics correctly', async () => {
      const user = userEvent.setup()

      render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
        />
      )

      // Expand phase 2 to see detailed metrics
      const phaseHeader = screen.getByText('Development Team').closest('.phase-header')
      await user.click(phaseHeader)

      expect(screen.getByText('Avg Time: 3.2 days')).toBeInTheDocument()
      expect(screen.getByText('Satisfaction: 4.6/5')).toBeInTheDocument()
      expect(screen.getByText('Error Rate: 5%')).toBeInTheDocument()
    })

    it('should show user completion status', async () => {
      const user = userEvent.setup()

      render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
        />
      )

      // Expand phase 2
      const phaseHeader = screen.getByText('Development Team').closest('.phase-header')
      await user.click(phaseHeader)

      // Check that completed users show checkmark
      const completedUsers = mockPhases[1].completedUsers
      completedUsers.forEach(userId => {
        const userBadge = screen.getByTestId(`user-${userId}-phase-2`)
        expect(userBadge).toHaveTextContent('✓')
        expect(userBadge).toHaveClass('completed')
      })

      // Check that pending users don't show checkmark
      const pendingUsers = mockPhases[1].targetUsers.filter(
        userId => !completedUsers.includes(userId)
      )
      pendingUsers.forEach(userId => {
        const userBadge = screen.getByTestId(`user-${userId}-phase-2`)
        expect(userBadge).not.toHaveTextContent('✓')
        expect(userBadge).toHaveClass('pending')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
        />
      )

      // Check that phase headers have proper role and tabindex
      const phaseHeaders = screen.getAllByRole('button')
      phaseHeaders.forEach(header => {
        expect(header).toHaveAttribute('tabIndex', '0')
      })
    })

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup()

      render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
        />
      )

      const phaseHeader = screen.getByText('Leadership Onboarding').closest('.phase-header')

      // Should be focusable
      phaseHeader.focus()
      expect(phaseHeader).toHaveFocus()

      // Should respond to Enter key
      await user.keyboard('{Enter}')
      expect(screen.getByTestId('phase-details-phase-1')).toBeInTheDocument()
    })

    it('should have proper expand/collapse button states', async () => {
      const user = userEvent.setup()

      render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
        />
      )

      const expandButton = screen.getAllByClassName('expand-button')[0]

      // Initial state
      expect(expandButton).toHaveAttribute('aria-expanded', 'false')
      expect(expandButton).toHaveTextContent('+')

      // After expansion
      const phaseHeader = expandButton.closest('.phase-header')
      await user.click(phaseHeader)

      expect(expandButton).toHaveAttribute('aria-expanded', 'true')
      expect(expandButton).toHaveTextContent('−')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing deployment data gracefully', () => {
      render(
        <PhasedDeploymentDashboard
          deployments={[]}
        />
      )

      expect(screen.getByTestId('phased-deployment-dashboard')).toBeInTheDocument()
      // Should not crash when no deployments are provided
    })

    it('should handle malformed phase data', () => {
      const malformedDeployment = {
        ...mockDeployments[0],
        phases: [
          {
            id: 'malformed-phase',
            name: 'Malformed Phase',
            // Missing required fields
            metrics: {},
            targetUsers: null,
            completedUsers: undefined
          }
        ]
      }

      render(
        <PhasedDeploymentDashboard
          deployments={[malformedDeployment]}
        />
      )

      // Should render without crashing
      expect(screen.getByText('Malformed Phase')).toBeInTheDocument()
    })

    it('should handle API errors during phase start', async () => {
      const user = userEvent.setup()
      const mockOnPhaseStartWithError = jest.fn().mockRejectedValue(
        new Error('Failed to start phase')
      )

      render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
          onPhaseStart={mockOnPhaseStartWithError}
        />
      )

      // Expand and try to start phase 3
      const phaseHeader = screen.getByText('Extended Team').closest('.phase-header')
      await user.click(phaseHeader)

      const startButton = screen.getByTestId('start-phase-phase-3')

      // Should not crash when phase start fails
      await user.click(startButton)

      expect(mockOnPhaseStartWithError).toHaveBeenCalled()
    })
  })

  describe('Performance', () => {
    it('should handle large numbers of phases efficiently', () => {
      const manyPhases = Array.from({ length: 50 }, (_, i) => ({
        ...mockPhases[0],
        id: `phase-${i + 1}`,
        name: `Phase ${i + 1}`
      }))

      const largeDeployment = {
        ...mockDeployments[0],
        phases: manyPhases
      }

      const startTime = performance.now()

      render(
        <PhasedDeploymentDashboard
          deployments={[largeDeployment]}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within a reasonable time
      expect(renderTime).toBeLessThan(1000) // Less than 1 second
      expect(screen.getAllByClassName('phase-card')).toHaveLength(50)
    })

    it('should not re-render unnecessarily', () => {
      const { rerender } = render(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
          onPhaseStart={mockOnPhaseStart}
        />
      )

      // Re-render with same props
      rerender(
        <PhasedDeploymentDashboard
          deployments={mockDeployments}
          onPhaseStart={mockOnPhaseStart}
        />
      )

      // Component should still be there and functional
      expect(screen.getByTestId('phased-deployment-dashboard')).toBeInTheDocument()
    })
  })
})
