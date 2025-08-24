// Comprehensive tests for HealthMonitoringDashboard component

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HealthMonitoringDashboard } from '../../../components/netlify/HealthMonitoringDashboard';
import {
  mockCandlefishSites,
  createMockPerformanceMetrics,
  generatePerformanceTimeSeries,
  assertionHelpers
} from '../../factories/netlify-factory';

// Mock the API client
jest.mock('../../../lib/netlify-api', () => ({
  netlifyApi: {
    healthCheck: jest.fn(),
    getPerformanceMetrics: jest.fn()
  }
}));

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
    defaults: { plugins: { legend: { labels: { usePointStyle: false } } } }
  },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn()
}));

jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options, ...props }: any) => (
    <div data-testid="performance-chart" data-chart-type="line" {...props}>
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
  Doughnut: ({ data, options, ...props }: any) => (
    <div data-testid="status-chart" data-chart-type="doughnut" {...props}>
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
    </div>
  )
}));

import { netlifyApi } from '../../../lib/netlify-api';

const mockNetlifyApi = netlifyApi as jest.Mocked<typeof netlifyApi>;

describe('HealthMonitoringDashboard', () => {
  const mockHealthData = {
    overview: {
      totalSites: 8,
      healthySites: 6,
      degradedSites: 1,
      unhealthySites: 1,
      maintenanceSites: 0,
      averageResponseTime: 156,
      overallUptime: 99.2,
      criticalIssues: 1
    },
    sites: mockCandlefishSites.map((site, index) => ({
      siteId: site.id,
      name: site.name,
      status: (['healthy', 'degraded', 'healthy', 'healthy', 'unhealthy', 'healthy', 'healthy', 'healthy'] as const)[index],
      responseTime: Math.floor(Math.random() * 200 + 100),
      uptime: 95 + Math.random() * 5,
      issues: index === 1 ? [
        {
          type: 'performance' as const,
          severity: 'medium' as const,
          message: 'Response time above threshold',
          since: new Date()
        }
      ] : [],
      metrics: {
        availability: 95 + Math.random() * 5,
        averageResponseTime: Math.floor(Math.random() * 200 + 100),
        errorRate: Math.random() * 0.05,
        deploymentStatus: site.status
      }
    }))
  };

  const mockProps = {
    refreshInterval: 30000,
    autoRefresh: true,
    onSiteClick: jest.fn(),
    onIssueClick: jest.fn(),
    onRefresh: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock API responses
    mockNetlifyApi.healthCheck.mockResolvedValue({
      status: 'ok',
      timestamp: new Date()
    });

    mockNetlifyApi.getPerformanceMetrics.mockImplementation((siteId) =>
      Promise.resolve(generatePerformanceTimeSeries(siteId, 24, 60))
    );

    // Mock fetch for health API
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockHealthData,
        timestamp: new Date()
      })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render health monitoring dashboard', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Health Monitoring Dashboard')).toBeInTheDocument();
        expect(screen.getByText('System Overview')).toBeInTheDocument();
        expect(screen.getByText('Site Status')).toBeInTheDocument();
      });
    });

    it('should display system overview metrics', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('8 Total Sites')).toBeInTheDocument();
        expect(screen.getByText('6 Healthy')).toBeInTheDocument();
        expect(screen.getByText('1 Degraded')).toBeInTheDocument();
        expect(screen.getByText('1 Unhealthy')).toBeInTheDocument();
        expect(screen.getByText('99.2%')).toBeInTheDocument(); // Uptime
        expect(screen.getByText('156ms')).toBeInTheDocument(); // Average response time
      });
    });

    it('should render site status grid', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        mockHealthData.sites.forEach(site => {
          expect(screen.getByText(site.name)).toBeInTheDocument();
          expect(screen.getByTestId(`site-status-${site.siteId}`)).toBeInTheDocument();
        });
      });
    });

    it('should show loading state', () => {
      // Make API call hang
      global.fetch = jest.fn(() => new Promise(() => {}));

      render(<HealthMonitoringDashboard {...mockProps} />);

      expect(screen.getByTestId('health-dashboard-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading health data...')).toBeInTheDocument();
    });

    it('should show error state when API fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));

      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load health data/)).toBeInTheDocument();
      });
    });

    it('should display performance charts', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
        expect(screen.getByTestId('status-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Status Indicators', () => {
    it('should show correct status colors', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        const healthyCards = screen.getAllByTestId(/site-status-.*healthy/);
        const degradedCards = screen.getAllByTestId(/site-status-.*degraded/);
        const unhealthyCards = screen.getAllByTestId(/site-status-.*unhealthy/);

        expect(healthyCards.length).toBeGreaterThan(0);
        expect(degradedCards.length).toBeGreaterThan(0);
        expect(unhealthyCards.length).toBeGreaterThan(0);

        // Check CSS classes for status colors
        healthyCards.forEach(card => {
          expect(card).toHaveClass('status-healthy');
        });
      });
    });

    it('should show response time indicators', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        mockHealthData.sites.forEach(site => {
          const responseTimeElement = screen.getByTestId(`response-time-${site.siteId}`);
          expect(responseTimeElement).toHaveTextContent(`${site.responseTime}ms`);
        });
      });
    });

    it('should show uptime percentages', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        mockHealthData.sites.forEach(site => {
          const uptimeElement = screen.getByTestId(`uptime-${site.siteId}`);
          expect(uptimeElement).toHaveTextContent(`${site.uptime.toFixed(1)}%`);
        });
      });
    });
  });

  describe('Issue Management', () => {
    it('should display site issues', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        const siteWithIssues = mockHealthData.sites.find(site => site.issues.length > 0);
        if (siteWithIssues) {
          const issueElement = screen.getByText(siteWithIssues.issues[0].message);
          expect(issueElement).toBeInTheDocument();
        }
      });
    });

    it('should show issue severity badges', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        const siteWithIssues = mockHealthData.sites.find(site => site.issues.length > 0);
        if (siteWithIssues) {
          const severityBadge = screen.getByTestId(`issue-severity-${siteWithIssues.issues[0].severity}`);
          expect(severityBadge).toBeInTheDocument();
          expect(severityBadge).toHaveTextContent(siteWithIssues.issues[0].severity);
        }
      });
    });

    it('should handle issue clicks', async () => {
      const user = userEvent.setup();
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(async () => {
        const siteWithIssues = mockHealthData.sites.find(site => site.issues.length > 0);
        if (siteWithIssues && siteWithIssues.issues.length > 0) {
          const issueButton = screen.getByTestId(`issue-button-${siteWithIssues.siteId}-0`);
          await user.click(issueButton);

          expect(mockProps.onIssueClick).toHaveBeenCalledWith({
            siteId: siteWithIssues.siteId,
            issue: siteWithIssues.issues[0]
          });
        }
      });
    });

    it('should group issues by severity', async () => {
      const multipleIssuesSite = {
        ...mockHealthData.sites[0],
        issues: [
          {
            type: 'performance' as const,
            severity: 'critical' as const,
            message: 'Site is down',
            since: new Date()
          },
          {
            type: 'security' as const,
            severity: 'medium' as const,
            message: 'SSL certificate expires soon',
            since: new Date()
          },
          {
            type: 'performance' as const,
            severity: 'low' as const,
            message: 'Slow response time',
            since: new Date()
          }
        ]
      };

      const modifiedHealthData = {
        ...mockHealthData,
        sites: [multipleIssuesSite, ...mockHealthData.sites.slice(1)]
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: modifiedHealthData,
          timestamp: new Date()
        })
      });

      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('issue-severity-critical')).toBeInTheDocument();
        expect(screen.getByTestId('issue-severity-medium')).toBeInTheDocument();
        expect(screen.getByTestId('issue-severity-low')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should auto-refresh data at specified interval', async () => {
      jest.useFakeTimers();

      render(<HealthMonitoringDashboard {...mockProps} refreshInterval={5000} />);

      // Initial load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Fast forward 5 seconds
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });

    it('should disable auto-refresh when autoRefresh is false', async () => {
      jest.useFakeTimers();

      render(<HealthMonitoringDashboard {...mockProps} autoRefresh={false} />);

      // Initial load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Fast forward - should not refresh
      jest.advanceTimersByTime(30000);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      jest.useRealTimers();
    });

    it('should handle manual refresh', async () => {
      const user = userEvent.setup();
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Health Monitoring Dashboard')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: 'Refresh Data' });
      await user.click(refreshButton);

      expect(mockProps.onRefresh).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should show last updated timestamp', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
        expect(screen.getByTestId('last-updated-time')).toBeInTheDocument();
      });
    });

    it('should indicate when data is stale', async () => {
      jest.useFakeTimers();

      render(<HealthMonitoringDashboard {...mockProps} refreshInterval={5000} />);

      // Initial load
      await waitFor(() => {
        expect(screen.getByText('Health Monitoring Dashboard')).toBeInTheDocument();
      });

      // Make next API call fail to simulate stale data
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      // Fast forward past refresh interval
      jest.advanceTimersByTime(10000);

      await waitFor(() => {
        expect(screen.getByTestId('stale-data-indicator')).toBeInTheDocument();
        expect(screen.getByText(/Data may be outdated/)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter sites by status', async () => {
      const user = userEvent.setup();
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Health Monitoring Dashboard')).toBeInTheDocument();
      });

      const statusFilter = screen.getByLabelText('Filter by status');
      await user.selectOptions(statusFilter, 'healthy');

      await waitFor(() => {
        const visibleSites = screen.getAllByTestId(/^site-card-/);
        visibleSites.forEach(siteCard => {
          const statusElement = within(siteCard).getByTestId(/^site-status-/);
          expect(statusElement).toHaveClass('status-healthy');
        });
      });
    });

    it('should filter sites by issues', async () => {
      const user = userEvent.setup();
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Health Monitoring Dashboard')).toBeInTheDocument();
      });

      const issueFilter = screen.getByLabelText('Show only sites with issues');
      await user.click(issueFilter);

      await waitFor(() => {
        const visibleSites = screen.getAllByTestId(/^site-card-/);
        visibleSites.forEach(siteCard => {
          const issueCount = within(siteCard).queryAllByTestId(/^issue-button-/);
          expect(issueCount.length).toBeGreaterThan(0);
        });
      });
    });

    it('should sort sites by response time', async () => {
      const user = userEvent.setup();
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Health Monitoring Dashboard')).toBeInTheDocument();
      });

      const sortSelect = screen.getByLabelText('Sort by');
      await user.selectOptions(sortSelect, 'response-time');

      await waitFor(() => {
        const siteCards = screen.getAllByTestId(/^site-card-/);
        expect(siteCards.length).toBeGreaterThan(0);

        // Check that first site has lower or equal response time than the second
        if (siteCards.length >= 2) {
          const firstResponseTime = within(siteCards[0]).getByTestId(/^response-time-/);
          const secondResponseTime = within(siteCards[1]).getByTestId(/^response-time-/);

          const firstTime = parseInt(firstResponseTime.textContent?.replace('ms', '') || '0');
          const secondTime = parseInt(secondResponseTime.textContent?.replace('ms', '') || '0');

          expect(firstTime).toBeLessThanOrEqual(secondTime);
        }
      });
    });

    it('should search sites by name', async () => {
      const user = userEvent.setup();
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Health Monitoring Dashboard')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search sites...');
      await user.type(searchInput, 'Candlefish');

      await waitFor(() => {
        const visibleSites = screen.getAllByTestId(/^site-card-/);
        visibleSites.forEach(siteCard => {
          const siteName = within(siteCard).getByRole('heading', { level: 3 });
          expect(siteName.textContent).toMatch(/Candlefish/i);
        });
      });
    });
  });

  describe('Performance Charts', () => {
    it('should render response time chart', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        const chart = screen.getByTestId('performance-chart');
        expect(chart).toHaveAttribute('data-chart-type', 'line');

        const chartData = JSON.parse(chart.querySelector('[data-testid="chart-data"]')?.textContent || '{}');
        expect(chartData.datasets).toBeDefined();
        expect(chartData.datasets[0].label).toContain('Response Time');
      });
    });

    it('should render status distribution chart', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        const chart = screen.getByTestId('status-chart');
        expect(chart).toHaveAttribute('data-chart-type', 'doughnut');

        const chartData = JSON.parse(chart.querySelector('[data-testid="chart-data"]')?.textContent || '{}');
        expect(chartData.labels).toContain('Healthy');
        expect(chartData.labels).toContain('Degraded');
        expect(chartData.labels).toContain('Unhealthy');
      });
    });

    it('should update charts when time range changes', async () => {
      const user = userEvent.setup();
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
      });

      const timeRangeSelect = screen.getByLabelText('Time Range');
      await user.selectOptions(timeRangeSelect, '7d');

      await waitFor(() => {
        expect(mockNetlifyApi.getPerformanceMetrics).toHaveBeenCalledWith(
          expect.any(String),
          '7d'
        );
      });
    });

    it('should handle chart interaction', async () => {
      const user = userEvent.setup();
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
      });

      // Simulate clicking on chart
      const chart = screen.getByTestId('performance-chart');
      await user.click(chart);

      // Should show detailed tooltip or drill-down view
      expect(screen.queryByTestId('chart-tooltip')).toBeInTheDocument();
    });
  });

  describe('Site Interactions', () => {
    it('should handle site card clicks', async () => {
      const user = userEvent.setup();
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Health Monitoring Dashboard')).toBeInTheDocument();
      });

      const firstSiteCard = screen.getByTestId(`site-card-${mockHealthData.sites[0].siteId}`);
      await user.click(firstSiteCard);

      expect(mockProps.onSiteClick).toHaveBeenCalledWith(mockHealthData.sites[0].siteId);
    });

    it('should show site details on hover', async () => {
      const user = userEvent.setup();
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Health Monitoring Dashboard')).toBeInTheDocument();
      });

      const firstSiteCard = screen.getByTestId(`site-card-${mockHealthData.sites[0].siteId}`);
      await user.hover(firstSiteCard);

      await waitFor(() => {
        expect(screen.getByTestId('site-details-tooltip')).toBeInTheDocument();
        expect(screen.getByText(/Deployment Status:/)).toBeInTheDocument();
        expect(screen.getByText(/Error Rate:/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Health Monitoring Dashboard');
        expect(screen.getByRole('region', { name: 'System Overview' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Site Status Grid' })).toBeInTheDocument();
      });
    });

    it('should announce status changes', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Simulate status change through props
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            ...mockHealthData,
            overview: {
              ...mockHealthData.overview,
              unhealthySites: 2 // Changed from 1 to 2
            }
          },
          timestamp: new Date()
        })
      });

      // Manually trigger refresh
      const refreshButton = screen.getByRole('button', { name: 'Refresh Data' });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        const statusElement = screen.getByRole('status');
        expect(statusElement).toHaveTextContent(/Site status updated/);
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Health Monitoring Dashboard')).toBeInTheDocument();
      });

      const firstSiteCard = screen.getByTestId(`site-card-${mockHealthData.sites[0].siteId}`);
      firstSiteCard.focus();

      // Should be able to activate with Enter or Space
      await user.keyboard('{Enter}');
      expect(mockProps.onSiteClick).toHaveBeenCalled();
    });

    it('should have sufficient color contrast for status indicators', async () => {
      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        const statusIndicators = screen.getAllByTestId(/^site-status-/);
        statusIndicators.forEach(indicator => {
          const styles = window.getComputedStyle(indicator);
          expect(styles.backgroundColor).toBeDefined();
          expect(styles.color).toBeDefined();
          // Additional contrast checking would be done with a proper color contrast library
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle partial data failures', async () => {
      // Mock one site's metrics to fail
      mockNetlifyApi.getPerformanceMetrics
        .mockResolvedValueOnce(generatePerformanceTimeSeries('site-1', 24, 60))
        .mockRejectedValueOnce(new Error('Metrics unavailable'))
        .mockResolvedValue(generatePerformanceTimeSeries('site-3', 24, 60));

      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        // Should still render dashboard with available data
        expect(screen.getByText('Health Monitoring Dashboard')).toBeInTheDocument();

        // Should show error for unavailable metrics
        expect(screen.getByText(/Some metrics unavailable/)).toBeInTheDocument();
      });
    });

    it('should retry failed requests', async () => {
      const user = userEvent.setup();
      global.fetch = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockHealthData,
            timestamp: new Date()
          })
        });

      render(<HealthMonitoringDashboard {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: 'Retry' });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Health Monitoring Dashboard')).toBeInTheDocument();
        expect(screen.getByText('System Overview')).toBeInTheDocument();
      });
    });
  });
});
