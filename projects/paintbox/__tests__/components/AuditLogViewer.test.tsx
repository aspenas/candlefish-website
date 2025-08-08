import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

import { AuditLogViewer } from '../../components/secrets/AuditLogViewer'

// Mock fetch
global.fetch = jest.fn()

describe('AuditLogViewer', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  const mockAuditEvents = [
    {
      id: 'event-1',
      timestamp: '2024-01-15T10:30:00Z',
      service: 'salesforce',
      action: 'auth.login',
      user: 'user@example.com',
      ip: '192.168.1.100',
      success: true,
      details: 'Successful login'
    },
    {
      id: 'event-2',
      timestamp: '2024-01-15T10:35:00Z',
      service: 'companycam',
      action: 'api.request',
      user: 'user@example.com',
      ip: '192.168.1.100',
      success: false,
      error: 'Rate limit exceeded'
    },
    {
      id: 'event-3',
      timestamp: '2024-01-15T11:00:00Z',
      service: 'salesforce',
      action: 'data.export',
      user: 'admin@example.com',
      ip: '10.0.0.1',
      success: true,
      details: 'Exported 1000 records'
    }
  ]

  const defaultProps = {
    className: 'test-audit-viewer'
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default successful response
    mockFetch.mockImplementation((url) => {
      const urlStr = url.toString()

      if (urlStr.includes('/api/v1/audit/events')) {
        const urlObj = new URL(urlStr)
        const page = parseInt(urlObj.searchParams.get('page') || '1')
        const limit = parseInt(urlObj.searchParams.get('limit') || '10')
        const service = urlObj.searchParams.get('service')
        const action = urlObj.searchParams.get('action')
        const search = urlObj.searchParams.get('search')

        let filteredEvents = [...mockAuditEvents]

        // Apply filters
        if (service) {
          filteredEvents = filteredEvents.filter(event => event.service === service)
        }
        if (action) {
          filteredEvents = filteredEvents.filter(event => event.action === action)
        }
        if (search) {
          filteredEvents = filteredEvents.filter(event =>
            JSON.stringify(event).toLowerCase().includes(search.toLowerCase())
          )
        }

        // Apply pagination
        const startIndex = (page - 1) * limit
        const paginatedEvents = filteredEvents.slice(startIndex, startIndex + limit)

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: paginatedEvents,
            total: filteredEvents.length,
            page,
            limit,
            totalPages: Math.ceil(filteredEvents.length / limit)
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
    it('should render audit log viewer with loading state', () => {
      render(<AuditLogViewer {...defaultProps} />)

      expect(screen.getByText('Audit Log Viewer')).toBeInTheDocument()
      expect(screen.getByText('Loading audit events...')).toBeInTheDocument()
    })

    it('should load and display audit events', async () => {
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      expect(screen.getByText('event-2')).toBeInTheDocument()
      expect(screen.getByText('event-3')).toBeInTheDocument()
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
      expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    })

    it('should display audit events in a table format', async () => {
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      const table = screen.getByRole('table')
      const headers = within(table).getAllByRole('columnheader')

      expect(headers).toHaveLength(8) // Timestamp, Service, Action, User, IP, Status, Details, Actions
      expect(within(table).getByText('Timestamp')).toBeInTheDocument()
      expect(within(table).getByText('Service')).toBeInTheDocument()
      expect(within(table).getByText('Action')).toBeInTheDocument()
      expect(within(table).getByText('User')).toBeInTheDocument()
      expect(within(table).getByText('IP Address')).toBeInTheDocument()
      expect(within(table).getByText('Status')).toBeInTheDocument()
      expect(within(table).getByText('Details')).toBeInTheDocument()
    })

    it('should display event details with proper formatting', async () => {
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('salesforce')).toBeInTheDocument()
      })

      // Check success/failure indicators
      expect(screen.getByText('Success')).toBeInTheDocument()
      expect(screen.getByText('Failed')).toBeInTheDocument()

      // Check timestamp formatting
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument()

      // Check IP addresses
      expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
      expect(screen.getByText('10.0.0.1')).toBeInTheDocument()
    })
  })

  describe('Filtering', () => {
    it('should filter events by service', async () => {
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      // Find and use service filter
      const serviceFilter = screen.getByRole('combobox', { name: /service/i })
      fireEvent.change(serviceFilter, { target: { value: 'salesforce' } })

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
        expect(screen.getByText('event-3')).toBeInTheDocument()
        expect(screen.queryByText('event-2')).not.toBeInTheDocument()
      })
    })

    it('should filter events by action', async () => {
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      const actionFilter = screen.getByRole('combobox', { name: /action/i })
      fireEvent.change(actionFilter, { target: { value: 'auth.login' } })

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
        expect(screen.queryByText('event-2')).not.toBeInTheDocument()
        expect(screen.queryByText('event-3')).not.toBeInTheDocument()
      })
    })

    it('should filter events by date range', async () => {
      const user = userEvent.setup()
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      const startDateInput = screen.getByLabelText(/start date/i)
      const endDateInput = screen.getByLabelText(/end date/i)

      await user.clear(startDateInput)
      await user.type(startDateInput, '2024-01-15')

      await user.clear(endDateInput)
      await user.type(endDateInput, '2024-01-15')

      const applyButton = screen.getByRole('button', { name: /apply filters/i })
      await user.click(applyButton)

      await waitFor(() => {
        // Should show events from the specified date
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('start_date=2024-01-15')
        )
      })
    })

    it('should filter events by success/failure status', async () => {
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      const statusFilter = screen.getByRole('combobox', { name: /status/i })
      fireEvent.change(statusFilter, { target: { value: 'failed' } })

      await waitFor(() => {
        expect(screen.queryByText('event-1')).not.toBeInTheDocument()
        expect(screen.getByText('event-2')).toBeInTheDocument()
        expect(screen.queryByText('event-3')).not.toBeInTheDocument()
      })
    })

    it('should clear all filters when clear button is clicked', async () => {
      const user = userEvent.setup()
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      // Apply a filter
      const serviceFilter = screen.getByRole('combobox', { name: /service/i })
      fireEvent.change(serviceFilter, { target: { value: 'salesforce' } })

      await waitFor(() => {
        expect(screen.queryByText('event-2')).not.toBeInTheDocument()
      })

      // Clear filters
      const clearButton = screen.getByRole('button', { name: /clear filters/i })
      await user.click(clearButton)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
        expect(screen.getByText('event-2')).toBeInTheDocument()
        expect(screen.getByText('event-3')).toBeInTheDocument()
      })
    })
  })

  describe('Search', () => {
    it('should search events by text', async () => {
      const user = userEvent.setup()
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      const searchInput = screen.getByRole('textbox', { name: /search/i })
      await user.type(searchInput, 'rate limit')

      await waitFor(() => {
        expect(screen.queryByText('event-1')).not.toBeInTheDocument()
        expect(screen.getByText('event-2')).toBeInTheDocument()
        expect(screen.queryByText('event-3')).not.toBeInTheDocument()
      })
    })

    it('should debounce search input to avoid excessive API calls', async () => {
      jest.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      const initialCallCount = mockFetch.mock.calls.length

      const searchInput = screen.getByRole('textbox', { name: /search/i })

      // Type multiple characters quickly
      await user.type(searchInput, 'login')

      // Should not have made additional API calls yet
      expect(mockFetch.mock.calls.length).toBe(initialCallCount)

      // Fast-forward debounce delay
      jest.advanceTimersByTime(500)

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount)
      })

      jest.useRealTimers()
    })
  })

  describe('Pagination', () => {
    it('should display pagination controls', async () => {
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
      expect(screen.getByText(/page 1 of/i)).toBeInTheDocument()
    })

    it('should navigate between pages', async () => {
      const user = userEvent.setup()

      // Mock pagination response
      mockFetch.mockImplementation((url) => {
        const urlObj = new URL(url.toString())
        const page = parseInt(urlObj.searchParams.get('page') || '1')

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: page === 1 ? [mockAuditEvents[0]] : [mockAuditEvents[1]],
            total: 2,
            page,
            limit: 1,
            totalPages: 2
          })
        } as Response)
      })

      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText('event-2')).toBeInTheDocument()
        expect(screen.queryByText('event-1')).not.toBeInTheDocument()
      })
    })

    it('should change page size', async () => {
      const user = userEvent.setup()
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      const pageSizeSelect = screen.getByRole('combobox', { name: /items per page/i })
      await user.selectOptions(pageSizeSelect, '25')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('limit=25')
        )
      })
    })
  })

  describe('Event Details', () => {
    it('should show detailed view when event is clicked', async () => {
      const user = userEvent.setup()
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      const eventRow = screen.getByText('event-1').closest('tr')
      await user.click(eventRow!)

      await waitFor(() => {
        expect(screen.getByText('Event Details')).toBeInTheDocument()
      })

      // Should show all event properties
      expect(screen.getByText('Event ID: event-1')).toBeInTheDocument()
      expect(screen.getByText('Successful login')).toBeInTheDocument()
    })

    it('should display raw JSON for technical users', async () => {
      const user = userEvent.setup()
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      const eventRow = screen.getByText('event-1').closest('tr')
      await user.click(eventRow!)

      await waitFor(() => {
        expect(screen.getByText('Event Details')).toBeInTheDocument()
      })

      const rawJsonButton = screen.getByRole('button', { name: /raw json/i })
      await user.click(rawJsonButton)

      expect(screen.getByRole('textbox', { name: /json/i })).toBeInTheDocument()
    })
  })

  describe('Export Functionality', () => {
    it('should export filtered events to CSV', async () => {
      const user = userEvent.setup()

      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'mock-blob-url')
      global.URL.revokeObjectURL = jest.fn()

      // Mock document.createElement for download link
      const mockCreateElement = jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'a') {
          return {
            href: '',
            download: '',
            click: jest.fn(),
            style: { display: '' }
          } as any
        }
        return document.createElement(tagName)
      })

      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)

      expect(global.URL.createObjectURL).toHaveBeenCalled()

      mockCreateElement.mockRestore()
    })

    it('should limit export size for large datasets', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `event-${i}`,
        timestamp: new Date().toISOString(),
        service: 'test',
        action: 'test.action',
        user: 'test@example.com',
        success: true
      }))

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: largeDataset.slice(0, 1000), // API limits to 1000
            total: largeDataset.length,
            page: 1,
            limit: 1000
          })
        } as Response)
      )

      const user = userEvent.setup()
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-0')).toBeInTheDocument()
      })

      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)

      // Should show warning about export limit
      expect(screen.getByText(/export limited to.*1000.*events/i)).toBeInTheDocument()
    })
  })

  describe('Security Features', () => {
    it('should redact sensitive information in displayed events', async () => {
      const sensitiveEvents = [
        {
          id: 'event-sensitive',
          timestamp: '2024-01-15T10:30:00Z',
          service: 'salesforce',
          action: 'auth.login',
          user: 'user@example.com',
          ip: '192.168.1.100',
          success: true,
          details: 'Login with password: secretpass123 and token: abc123xyz'
        }
      ]

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: sensitiveEvents,
            total: 1,
            page: 1,
            limit: 10
          })
        } as Response)
      )

      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-sensitive')).toBeInTheDocument()
      })

      const componentText = document.body.textContent || ''

      // Should not display actual sensitive values
      expect(componentText).not.toContain('secretpass123')
      expect(componentText).not.toContain('abc123xyz')

      // Should show redacted version
      expect(screen.getByText(/password:.*\[REDACTED\]/i)).toBeInTheDocument()
    })

    it('should validate and sanitize search input', async () => {
      const user = userEvent.setup()
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      const searchInput = screen.getByRole('textbox', { name: /search/i })

      // Test XSS payload
      await user.type(searchInput, '<script>alert("xss")</script>')

      await waitFor(() => {
        // Should not execute script
        expect(document.querySelector('script')).toBeNull()

        // Should sanitize the search term
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('search=')
        )
      })
    })

    it('should require proper authorization for admin actions', async () => {
      // Mock unauthorized response
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ error: 'Insufficient permissions' })
        } as Response)
      )

      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument()
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

      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/failed to load audit events/i)).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementationOnce(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100)
        })
      )

      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/network.*timeout/i)).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('should virtualize large lists for better performance', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `event-${i}`,
        timestamp: new Date().toISOString(),
        service: 'test',
        action: 'test.action',
        user: 'test@example.com',
        success: true
      }))

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            events: largeDataset,
            total: largeDataset.length,
            page: 1,
            limit: 1000
          })
        } as Response)
      )

      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-0')).toBeInTheDocument()
      })

      // Should only render visible rows (virtualization)
      const renderedRows = screen.getAllByRole('row')
      expect(renderedRows.length).toBeLessThan(100) // Much less than 1000
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      // Check table accessibility
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()

      // Check filter accessibility
      expect(screen.getByRole('combobox', { name: /service/i })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument()

      // Check pagination accessibility
      expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<AuditLogViewer {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('event-1')).toBeInTheDocument()
      })

      // Tab through interactive elements
      await user.tab() // Search input
      expect(screen.getByRole('textbox', { name: /search/i })).toHaveFocus()

      await user.tab() // Service filter
      expect(screen.getByRole('combobox', { name: /service/i })).toHaveFocus()

      await user.tab() // Action filter
      expect(screen.getByRole('combobox', { name: /action/i })).toHaveFocus()
    })
  })
})
