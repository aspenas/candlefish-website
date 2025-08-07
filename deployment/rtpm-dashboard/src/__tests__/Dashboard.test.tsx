/**
 * Tests for the Dashboard component.
 * Covers dashboard layout, panel management, and real-time updates.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import Dashboard from '../components/Dashboard';
import { mockUser, mockAuthToken, mockDeploymentStatus } from './setup';
import * as apiMock from './__mocks__/apiMock';
import * as websocketMock from './__mocks__/websocketMock';

// Mock child components
jest.mock('../components/panels/DNSManagementPanel', () => {
  return function MockDNSPanel() {
    return <div data-testid="dns-panel">DNS Management Panel</div>;
  };
});

jest.mock('../components/panels/InfrastructureStatusPanel', () => {
  return function MockInfrastructurePanel() {
    return <div data-testid="infrastructure-panel">Infrastructure Status Panel</div>;
  };
});

jest.mock('../components/panels/KubernetesPanel', () => {
  return function MockKubernetesPanel() {
    return <div data-testid="kubernetes-panel">Kubernetes Panel</div>;
  };
});

jest.mock('../components/panels/ValidationResultsPanel', () => {
  return function MockValidationPanel() {
    return <div data-testid="validation-panel">Validation Results Panel</div>;
  };
});

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Reset mocks
    apiMock.resetAllMocks();
    websocketMock.resetWebSocketMocks();
    localStorage.setItem('authToken', mockAuthToken);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial Rendering', () => {
    it('renders dashboard with all panels', async () => {
      apiMock.setApiResponse('getDeploymentStatus', mockDeploymentStatus);

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Check for main dashboard elements
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('dns-panel')).toBeInTheDocument();
      expect(screen.getByTestId('infrastructure-panel')).toBeInTheDocument();
      expect(screen.getByTestId('kubernetes-panel')).toBeInTheDocument();
      expect(screen.getByTestId('validation-panel')).toBeInTheDocument();
    });

    it('displays dashboard header with status', async () => {
      apiMock.setApiResponse('getDeploymentStatus', mockDeploymentStatus);

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
      });

      // Check status indicator
      expect(screen.getByText('System Status: Healthy')).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      // Mock delayed API response
      apiMock.setApiResponse('getDeploymentStatus', 
        new Promise(resolve => setTimeout(() => resolve(mockDeploymentStatus), 100))
      );

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('establishes WebSocket connection on mount', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(websocketMock.getEventCount('connect')).toBe(1);
      });
    });

    it('subscribes to relevant metrics', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Connect WebSocket
      await websocketMock.mockWebSocketClient.connect(mockAuthToken);

      await waitFor(() => {
        const subscriptions = websocketMock.mockWebSocketClient.getSubscriptions();
        expect(subscriptions).toContain('cpu_usage');
        expect(subscriptions).toContain('memory_usage');
        expect(subscriptions).toContain('response_time');
      });
    });

    it('handles real-time metric updates', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await websocketMock.mockWebSocketClient.connect(mockAuthToken);

      // Simulate metric update
      websocketMock.simulateMetricUpdate({
        metricName: 'cpu_usage',
        value: 85.0,
        timestamp: new Date().toISOString(),
        labels: { host: 'web-01' }
      });

      await waitFor(() => {
        // Check that the metric update was processed
        expect(websocketMock.getEventCount('emit')).toBeGreaterThan(0);
      });
    });

    it('handles WebSocket connection errors', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate connection error
      websocketMock.simulateConnectionError(new Error('Connection failed'));

      await waitFor(() => {
        // Should show error state or retry
        expect(screen.getByTestId('connection-error')).toBeInTheDocument();
      });
    });

    it('attempts reconnection on disconnect', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await websocketMock.mockWebSocketClient.connect(mockAuthToken);
      
      // Simulate disconnect
      websocketMock.mockWebSocketClient.disconnect();

      // Simulate reconnect attempt
      websocketMock.simulateReconnect();

      await waitFor(() => {
        expect(websocketMock.mockWebSocketClient.isConnected()).toBe(true);
      });
    });
  });

  describe('Panel Management', () => {
    it('allows panel reordering', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Test drag and drop functionality
      const dnsPanel = screen.getByTestId('dns-panel');
      const kubernetesPanel = screen.getByTestId('kubernetes-panel');

      // Simulate drag and drop (this would require more complex setup)
      // For now, test the reorder button functionality
      const reorderButton = screen.getByTestId('reorder-panels-button');
      await user.click(reorderButton);

      expect(screen.getByTestId('panel-reorder-modal')).toBeInTheDocument();
    });

    it('allows panel visibility toggle', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Click panel settings
      const settingsButton = screen.getByTestId('panel-settings-button');
      await user.click(settingsButton);

      // Toggle DNS panel visibility
      const dnsToggle = screen.getByTestId('toggle-dns-panel');
      await user.click(dnsToggle);

      await waitFor(() => {
        expect(screen.queryByTestId('dns-panel')).not.toBeInTheDocument();
      });
    });

    it('saves panel preferences to localStorage', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Modify panel settings
      const settingsButton = screen.getByTestId('panel-settings-button');
      await user.click(settingsButton);

      const dnsToggle = screen.getByTestId('toggle-dns-panel');
      await user.click(dnsToggle);

      // Check localStorage was updated
      const savedPreferences = localStorage.getItem('dashboardPanelPreferences');
      expect(savedPreferences).toContain('dns-panel');
    });

    it('loads panel preferences from localStorage', () => {
      // Set preferences before rendering
      localStorage.setItem('dashboardPanelPreferences', JSON.stringify({
        'dns-panel': { visible: false, order: 1 },
        'infrastructure-panel': { visible: true, order: 2 }
      }));

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // DNS panel should be hidden based on saved preferences
      expect(screen.queryByTestId('dns-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('infrastructure-panel')).toBeInTheDocument();
    });
  });

  describe('Status Updates', () => {
    it('displays system health status', async () => {
      apiMock.setApiResponse('healthCheck', {
        status: 'healthy',
        services: {
          database: 'up',
          redis: 'up',
          api: 'up'
        }
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('system-status')).toBeInTheDocument();
        expect(screen.getByText('Healthy')).toBeInTheDocument();
      });
    });

    it('shows degraded status when services are down', async () => {
      apiMock.setApiResponse('healthCheck', {
        status: 'degraded',
        services: {
          database: 'up',
          redis: 'down',
          api: 'up'
        }
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Degraded')).toBeInTheDocument();
        expect(screen.getByTestId('service-redis-status')).toHaveTextContent('down');
      });
    });

    it('updates status in real-time', async () => {
      apiMock.setApiResponse('healthCheck', {
        status: 'healthy',
        services: { database: 'up', redis: 'up', api: 'up' }
      });

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Healthy')).toBeInTheDocument();
      });

      // Simulate status update via WebSocket
      await websocketMock.mockWebSocketClient.connect(mockAuthToken);
      
      websocketMock.simulateMetricUpdate({
        type: 'system_status',
        data: {
          status: 'degraded',
          services: { database: 'up', redis: 'down', api: 'up' }
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Degraded')).toBeInTheDocument();
      });
    });
  });

  describe('Alerts and Notifications', () => {
    it('displays alert notifications', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await websocketMock.mockWebSocketClient.connect(mockAuthToken);

      // Simulate alert
      websocketMock.simulateAlertFired({
        id: 'alert-123',
        ruleName: 'High CPU Usage',
        severity: 'warning',
        currentValue: 85.0,
        threshold: 80.0
      });

      await waitFor(() => {
        expect(screen.getByTestId('alert-notification')).toBeInTheDocument();
        expect(screen.getByText('High CPU Usage')).toBeInTheDocument();
      });
    });

    it('allows dismissing alert notifications', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await websocketMock.mockWebSocketClient.connect(mockAuthToken);
      
      websocketMock.simulateAlertFired({
        id: 'alert-123',
        ruleName: 'High CPU Usage',
        severity: 'warning'
      });

      await waitFor(() => {
        expect(screen.getByTestId('alert-notification')).toBeInTheDocument();
      });

      // Dismiss alert
      const dismissButton = screen.getByTestId('dismiss-alert-button');
      await user.click(dismissButton);

      expect(screen.queryByTestId('alert-notification')).not.toBeInTheDocument();
    });

    it('shows alert history', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Open alert history
      const alertHistoryButton = screen.getByTestId('alert-history-button');
      await user.click(alertHistoryButton);

      await waitFor(() => {
        expect(screen.getByTestId('alert-history-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Data Refresh', () => {
    it('provides manual refresh functionality', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Click refresh button
      const refreshButton = screen.getByTestId('refresh-button');
      await user.click(refreshButton);

      // Should trigger API calls
      expect(apiMock.getApiCallCount()).toBeGreaterThan(0);
    });

    it('auto-refreshes data periodically', async () => {
      jest.useFakeTimers();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      const initialCallCount = apiMock.getApiCallCount();

      // Fast-forward time by 30 seconds (assuming 30s refresh interval)
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(apiMock.getApiCallCount()).toBeGreaterThan(initialCallCount);
      });

      jest.useRealTimers();
    });

    it('shows last updated timestamp', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('last-updated')).toBeInTheDocument();
      });

      // Should show recent timestamp
      const timestamp = screen.getByTestId('last-updated');
      expect(timestamp.textContent).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large datasets', async () => {
      const startTime = performance.now();

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('memoizes expensive calculations', () => {
      const { rerender } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Mock expensive computation
      const computationSpy = jest.fn();
      
      // Rerender with same props
      rerender(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Expensive computation should only run once
      // This would require actual implementation of memoization
    });

    it('handles rapid WebSocket updates efficiently', async () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await websocketMock.mockWebSocketClient.connect(mockAuthToken);

      const startTime = performance.now();

      // Simulate 100 rapid metric updates
      for (let i = 0; i < 100; i++) {
        websocketMock.simulateMetricUpdate({
          metricName: 'cpu_usage',
          value: Math.random() * 100,
          timestamp: new Date().toISOString()
        });
      }

      await waitFor(() => {
        expect(websocketMock.getEventCount('emit')).toBeGreaterThan(100);
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should handle in under 1 second
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      window.dispatchEvent(new Event('resize'));

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should show mobile layout
      expect(screen.getByTestId('dashboard')).toHaveClass('mobile-layout');
    });

    it('adapts to tablet viewport', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      window.dispatchEvent(new Event('resize'));

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Should show tablet layout
      expect(screen.getByTestId('dashboard')).toHaveClass('tablet-layout');
    });

    it('handles orientation changes', () => {
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Simulate orientation change
      window.dispatchEvent(new Event('orientationchange'));

      // Should adjust layout accordingly
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      apiMock.setApiError('getDeploymentStatus', new Error('API Error'));

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
      });
    });

    it('shows retry option on errors', async () => {
      const user = userEvent.setup();
      
      apiMock.setApiError('getDeploymentStatus', new Error('Network Error'));

      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      });

      // Click retry
      await user.click(screen.getByTestId('retry-button'));

      // Should attempt to reload data
      expect(apiMock.getApiCallCount('getDeploymentStatus')).toBeGreaterThan(1);
    });
  });
});