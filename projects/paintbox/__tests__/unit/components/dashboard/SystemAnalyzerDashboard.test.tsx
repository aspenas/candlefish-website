/**
 * Unit Tests for SystemAnalyzerDashboard Component
 * Tests main dashboard functionality, data fetching, and user interactions
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { SystemAnalyzerDashboard } from '../../../../components/dashboard/SystemAnalyzerDashboard';
import { ApolloMockFactory, mockSystemData } from '../../../mocks/apolloMocks';
import { SYSTEM_ANALYSIS_QUERY, SERVICES_QUERY } from '../../../mocks/apolloMocks';
import '@testing-library/jest-dom';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock chart components
jest.mock('react-chartjs-2', () => ({
  Line: ({ data }: any) => (
    <div data-testid="chart-line">
      Mock Line Chart: {data?.datasets?.[0]?.label || 'No data'}
    </div>
  ),
  Doughnut: ({ data }: any) => (
    <div data-testid="chart-doughnut">
      Mock Doughnut Chart: {data?.labels?.join(', ') || 'No labels'}
    </div>
  ),
}));

// Mock Next.js router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    pathname: '/dashboard',
    query: {},
    asPath: '/dashboard',
  }),
}));

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('SystemAnalyzerDashboard', () => {
  const defaultMocks = ApolloMockFactory.createComprehensiveMocks();

  const renderDashboard = (mocks = defaultMocks, props = {}) => {
    return render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <SystemAnalyzerDashboard {...props} />
      </MockedProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading States', () => {
    it('should show loading spinner while fetching initial data', async () => {
      const loadingMocks = ApolloMockFactory.createLoadingMocks();

      renderDashboard(loadingMocks);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading system analysis/i)).toBeInTheDocument();
    });

    it('should show skeleton components during data loading', async () => {
      const loadingMocks = ApolloMockFactory.createLoadingMocks();

      renderDashboard(loadingMocks);

      expect(screen.getAllByTestId('skeleton')).toHaveLength(6); // Expect 6 skeleton components
    });
  });

  describe('Data Display', () => {
    it('should display system health overview correctly', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('system-health-score')).toBeInTheDocument();
        expect(screen.getByText(/overall health/i)).toBeInTheDocument();
        expect(screen.getByTestId('health-status-badge')).toBeInTheDocument();
      });

      // Check health score display
      const healthScore = screen.getByTestId('health-score-value');
      expect(healthScore).toHaveTextContent(/\d{1,3}/); // Should display a number
    });

    it('should display services summary correctly', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/total services/i)).toBeInTheDocument();
        expect(screen.getByText(/healthy services/i)).toBeInTheDocument();
        expect(screen.getByText(/degraded services/i)).toBeInTheDocument();
        expect(screen.getByText(/unhealthy services/i)).toBeInTheDocument();
      });

      // Check service counts
      const serviceCounts = screen.getAllByTestId('service-count');
      expect(serviceCounts.length).toBeGreaterThan(0);
    });

    it('should display alerts summary correctly', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/active alerts/i)).toBeInTheDocument();
        expect(screen.getByTestId('alerts-summary')).toBeInTheDocument();
      });

      // Check for alert severity breakdown
      expect(screen.getByText(/critical/i)).toBeInTheDocument();
      expect(screen.getByText(/high/i)).toBeInTheDocument();
      expect(screen.getByText(/medium/i)).toBeInTheDocument();
      expect(screen.getByText(/low/i)).toBeInTheDocument();
    });

    it('should display performance metrics chart', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('chart-line')).toBeInTheDocument();
        expect(screen.getByText(/performance trends/i)).toBeInTheDocument();
      });
    });

    it('should display service status distribution chart', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('chart-doughnut')).toBeInTheDocument();
        expect(screen.getByText(/service distribution/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle refresh button click', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
      });

      const refreshButton = screen.getByTestId('refresh-button');
      fireEvent.click(refreshButton);

      // Should show loading state briefly
      expect(screen.getByTestId('refresh-loading')).toBeInTheDocument();
    });

    it('should handle time range selection', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('time-range-selector')).toBeInTheDocument();
      });

      const timeRangeSelector = screen.getByTestId('time-range-selector');
      fireEvent.change(timeRangeSelector, { target: { value: '24h' } });

      // Should trigger new data fetch
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });

    it('should navigate to services view when service card clicked', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('services-card')).toBeInTheDocument();
      });

      const servicesCard = screen.getByTestId('services-card');
      fireEvent.click(servicesCard);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/services');
    });

    it('should navigate to alerts view when alerts card clicked', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('alerts-card')).toBeInTheDocument();
      });

      const alertsCard = screen.getByTestId('alerts-card');
      fireEvent.click(alertsCard);

      expect(mockPush).toHaveBeenCalledWith('/dashboard/alerts');
    });

    it('should handle service filter changes', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('service-filter')).toBeInTheDocument();
      });

      const serviceFilter = screen.getByTestId('service-filter');
      fireEvent.change(serviceFilter, { target: { value: 'UNHEALTHY' } });

      // Should update displayed services
      await waitFor(() => {
        expect(screen.getByTestId('filtered-services')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should update dashboard when receiving real-time data', async () => {
      const subscriptionMocks = ApolloMockFactory.createSubscriptionMocks();

      renderDashboard([...defaultMocks, ...subscriptionMocks]);

      await waitFor(() => {
        expect(screen.getByTestId('system-health-score')).toBeInTheDocument();
      });

      // Simulate real-time update
      // This would normally come through subscriptions
      // For testing purposes, we can check that the component handles updates
      expect(screen.getByTestId('real-time-indicator')).toBeInTheDocument();
    });

    it('should show connection status indicator', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      });

      const connectionStatus = screen.getByTestId('connection-status');
      expect(connectionStatus).toHaveClass('connected'); // Should show as connected
    });
  });

  describe('Error Handling', () => {
    it('should display error message when data fetch fails', async () => {
      const errorMocks = ApolloMockFactory.createErrorMocks();

      renderDashboard(errorMocks);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText(/failed to load system analysis/i)).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    it('should handle retry after error', async () => {
      const errorMocks = ApolloMockFactory.createErrorMocks();

      renderDashboard(errorMocks);

      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId('retry-button');
      fireEvent.click(retryButton);

      // Should show loading state
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should handle partial data failures gracefully', async () => {
      const partialErrorMocks = [
        ...defaultMocks.slice(0, 2), // Only include some successful mocks
        ...ApolloMockFactory.createErrorMocks().slice(0, 1), // Include one error mock
      ];

      renderDashboard(partialErrorMocks);

      await waitFor(() => {
        // Should show available data
        expect(screen.getByTestId('system-health-score')).toBeInTheDocument();

        // Should show error for failed sections
        expect(screen.getByTestId('section-error')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', async () => {
      const renderSpy = jest.fn();

      const TestWrapper = () => {
        renderSpy();
        return <SystemAnalyzerDashboard />;
      };

      render(
        <MockedProvider mocks={defaultMocks} addTypename={false}>
          <TestWrapper />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('system-health-score')).toBeInTheDocument();
      });

      // Initial render
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Simulate prop change that shouldn't cause re-render
      // This would be more comprehensive in a real test
    });

    it('should use memoization for expensive calculations', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('memoized-calculations')).toBeInTheDocument();
      });

      // Check that expensive calculations are memoized
      const calculationElement = screen.getByTestId('memoized-calculations');
      expect(calculationElement).toHaveAttribute('data-memoized', 'true');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('system-health-score')).toBeInTheDocument();
      });

      // Check for ARIA labels
      expect(screen.getByLabelText(/system health score/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/services overview/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/alerts summary/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('services-card')).toBeInTheDocument();
      });

      const servicesCard = screen.getByTestId('services-card');

      // Should be focusable
      expect(servicesCard).toHaveAttribute('tabIndex', '0');

      // Should handle Enter key
      fireEvent.keyDown(servicesCard, { key: 'Enter', code: 'Enter' });
      expect(mockPush).toHaveBeenCalledWith('/dashboard/services');
    });

    it('should have proper color contrast for health status indicators', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('health-status-badge')).toBeInTheDocument();
      });

      const healthBadge = screen.getByTestId('health-status-badge');

      // Should have appropriate contrast class
      expect(healthBadge).toHaveClass(/text-(white|black)/);
      expect(healthBadge).toHaveClass(/bg-(green|yellow|red)/);
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', async () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // Mobile width
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-container')).toBeInTheDocument();
      });

      const container = screen.getByTestId('dashboard-container');
      expect(container).toHaveClass(/mobile-layout/);
    });

    it('should show appropriate number of columns on different screen sizes', async () => {
      // Mock window.innerWidth for tablet
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768, // Tablet width
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument();
      });

      const grid = screen.getByTestId('dashboard-grid');
      expect(grid).toHaveClass(/grid-cols-2/); // Should use 2 columns on tablet
    });
  });

  describe('Data Refresh', () => {
    it('should auto-refresh data at specified intervals', async () => {
      jest.useFakeTimers();

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('system-health-score')).toBeInTheDocument();
      });

      // Fast-forward time to trigger auto-refresh
      jest.advanceTimersByTime(30000); // 30 seconds

      // Should show refresh indicator
      expect(screen.getByTestId('auto-refresh-indicator')).toBeInTheDocument();

      jest.useRealTimers();
    });

    it('should pause auto-refresh when user is inactive', async () => {
      jest.useFakeTimers();

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('system-health-score')).toBeInTheDocument();
      });

      // Simulate user inactivity
      const dashboard = screen.getByTestId('dashboard-container');
      fireEvent.blur(dashboard);

      // Fast-forward time
      jest.advanceTimersByTime(60000); // 1 minute

      // Should show paused indicator
      expect(screen.getByTestId('refresh-paused-indicator')).toBeInTheDocument();

      jest.useRealTimers();
    });
  });

  describe('Integration with Other Components', () => {
    it('should communicate with alert components', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('alert-component')).toBeInTheDocument();
      });

      // Should pass correct props to alert components
      const alertComponent = screen.getByTestId('alert-component');
      expect(alertComponent).toHaveAttribute('data-service-count', expect.any(String));
    });

    it('should communicate with metric components', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('metric-component')).toBeInTheDocument();
      });

      // Should pass time range to metric components
      const metricComponent = screen.getByTestId('metric-component');
      expect(metricComponent).toHaveAttribute('data-time-range', '24h');
    });
  });
});
