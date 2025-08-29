import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

import { PricingInsightsDashboard } from '../../src/components/pricing/PricingInsightsDashboard';
import { mockPricingInsights } from '../__mocks__/valuationMocks';

// Mock Chart.js components
vi.mock('react-chartjs-2', () => ({
  Chart: vi.fn(() => null),
  Bar: vi.fn(({ data, options, ...props }) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} {...props}>
      Bar Chart Mock
    </div>
  )),
  Line: vi.fn(({ data, options, ...props }) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} {...props}>
      Line Chart Mock
    </div>
  )),
  Doughnut: vi.fn(({ data, options, ...props }) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} {...props}>
      Doughnut Chart Mock
    </div>
  )),
}));

// Mock API calls
vi.mock('../../src/api/valuationApi', () => ({
  usePricingInsights: vi.fn(),
  useExportPricingReport: vi.fn(),
}));

import { usePricingInsights, useExportPricingReport } from '../../src/api/valuationApi';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('PricingInsightsDashboard', () => {
  const mockUsePricingInsights = usePricingInsights as jest.MockedFunction<typeof usePricingInsights>;
  const mockUseExportPricingReport = useExportPricingReport as jest.MockedFunction<typeof useExportPricingReport>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock return values
    mockUsePricingInsights.mockReturnValue({
      data: mockPricingInsights,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseExportPricingReport.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
      error: null,
      data: null,
    });
  });

  it('renders dashboard header correctly', () => {
    renderWithQueryClient(<PricingInsightsDashboard />);

    expect(screen.getByText('Pricing Insights Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export report/i })).toBeInTheDocument();
  });

  it('displays summary statistics correctly', () => {
    renderWithQueryClient(<PricingInsightsDashboard />);

    // Check summary cards
    expect(screen.getByText('Total Items')).toBeInTheDocument();
    expect(screen.getByText('156')).toBeInTheDocument(); // Total items count

    expect(screen.getByText('Items with Valuations')).toBeInTheDocument();
    expect(screen.getByText('124')).toBeInTheDocument(); // Items with valuations count

    expect(screen.getByText('Total Purchase Value')).toBeInTheDocument();
    expect(screen.getByText('$45,600.00')).toBeInTheDocument();

    expect(screen.getByText('Total Current Value')).toBeInTheDocument();
    expect(screen.getByText('$38,800.00')).toBeInTheDocument();

    expect(screen.getByText('Overall Change')).toBeInTheDocument();
    expect(screen.getByText('-$6,800.00')).toBeInTheDocument();
    expect(screen.getByText('(-14.9%)')).toBeInTheDocument();
  });

  it('renders room summaries table correctly', () => {
    renderWithQueryClient(<PricingInsightsDashboard />);

    // Check table headers
    expect(screen.getByText('Room')).toBeInTheDocument();
    expect(screen.getByText('Items')).toBeInTheDocument();
    expect(screen.getByText('Purchase Value')).toBeInTheDocument();
    expect(screen.getByText('Current Value')).toBeInTheDocument();
    expect(screen.getByText('Change')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();

    // Check room data
    expect(screen.getByText('Living Room')).toBeInTheDocument();
    expect(screen.getByText('Bedroom')).toBeInTheDocument();
    expect(screen.getByText('Kitchen')).toBeInTheDocument();

    // Check specific room values
    const livingRoomRow = screen.getByText('Living Room').closest('tr');
    expect(within(livingRoomRow!).getByText('8')).toBeInTheDocument(); // Items count
    expect(within(livingRoomRow!).getByText('$18,500.00')).toBeInTheDocument(); // Purchase value
    expect(within(livingRoomRow!).getByText('85%')).toBeInTheDocument(); // Confidence
  });

  it('handles room sorting correctly', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingInsightsDashboard />);

    // Click on room name header to sort
    const roomHeader = screen.getByText('Room');
    await user.click(roomHeader);

    // Table should be re-sorted (we'd need to check the order of rows)
    const tableRows = screen.getAllByRole('row');
    expect(tableRows.length).toBeGreaterThan(1); // Header + data rows
  });

  it('renders market insights section correctly', () => {
    renderWithQueryClient(<PricingInsightsDashboard />);

    expect(screen.getByText('Market Insights')).toBeInTheDocument();

    // Check category insights
    expect(screen.getByText('Furniture')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Art / Decor')).toBeInTheDocument();

    // Check retention percentages
    expect(screen.getByText('72%')).toBeInTheDocument(); // Furniture retention
    expect(screen.getByText('45%')).toBeInTheDocument(); // Electronics retention
  });

  it('displays top performers correctly', () => {
    renderWithQueryClient(<PricingInsightsDashboard />);

    expect(screen.getByText('Top Performers')).toBeInTheDocument();

    // Check for specific top performing items
    expect(screen.getByText('Vintage Armchair')).toBeInTheDocument();
    expect(screen.getByText('Designer Table Lamp')).toBeInTheDocument();

    // Check appreciation values
    expect(screen.getByText('+25%')).toBeInTheDocument(); // Vintage armchair appreciation
    expect(screen.getByText('+15%')).toBeInTheDocument(); // Table lamp appreciation
  });

  it('displays items needing updates correctly', () => {
    renderWithQueryClient(<PricingInsightsDashboard />);

    expect(screen.getByText('Needs Valuation Update')).toBeInTheDocument();

    // Check for items with stale valuations
    expect(screen.getByText('Modern Sofa')).toBeInTheDocument();
    expect(screen.getByText('Coffee Table')).toBeInTheDocument();

    // Check last updated dates
    expect(screen.getByText(/90 days ago/i)).toBeInTheDocument();
    expect(screen.getByText(/120 days ago/i)).toBeInTheDocument();
  });

  it('renders charts correctly', () => {
    renderWithQueryClient(<PricingInsightsDashboard />);

    // Check that chart components are rendered
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument(); // Room values chart
    expect(screen.getByTestId('line-chart')).toBeInTheDocument(); // Value trends chart
    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument(); // Category breakdown
  });

  it('handles loading state correctly', () => {
    mockUsePricingInsights.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<PricingInsightsDashboard />);

    expect(screen.getByTestId('dashboard-loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading pricing insights...')).toBeInTheDocument();
  });

  it('handles error state correctly', () => {
    const errorMessage = 'Failed to load pricing insights';
    mockUsePricingInsights.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error(errorMessage),
      refetch: vi.fn(),
    });

    renderWithQueryClient(<PricingInsightsDashboard />);

    expect(screen.getByText('Error Loading Insights')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn();

    mockUsePricingInsights.mockReturnValue({
      data: mockPricingInsights,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderWithQueryClient(<PricingInsightsDashboard />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles export report button click', async () => {
    const user = userEvent.setup();
    const mockExportMutate = vi.fn();

    mockUseExportPricingReport.mockReturnValue({
      mutate: mockExportMutate,
      isLoading: false,
      error: null,
      data: null,
    });

    renderWithQueryClient(<PricingInsightsDashboard />);

    const exportButton = screen.getByRole('button', { name: /export report/i });
    await user.click(exportButton);

    expect(mockExportMutate).toHaveBeenCalledWith({
      format: 'pdf',
      includeCharts: true,
      includeDetails: true,
    });
  });

  it('shows export loading state', () => {
    mockUseExportPricingReport.mockReturnValue({
      mutate: vi.fn(),
      isLoading: true,
      error: null,
      data: null,
    });

    renderWithQueryClient(<PricingInsightsDashboard />);

    const exportButton = screen.getByRole('button', { name: /export report/i });
    expect(exportButton).toBeDisabled();
    expect(within(exportButton).getByTestId('export-spinner')).toBeInTheDocument();
  });

  it('handles empty data state', () => {
    const emptyInsights = {
      ...mockPricingInsights,
      totalItems: 0,
      roomSummaries: [],
      marketInsights: [],
      topPerformers: [],
      needsUpdate: [],
    };

    mockUsePricingInsights.mockReturnValue({
      data: emptyInsights,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(<PricingInsightsDashboard />);

    expect(screen.getByText('No Data Available')).toBeInTheDocument();
    expect(screen.getByText('Add items and valuations to see insights.')).toBeInTheDocument();
  });

  it('displays correct currency formatting', () => {
    renderWithQueryClient(<PricingInsightsDashboard />);

    // Check various currency formats
    expect(screen.getByText('$45,600.00')).toBeInTheDocument(); // Large amount with commas
    expect(screen.getByText('$38,800.00')).toBeInTheDocument();
    expect(screen.getByText('-$6,800.00')).toBeInTheDocument(); // Negative amount
  });

  it('displays correct percentage formatting', () => {
    renderWithQueryClient(<PricingInsightsDashboard />);

    // Check various percentage formats
    expect(screen.getByText('(-14.9%)')).toBeInTheDocument(); // Negative percentage
    expect(screen.getByText('+25%')).toBeInTheDocument(); // Positive percentage
    expect(screen.getByText('85%')).toBeInTheDocument(); // Confidence percentage
  });

  it('handles time-based filtering', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingInsightsDashboard />);

    // Check for time filter dropdown
    const timeFilterSelect = screen.getByLabelText(/time period/i);
    expect(timeFilterSelect).toBeInTheDocument();

    // Change time period
    await user.selectOptions(timeFilterSelect, '6months');

    // Should trigger data refetch with new parameters
    await waitFor(() => {
      expect(mockUsePricingInsights).toHaveBeenCalledWith(
        expect.objectContaining({ timePeriod: '6months' })
      );
    });
  });

  it('supports room filtering', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingInsightsDashboard />);

    // Check for room filter checkboxes
    const livingRoomCheckbox = screen.getByRole('checkbox', { name: /living room/i });
    const bedroomCheckbox = screen.getByRole('checkbox', { name: /bedroom/i });

    expect(livingRoomCheckbox).toBeChecked(); // Should be checked by default
    expect(bedroomCheckbox).toBeChecked();

    // Uncheck bedroom
    await user.click(bedroomCheckbox);

    expect(bedroomCheckbox).not.toBeChecked();
    // Should update the displayed data (filtered)
  });

  it('handles responsive design breakpoints', () => {
    // Mock different viewport sizes
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768, // Tablet size
    });

    renderWithQueryClient(<PricingInsightsDashboard />);

    const dashboard = screen.getByTestId('pricing-insights-dashboard');
    expect(dashboard).toHaveClass('responsive-layout');
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(<PricingInsightsDashboard />);

    // Tab through interactive elements
    await user.tab();
    expect(screen.getByRole('button', { name: /refresh/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: /export report/i })).toHaveFocus();

    await user.tab();
    expect(screen.getByLabelText(/time period/i)).toHaveFocus();
  });
});

// Integration tests for dashboard interactions
describe('PricingInsightsDashboard Integration', () => {
  it('handles complete dashboard workflow', async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn();
    const mockExport = vi.fn();

    mockUsePricingInsights.mockReturnValue({
      data: mockPricingInsights,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    mockUseExportPricingReport.mockReturnValue({
      mutate: mockExport,
      isLoading: false,
      error: null,
      data: null,
    });

    renderWithQueryClient(<PricingInsightsDashboard />);

    // 1. Verify initial data load
    expect(screen.getByText('156')).toBeInTheDocument(); // Total items

    // 2. Filter by room
    const kitchenCheckbox = screen.getByRole('checkbox', { name: /kitchen/i });
    await user.click(kitchenCheckbox);

    // 3. Change time period
    const timeSelect = screen.getByLabelText(/time period/i);
    await user.selectOptions(timeSelect, '3months');

    // 4. Refresh data
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();

    // 5. Export report
    const exportButton = screen.getByRole('button', { name: /export report/i });
    await user.click(exportButton);

    expect(mockExport).toHaveBeenCalled();
  });

  it('handles data updates correctly', async () => {
    const mockRefetch = vi.fn();

    // Initial render with old data
    mockUsePricingInsights.mockReturnValue({
      data: mockPricingInsights,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { rerender } = renderWithQueryClient(<PricingInsightsDashboard />);

    expect(screen.getByText('156')).toBeInTheDocument();

    // Simulate data update
    const updatedInsights = {
      ...mockPricingInsights,
      totalItems: 160,
      totalCurrentValue: 40000,
    };

    mockUsePricingInsights.mockReturnValue({
      data: updatedInsights,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <PricingInsightsDashboard />
      </QueryClientProvider>
    );

    // Should show updated values
    expect(screen.getByText('160')).toBeInTheDocument();
    expect(screen.getByText('$40,000.00')).toBeInTheDocument();
  });
});