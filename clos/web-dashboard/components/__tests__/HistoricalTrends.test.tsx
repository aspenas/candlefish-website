import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HistoricalTrends } from '../HistoricalTrends';

describe('HistoricalTrends', () => {
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
    
    // Mock historical data API responses
    mockAnalyticsApi.getHistoricalTrends = jest.fn().mockResolvedValue({
      success: true,
      data: {
        agents: [
          {
            timestamp: '2024-01-01T08:00:00Z',
            responseTime: 120,
            successRate: 98.5,
            errorRate: 1.5
          },
          {
            timestamp: '2024-01-01T09:00:00Z',
            responseTime: 115,
            successRate: 98.8,
            errorRate: 1.2
          },
          {
            timestamp: '2024-01-01T10:00:00Z',
            responseTime: 118,
            successRate: 98.6,
            errorRate: 1.4
          }
        ],
        services: [
          {
            timestamp: '2024-01-01T08:00:00Z',
            responseTime: 89,
            uptime: 99.9,
            errorRate: 0.1
          },
          {
            timestamp: '2024-01-01T09:00:00Z',
            responseTime: 92,
            uptime: 99.8,
            errorRate: 0.2
          },
          {
            timestamp: '2024-01-01T10:00:00Z',
            responseTime: 87,
            uptime: 99.9,
            errorRate: 0.1
          }
        ],
        system: [
          {
            timestamp: '2024-01-01T08:00:00Z',
            cpuUsage: 45.2,
            memoryUsage: 67.8,
            diskUsage: 23.1
          },
          {
            timestamp: '2024-01-01T09:00:00Z',
            cpuUsage: 48.1,
            memoryUsage: 69.2,
            diskUsage: 23.5
          },
          {
            timestamp: '2024-01-01T10:00:00Z',
            cpuUsage: 46.7,
            memoryUsage: 68.4,
            diskUsage: 23.3
          }
        ]
      }
    });

    mockAnalyticsApi.getComparativeAnalysis = jest.fn().mockResolvedValue({
      success: true,
      data: {
        periodComparison: {
          current: { avg: 118, change: -2.5 },
          previous: { avg: 121, change: 0 }
        },
        trends: {
          responseTime: 'improving',
          successRate: 'stable',
          errorRate: 'improving'
        },
        anomalies: [
          {
            timestamp: '2024-01-01T09:30:00Z',
            metric: 'responseTime',
            value: 250,
            severity: 'high',
            description: 'Response time spike detected'
          }
        ]
      }
    });

    mockAnalyticsApi.getForecastData = jest.fn().mockResolvedValue({
      success: true,
      data: {
        predictions: [
          { timestamp: '2024-01-01T11:00:00Z', predicted: 116, confidence: 85 },
          { timestamp: '2024-01-01T12:00:00Z', predicted: 114, confidence: 80 },
          { timestamp: '2024-01-01T13:00:00Z', predicted: 119, confidence: 75 }
        ],
        accuracy: {
          lastWeek: 87.5,
          lastMonth: 82.3
        }
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

  it('should render historical trends component', async () => {
    renderWithProviders(<HistoricalTrends />);

    expect(screen.getByText('Historical Trends')).toBeInTheDocument();
    expect(screen.getByText('Performance Analysis')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });
  });

  it('should display time period selector', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HistoricalTrends />);

    const periodSelector = screen.getByRole('combobox', { name: /time period/i });
    expect(periodSelector).toBeInTheDocument();

    await user.click(periodSelector);

    expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Last 3 months')).toBeInTheDocument();
  });

  it('should update data when time period changes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HistoricalTrends />);

    const periodSelector = screen.getByRole('combobox', { name: /time period/i });
    await user.click(periodSelector);

    const weeklyOption = screen.getByText('Last 7 days');
    await user.click(weeklyOption);

    await waitFor(() => {
      expect(mockAnalyticsApi.getHistoricalTrends).toHaveBeenCalledWith(
        expect.objectContaining({
          period: '7d'
        })
      );
    });
  });

  it('should toggle between different metrics', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HistoricalTrends />);

    await waitFor(() => {
      expect(screen.getByText('Response Time')).toBeInTheDocument();
    });

    // Switch to Success Rate metric
    const successRateButton = screen.getByRole('button', { name: /success rate/i });
    await user.click(successRateButton);

    expect(successRateButton).toHaveAttribute('aria-pressed', 'true');

    // Chart should update to show success rate data
    await waitFor(() => {
      expect(screen.getByText('98.8%')).toBeInTheDocument();
    });
  });

  it('should display comparative analysis', async () => {
    renderWithProviders(<HistoricalTrends />);

    await waitFor(() => {
      expect(screen.getByText('Comparative Analysis')).toBeInTheDocument();
      expect(screen.getByText('-2.5%')).toBeInTheDocument(); // Improvement
      expect(screen.getByText('vs previous period')).toBeInTheDocument();
    });

    // Check trend indicators
    const improvingTrend = screen.getByTestId('trend-improving');
    const stableTrend = screen.getByTestId('trend-stable');

    expect(improvingTrend).toBeInTheDocument();
    expect(stableTrend).toBeInTheDocument();
  });

  it('should highlight anomalies on the chart', async () => {
    renderWithProviders(<HistoricalTrends />);

    await waitFor(() => {
      const anomalyMarker = screen.getByTestId('anomaly-marker');
      expect(anomalyMarker).toBeInTheDocument();
    });

    // Click on anomaly for details
    const anomalyMarker = screen.getByTestId('anomaly-marker');
    fireEvent.click(anomalyMarker);

    await waitFor(() => {
      expect(screen.getByText('Response time spike detected')).toBeInTheDocument();
      expect(screen.getByText('Severity: High')).toBeInTheDocument();
    });
  });

  it('should show forecast predictions when enabled', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HistoricalTrends />);

    const forecastToggle = screen.getByRole('switch', { name: /show forecast/i });
    await user.click(forecastToggle);

    await waitFor(() => {
      expect(mockAnalyticsApi.getForecastData).toHaveBeenCalled();
      expect(screen.getByText('Predictions')).toBeInTheDocument();
      expect(screen.getByText('85% confidence')).toBeInTheDocument();
    });

    // Should show forecast line on chart
    expect(screen.getByTestId('forecast-line')).toBeInTheDocument();
  });

  it('should export trend data', async () => {
    const user = userEvent.setup();
    
    // Mock download functionality
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    const mockLink = {
      click: jest.fn(),
      setAttribute: jest.fn(),
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

    renderWithProviders(<HistoricalTrends />);

    await waitFor(() => {
      expect(screen.getByText('Historical Trends')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);

    // Choose CSV format
    const csvOption = screen.getByText('CSV');
    await user.click(csvOption);

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('should handle custom date range selection', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HistoricalTrends />);

    const customRangeButton = screen.getByRole('button', { name: /custom range/i });
    await user.click(customRangeButton);

    // Date picker should appear
    expect(screen.getByText('Select Date Range')).toBeInTheDocument();

    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');

    await user.type(startDateInput, '2024-01-01');
    await user.type(endDateInput, '2024-01-07');

    const applyButton = screen.getByRole('button', { name: /apply/i });
    await user.click(applyButton);

    await waitFor(() => {
      expect(mockAnalyticsApi.getHistoricalTrends).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-01-07'
        })
      );
    });
  });

  it('should show data granularity options', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HistoricalTrends />);

    const granularitySelector = screen.getByRole('combobox', { name: /granularity/i });
    await user.click(granularitySelector);

    expect(screen.getByText('1 minute')).toBeInTheDocument();
    expect(screen.getByText('5 minutes')).toBeInTheDocument();
    expect(screen.getByText('1 hour')).toBeInTheDocument();
    expect(screen.getByText('1 day')).toBeInTheDocument();

    // Select hourly granularity
    const hourlyOption = screen.getByText('1 hour');
    await user.click(hourlyOption);

    await waitFor(() => {
      expect(mockAnalyticsApi.getHistoricalTrends).toHaveBeenCalledWith(
        expect.objectContaining({
          granularity: 'hour'
        })
      );
    });
  });

  it('should display statistical summary', async () => {
    renderWithProviders(<HistoricalTrends />);

    await waitFor(() => {
      expect(screen.getByText('Statistical Summary')).toBeInTheDocument();
    });

    // Check for statistical values
    expect(screen.getByText('Min:')).toBeInTheDocument();
    expect(screen.getByText('Max:')).toBeInTheDocument();
    expect(screen.getByText('Avg:')).toBeInTheDocument();
    expect(screen.getByText('Std Dev:')).toBeInTheDocument();

    // Values should be calculated from the data
    expect(screen.getByText('115ms')).toBeInTheDocument(); // Min
    expect(screen.getByText('120ms')).toBeInTheDocument(); // Max
    expect(screen.getByText('117.7ms')).toBeInTheDocument(); // Average
  });

  it('should support chart zoom and pan', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HistoricalTrends />);

    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    const chart = screen.getByTestId('area-chart');

    // Simulate zoom gesture
    fireEvent.wheel(chart, {
      deltaY: -100,
      ctrlKey: true
    });

    // Should trigger zoom callback
    await waitFor(() => {
      expect(screen.getByText('Zoomed View')).toBeInTheDocument();
    });

    // Reset zoom
    const resetButton = screen.getByRole('button', { name: /reset zoom/i });
    await user.click(resetButton);

    await waitFor(() => {
      expect(screen.queryByText('Zoomed View')).not.toBeInTheDocument();
    });
  });

  it('should handle missing data gracefully', async () => {
    mockAnalyticsApi.getHistoricalTrends.mockResolvedValue({
      success: true,
      data: {
        agents: [],
        services: [],
        system: []
      }
    });

    renderWithProviders(<HistoricalTrends />);

    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument();
      expect(screen.getByText('Try selecting a different time period')).toBeInTheDocument();
    });
  });

  it('should show correlation analysis between metrics', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HistoricalTrends />);

    const correlationTab = screen.getByRole('tab', { name: /correlation/i });
    await user.click(correlationTab);

    await waitFor(() => {
      expect(screen.getByText('Metric Correlations')).toBeInTheDocument();
    });

    // Should show correlation matrix
    expect(screen.getByText('Response Time vs Success Rate')).toBeInTheDocument();
    expect(screen.getByText('Strong negative correlation')).toBeInTheDocument();
    expect(screen.getByText('-0.87')).toBeInTheDocument(); // Correlation coefficient
  });

  it('should be accessible with proper ARIA labels', async () => {
    renderWithProviders(<HistoricalTrends />);

    // Check main accessibility features
    expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Historical Trends Analysis');
    
    await waitFor(() => {
      const chart = screen.getByRole('img', { name: /performance trend chart/i });
      expect(chart).toBeInTheDocument();
    });

    // Tab navigation should work
    const tabList = screen.getByRole('tablist');
    expect(tabList).toHaveAttribute('aria-label', 'Trend analysis tabs');
  });

  it('should handle keyboard shortcuts', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HistoricalTrends />);

    await waitFor(() => {
      expect(screen.getByText('Historical Trends')).toBeInTheDocument();
    });

    // Focus the component
    const main = screen.getByRole('main');
    main.focus();

    // Test keyboard shortcuts
    await user.keyboard('r'); // Refresh data
    expect(mockAnalyticsApi.getHistoricalTrends).toHaveBeenCalledTimes(2);

    await user.keyboard('e'); // Export data
    expect(screen.getByText('Export Options')).toBeInTheDocument();

    await user.keyboard('{Escape}'); // Close modal
    expect(screen.queryByText('Export Options')).not.toBeInTheDocument();
  });

  it('should update in real-time with WebSocket data', async () => {
    const mockWebSocket = require('../../hooks/useWebSocket').useWebSocket();
    renderWithProviders(<HistoricalTrends />);

    await waitFor(() => {
      expect(screen.getByText('Historical Trends')).toBeInTheDocument();
    });

    // Simulate WebSocket update
    const newDataPoint = {
      timestamp: '2024-01-01T11:00:00Z',
      responseTime: 122,
      successRate: 98.4,
      errorRate: 1.6
    };

    // Trigger WebSocket callback
    const onCallback = mockWebSocket.on.mock.calls.find(
      call => call[0] === 'analytics:trends:update'
    )?.[1];

    if (onCallback) {
      onCallback(newDataPoint);
    }

    await waitFor(() => {
      // Should append new data point to the chart
      expect(screen.getByText('122ms')).toBeInTheDocument();
    });
  });
});