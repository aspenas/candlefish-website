/**
 * Health Monitoring Dashboard Component Test Suite
 * Tests for the HealthMonitoringDashboard React component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react-dom/test-utils';
import HealthMonitoringDashboard from '@/components/infrastructure/HealthMonitoringDashboard';
import { useHealthStore } from '@/stores/useInfrastructureStore';
import { useHealthWebSocket } from '@/hooks/useInfrastructureWebSocket';
import { healthComponentFactory } from '../../factories/componentFactory';

// Mock dependencies
jest.mock('@/stores/useInfrastructureStore');
jest.mock('@/hooks/useInfrastructureWebSocket');
jest.mock('@/lib/services/healthService');

const mockUseHealthStore = useHealthStore as jest.MockedFunction<typeof useHealthStore>;
const mockUseHealthWebSocket = useHealthWebSocket as jest.MockedFunction<typeof useHealthWebSocket>;

// Test utilities
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('HealthMonitoringDashboard Component', () => {
  let mockHealthData: any;
  let mockWebSocketActions: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockHealthData = healthComponentFactory.createHealthyDashboardData();
    mockWebSocketActions = {
      isConnected: true,
      requestHealthCheck: jest.fn(),
      subscribeToService: jest.fn(),
      unsubscribeFromService: jest.fn(),
    };

    mockUseHealthStore.mockReturnValue(mockHealthData);
    mockUseHealthWebSocket.mockReturnValue(mockWebSocketActions);

    jest.clearAllMocks();
  });

  describe('Dashboard Rendering', () => {
    it('should render dashboard with healthy status', () => {
      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      expect(screen.getByText('System Health Overview')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
      expect(screen.getByTestId('health-status-indicator')).toHaveClass('bg-green-100');
    });

    it('should render dashboard with degraded status', () => {
      // Arrange
      const degradedData = healthComponentFactory.createDegradedDashboardData();
      mockUseHealthStore.mockReturnValue(degradedData);

      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      expect(screen.getByText('Degraded')).toBeInTheDocument();
      expect(screen.getByTestId('health-status-indicator')).toHaveClass('bg-yellow-100');
      expect(screen.getByText(/Some services are experiencing issues/)).toBeInTheDocument();
    });

    it('should render dashboard with unhealthy status', () => {
      // Arrange
      const unhealthyData = healthComponentFactory.createUnhealthyDashboardData();
      mockUseHealthStore.mockReturnValue(unhealthyData);

      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      expect(screen.getByText('Unhealthy')).toBeInTheDocument();
      expect(screen.getByTestId('health-status-indicator')).toHaveClass('bg-red-100');
      expect(screen.getByText(/Critical services are down/)).toBeInTheDocument();
    });

    it('should display service status cards', () => {
      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      expect(screen.getByTestId('service-database')).toBeInTheDocument();
      expect(screen.getByTestId('service-redis')).toBeInTheDocument();
      expect(screen.getByTestId('service-temporal')).toBeInTheDocument();
      
      // Check service details
      const databaseCard = screen.getByTestId('service-database');
      expect(within(databaseCard).getByText('Database')).toBeInTheDocument();
      expect(within(databaseCard).getByText('Healthy')).toBeInTheDocument();
    });

    it('should display response time metrics', () => {
      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      const databaseCard = screen.getByTestId('service-database');
      expect(within(databaseCard).getByText(/15ms/)).toBeInTheDocument();
    });

    it('should show loading state during initial load', () => {
      // Arrange
      const loadingData = healthComponentFactory.createLoadingDashboardData();
      mockUseHealthStore.mockReturnValue(loadingData);

      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading health data...')).toBeInTheDocument();
    });

    it('should display error state when health check fails', () => {
      // Arrange
      const errorData = healthComponentFactory.createErrorDashboardData();
      mockUseHealthStore.mockReturnValue(errorData);

      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      expect(screen.getByText('Error loading health data')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should display WebSocket connection status', () => {
      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      expect(screen.getByTestId('websocket-status')).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByTestId('websocket-indicator')).toHaveClass('bg-green-500');
    });

    it('should show disconnected status when WebSocket is down', () => {
      // Arrange
      mockWebSocketActions.isConnected = false;
      mockUseHealthWebSocket.mockReturnValue(mockWebSocketActions);

      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByTestId('websocket-indicator')).toHaveClass('bg-red-500');
    });

    it('should update data when health status changes', async () => {
      // Arrange
      const { rerender } = renderWithProviders(<HealthMonitoringDashboard />);
      
      // Act - simulate health status change
      const updatedData = healthComponentFactory.createDegradedDashboardData();
      mockUseHealthStore.mockReturnValue(updatedData);
      
      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <HealthMonitoringDashboard />
        </QueryClientProvider>
      );

      // Assert
      expect(screen.getByText('Degraded')).toBeInTheDocument();
    });

    it('should auto-refresh health data when enabled', async () => {
      // Arrange
      renderWithProviders(<HealthMonitoringDashboard />);

      // Act
      const autoRefreshToggle = screen.getByTestId('auto-refresh-toggle');
      await user.click(autoRefreshToggle);

      // Assert
      await waitFor(() => {
        expect(mockWebSocketActions.requestHealthCheck).toHaveBeenCalled();
      });
    });
  });

  describe('User Interactions', () => {
    it('should manually refresh health data', async () => {
      // Arrange
      renderWithProviders(<HealthMonitoringDashboard />);

      // Act
      const refreshButton = screen.getByTestId('refresh-button');
      await user.click(refreshButton);

      // Assert
      expect(mockWebSocketActions.requestHealthCheck).toHaveBeenCalled();
    });

    it('should toggle auto-refresh setting', async () => {
      // Arrange
      renderWithProviders(<HealthMonitoringDashboard />);

      // Act
      const autoRefreshToggle = screen.getByTestId('auto-refresh-toggle');
      await user.click(autoRefreshToggle);

      // Assert
      expect(mockHealthData.toggleAutoRefresh).toHaveBeenCalled();
    });

    it('should change refresh interval', async () => {
      // Arrange
      renderWithProviders(<HealthMonitoringDashboard />);

      // Act
      const intervalSelect = screen.getByTestId('refresh-interval-select');
      await user.selectOptions(intervalSelect, '60000'); // 1 minute

      // Assert
      expect(mockHealthData.setRefreshInterval).toHaveBeenCalledWith(60000);
    });

    it('should filter services by status', async () => {
      // Arrange
      renderWithProviders(<HealthMonitoringDashboard />);

      // Act
      const statusFilter = screen.getByTestId('status-filter');
      await user.selectOptions(statusFilter, 'unhealthy');

      // Assert
      // Only unhealthy services should be visible
      expect(screen.queryByTestId('service-database')).not.toBeInTheDocument();
      expect(screen.queryByTestId('service-redis')).not.toBeInTheDocument();
    });

    it('should expand service details', async () => {
      // Arrange
      renderWithProviders(<HealthMonitoringDashboard />);

      // Act
      const databaseCard = screen.getByTestId('service-database');
      const expandButton = within(databaseCard).getByTestId('expand-details');
      await user.click(expandButton);

      // Assert
      expect(screen.getByTestId('service-details-modal')).toBeInTheDocument();
      expect(screen.getByText('Database Connection Details')).toBeInTheDocument();
    });

    it('should subscribe to service-specific updates', async () => {
      // Arrange
      renderWithProviders(<HealthMonitoringDashboard />);

      // Act
      const databaseCard = screen.getByTestId('service-database');
      const subscribeButton = within(databaseCard).getByTestId('subscribe-button');
      await user.click(subscribeButton);

      // Assert
      expect(mockWebSocketActions.subscribeToService).toHaveBeenCalledWith('database');
    });
  });

  describe('Performance Monitoring', () => {
    it('should display response time chart', () => {
      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      expect(screen.getByTestId('response-time-chart')).toBeInTheDocument();
      expect(screen.getByText('Response Time Trends')).toBeInTheDocument();
    });

    it('should show system metrics', () => {
      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      expect(screen.getByTestId('system-metrics')).toBeInTheDocument();
      expect(screen.getByText('CPU Usage')).toBeInTheDocument();
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('Uptime')).toBeInTheDocument();
    });

    it('should display historical health data', async () => {
      // Arrange
      renderWithProviders(<HealthMonitoringDashboard />);

      // Act
      const historyTab = screen.getByTestId('history-tab');
      await user.click(historyTab);

      // Assert
      expect(screen.getByTestId('health-history-chart')).toBeInTheDocument();
      expect(screen.getByText('Health Status History')).toBeInTheDocument();
    });
  });

  describe('Alert Integration', () => {
    it('should display active alerts', () => {
      // Arrange
      const dataWithAlerts = healthComponentFactory.createDashboardDataWithAlerts();
      mockUseHealthStore.mockReturnValue(dataWithAlerts);

      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      expect(screen.getByTestId('active-alerts')).toBeInTheDocument();
      expect(screen.getByText('High CPU Usage Alert')).toBeInTheDocument();
    });

    it('should acknowledge alerts', async () => {
      // Arrange
      const dataWithAlerts = healthComponentFactory.createDashboardDataWithAlerts();
      mockUseHealthStore.mockReturnValue(dataWithAlerts);
      renderWithProviders(<HealthMonitoringDashboard />);

      // Act
      const acknowledgeButton = screen.getByTestId('acknowledge-alert-1');
      await user.click(acknowledgeButton);

      // Assert
      expect(mockHealthData.acknowledgeAlert).toHaveBeenCalledWith('alert-1');
    });

    it('should create custom alerts', async () => {
      // Arrange
      renderWithProviders(<HealthMonitoringDashboard />);

      // Act
      const createAlertButton = screen.getByTestId('create-alert-button');
      await user.click(createAlertButton);

      const alertModal = screen.getByTestId('create-alert-modal');
      const serviceSelect = within(alertModal).getByTestId('alert-service-select');
      const thresholdInput = within(alertModal).getByTestId('alert-threshold-input');
      const saveButton = within(alertModal).getByTestId('save-alert-button');

      await user.selectOptions(serviceSelect, 'database');
      await user.type(thresholdInput, '100');
      await user.click(saveButton);

      // Assert
      expect(mockHealthData.createAlert).toHaveBeenCalledWith({
        service: 'database',
        threshold: 100,
        type: 'response_time'
      });
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation', async () => {
      // Arrange
      renderWithProviders(<HealthMonitoringDashboard />);

      // Act
      const refreshButton = screen.getByTestId('refresh-button');
      refreshButton.focus();
      
      await user.keyboard('{Enter}');

      // Assert
      expect(mockWebSocketActions.requestHealthCheck).toHaveBeenCalled();
    });

    it('should have proper ARIA labels', () => {
      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Health monitoring dashboard');
      expect(screen.getByTestId('health-status-indicator')).toHaveAttribute('aria-label');
    });

    it('should support screen readers', () => {
      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      expect(screen.getByText('System Health Overview')).toHaveAttribute('role', 'heading');
      expect(screen.getByTestId('service-list')).toHaveAttribute('role', 'list');
    });

    it('should announce status changes to screen readers', async () => {
      // Arrange
      const { rerender } = renderWithProviders(<HealthMonitoringDashboard />);
      
      // Act
      const degradedData = healthComponentFactory.createDegradedDashboardData();
      mockUseHealthStore.mockReturnValue(degradedData);
      
      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <HealthMonitoringDashboard />
        </QueryClientProvider>
      );

      // Assert
      expect(screen.getByTestId('status-announcement')).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByTestId('status-announcement')).toHaveTextContent('System status changed to degraded');
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile devices', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // Mobile width
      });

      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      const dashboard = screen.getByTestId('health-dashboard');
      expect(dashboard).toHaveClass('mobile-layout');
      expect(screen.getByTestId('mobile-menu-button')).toBeInTheDocument();
    });

    it('should stack service cards vertically on small screens', () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640, // Small screen width
      });

      // Act
      renderWithProviders(<HealthMonitoringDashboard />);

      // Assert
      const serviceGrid = screen.getByTestId('service-grid');
      expect(serviceGrid).toHaveClass('grid-cols-1');
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component errors gracefully', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const ThrowError = () => {
        throw new Error('Test component error');
      };

      // Act
      render(
        <QueryClientProvider client={createQueryClient()}>
          <HealthMonitoringDashboard>
            <ThrowError />
          </HealthMonitoringDashboard>
        </QueryClientProvider>
      );

      // Assert
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Reload Dashboard')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });
});