import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeploymentDashboard from '../../../dashboard/src/pages/DeploymentDashboard'
import { deploymentAPIClient } from '../../../dashboard/src/lib/deployment-api'

// Mock the API client
jest.mock('../../../dashboard/src/lib/deployment-api', () => ({
  deploymentAPIClient: {
    repositories: {
      getRepositories: jest.fn(),
    },
    system: {
      getSystemStatus: jest.fn(),
    },
    deployment: {
      getActions: jest.fn(),
      executeAction: jest.fn(),
    }
  }
}))

// Mock react-spring to avoid animation issues
jest.mock('@react-spring/web', () => ({
  useSpring: () => ({}),
  animated: {
    div: 'div'
  },
  config: {}
}))

describe('DeploymentDashboard', () => {
  const mockRepositories = [
    {
      id: 'repo-1',
      name: 'claude-resources-setup',
      organization: 'candlefish-ai',
      url: 'https://github.com/candlefish-ai/claude-resources-setup',
      status: 'synced',
      lastSync: '2025-01-04T10:30:00Z',
      hasClaudeResources: true,
      symlinkStatus: 'complete',
      metadata: {
        branch: 'main',
        commit: 'abc123',
        syncDuration: 45,
        fileCount: 23
      }
    },
    {
      id: 'repo-2',
      name: 'project-alpha',
      organization: 'candlefish-ai',
      status: 'error',
      lastError: 'Authentication failed',
      hasClaudeResources: false,
      symlinkStatus: 'error'
    }
  ]

  const mockSystemStatus = {
    overallHealth: 'healthy',
    totalRepositories: 12,
    syncedRepositories: 9,
    pendingSyncs: 2,
    failedSyncs: 1,
    resourcesVersion: 'v2.1.0',
    components: {
      syncService: 'healthy',
      distributionService: 'healthy',
      storageService: 'healthy'
    }
  }

  const mockDeploymentActions = [
    {
      id: 'action-1',
      type: 'sync',
      title: 'Sync All Repositories',
      description: 'Synchronize Claude resources across all repositories',
      status: 'idle',
      lastRun: '2025-01-04T10:00:00Z',
      estimatedDuration: 120
    }
  ]

  beforeEach(() => {
    deploymentAPIClient.repositories.getRepositories.mockResolvedValue(mockRepositories)
    deploymentAPIClient.system.getSystemStatus.mockResolvedValue(mockSystemStatus)
    deploymentAPIClient.deployment.getActions.mockResolvedValue(mockDeploymentActions)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render main dashboard elements', async () => {
      render(<DeploymentDashboard />)

      expect(screen.getByText('Claude Resources Deployment')).toBeInTheDocument()
      expect(screen.getByText('Manage and deploy Claude resources across your organization')).toBeInTheDocument()
      expect(screen.getByText('System Status')).toBeInTheDocument()
      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByText('Repositories')).toBeInTheDocument()
    })

    it('should display system health metrics', async () => {
      render(<DeploymentDashboard />)

      expect(screen.getByText('12')).toBeInTheDocument() // Total Repos
      expect(screen.getByText('9')).toBeInTheDocument()  // Synced
      expect(screen.getByText('2')).toBeInTheDocument()  // Pending
      expect(screen.getByText('1')).toBeInTheDocument()  // Failed
    })

    it('should display resources version', async () => {
      render(<DeploymentDashboard />)

      expect(screen.getByText('v2.1.0')).toBeInTheDocument()
    })
  })

  describe('Repository Cards', () => {
    it('should render repository information correctly', async () => {
      render(<DeploymentDashboard />)

      // Wait for repositories to load
      await waitFor(() => {
        expect(screen.getByText('claude-resources-setup')).toBeInTheDocument()
      })

      expect(screen.getByText('candlefish-ai')).toBeInTheDocument()
      expect(screen.getByText('synced')).toBeInTheDocument()
      expect(screen.getByText('23')).toBeInTheDocument() // File count
    })

    it('should display error states for failed repositories', async () => {
      render(<DeploymentDashboard />)

      await waitFor(() => {
        expect(screen.getByText('project-alpha')).toBeInTheDocument()
      })

      expect(screen.getByText('error')).toBeInTheDocument()
      expect(screen.getByText('Authentication failed')).toBeInTheDocument()
    })

    it('should show Claude Resources indicator when present', async () => {
      render(<DeploymentDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Claude Resources')).toBeInTheDocument()
      })
    })

    it('should show symlinks status when complete', async () => {
      render(<DeploymentDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Symlinks')).toBeInTheDocument()
      })
    })

    it('should make repository URLs clickable', async () => {
      render(<DeploymentDashboard />)

      await waitFor(() => {
        const repoLink = screen.getByRole('link')
        expect(repoLink).toHaveAttribute('href', 'https://github.com/candlefish-ai/claude-resources-setup')
        expect(repoLink).toHaveAttribute('target', '_blank')
        expect(repoLink).toHaveAttribute('rel', 'noopener noreferrer')
      })
    })
  })

  describe('System Health Card', () => {
    it('should display overall health status', async () => {
      render(<DeploymentDashboard />)

      expect(screen.getByText('Healthy')).toBeInTheDocument()
    })

    it('should show component health indicators', async () => {
      render(<DeploymentDashboard />)

      expect(screen.getByText('Sync Service')).toBeInTheDocument()
      expect(screen.getByText('Distribution Service')).toBeInTheDocument()
      expect(screen.getByText('Storage Service')).toBeInTheDocument()
    })

    it('should display metrics in correct format', async () => {
      render(<DeploymentDashboard />)

      expect(screen.getByText('Total Repos')).toBeInTheDocument()
      expect(screen.getByText('Synced')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Failed')).toBeInTheDocument()
    })
  })

  describe('Deployment Actions', () => {
    it('should render deployment action buttons', async () => {
      render(<DeploymentDashboard />)

      expect(screen.getByText('Sync All Repositories')).toBeInTheDocument()
      expect(screen.getByText('Synchronize Claude resources across all repositories')).toBeInTheDocument()
    })

    it('should handle action button clicks', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      render(<DeploymentDashboard />)

      const actionButton = screen.getByText('Sync All Repositories').closest('button')
      await user.click(actionButton)

      expect(consoleSpy).toHaveBeenCalledWith('Executing action:', 'sync')

      consoleSpy.mockRestore()
    })

    it('should show action status correctly', async () => {
      render(<DeploymentDashboard />)

      expect(screen.getByText('Last run:')).toBeInTheDocument()
      expect(screen.getByText('Est. duration: 120s')).toBeInTheDocument()
    })

    it('should disable running actions', async () => {
      const runningAction = {
        ...mockDeploymentActions[0],
        status: 'running',
        progress: 50
      }

      deploymentAPIClient.deployment.getActions.mockResolvedValue([runningAction])

      render(<DeploymentDashboard />)

      await waitFor(() => {
        const actionButton = screen.getByText('Sync All Repositories').closest('button')
        expect(actionButton).toBeDisabled()
      })
    })

    it('should show progress for running actions', async () => {
      const runningAction = {
        ...mockDeploymentActions[0],
        status: 'running',
        progress: 75
      }

      deploymentAPIClient.deployment.getActions.mockResolvedValue([runningAction])

      render(<DeploymentDashboard />)

      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument()
      })
    })

    it('should display action errors', async () => {
      const failedAction = {
        ...mockDeploymentActions[0],
        status: 'failed',
        error: 'Sync failed due to network timeout'
      }

      deploymentAPIClient.deployment.getActions.mockResolvedValue([failedAction])

      render(<DeploymentDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Sync failed due to network timeout')).toBeInTheDocument()
      })
    })
  })

  describe('Status Badges', () => {
    it('should render correct status badge for synced repositories', async () => {
      render(<DeploymentDashboard />)

      await waitFor(() => {
        const badge = screen.getByText('synced')
        expect(badge).toHaveClass('text-green-800', 'bg-green-100')
      })
    })

    it('should render correct status badge for error repositories', async () => {
      render(<DeploymentDashboard />)

      await waitFor(() => {
        const badge = screen.getByText('error')
        expect(badge).toHaveClass('text-red-800', 'bg-red-100')
      })
    })

    it('should handle syncing status with animation', async () => {
      const syncingRepo = {
        ...mockRepositories[0],
        status: 'syncing'
      }

      deploymentAPIClient.repositories.getRepositories.mockResolvedValue([syncingRepo])

      render(<DeploymentDashboard />)

      await waitFor(() => {
        const badge = screen.getByText('syncing')
        expect(badge).toHaveClass('text-blue-800', 'bg-blue-100')
      })
    })
  })

  describe('Date and Time Formatting', () => {
    it('should format last sync timestamp correctly', async () => {
      render(<DeploymentDashboard />)

      await waitFor(() => {
        // Check that date is formatted (exact format depends on locale)
        const lastSyncElement = screen.getByText('Last Sync:').nextElementSibling
        expect(lastSyncElement.textContent).toMatch(/\d+\/\d+\/\d+/)
      })
    })

    it('should show "Never" for repositories without last sync', async () => {
      const neverSyncedRepo = {
        ...mockRepositories[0],
        lastSync: undefined
      }

      deploymentAPIClient.repositories.getRepositories.mockResolvedValue([neverSyncedRepo])

      render(<DeploymentDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Never')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      deploymentAPIClient.repositories.getRepositories.mockRejectedValue(
        new Error('Failed to fetch repositories')
      )

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      render(<DeploymentDashboard />)

      // Component should still render without crashing
      expect(screen.getByText('Claude Resources Deployment')).toBeInTheDocument()

      consoleSpy.mockRestore()
    })

    it('should handle missing repository metadata', async () => {
      const repoWithoutMetadata = {
        id: 'repo-minimal',
        name: 'minimal-repo',
        organization: 'test-org',
        status: 'synced',
        hasClaudeResources: false,
        symlinkStatus: 'none'
      }

      deploymentAPIClient.repositories.getRepositories.mockResolvedValue([repoWithoutMetadata])

      render(<DeploymentDashboard />)

      await waitFor(() => {
        expect(screen.getByText('minimal-repo')).toBeInTheDocument()
        expect(screen.getByText('0')).toBeInTheDocument() // Default file count
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      render(<DeploymentDashboard />)

      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('Claude Resources Deployment')

      const sectionHeadings = screen.getAllByRole('heading', { level: 2 })
      expect(sectionHeadings).toHaveLength(2)
      expect(sectionHeadings[0]).toHaveTextContent('Quick Actions')
      expect(sectionHeadings[1]).toHaveTextContent('Repositories')
    })

    it('should have accessible button labels', async () => {
      render(<DeploymentDashboard />)

      const manageTeamButton = screen.getByRole('button', { name: /manage team/i })
      expect(manageTeamButton).toBeInTheDocument()
    })

    it('should have proper link accessibility', async () => {
      render(<DeploymentDashboard />)

      await waitFor(() => {
        const repoLinks = screen.getAllByRole('link')
        repoLinks.forEach(link => {
          expect(link).toHaveAttribute('rel', 'noopener noreferrer')
        })
      })
    })
  })

  describe('Responsive Design', () => {
    it('should render grid layout classes correctly', async () => {
      render(<DeploymentDashboard />)

      const mainGrid = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-3')
      expect(mainGrid).toBeInTheDocument()
    })

    it('should handle mobile layout classes', async () => {
      render(<DeploymentDashboard />)

      const responsiveElements = document.querySelectorAll('[class*="sm:"], [class*="md:"], [class*="lg:"]')
      expect(responsiveElements.length).toBeGreaterThan(0)
    })
  })
})
