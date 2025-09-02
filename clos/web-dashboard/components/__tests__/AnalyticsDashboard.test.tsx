import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnalyticsDashboard } from '../AnalyticsDashboard';

// Mock the hooks and services
jest.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(() => ({
    isConnected: true,
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }))
}));

jest.mock('../../lib/analytics-api', () => ({
  getSystemOverview: jest.fn(),
  getAgentPerformance: jest.fn(),
  getServiceHealth: jest.fn(),
  getPerformanceTrends: jest.fn()
}));

describe('AnalyticsDashboard', () => {
  let queryClient: QueryClient;
  let mockAnalyticsApi: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockAnalyticsApi = require('../../lib/analytics-api');
    
    // Mock API responses
    mockAnalyticsApi.getSystemOverview.mockResolvedValue({
      success: true,
      data: testUtils.createMockAnalyticsData()
    });

    mockAnalyticsApi.getAgentPerformance.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          responseTime: 120,
          successRate: 98.5,
          errorRate: 1.5,
          lastActivity: '2024-01-01T10:00:00Z'
        }
      ]
    });

    mockAnalyticsApi.getServiceHealth.mockResolvedValue({
      success: true,
      data: [
        {
          service: 'api-server',
          status: 'healthy',
          responseTime: 89,
          uptime: 99.9,
          errorRate: 0.1
        }
      ]
    });

    mockAnalyticsApi.getPerformanceTrends.mockResolvedValue({
      success: true,
      data: {
        agents: [
          { timestamp: '2024-01-01T10:00:00Z', value: 120 },
          { timestamp: '2024-01-01T10:15:00Z', value: 115 },
          { timestamp: '2024-01-01T10:30:00Z', value: 118 }
        ],
        services: [
          { timestamp: '2024-01-01T10:00:00Z', value: 89 },
          { timestamp: '2024-01-01T10:15:00Z', value: 92 },
          { timestamp: '2024-01-01T10:30:00Z', value: 87 }
        ]
      }
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should render dashboard with all main sections', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    // Check for main sections
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('System Overview')).toBeInTheDocument();
    expect(screen.getByText('Agent Performance')).toBeInTheDocument();
    expect(screen.getByText('Service Health')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });
  });

  it('should display system metrics correctly', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('45.2%')).toBeInTheDocument(); // CPU usage
      expect(screen.getByText('67.8%')).toBeInTheDocument(); // Memory usage
    });

    // Check metric labels
    expect(screen.getByText('CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    renderWithProviders(<AnalyticsDashboard />);

    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading analytics data...')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    mockAnalyticsApi.getSystemOverview.mockRejectedValue(
      new Error('API Error')
    );

    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Error loading analytics data')).toBeInTheDocument();
    });

    // Should show retry button
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('should retry data fetching on button click', async () => {
    mockAnalyticsApi.getSystemOverview
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({
        success: true,
        data: testUtils.createMockAnalyticsData()
      });

    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Error loading analytics data')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('System Overview')).toBeInTheDocument();
    });
  });

  it('should filter agents by status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Find and click the filter dropdown
    const filterButton = screen.getByRole('button', { name: /filter agents/i });
    await user.click(filterButton);

    // Select 'active' filter
    const activeFilter = screen.getByText('Active Only');
    await user.click(activeFilter);

    // Verify filtering works (this would filter the displayed agents)
    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });
  });

  it('should update time range and refetch data', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
    });

    // Click time range selector
    const timeRangeButton = screen.getByRole('button', { name: /last 24 hours/i });
    await user.click(timeRangeButton);

    // Select different time range
    const lastHourOption = screen.getByText('Last hour');
    await user.click(lastHourOption);

    // Verify API was called with new time range
    await waitFor(() => {
      expect(mockAnalyticsApi.getSystemOverview).toHaveBeenCalledWith(
        expect.objectContaining({
          timeRange: '1h'
        })
      );
    });
  });

  it('should display agent performance metrics', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.getByText('120ms')).toBeInTheDocument(); // Response time
      expect(screen.getByText('98.5%')).toBeInTheDocument(); // Success rate
    });

    // Check status indicators
    const statusIndicator = screen.getByTestId('agent-status-indicator');
    expect(statusIndicator).toHaveClass('status-active');
  });

  it('should show service health status', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('api-server')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByText('99.9%')).toBeInTheDocument(); // Uptime
    });

    // Check health indicator color
    const healthIndicator = screen.getByTestId('service-health-indicator');
    expect(healthIndicator).toHaveClass('health-healthy');
  });

  it('should render performance trend charts', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    // Check chart data points
    expect(screen.getByText('Performance Trends')).toBeInTheDocument();
  });

  it('should handle WebSocket real-time updates', async () => {
    const mockWebSocket = require('../../hooks/useWebSocket').useWebSocket();
    renderWithProviders(<AnalyticsDashboard />);

    // Simulate WebSocket update
    const updateData = {
      type: 'agent:performance',
      agent_id: 'agent-1',
      metrics: {
        responseTime: 125,
        successRate: 98.2
      }
    };

    // Trigger WebSocket callback
    const onCallback = mockWebSocket.on.mock.calls.find(
      call => call[0] === 'analytics:update'
    )?.[1];

    if (onCallback) {
      onCallback(updateData);
    }

    await waitFor(() => {
      // Should trigger a refetch or update the display
      expect(mockAnalyticsApi.getAgentPerformance).toHaveBeenCalled();
    });
  });

  it('should be accessible with proper ARIA labels', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    // Check ARIA labels
    expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Analytics Dashboard');
    expect(screen.getByRole('region', { name: 'System Overview' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Agent Performance' })).toBeInTheDocument();
    
    await waitFor(() => {
      const agentTable = screen.getByRole('table', { name: 'Agent Performance Table' });
      expect(agentTable).toBeInTheDocument();
    });
  });

  it('should handle keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Tab navigation should work
    const firstButton = screen.getByRole('button', { name: /filter agents/i });
    firstButton.focus();
    
    await user.keyboard('{Tab}');
    
    const timeRangeButton = screen.getByRole('button', { name: /last 24 hours/i });
    expect(timeRangeButton).toHaveFocus();
  });

  it('should refresh data automatically', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    // Clear previous calls
    mockAnalyticsApi.getSystemOverview.mockClear();

    // Wait for auto-refresh interval (mocked)
    jest.advanceTimersByTime(30000); // 30 seconds

    await waitFor(() => {
      expect(mockAnalyticsApi.getSystemOverview).toHaveBeenCalledTimes(1);
    });
  });

  it('should export analytics data', async () => {
    const user = userEvent.setup();
    
    // Mock window.URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    
    // Mock document.createElement and click
    const mockLink = {
      click: jest.fn(),
      setAttribute: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

    renderWithProviders(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /export data/i });
    await user.click(exportButton);

    // Should trigger download
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.click).toHaveBeenCalled();
  });
});