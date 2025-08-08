import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

import { ServiceStatusMonitor } from '../../components/secrets/ServiceStatusMonitor'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 100)
  }

  send(data: string) {
    // Echo back for testing
    setTimeout(() => {
      this.onmessage?.(new MessageEvent('message', { data }))
    }, 50)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }
}

global.WebSocket = MockWebSocket as any

// Mock fetch
global.fetch = jest.fn()

describe('ServiceStatusMonitor', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  const defaultProps = {
    services: ['salesforce', 'companycam'],
    refreshInterval: 5000,
    enableRealTime: true
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Default mock responses
    mockFetch.mockImplementation((url) => {
      const urlStr = url.toString()

      if (urlStr.includes('salesforce/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            service: 'salesforce',
            status: 'healthy',
            lastCheck: new Date().toISOString(),
            lastSuccess: new Date().toISOString(),
            latency: 120,
            metadata: {
              version: 'v2.0',
              instances: 3
            }
          })
        } as Response)
      }

      if (urlStr.includes('companycam/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            service: 'companycam',
            status: 'healthy',
            lastCheck: new Date().toISOString(),
            lastSuccess: new Date().toISOString(),
            latency: 200
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
    it('should render service status monitor with loading state', () => {
      render(<ServiceStatusMonitor {...defaultProps} />)

      expect(screen.getByText('Service Status Monitor')).toBeInTheDocument()
      expect(screen.getByText('Loading service status...')).toBeInTheDocument()
    })

    it('should load and display service statuses', async () => {
      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Salesforce')).toBeInTheDocument()
      })

      expect(screen.getByText('Companycam')).toBeInTheDocument()
      expect(screen.getAllByText(/healthy/i)).toHaveLength(2)
    })

    it('should display service details and metrics', async () => {
      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Salesforce')).toBeInTheDocument()
      })

      // Check for latency information
      expect(screen.getByText('120ms')).toBeInTheDocument()
      expect(screen.getByText('200ms')).toBeInTheDocument()

      // Check for last check timestamps
      expect(screen.getAllByText(/Last check:/)).toHaveLength(2)
    })
  })

  describe('Real-time Updates', () => {
    it('should establish WebSocket connection for real-time updates', async () => {
      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Real-time monitoring active')).toBeInTheDocument()
      })
    })

    it('should handle real-time status updates via WebSocket', async () => {
      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Salesforce')).toBeInTheDocument()
      })

      // Simulate WebSocket message with status update
      const websocket = (global.WebSocket as any).mock.instances[0]

      const updateMessage = {
        type: 'service_status_update',
        service: 'salesforce',
        status: 'warning',
        latency: 1500,
        error: 'High response time detected'
      }

      websocket.onmessage(new MessageEvent('message', {
        data: JSON.stringify(updateMessage)
      }))

      await waitFor(() => {
        expect(screen.getByText(/warning/i)).toBeInTheDocument()
      })

      expect(screen.getByText('1500ms')).toBeInTheDocument()
      expect(screen.getByText('High response time detected')).toBeInTheDocument()
    })

    it('should handle WebSocket connection failures gracefully', async () => {
      // Mock WebSocket to fail
      class FailingWebSocket {
        constructor() {
          setTimeout(() => {
            this.onerror?.(new Event('error'))
          }, 100)
        }
        onerror: ((event: Event) => void) | null = null
        onopen: ((event: Event) => void) | null = null
        onmessage: ((event: MessageEvent) => void) | null = null
        onclose: ((event: CloseEvent) => void) | null = null
        close() {}
      }

      global.WebSocket = FailingWebSocket as any

      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Real-time monitoring unavailable')).toBeInTheDocument()
      })
    })

    it('should reconnect WebSocket after connection loss', async () => {
      jest.useFakeTimers()

      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Real-time monitoring active')).toBeInTheDocument()
      })

      // Simulate connection loss
      const websocket = (global.WebSocket as any).mock.instances[0]
      websocket.onclose(new CloseEvent('close'))

      await waitFor(() => {
        expect(screen.getByText('Reconnecting...')).toBeInTheDocument()
      })

      // Fast-forward reconnection delay
      jest.advanceTimersByTime(3000)

      await waitFor(() => {
        expect(screen.getByText('Real-time monitoring active')).toBeInTheDocument()
      })

      jest.useRealTimers()
    })
  })

  describe('Service Status Display', () => {
    it('should display different status types with appropriate styling', async () => {
      mockFetch.mockImplementation((url) => {
        const urlStr = url.toString()

        if (urlStr.includes('salesforce/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              service: 'salesforce',
              status: 'error',
              lastCheck: new Date().toISOString(),
              error: 'Authentication failed'
            })
          } as Response)
        }

        if (urlStr.includes('companycam/status')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              service: 'companycam',
              status: 'warning',
              lastCheck: new Date().toISOString(),
              latency: 2000
            })
          } as Response)
        }

        return Promise.reject(new Error('Unknown endpoint'))
      })

      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Salesforce')).toBeInTheDocument()
      })

      // Check error status styling
      const errorStatus = screen.getByText(/error/i)
      expect(errorStatus.closest('span')).toHaveClass(expect.stringMatching(/red/))

      // Check warning status styling
      const warningStatus = screen.getByText(/warning/i)
      expect(warningStatus.closest('span')).toHaveClass(expect.stringMatching(/yellow/))
    })

    it('should display service uptime and availability metrics', async () => {
      mockFetch.mockImplementation((url) => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            service: 'salesforce',
            status: 'healthy',
            lastCheck: new Date().toISOString(),
            uptime: '99.95%',
            availability: {
              daily: '100%',
              weekly: '99.8%',
              monthly: '99.95%'
            }
          })
        } as Response)
      })

      render(<ServiceStatusMonitor {...defaultProps} services={['salesforce']} />)

      await waitFor(() => {
        expect(screen.getByText('99.95%')).toBeInTheDocument()
      })
    })

    it('should show historical status trends', async () => {
      mockFetch.mockImplementation((url) => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            service: 'salesforce',
            status: 'healthy',
            lastCheck: new Date().toISOString(),
            history: [
              { timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'healthy' },
              { timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'warning' },
              { timestamp: new Date(Date.now() - 10800000).toISOString(), status: 'healthy' }
            ]
          })
        } as Response)
      })

      render(<ServiceStatusMonitor {...defaultProps} services={['salesforce']} showHistory={true} />)

      await waitFor(() => {
        expect(screen.getByText('Status History')).toBeInTheDocument()
      })

      // Should show historical status indicators
      const historyElements = screen.getAllByRole('listitem')
      expect(historyElements.length).toBeGreaterThan(0)
    })
  })

  describe('Manual Refresh', () => {
    it('should refresh service status when refresh button is clicked', async () => {
      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Salesforce')).toBeInTheDocument()
      })

      const initialCallCount = mockFetch.mock.calls.length

      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount)
      })
    })

    it('should disable refresh button during refresh', async () => {
      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Salesforce')).toBeInTheDocument()
      })

      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      fireEvent.click(refreshButton)

      expect(refreshButton).toBeDisabled()
    })
  })

  describe('Auto-refresh', () => {
    it('should auto-refresh at specified intervals', async () => {
      jest.useFakeTimers()

      render(<ServiceStatusMonitor {...defaultProps} refreshInterval={1000} />)

      await waitFor(() => {
        expect(screen.getByText('Salesforce')).toBeInTheDocument()
      })

      const initialCallCount = mockFetch.mock.calls.length

      // Fast-forward time
      jest.advanceTimersByTime(1000)

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount)
      })

      jest.useRealTimers()
    })

    it('should pause auto-refresh when component is not visible', async () => {
      jest.useFakeTimers()

      // Mock Intersection Observer
      const mockIntersectionObserver = jest.fn()
      mockIntersectionObserver.mockReturnValue({
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null
      })
      global.IntersectionObserver = mockIntersectionObserver

      render(<ServiceStatusMonitor {...defaultProps} refreshInterval={1000} />)

      await waitFor(() => {
        expect(screen.getByText('Salesforce')).toBeInTheDocument()
      })

      // Simulate component becoming invisible
      const [observerCallback] = mockIntersectionObserver.mock.calls[0]
      observerCallback([{ isIntersecting: false }])

      const callCountBeforePause = mockFetch.mock.calls.length

      // Fast-forward time - should not refresh while invisible
      jest.advanceTimersByTime(5000)

      expect(mockFetch.mock.calls.length).toBe(callCountBeforePause)

      jest.useRealTimers()
    })
  })

  describe('Error Handling', () => {
    it('should handle service API errors gracefully', async () => {
      mockFetch.mockImplementation((url) => {
        if (url.toString().includes('salesforce')) {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable'
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

      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Service Unavailable')).toBeInTheDocument()
      })

      // Should still show other services
      expect(screen.getByText('Companycam')).toBeInTheDocument()
    })

    it('should handle network timeout errors', async () => {
      mockFetch.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100)
        })
      })

      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/network.*timeout/i)).toBeInTheDocument()
      })
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new Error('Unexpected token'))
        } as Response)
      )

      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/invalid.*response/i)).toBeInTheDocument()
      })
    })
  })

  describe('Security Features', () => {
    it('should not display sensitive information in status messages', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            service: 'salesforce',
            status: 'error',
            lastCheck: new Date().toISOString(),
            error: 'Authentication failed: invalid token sk-1234567890abcdef',
            debug: 'Password: secretpassword123'
          })
        } as Response)
      )

      render(<ServiceStatusMonitor {...defaultProps} services={['salesforce']} />)

      await waitFor(() => {
        expect(screen.getByText('Salesforce')).toBeInTheDocument()
      })

      const componentText = document.body.textContent || ''

      // Should not contain sensitive information
      expect(componentText).not.toContain('sk-1234567890abcdef')
      expect(componentText).not.toContain('secretpassword123')

      // Should show sanitized error message
      expect(screen.getByText(/authentication.*failed/i)).toBeInTheDocument()
    })

    it('should validate WebSocket messages to prevent XSS', async () => {
      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Real-time monitoring active')).toBeInTheDocument()
      })

      const websocket = (global.WebSocket as any).mock.instances[0]

      // Send malicious payload
      const maliciousMessage = {
        type: 'service_status_update',
        service: 'salesforce',
        status: '<script>alert("XSS")</script>',
        error: '<img src=x onerror=alert("XSS")>'
      }

      websocket.onmessage(new MessageEvent('message', {
        data: JSON.stringify(maliciousMessage)
      }))

      await waitFor(() => {
        // Should not execute scripts
        expect(document.querySelector('script')).toBeNull()

        // Should escape the content
        expect(screen.getByText(/script/)).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('should throttle rapid status updates', async () => {
      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Real-time monitoring active')).toBeInTheDocument()
      })

      const websocket = (global.WebSocket as any).mock.instances[0]

      // Send rapid updates
      for (let i = 0; i < 10; i++) {
        websocket.onmessage(new MessageEvent('message', {
          data: JSON.stringify({
            type: 'service_status_update',
            service: 'salesforce',
            status: 'healthy',
            latency: 100 + i
          })
        }))
      }

      // Should only show the last update after throttling
      await waitFor(() => {
        expect(screen.getByText('109ms')).toBeInTheDocument()
      })
    })

    it('should limit the number of concurrent API requests', async () => {
      const services = Array.from({ length: 20 }, (_, i) => `service-${i}`)

      render(<ServiceStatusMonitor services={services} refreshInterval={5000} enableRealTime={false} />)

      // Should limit concurrent requests to prevent overwhelming the server
      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeLessThanOrEqual(5)
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for screen readers', async () => {
      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Salesforce')).toBeInTheDocument()
      })

      // Check for proper ARIA labels
      expect(screen.getByRole('region', { name: /service.*status/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()

      // Status indicators should have proper labels
      const statusIndicators = screen.getAllByRole('status')
      expect(statusIndicators.length).toBeGreaterThan(0)
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Salesforce')).toBeInTheDocument()
      })

      // Tab through interactive elements
      const refreshButton = screen.getByRole('button', { name: /refresh/i })

      await user.tab()
      expect(refreshButton).toHaveFocus()

      // Activate with keyboard
      await user.keyboard('{Enter}')
      expect(refreshButton).toBeDisabled() // Should trigger refresh
    })

    it('should announce status changes to screen readers', async () => {
      render(<ServiceStatusMonitor {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Real-time monitoring active')).toBeInTheDocument()
      })

      const websocket = (global.WebSocket as any).mock.instances[0]

      // Send status change
      websocket.onmessage(new MessageEvent('message', {
        data: JSON.stringify({
          type: 'service_status_update',
          service: 'salesforce',
          status: 'error',
          error: 'Service unavailable'
        })
      }))

      await waitFor(() => {
        // Should have aria-live region for announcements
        const announcement = screen.getByRole('status')
        expect(announcement).toHaveAttribute('aria-live', 'polite')
      })
    })
  })
})
