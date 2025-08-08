import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

import { SecurityConfigurationPanel } from '../../components/secrets/SecurityConfigurationPanel'

// Mock fetch
global.fetch = jest.fn()

describe('SecurityConfigurationPanel', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  const mockSecurityChecks = [
    {
      id: 'ssl-cert',
      name: 'SSL Certificate Validation',
      description: 'Verify SSL certificates are valid and not expired',
      status: 'passed' as const,
      required: true,
      details: 'Certificate expires in 89 days'
    },
    {
      id: 'secret-rotation',
      name: 'Secret Rotation Schedule',
      description: 'Ensure secrets are rotated according to policy',
      status: 'warning' as const,
      required: true,
      details: 'Some secrets expire within 30 days'
    },
    {
      id: 'access-logs',
      name: 'Access Logging',
      description: 'Verify all access attempts are logged',
      status: 'failed' as const,
      required: true,
      details: 'Missing logs for CompanyCam API'
    },
    {
      id: 'rate-limiting',
      name: 'Rate Limiting',
      description: 'Confirm rate limiting is properly configured',
      status: 'passed' as const,
      required: false,
      details: 'Rate limits configured: 100 req/min per user'
    }
  ]

  const mockConfiguration = {
    environment: 'production' as const,
    features: {
      multiFactorAuth: true,
      encryptionAtRest: true,
      auditLogging: true,
      ipWhitelisting: false
    },
    security: {
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireNumbers: true,
        requireSymbols: true
      },
      sessionTimeout: 3600,
      maxLoginAttempts: 5
    }
  }

  const defaultProps = {
    className: 'test-security-panel'
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock responses
    mockFetch.mockImplementation((url) => {
      const urlStr = url.toString()

      if (urlStr.includes('/api/v1/security/checks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            checks: mockSecurityChecks,
            overallStatus: 'warning',
            lastRun: new Date().toISOString()
          })
        } as Response)
      }

      if (urlStr.includes('/api/v1/security/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConfiguration)
        } as Response)
      }

      if (urlStr.includes('/api/v1/security/migrate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            migrationId: 'migration-123'
          })
        } as Response)
      }

      return Promise.reject(new Error('Unknown endpoint'))
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render security configuration panel with loading state', () => {
      render(<SecurityConfigurationPanel {...defaultProps} />)

      expect(screen.getByText('Security Configuration')).toBeInTheDocument()
      expect(screen.getByText('Loading security status...')).toBeInTheDocument()
    })

    it('should load and display security checks', async () => {
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('SSL Certificate Validation')).toBeInTheDocument()
      })

      expect(screen.getByText('Secret Rotation Schedule')).toBeInTheDocument()
      expect(screen.getByText('Access Logging')).toBeInTheDocument()
      expect(screen.getByText('Rate Limiting')).toBeInTheDocument()
    })

    it('should display overall security status', async () => {
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/overall.*status/i)).toBeInTheDocument()
      })

      expect(screen.getByText(/warning/i)).toBeInTheDocument()
    })

    it('should show security checklist with proper status indicators', async () => {
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('SSL Certificate Validation')).toBeInTheDocument()
      })

      // Check status indicators
      expect(screen.getAllByText('✓')).toHaveLength(2) // Passed checks
      expect(screen.getAllByText('⚠')).toHaveLength(1) // Warning check
      expect(screen.getAllByText('✗')).toHaveLength(1) // Failed check
    })
  })

  describe('Security Checks', () => {
    it('should display check details and requirements', async () => {
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('SSL Certificate Validation')).toBeInTheDocument()
      })

      // Check descriptions
      expect(screen.getByText('Verify SSL certificates are valid and not expired')).toBeInTheDocument()

      // Check details
      expect(screen.getByText('Certificate expires in 89 days')).toBeInTheDocument()
      expect(screen.getByText('Some secrets expire within 30 days')).toBeInTheDocument()

      // Check required indicators
      const requiredChecks = screen.getAllByText('Required')
      expect(requiredChecks).toHaveLength(3)

      const optionalChecks = screen.getAllByText('Optional')
      expect(optionalChecks).toHaveLength(1)
    })

    it('should run security checks manually', async () => {
      const user = userEvent.setup()
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('SSL Certificate Validation')).toBeInTheDocument()
      })

      const runChecksButton = screen.getByRole('button', { name: /run.*checks/i })
      await user.click(runChecksButton)

      expect(runChecksButton).toBeDisabled()
      expect(screen.getByText(/running.*checks/i)).toBeInTheDocument()

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/security/checks'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    })

    it('should fix failed checks when possible', async () => {
      const user = userEvent.setup()
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Access Logging')).toBeInTheDocument()
      })

      // Find the failed check and its fix button
      const failedCheck = screen.getByText('Access Logging').closest('[data-testid="security-check"]')
      const fixButton = within(failedCheck!).getByRole('button', { name: /fix/i })

      await user.click(fixButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/security/fix'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ checkId: 'access-logs' })
          })
        )
      })
    })

    it('should expand check details when clicked', async () => {
      const user = userEvent.setup()
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('SSL Certificate Validation')).toBeInTheDocument()
      })

      const checkRow = screen.getByText('SSL Certificate Validation').closest('[data-testid="security-check"]')
      await user.click(checkRow!)

      await waitFor(() => {
        expect(screen.getByText('Check Details')).toBeInTheDocument()
      })

      // Should show additional information
      expect(screen.getByText(/last.*checked/i)).toBeInTheDocument()
      expect(screen.getByText(/next.*check/i)).toBeInTheDocument()
    })
  })

  describe('Configuration Display', () => {
    it('should display current security configuration', async () => {
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Current Configuration')).toBeInTheDocument()
      })

      // Environment
      expect(screen.getByText('Environment: production')).toBeInTheDocument()

      // Features
      expect(screen.getByText('Multi-Factor Authentication: Enabled')).toBeInTheDocument()
      expect(screen.getByText('Encryption at Rest: Enabled')).toBeInTheDocument()
      expect(screen.getByText('Audit Logging: Enabled')).toBeInTheDocument()
      expect(screen.getByText('IP Whitelisting: Disabled')).toBeInTheDocument()
    })

    it('should display password policy settings', async () => {
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Password Policy')).toBeInTheDocument()
      })

      expect(screen.getByText('Minimum Length: 12 characters')).toBeInTheDocument()
      expect(screen.getByText('Require Uppercase: Yes')).toBeInTheDocument()
      expect(screen.getByText('Require Numbers: Yes')).toBeInTheDocument()
      expect(screen.getByText('Require Symbols: Yes')).toBeInTheDocument()
    })

    it('should display session and login settings', async () => {
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Session Settings')).toBeInTheDocument()
      })

      expect(screen.getByText('Session Timeout: 3600 seconds')).toBeInTheDocument()
      expect(screen.getByText('Max Login Attempts: 5')).toBeInTheDocument()
    })
  })

  describe('Migration Features', () => {
    it('should display migration status and options', async () => {
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Security Migration')).toBeInTheDocument()
      })

      expect(screen.getByText('Migrate to Latest Security Standards')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /start.*migration/i })).toBeInTheDocument()
    })

    it('should start security migration when requested', async () => {
      const user = userEvent.setup()
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Security Migration')).toBeInTheDocument()
      })

      const migrateButton = screen.getByRole('button', { name: /start.*migration/i })
      await user.click(migrateButton)

      // Should show confirmation dialog
      expect(screen.getByText('Confirm Migration')).toBeInTheDocument()
      expect(screen.getByText(/this will update.*security.*settings/i)).toBeInTheDocument()

      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/security/migrate'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    })

    it('should show migration progress and status', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.toString().includes('/api/v1/security/migrate')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              migrationId: 'migration-123',
              status: 'in_progress',
              progress: 45,
              steps: [
                { name: 'Update encryption', status: 'completed' },
                { name: 'Migrate secrets', status: 'in_progress' },
                { name: 'Update access controls', status: 'pending' }
              ]
            })
          } as Response)
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockConfiguration)
        } as Response)
      })

      const user = userEvent.setup()
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start.*migration/i })).toBeInTheDocument()
      })

      const migrateButton = screen.getByRole('button', { name: /start.*migration/i })
      await user.click(migrateButton)

      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText('Migration in Progress')).toBeInTheDocument()
      })

      expect(screen.getByText('45%')).toBeInTheDocument()
      expect(screen.getByText('Update encryption: Completed')).toBeInTheDocument()
      expect(screen.getByText('Migrate secrets: In Progress')).toBeInTheDocument()
      expect(screen.getByText('Update access controls: Pending')).toBeInTheDocument()
    })
  })

  describe('Security Recommendations', () => {
    it('should display security recommendations based on current status', async () => {
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Security Recommendations')).toBeInTheDocument()
      })

      // Should show recommendations based on failed/warning checks
      expect(screen.getByText(/fix.*access.*logging/i)).toBeInTheDocument()
      expect(screen.getByText(/rotate.*expiring.*secrets/i)).toBeInTheDocument()
    })

    it('should prioritize recommendations by severity', async () => {
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Security Recommendations')).toBeInTheDocument()
      })

      const recommendations = screen.getAllByRole('listitem')

      // High priority recommendations should come first
      expect(recommendations[0]).toHaveTextContent(/high.*priority/i)
      expect(recommendations[0]).toHaveClass(expect.stringMatching(/red/)) // High priority styling
    })

    it('should allow dismissing recommendations', async () => {
      const user = userEvent.setup()
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Security Recommendations')).toBeInTheDocument()
      })

      const dismissButtons = screen.getAllByRole('button', { name: /dismiss/i })
      await user.click(dismissButtons[0])

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/security/recommendations'),
          expect.objectContaining({
            method: 'DELETE'
          })
        )
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response)
      )

      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/failed.*to.*load/i)).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('should handle check execution failures', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.toString().includes('/api/v1/security/checks') && url.toString().includes('POST')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({
              error: 'Check execution failed',
              details: 'Unable to connect to SSL certificate service'
            })
          } as Response)
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ checks: mockSecurityChecks })
        } as Response)
      })

      const user = userEvent.setup()
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run.*checks/i })).toBeInTheDocument()
      })

      const runChecksButton = screen.getByRole('button', { name: /run.*checks/i })
      await user.click(runChecksButton)

      await waitFor(() => {
        expect(screen.getByText('Check execution failed')).toBeInTheDocument()
      })
    })
  })

  describe('Security Validation', () => {
    it('should validate user permissions before showing sensitive information', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ error: 'Insufficient permissions' })
        } as Response)
      )

      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/insufficient.*permissions/i)).toBeInTheDocument()
      })

      // Should not show security details
      expect(screen.queryByText('SSL Certificate Validation')).not.toBeInTheDocument()
    })

    it('should sanitize configuration display to prevent XSS', async () => {
      const maliciousConfig = {
        ...mockConfiguration,
        environment: '<script>alert("xss")</script>' as any
      }

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(maliciousConfig)
        } as Response)
      )

      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Current Configuration')).toBeInTheDocument()
      })

      // Should not execute script
      expect(document.querySelector('script')).toBeNull()

      // Should display escaped content
      expect(screen.getByText(/script.*alert/)).toBeInTheDocument()
    })
  })

  describe('Real-time Updates', () => {
    it('should update check status in real-time during execution', async () => {
      jest.useFakeTimers()

      // Mock progressive updates
      let callCount = 0
      mockFetch.mockImplementation((url) => {
        if (url.toString().includes('/api/v1/security/checks') && url.toString().includes('POST')) {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                status: 'running',
                progress: 25,
                completed: ['ssl-cert']
              })
            } as Response)
          } else {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                status: 'completed',
                progress: 100,
                checks: mockSecurityChecks
              })
            } as Response)
          }
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ checks: mockSecurityChecks })
        } as Response)
      })

      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run.*checks/i })).toBeInTheDocument()
      })

      const runChecksButton = screen.getByRole('button', { name: /run.*checks/i })
      await user.click(runChecksButton)

      // Should show initial progress
      await waitFor(() => {
        expect(screen.getByText('25%')).toBeInTheDocument()
      })

      // Fast-forward polling interval
      jest.advanceTimersByTime(2000)

      // Should show completion
      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument()
      })

      jest.useRealTimers()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('SSL Certificate Validation')).toBeInTheDocument()
      })

      // Check main sections
      expect(screen.getByRole('region', { name: /security.*configuration/i })).toBeInTheDocument()
      expect(screen.getByRole('table')).toBeInTheDocument()

      // Check interactive elements
      expect(screen.getByRole('button', { name: /run.*checks/i })).toBeInTheDocument()

      // Check status indicators have proper labels
      const statusElements = screen.getAllByRole('status')
      expect(statusElements.length).toBeGreaterThan(0)
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run.*checks/i })).toBeInTheDocument()
      })

      // Tab to the run checks button
      await user.tab()
      expect(screen.getByRole('button', { name: /run.*checks/i })).toHaveFocus()

      // Activate with keyboard
      await user.keyboard('{Enter}')
      expect(screen.getByText(/running.*checks/i)).toBeInTheDocument()
    })

    it('should announce status changes to screen readers', async () => {
      render(<SecurityConfigurationPanel {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('SSL Certificate Validation')).toBeInTheDocument()
      })

      // Should have live regions for status updates
      const liveRegions = screen.getAllByRole('status')
      liveRegions.forEach(region => {
        expect(region).toHaveAttribute('aria-live')
      })
    })
  })

  describe('Performance', () => {
    it('should not re-render excessively during status updates', async () => {
      const renderSpy = jest.fn()

      const TestComponent = () => {
        renderSpy()
        return <SecurityConfigurationPanel {...defaultProps} />
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText('SSL Certificate Validation')).toBeInTheDocument()
      })

      const initialRenderCount = renderSpy.mock.calls.length

      // Trigger manual checks
      const runChecksButton = screen.getByRole('button', { name: /run.*checks/i })
      fireEvent.click(runChecksButton)

      await waitFor(() => {
        expect(screen.getByText(/running.*checks/i)).toBeInTheDocument()
      })

      // Should not have excessive re-renders
      expect(renderSpy.mock.calls.length).toBeLessThan(initialRenderCount + 5)
    })
  })
})
