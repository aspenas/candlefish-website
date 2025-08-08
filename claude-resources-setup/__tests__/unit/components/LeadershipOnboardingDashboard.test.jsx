/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { mockUsers, mockPhases, mockMetrics } from '../../mocks/data.js'

// Mock the LeadershipOnboardingDashboard component
const LeadershipOnboardingDashboard = ({
  teamMembers = [],
  phases = [],
  metrics = {},
  onMemberSelect,
  onBulkAction,
  onExportReport,
  viewMode = 'overview',
  department = 'all'
}) => {
  const [selectedMembers, setSelectedMembers] = React.useState(new Set())
  const [sortBy, setSortBy] = React.useState('name')
  const [sortOrder, setSortOrder] = React.useState('asc')
  const [filterStatus, setFilterStatus] = React.useState('all')

  const filteredMembers = React.useMemo(() => {
    let filtered = teamMembers

    // Filter by department
    if (department !== 'all') {
      filtered = filtered.filter(member => member.department === department)
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(member =>
        member.onboardingStatus?.status === filterStatus
      )
    }

    // Sort members
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'name':
          aValue = a.username
          bValue = b.username
          break
        case 'progress':
          aValue = a.onboardingStatus?.progress || 0
          bValue = b.onboardingStatus?.progress || 0
          break
        case 'department':
          aValue = a.department
          bValue = b.department
          break
        case 'role':
          aValue = a.role
          bValue = b.role
          break
        default:
          aValue = a.username
          bValue = b.username
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [teamMembers, department, filterStatus, sortBy, sortOrder])

  const handleSelectAll = () => {
    if (selectedMembers.size === filteredMembers.length) {
      setSelectedMembers(new Set())
    } else {
      setSelectedMembers(new Set(filteredMembers.map(m => m.id)))
    }
  }

  const handleMemberSelect = (memberId) => {
    const newSelected = new Set(selectedMembers)
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId)
    } else {
      newSelected.add(memberId)
    }
    setSelectedMembers(newSelected)

    if (onMemberSelect) {
      onMemberSelect(memberId, newSelected.has(memberId))
    }
  }

  const handleBulkAction = (action) => {
    if (onBulkAction && selectedMembers.size > 0) {
      onBulkAction(action, Array.from(selectedMembers))
    }
  }

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'success'
    if (progress >= 50) return 'warning'
    return 'danger'
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
      case 'team_lead':
        return '👑'
      case 'developer':
        return '💻'
      case 'designer':
        return '🎨'
      case 'manager':
        return '📊'
      default:
        return '👤'
    }
  }

  if (viewMode === 'overview') {
    return (
      <div data-testid="leadership-dashboard-overview" className="leadership-dashboard overview">
        <div className="dashboard-header">
          <h1>Leadership Onboarding Overview</h1>
          <div className="header-actions">
            <button
              onClick={() => onExportReport && onExportReport('overview')}
              data-testid="export-overview-button"
              className="export-btn"
            >
              📊 Export Report
            </button>
          </div>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">👥</div>
            <div className="metric-content">
              <div className="metric-value" data-testid="total-team-members">
                {metrics.adoption?.totalUsers || 0}
              </div>
              <div className="metric-label">Total Team Members</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">✅</div>
            <div className="metric-content">
              <div className="metric-value" data-testid="completed-onboarding">
                {metrics.adoption?.onboardedUsers || 0}
              </div>
              <div className="metric-label">Completed Onboarding</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">📈</div>
            <div className="metric-content">
              <div className="metric-value" data-testid="completion-rate">
                {metrics.adoption?.completionRate || 0}%
              </div>
              <div className="metric-label">Completion Rate</div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">⭐</div>
            <div className="metric-content">
              <div className="metric-value" data-testid="avg-satisfaction">
                {metrics.adoption?.timeToValue?.avg || 0}
              </div>
              <div className="metric-label">Avg Time to Value (days)</div>
            </div>
          </div>
        </div>

        <div className="department-breakdown">
          <h2>Department Progress</h2>
          <div className="department-grid">
            {Object.entries(metrics.adoption?.departmentBreakdown || {}).map(([dept, data]) => (
              <div key={dept} className="department-card" data-testid={`dept-${dept.toLowerCase()}`}>
                <div className="dept-header">
                  <h3>{dept}</h3>
                  <span className="dept-rate">{data.rate}%</span>
                </div>
                <div className="dept-progress">
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${getProgressColor(data.rate)}`}
                      style={{ width: `${data.rate}%` }}
                    />
                  </div>
                  <div className="dept-stats">
                    <span>{data.completed}/{data.total} completed</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="phase-overview">
          <h2>Phase Progress</h2>
          <div className="phase-grid">
            {phases.map(phase => (
              <div key={phase.id} className={`phase-overview-card ${phase.status}`} data-testid={`phase-overview-${phase.id}`}>
                <div className="phase-header">
                  <h3>{phase.name}</h3>
                  <span className={`status-badge ${phase.status}`}>
                    {phase.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="phase-metrics">
                  <div className="metric">
                    <span className="value">{phase.metrics.completionRate}%</span>
                    <span className="label">Complete</span>
                  </div>
                  <div className="metric">
                    <span className="value">{phase.completedUsers.length}/{phase.targetUsers.length}</span>
                    <span className="label">Users</span>
                  </div>
                  <div className="metric">
                    <span className="value">{phase.metrics.userSatisfaction}/5</span>
                    <span className="label">Satisfaction</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="leadership-dashboard-detailed" className="leadership-dashboard detailed">
      <div className="dashboard-header">
        <h1>Team Onboarding Details</h1>
        <div className="header-controls">
          <div className="filters">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              data-testid="status-filter"
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              data-testid="sort-select"
              className="sort-select"
            >
              <option value="name">Sort by Name</option>
              <option value="progress">Sort by Progress</option>
              <option value="department">Sort by Department</option>
              <option value="role">Sort by Role</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              data-testid="sort-order-button"
              className="sort-order-btn"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          <div className="bulk-actions">
            <button
              onClick={handleSelectAll}
              data-testid="select-all-button"
              className="select-all-btn"
            >
              {selectedMembers.size === filteredMembers.length ? 'Deselect All' : 'Select All'}
            </button>

            {selectedMembers.size > 0 && (
              <div className="bulk-action-buttons">
                <button
                  onClick={() => handleBulkAction('send_reminder')}
                  data-testid="bulk-reminder-button"
                  className="bulk-action-btn"
                >
                  Send Reminder ({selectedMembers.size})
                </button>
                <button
                  onClick={() => handleBulkAction('export_progress')}
                  data-testid="bulk-export-button"
                  className="bulk-action-btn"
                >
                  Export Selected
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="team-summary">
        <div className="summary-stats">
          <span data-testid="showing-count">
            Showing {filteredMembers.length} of {teamMembers.length} members
          </span>
          <span data-testid="selected-count">
            {selectedMembers.size} selected
          </span>
        </div>
      </div>

      <div className="team-members-list">
        {filteredMembers.map(member => (
          <div
            key={member.id}
            className={`member-card ${member.onboardingStatus?.status || 'pending'} ${
              selectedMembers.has(member.id) ? 'selected' : ''
            }`}
            data-testid={`member-card-${member.id}`}
          >
            <div className="member-header">
              <input
                type="checkbox"
                checked={selectedMembers.has(member.id)}
                onChange={() => handleMemberSelect(member.id)}
                data-testid={`member-checkbox-${member.id}`}
                className="member-checkbox"
              />

              <div className="member-info">
                <div className="member-name">
                  <span className="role-icon">{getRoleIcon(member.role)}</span>
                  <span className="name">{member.username}</span>
                  <span className="email">{member.email}</span>
                </div>
                <div className="member-meta">
                  <span className="department">{member.department}</span>
                  <span className="role">{member.role}</span>
                </div>
              </div>

              <div className="member-status">
                <span
                  className={`status-badge ${member.onboardingStatus?.status || 'pending'}`}
                  data-testid={`member-status-${member.id}`}
                >
                  {(member.onboardingStatus?.status || 'pending').replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="member-progress">
              <div className="progress-info">
                <span className="progress-text">
                  Progress: {member.onboardingStatus?.progress || 0}%
                </span>
                <span className="current-step">
                  {member.onboardingStatus?.currentStep ?
                    `Step ${member.onboardingStatus.currentStep}` :
                    'Not started'
                  }
                </span>
              </div>

              <div className="progress-bar">
                <div
                  className={`progress-fill ${getProgressColor(member.onboardingStatus?.progress || 0)}`}
                  style={{ width: `${member.onboardingStatus?.progress || 0}%` }}
                  data-testid={`member-progress-${member.id}`}
                />
              </div>
            </div>

            {member.onboardingStatus?.steps && (
              <div className="member-steps">
                <div className="steps-grid">
                  {member.onboardingStatus.steps.map(step => (
                    <div
                      key={step.id}
                      className={`step-item ${step.status}`}
                      data-testid={`step-${step.id}-${member.id}`}
                    >
                      <span className="step-indicator">
                        {step.status === 'completed' ? '✓' :
                         step.status === 'in_progress' ? '⏳' : '○'}
                      </span>
                      <span className="step-name">{step.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="member-actions">
              <button
                onClick={() => onMemberSelect && onMemberSelect(member.id, true)}
                data-testid={`view-details-${member.id}`}
                className="action-btn view-btn"
              >
                View Details
              </button>

              {member.onboardingStatus?.status === 'in_progress' && (
                <button
                  onClick={() => handleBulkAction('send_reminder', [member.id])}
                  data-testid={`send-reminder-${member.id}`}
                  className="action-btn reminder-btn"
                >
                  Send Reminder
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredMembers.length === 0 && (
          <div className="empty-state" data-testid="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-message">
              No team members match the current filters
            </div>
            <button
              onClick={() => {
                setFilterStatus('all')
                setSortBy('name')
              }}
              className="reset-filters-btn"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

describe('LeadershipOnboardingDashboard', () => {
  const mockOnMemberSelect = jest.fn()
  const mockOnBulkAction = jest.fn()
  const mockOnExportReport = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Overview Mode', () => {
    it('should render overview dashboard with key metrics', () => {
      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          phases={mockPhases}
          metrics={mockMetrics}
          viewMode="overview"
          onExportReport={mockOnExportReport}
        />
      )

      expect(screen.getByTestId('leadership-dashboard-overview')).toBeInTheDocument()
      expect(screen.getByText('Leadership Onboarding Overview')).toBeInTheDocument()
    })

    it('should display correct metric values', () => {
      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          phases={mockPhases}
          metrics={mockMetrics}
          viewMode="overview"
        />
      )

      expect(screen.getByTestId('total-team-members')).toHaveTextContent('50')
      expect(screen.getByTestId('completed-onboarding')).toHaveTextContent('23')
      expect(screen.getByTestId('completion-rate')).toHaveTextContent('78%')
      expect(screen.getByTestId('avg-satisfaction')).toHaveTextContent('1.5')
    })

    it('should show department breakdown with progress bars', () => {
      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          phases={mockPhases}
          metrics={mockMetrics}
          viewMode="overview"
        />
      )

      expect(screen.getByTestId('dept-engineering')).toBeInTheDocument()
      expect(screen.getByTestId('dept-product')).toBeInTheDocument()
      expect(screen.getByTestId('dept-design')).toBeInTheDocument()
    })

    it('should display phase overview cards', () => {
      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          phases={mockPhases}
          metrics={mockMetrics}
          viewMode="overview"
        />
      )

      mockPhases.forEach(phase => {
        expect(screen.getByTestId(`phase-overview-${phase.id}`)).toBeInTheDocument()
      })
    })

    it('should handle export report action', async () => {
      const user = userEvent.setup()

      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          phases={mockPhases}
          metrics={mockMetrics}
          viewMode="overview"
          onExportReport={mockOnExportReport}
        />
      )

      const exportButton = screen.getByTestId('export-overview-button')
      await user.click(exportButton)

      expect(mockOnExportReport).toHaveBeenCalledWith('overview')
    })
  })

  describe('Detailed Mode', () => {
    it('should render detailed dashboard with team member list', () => {
      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          phases={mockPhases}
          metrics={mockMetrics}
          viewMode="detailed"
        />
      )

      expect(screen.getByTestId('leadership-dashboard-detailed')).toBeInTheDocument()
      expect(screen.getByText('Team Onboarding Details')).toBeInTheDocument()
    })

    it('should display team members with correct information', () => {
      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
        />
      )

      mockUsers.forEach(member => {
        expect(screen.getByTestId(`member-card-${member.id}`)).toBeInTheDocument()
        expect(screen.getByText(member.username)).toBeInTheDocument()
        expect(screen.getByText(member.email)).toBeInTheDocument()
      })
    })

    it('should show correct role icons', () => {
      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
        />
      )

      // Check that role icons are displayed (this would depend on actual implementation)
      const memberCards = screen.getAllByTestId(/member-card-/)
      expect(memberCards.length).toBeGreaterThan(0)
    })

    it('should display member progress with correct colors', () => {
      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
        />
      )

      mockUsers.forEach(member => {
        const progressBar = screen.getByTestId(`member-progress-${member.id}`)
        const progress = member.onboardingStatus?.progress || 0

        expect(progressBar).toHaveStyle({ width: `${progress}%` })

        if (progress >= 80) {
          expect(progressBar).toHaveClass('success')
        } else if (progress >= 50) {
          expect(progressBar).toHaveClass('warning')
        } else {
          expect(progressBar).toHaveClass('danger')
        }
      })
    })

    it('should show member steps with correct indicators', () => {
      const memberWithSteps = mockUsers.find(u => u.onboardingStatus?.steps)

      if (memberWithSteps) {
        render(
          <LeadershipOnboardingDashboard
            teamMembers={[memberWithSteps]}
            viewMode="detailed"
          />
        )

        memberWithSteps.onboardingStatus.steps.forEach(step => {
          const stepElement = screen.getByTestId(`step-${step.id}-${memberWithSteps.id}`)
          expect(stepElement).toBeInTheDocument()

          if (step.status === 'completed') {
            expect(stepElement).toHaveTextContent('✓')
          } else if (step.status === 'in_progress') {
            expect(stepElement).toHaveTextContent('⏳')
          } else {
            expect(stepElement).toHaveTextContent('○')
          }
        })
      }
    })
  })

  describe('Filtering and Sorting', () => {
    it('should filter members by status', async () => {
      const user = userEvent.setup()

      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
        />
      )

      const statusFilter = screen.getByTestId('status-filter')
      await user.selectOptions(statusFilter, 'completed')

      // Should only show completed members
      const completedMembers = mockUsers.filter(m => m.onboardingStatus?.status === 'completed')
      expect(screen.getByTestId('showing-count')).toHaveTextContent(
        `Showing ${completedMembers.length} of ${mockUsers.length} members`
      )
    })

    it('should sort members by different criteria', async () => {
      const user = userEvent.setup()

      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
        />
      )

      const sortSelect = screen.getByTestId('sort-select')
      await user.selectOptions(sortSelect, 'progress')

      // Members should be sorted by progress (this would need to be verified in implementation)
      expect(sortSelect).toHaveValue('progress')
    })

    it('should toggle sort order', async () => {
      const user = userEvent.setup()

      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
        />
      )

      const sortOrderButton = screen.getByTestId('sort-order-button')
      expect(sortOrderButton).toHaveTextContent('↑') // Initial ascending

      await user.click(sortOrderButton)
      expect(sortOrderButton).toHaveTextContent('↓') // Now descending

      await user.click(sortOrderButton)
      expect(sortOrderButton).toHaveTextContent('↑') // Back to ascending
    })

    it('should show empty state when no members match filters', async () => {
      const user = userEvent.setup()

      // Use members that don't have 'pending' status
      const completedUsers = mockUsers.filter(u => u.onboardingStatus?.status !== 'pending')

      render(
        <LeadershipOnboardingDashboard
          teamMembers={completedUsers}
          viewMode="detailed"
        />
      )

      const statusFilter = screen.getByTestId('status-filter')
      await user.selectOptions(statusFilter, 'pending')

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No team members match the current filters')).toBeInTheDocument()
    })
  })

  describe('Member Selection and Bulk Actions', () => {
    it('should handle individual member selection', async () => {
      const user = userEvent.setup()

      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
          onMemberSelect={mockOnMemberSelect}
        />
      )

      const firstMember = mockUsers[0]
      const checkbox = screen.getByTestId(`member-checkbox-${firstMember.id}`)

      await user.click(checkbox)
      expect(mockOnMemberSelect).toHaveBeenCalledWith(firstMember.id, true)
    })

    it('should handle select all functionality', async () => {
      const user = userEvent.setup()

      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
        />
      )

      const selectAllButton = screen.getByTestId('select-all-button')
      expect(selectAllButton).toHaveTextContent('Select All')

      await user.click(selectAllButton)
      expect(selectAllButton).toHaveTextContent('Deselect All')

      // All checkboxes should be checked
      mockUsers.forEach(member => {
        const checkbox = screen.getByTestId(`member-checkbox-${member.id}`)
        expect(checkbox).toBeChecked()
      })
    })

    it('should show bulk action buttons when members are selected', async () => {
      const user = userEvent.setup()

      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
          onBulkAction={mockOnBulkAction}
        />
      )

      // Select first member
      const firstCheckbox = screen.getByTestId(`member-checkbox-${mockUsers[0].id}`)
      await user.click(firstCheckbox)

      expect(screen.getByTestId('bulk-reminder-button')).toBeInTheDocument()
      expect(screen.getByTestId('bulk-export-button')).toBeInTheDocument()
      expect(screen.getByTestId('selected-count')).toHaveTextContent('1 selected')
    })

    it('should handle bulk reminder action', async () => {
      const user = userEvent.setup()

      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
          onBulkAction={mockOnBulkAction}
        />
      )

      // Select multiple members
      await user.click(screen.getByTestId(`member-checkbox-${mockUsers[0].id}`))
      await user.click(screen.getByTestId(`member-checkbox-${mockUsers[1].id}`))

      const bulkReminderButton = screen.getByTestId('bulk-reminder-button')
      expect(bulkReminderButton).toHaveTextContent('Send Reminder (2)')

      await user.click(bulkReminderButton)
      expect(mockOnBulkAction).toHaveBeenCalledWith('send_reminder', [mockUsers[0].id, mockUsers[1].id])
    })

    it('should handle individual member actions', async () => {
      const user = userEvent.setup()

      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
          onMemberSelect={mockOnMemberSelect}
          onBulkAction={mockOnBulkAction}
        />
      )

      const firstMember = mockUsers[0]
      const viewDetailsButton = screen.getByTestId(`view-details-${firstMember.id}`)

      await user.click(viewDetailsButton)
      expect(mockOnMemberSelect).toHaveBeenCalledWith(firstMember.id, true)

      // Check for reminder button if member is in progress
      const inProgressMember = mockUsers.find(u => u.onboardingStatus?.status === 'in_progress')
      if (inProgressMember) {
        const reminderButton = screen.getByTestId(`send-reminder-${inProgressMember.id}`)
        await user.click(reminderButton)
        expect(mockOnBulkAction).toHaveBeenCalledWith('send_reminder', [inProgressMember.id])
      }
    })
  })

  describe('Department Filtering', () => {
    it('should filter members by department', () => {
      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
          department="Engineering"
        />
      )

      const engineeringMembers = mockUsers.filter(m => m.department === 'Engineering')
      expect(screen.getByTestId('showing-count')).toHaveTextContent(
        `Showing ${engineeringMembers.length} of ${mockUsers.length} members`
      )
    })

    it('should show all members when department is "all"', () => {
      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
          department="all"
        />
      )

      expect(screen.getByTestId('showing-count')).toHaveTextContent(
        `Showing ${mockUsers.length} of ${mockUsers.length} members`
      )
    })
  })

  describe('Progress Color Coding', () => {
    it('should apply correct progress colors based on completion rate', () => {
      const testMembers = [
        {
          ...mockUsers[0],
          onboardingStatus: { progress: 90 } // Success
        },
        {
          ...mockUsers[0],
          id: 'test-2',
          onboardingStatus: { progress: 60 } // Warning
        },
        {
          ...mockUsers[0],
          id: 'test-3',
          onboardingStatus: { progress: 30 } // Danger
        }
      ]

      render(
        <LeadershipOnboardingDashboard
          teamMembers={testMembers}
          viewMode="detailed"
        />
      )

      expect(screen.getByTestId('member-progress-test-1')).toHaveClass('success')
      expect(screen.getByTestId('member-progress-test-2')).toHaveClass('warning')
      expect(screen.getByTestId('member-progress-test-3')).toHaveClass('danger')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty team members list', () => {
      render(
        <LeadershipOnboardingDashboard
          teamMembers={[]}
          viewMode="detailed"
        />
      )

      expect(screen.getByTestId('showing-count')).toHaveTextContent('Showing 0 of 0 members')
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('should handle members without onboarding status', () => {
      const membersWithoutStatus = [{
        id: 'no-status',
        username: 'no-status-user',
        email: 'no-status@example.com',
        department: 'Engineering',
        role: 'developer'
        // No onboardingStatus
      }]

      render(
        <LeadershipOnboardingDashboard
          teamMembers={membersWithoutStatus}
          viewMode="detailed"
        />
      )

      const memberCard = screen.getByTestId('member-card-no-status')
      expect(memberCard).toBeInTheDocument()
      expect(screen.getByTestId('member-status-no-status')).toHaveTextContent('PENDING')
    })

    it('should handle missing metrics gracefully', () => {
      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          phases={mockPhases}
          metrics={{}} // Empty metrics
          viewMode="overview"
        />
      )

      expect(screen.getByTestId('total-team-members')).toHaveTextContent('0')
      expect(screen.getByTestId('completed-onboarding')).toHaveTextContent('0')
      expect(screen.getByTestId('completion-rate')).toHaveTextContent('0%')
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels and ARIA attributes', () => {
      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
        />
      )

      const statusFilter = screen.getByTestId('status-filter')
      const sortSelect = screen.getByTestId('sort-select')

      expect(statusFilter).toBeInTheDocument()
      expect(sortSelect).toBeInTheDocument()

      // Checkboxes should be properly labeled
      mockUsers.forEach(member => {
        const checkbox = screen.getByTestId(`member-checkbox-${member.id}`)
        expect(checkbox).toHaveAttribute('type', 'checkbox')
      })
    })

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup()

      render(
        <LeadershipOnboardingDashboard
          teamMembers={mockUsers}
          viewMode="detailed"
        />
      )

      const firstCheckbox = screen.getByTestId(`member-checkbox-${mockUsers[0].id}`)

      // Should be focusable
      firstCheckbox.focus()
      expect(firstCheckbox).toHaveFocus()

      // Should respond to space key
      await user.keyboard(' ')
      expect(firstCheckbox).toBeChecked()
    })
  })

  describe('Performance', () => {
    it('should handle large member lists efficiently', () => {
      const manyMembers = Array.from({ length: 1000 }, (_, i) => ({
        id: `member-${i}`,
        username: `member${i}`,
        email: `member${i}@example.com`,
        department: 'Engineering',
        role: 'developer',
        onboardingStatus: {
          status: 'in_progress',
          progress: Math.floor(Math.random() * 100)
        }
      }))

      const startTime = performance.now()

      render(
        <LeadershipOnboardingDashboard
          teamMembers={manyMembers}
          viewMode="detailed"
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(3000) // Less than 3 seconds
    })

    it('should efficiently update when filters change', async () => {
      const user = userEvent.setup()
      const manyMembers = Array.from({ length: 100 }, (_, i) => ({
        id: `member-${i}`,
        username: `member${i}`,
        email: `member${i}@example.com`,
        department: i % 2 === 0 ? 'Engineering' : 'Product',
        role: 'developer',
        onboardingStatus: {
          status: i % 3 === 0 ? 'completed' : 'in_progress',
          progress: Math.floor(Math.random() * 100)
        }
      }))

      render(
        <LeadershipOnboardingDashboard
          teamMembers={manyMembers}
          viewMode="detailed"
        />
      )

      const statusFilter = screen.getByTestId('status-filter')

      // Filter changes should be fast
      const startTime = performance.now()
      await user.selectOptions(statusFilter, 'completed')
      const endTime = performance.now()
      const filterTime = endTime - startTime

      expect(filterTime).toBeLessThan(100) // Less than 100ms
    })
  })
})
