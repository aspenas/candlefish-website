import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

import { SecretsManagementDashboard } from '../../components/secrets/SecretsManagementDashboard'

// Mock fetch globally
global.fetch = jest.fn()

describe('SecretsManagementDashboard', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock successful API responses by default
    mockFetch.mockImplementation((url) => {
      if (url.toString().includes('/api/v1/secrets/config')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            environment: 'test',
            version: '1.0.0',
            features: {
              salesforce: true,
              companycam: true,
              audit: true
            },
            security: {
              tokenExpiry: 3600,
              rateLimits: {
                global: 1000,
                perUser: 100
              }
            }
          })
        } as Response)
      }

      if (url.toString().includes('/api/v1/services/')) {
        const serviceName = url.toString().includes('salesforce') ? 'salesforce' : 'companycam'
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            service: serviceName,
            status: 'healthy',
            lastCheck: new Date().toISOString(),
            lastSuccess: new Date().toISOString(),
            latency: 150
          })
        } as Response)
      }

      return Promise.reject(new Error('Unknown endpoint'))
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Rendering and Initial Load', () => {
    it('should render loading state initially', () => {
      render(<SecretsManagementDashboard />)

      expect(screen.getByText('Refreshing...')).toBeInTheDocument()
      expect(screen.getAllByRole('generic')).toHaveLength(expect.any(Number)) // Loading skeletons
    })

    it('should load and display dashboard data successfully', async () => {
      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Secrets Management')).toBeInTheDocument()
      })

      expect(screen.getByText('Environment: test')).toBeInTheDocument()
      expect(screen.getByText('Service Health')).toBeInTheDocument()
      expect(screen.getByText('Secret Rotation Status')).toBeInTheDocument()
      expect(screen.getByText('AWS Secrets Manager')).toBeInTheDocument()
    })

    it('should display service health information', async () => {
      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Salesforce')).toBeInTheDocument()
      })

      expect(screen.getByText('Companycam')).toBeInTheDocument()

      // Check for health status indicators
      const healthyStatuses = screen.getAllByText(/healthy/i)
      expect(healthyStatuses.length).toBeGreaterThan(0)
    })

    it('should display secrets rotation table', async () => {
      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Secret Rotation Status')).toBeInTheDocument()
      })

      // Check table headers
      expect(screen.getByText('Secret')).toBeInTheDocument()
      expect(screen.getByText('Service')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Last Rotated')).toBeInTheDocument()
      expect(screen.getByText('Next Rotation')).toBeInTheDocument()

      // Check for mock secret data
      expect(screen.getByText('SALESFORCE_CLIENT_SECRET')).toBeInTheDocument()
      expect(screen.getByText('COMPANYCAM_API_KEY')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should display error state when config fetch fails', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response)
      )

      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Dashboard Error')).toBeInTheDocument()
      })

      expect(screen.getByText('Failed to fetch configuration')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })

    it('should handle service status fetch failures gracefully', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.toString().includes('/api/v1/secrets/config')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              environment: 'test',
              version: '1.0.0',
              features: { salesforce: true, companycam: true, audit: true },
              security: { tokenExpiry: 3600, rateLimits: { global: 1000, perUser: 100 } }
            })
          } as Response)
        }

        if (url.toString().includes('/api/v1/services/salesforce/status')) {
          return Promise.resolve({
            ok: false,
            status: 503
          } as Response)
        }

        if (url.toString().includes('/api/v1/services/companycam/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              service: 'companycam',
              status: 'healthy',
              lastCheck: new Date().toISOString()
            })
          } as Response)
        }

        return Promise.reject(new Error('Unknown endpoint'))
      })

      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Secrets Management')).toBeInTheDocument()
      })

      // Should show error status for Salesforce
      const salesforceCard = screen.getByText('Salesforce').closest('div')
      expect(within(salesforceCard!).getByText(/error/i)).toBeInTheDocument()
      expect(within(salesforceCard!).getByText('HTTP 503')).toBeInTheDocument()

      // Should show healthy status for CompanyCam
      const companycamCard = screen.getByText('Companycam').closest('div')
      expect(within(companycamCard!).getByText(/healthy/i)).toBeInTheDocument()
    })

    it('should retry failed requests when retry button is clicked', async () => {
      // First call fails
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500
        } as Response)
      )

      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Dashboard Error')).toBeInTheDocument()
      })

      // Reset mock for successful retry
      mockFetch.mockImplementation((url) => {
        if (url.toString().includes('/api/v1/secrets/config')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              environment: 'test',
              version: '1.0.0',
              features: { salesforce: true, companycam: true, audit: true },
              security: { tokenExpiry: 3600, rateLimits: { global: 1000, perUser: 100 } }
            })
          } as Response)
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            service: 'test',
            status: 'healthy',
            lastCheck: new Date().toISOString()
          })
        } as Response)
      })

      const retryButton = screen.getByRole('button', { name: 'Retry' })
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Secrets Management')).toBeInTheDocument()
      })

      expect(screen.queryByText('Dashboard Error')).not.toBeInTheDocument()
    })
  })

  describe('Auto-refresh Functionality', () => {
    it('should auto-refresh data every 30 seconds', async () => {
      jest.useFakeTimers()

      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Secrets Management')).toBeInTheDocument()
      })

      const initialCallCount = mockFetch.mock.calls.length

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000)

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount)
      })

      jest.useRealTimers()
    })

    it('should display last refresh timestamp', async () => {
      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument()
      })

      const lastUpdatedText = screen.getByText(/Last updated:/)
      expect(lastUpdatedText.textContent).toMatch(/\d{1,2}:\d{2}:\d{2}/)
    })
  })

  describe('Manual Refresh', () => {
    it('should refresh data when refresh button is clicked', async () => {
      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Secrets Management')).toBeInTheDocument()
      })

      const initialCallCount = mockFetch.mock.calls.length

      const refreshButton = screen.getByRole('button', { name: 'Refresh' })
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount)
      })
    })

    it('should disable refresh button during refresh', async () => {
      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Secrets Management')).toBeInTheDocument()
      })

      const refreshButton = screen.getByRole('button', { name: 'Refresh' })
      fireEvent.click(refreshButton)

      expect(screen.getByRole('button', { name: 'Refreshing...' })).toBeDisabled()
    })
  })

  describe('Status Indicators', () => {
    it('should display correct status colors and icons', async () => {
      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Secrets Management')).toBeInTheDocument()
      })

      // Check for status indicators with proper styling
      const healthyStatuses = screen.getAllByText(/✓.*healthy/i)
      expect(healthyStatuses.length).toBeGreaterThan(0)

      healthyStatuses.forEach(status => {
        expect(status.closest('span')).toHaveClass(expect.stringMatching(/green/))
      })
    })

    it('should display warning status correctly', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.toString().includes('/api/v1/secrets/config')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              environment: 'test',
              version: '1.0.0',
              features: { salesforce: true, companycam: true, audit: true },
              security: { tokenExpiry: 3600, rateLimits: { global: 1000, perUser: 100 } }
            })
          } as Response)
        }

        if (url.toString().includes('/api/v1/services/salesforce/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              service: 'salesforce',
              status: 'warning',
              lastCheck: new Date().toISOString(),
              latency: 2500, // High latency
              error: 'High response time'
            })
          } as Response)
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            service: 'companycam',
            status: 'healthy',
            lastCheck: new Date().toISOString()
          })
        } as Response)
      })

      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Secrets Management')).toBeInTheDocument()
      })

      const warningStatus = screen.getByText(/⚠.*warning/i)
      expect(warningStatus.closest('span')).toHaveClass(expect.stringMatching(/yellow/))
    })
  })

  describe('AWS Secrets Manager Status', () => {
    it('should display AWS Secrets Manager connection status', async () => {
      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('AWS Secrets Manager')).toBeInTheDocument()
      })

      expect(screen.getByText('Connected')).toBeInTheDocument()
      expect(screen.getByText('Region: us-east-1')).toBeInTheDocument()
      expect(screen.getByText(/Secrets: \d+/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Secrets Management')).toBeInTheDocument()
      })

      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 1, name: 'Secrets Management' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Service Health' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Secret Rotation Status' })).toBeInTheDocument()

      // Check for table accessibility
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()

      const tableHeaders = within(table).getAllByRole('columnheader')
      expect(tableHeaders).toHaveLength(5)
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Secrets Management')).toBeInTheDocument()
      })

      const refreshButton = screen.getByRole('button', { name: 'Refresh' })

      // Tab to the refresh button
      await user.tab()
      expect(refreshButton).toHaveFocus()

      // Press Enter to activate
      await user.keyboard('{Enter}')

      // Should trigger refresh (indicated by button text change)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Refreshing...' })).toBeInTheDocument()
      })
    })
  })

  describe('Security Considerations', () => {
    it('should not display sensitive information in the UI', async () => {
      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Secrets Management')).toBeInTheDocument()
      })

      // Get all text content from the component
      const componentText = screen.getByTestId ?
        screen.getByTestId('secrets-dashboard')?.textContent || document.body.textContent :
        document.body.textContent

      // Should not contain actual secret values
      expect(componentText).not.toMatch(/password.*[a-zA-Z0-9]{8,}/)
      expect(componentText).not.toMatch(/token.*[a-zA-Z0-9]{20,}/)
      expect(componentText).not.toMatch(/key.*[a-zA-Z0-9]{16,}/)
      expect(componentText).not.toMatch(/secret.*[a-zA-Z0-9]{16,}/)
    })

    it('should handle XSS attempts in error messages', async () => {
      const xssPayload = '<script>alert("XSS")</script>'

      mockFetch.mockImplementationOnce(() =>
        Promise.reject(new Error(xssPayload))
      )

      render(<SecretsManagementDashboard />)

      await waitFor(() => {
        expect(screen.getByText('Dashboard Error')).toBeInTheDocument()
      })

      // Error message should be escaped, not executed
      expect(document.querySelector('script')).toBeNull()
      expect(screen.getByText(xssPayload)).toBeInTheDocument() // Shows as text, not executed
    })
  })

  describe('Performance', () => {
    it('should not cause excessive re-renders', async () => {
      const renderSpy = jest.fn()

      const TestComponent = () => {
        renderSpy()
        return <SecretsManagementDashboard />
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText('Secrets Management')).toBeInTheDocument()
      })

      const initialRenderCount = renderSpy.mock.calls.length

      // Trigger a manual refresh
      const refreshButton = screen.getByRole('button', { name: 'Refresh' })
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
      })

      // Should not have excessive re-renders
      expect(renderSpy.mock.calls.length).toBeLessThan(initialRenderCount + 3)
    })
  })
})
