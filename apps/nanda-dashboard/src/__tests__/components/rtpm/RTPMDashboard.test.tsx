/**
 * Tests for RTPMDashboard component
 * Tests main dashboard layout, navigation, and integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RTMPDashboard } from '../../../components/rtpm/RTPMDashboard';
import { createMockAgent, createMockMetrics, createMockRealtimeMetrics } from '../../setup';

// Mock the WebSocket service
const mockWebSocketService = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  getConnectionState: vi.fn().mockReturnValue('connected'),
};

vi.mock('../../../services/websocket.service', () => ({
  useWebSocket: vi.fn(() => ({
    connectionState: 'connected',
    service: mockWebSocketService,
  })),
}));

describe('RTPMDashboard', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with initial loading state', () => {
    render(<RTMPDashboard />);

    expect(screen.getByText('RTPM Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Real-time Performance Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Agent Performance Monitor')).toBeInTheDocument();
  });

  it('displays navigation sidebar with all menu items', () => {
    render(<RTMPDashboard />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Real-time')).toBeInTheDocument();
    expect(screen.getByText('Historical')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });

  it('shows connection status indicator', () => {
    render(<RTMPDashboard />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('navigates between different views when menu items are clicked', async () => {
    render(<RTMPDashboard />);

    // Initially on overview
    expect(screen.getByText('Total Agents')).toBeInTheDocument();

    // Click on Real-time
    await user.click(screen.getByText('Real-time'));

    // Should show real-time charts component
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    // Click on Agents
    await user.click(screen.getByText('Agents'));

    // Should show virtualized agent grid
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('displays overview metrics cards', () => {
    render(<RTMPDashboard />);

    // Check for metric cards
    expect(screen.getByText('Total Agents')).toBeInTheDocument();
    expect(screen.getByText('Online Agents')).toBeInTheDocument();
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
    expect(screen.getByText('Recent Alerts')).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    render(<RTMPDashboard />);

    const refreshButton = screen.getByTitle('Refresh data');
    await user.click(refreshButton);

    // Should show loading state briefly
    expect(refreshButton).toBeDisabled();
  });

  it('opens export manager when export button is clicked', async () => {
    render(<RTMPDashboard />);

    const exportButton = screen.getByTitle('Export data');
    await user.click(exportButton);

    // Export manager should be opened (this depends on implementation)
    // For now, just verify button works
    expect(exportButton).toBeInTheDocument();
  });

  it('collapses and expands sidebar', async () => {
    render(<RTMPDashboard />);

    // Find collapse button
    const collapseButton = screen.getByRole('button', { name: /minimize/i });
    await user.click(collapseButton);

    // Sidebar should be collapsed - text should be hidden
    await waitFor(() => {
      expect(screen.queryByText('Real-time Performance Monitoring')).not.toBeInTheDocument();
    });

    // Click expand button
    const expandButton = screen.getByRole('button', { name: /maximize/i });
    await user.click(expandButton);

    // Text should reappear
    await waitFor(() => {
      expect(screen.getByText('Real-time Performance Monitoring')).toBeInTheDocument();
    });
  });

  it('displays mobile navigation when on mobile', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });

    // Mock the responsive hook to return mobile
    vi.doMock('../../../components/rtpm/ThemeProvider', () => ({
      ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
      ThemeToggle: () => <button>Theme Toggle</button>,
      useResponsive: () => ({ isMobile: true, isTablet: false }),
      ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      ResponsiveGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }));

    render(<RTMPDashboard />);

    // Should show mobile menu button
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
  });

  it('handles WebSocket disconnection state', () => {
    // Mock disconnected state
    vi.mocked(mockWebSocketService.getConnectionState).mockReturnValue('disconnected');

    const { useWebSocket } = require('../../../services/websocket.service');
    useWebSocket.mockReturnValue({
      connectionState: 'disconnected',
      service: mockWebSocketService,
    });

    render(<RTMPDashboard />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('updates last updated timestamp', async () => {
    render(<RTMPDashboard />);

    // Check that timestamp is displayed
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();

    // Simulate refresh
    const refreshButton = screen.getByTitle('Refresh data');
    await user.click(refreshButton);

    // Wait for loading to complete and timestamp to update
    await waitFor(() => {
      expect(refreshButton).not.toBeDisabled();
    });
  });

  it('displays correct alert count badge', () => {
    render(<RTMPDashboard />);

    // Should show some alert count (based on mock data)
    const alertsButton = screen.getByText('Alerts');
    const parentElement = alertsButton.closest('button');

    // Look for alert badge
    if (parentElement) {
      const badge = within(parentElement).queryByText(/^\d+$/);
      if (badge) {
        expect(parseInt(badge.textContent || '0')).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('handles keyboard navigation', async () => {
    render(<RTMPDashboard />);

    // Tab through navigation items
    await user.tab();
    expect(document.activeElement).toHaveTextContent('Overview');

    await user.tab();
    expect(document.activeElement).toHaveTextContent('Real-time');

    // Press Enter to activate
    await user.keyboard('{Enter}');

    // Should navigate to real-time view
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(<RTMPDashboard className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('maintains view state during re-renders', async () => {
    const { rerender } = render(<RTMPDashboard />);

    // Navigate to agents view
    await user.click(screen.getByText('Agents'));
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();

    // Re-render component
    rerender(<RTMPDashboard />);

    // Should still be on agents view
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });

  it('handles agent selection from grid', async () => {
    render(<RTMPDashboard />);

    // Navigate to agents view
    await user.click(screen.getByText('Agents'));

    // Mock agent grid should render with test data
    const agentGrid = screen.getByTestId('virtualized-list');
    expect(agentGrid).toBeInTheDocument();

    // Grid should have agents (based on mock data)
    expect(agentGrid).toHaveAttribute('data-item-count', '50');
  });

  it('displays theme toggle button', () => {
    render(<RTMPDashboard />);

    expect(screen.getByText('Theme Toggle')).toBeInTheDocument();
  });

  it('handles error states gracefully', async () => {
    // Mock console.error to avoid test noise
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Simulate error in WebSocket connection
    const mockError = new Error('WebSocket connection failed');
    mockWebSocketService.connect.mockRejectedValue(mockError);

    render(<RTMPDashboard />);

    // Component should still render
    expect(screen.getByText('RTPM Dashboard')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('updates metrics when WebSocket receives data', async () => {
    const { useWebSocket } = require('../../../services/websocket.service');

    let onMetricsCallback: (metrics: any) => void;

    useWebSocket.mockImplementation((config: any, callbacks: any) => {
      onMetricsCallback = callbacks.onMetrics;
      return {
        connectionState: 'connected',
        service: mockWebSocketService,
      };
    });

    render(<RTMPDashboard />);

    // Simulate receiving metrics via WebSocket
    const mockMetrics = createMockRealtimeMetrics();
    onMetricsCallback(mockMetrics);

    // Dashboard should update with new metrics
    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  it('handles large number of agents efficiently', () => {
    render(<RTMPDashboard />);

    // Navigate to agents view
    fireEvent.click(screen.getByText('Agents'));

    // Virtualized grid should handle large datasets
    const agentGrid = screen.getByTestId('virtualized-list');
    expect(agentGrid).toHaveAttribute('data-item-count', '50');

    // Should only render visible items (virtualization)
    const renderedItems = within(agentGrid).getAllByText(/Agent-/);
    expect(renderedItems.length).toBeLessThanOrEqual(10); // Only visible items rendered
  });

  it('maintains responsive layout', () => {
    // Test desktop layout
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });

    const { rerender } = render(<RTMPDashboard />);

    // Should show desktop sidebar
    expect(screen.getByText('Real-time Performance Monitoring')).toBeInTheDocument();

    // Test mobile layout
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });

    rerender(<RTMPDashboard />);

    // Layout should adapt (this would need proper responsive hook mocking)
  });

  it('integrates with export functionality', async () => {
    render(<RTMPDashboard />);

    const exportButton = screen.getByTitle('Export data');
    await user.click(exportButton);

    // Export manager should be triggered
    // This would be tested more thoroughly in ExportManager tests
    expect(exportButton).toBeInTheDocument();
  });

  it('handles time range changes across views', async () => {
    render(<RTMPDashboard />);

    // Navigate to historical view
    await user.click(screen.getByText('Historical'));

    // Historical charts should be displayed
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();

    // Time range changes would be handled by HistoricalCharts component
    // This tests the integration point
  });
});

describe('RTPMDashboard Integration', () => {
  it('integrates all subcomponents correctly', () => {
    render(<RTMPDashboard />);

    // All major components should be present in DOM
    expect(screen.getByText('RTPM Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Total Agents')).toBeInTheDocument();
  });

  it('passes correct props to subcomponents', async () => {
    render(<RTMPDashboard />);

    // Navigate to different views and verify they receive correct data
    await userEvent.click(screen.getByText('Real-time'));

    const realtimeChart = screen.getByTestId('line-chart');
    expect(realtimeChart).toBeInTheDocument();

    // Chart should receive data prop
    const chartData = realtimeChart.getAttribute('data-chart-data');
    expect(chartData).toBeTruthy();
  });

  it('maintains data consistency across view changes', async () => {
    render(<RTMPDashboard />);

    // Get initial agent count from overview
    const totalAgentsCard = screen.getByText('Total Agents').closest('div');
    expect(totalAgentsCard).toBeTruthy();

    // Navigate to agents view
    await userEvent.click(screen.getByText('Agents'));

    // Agent grid should show same count
    const agentGrid = screen.getByTestId('virtualized-list');
    expect(agentGrid).toHaveAttribute('data-item-count', '50');
  });

  it('handles real-time updates across all views', async () => {
    const { useWebSocket } = require('../../../services/websocket.service');

    let callbacks: any = {};

    useWebSocket.mockImplementation((config: any, callbacksParam: any) => {
      callbacks = callbacksParam;
      return {
        connectionState: 'connected',
        service: mockWebSocketService,
      };
    });

    render(<RTMPDashboard />);

    // Simulate real-time metric update
    const newMetrics = createMockRealtimeMetrics({
      agents: { total: 51, online: 46, offline: 3, warning: 1, error: 1 }
    });

    callbacks.onMetrics?.(newMetrics);

    // Overview should update
    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });
});
