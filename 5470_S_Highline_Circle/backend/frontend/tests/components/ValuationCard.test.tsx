import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

import { ValuationCard } from '../../src/components/valuation/ValuationCard';
import { mockCurrentValuation, mockItem } from '../__mocks__/valuationMocks';

// Mock React Query
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Mock API calls
vi.mock('../../src/api/valuationApi', () => ({
  useCurrentValuation: vi.fn(),
  useRequestMarketValuation: vi.fn(),
  useValuationResponse: vi.fn(),
}));

import { 
  useCurrentValuation, 
  useRequestMarketValuation,
  useValuationResponse 
} from '../../src/api/valuationApi';

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ValuationCard', () => {
  const mockItemId = 'test-item-id-123';
  const mockUseCurrentValuation = useCurrentValuation as jest.MockedFunction<typeof useCurrentValuation>;
  const mockUseRequestMarketValuation = useRequestMarketValuation as jest.MockedFunction<typeof useRequestMarketValuation>;
  const mockUseValuationResponse = useValuationResponse as jest.MockedFunction<typeof useValuationResponse>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders valuation information correctly', () => {
    mockUseCurrentValuation.mockReturnValue({
      data: mockCurrentValuation,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseValuationResponse.mockReturnValue({
      data: {
        itemId: mockItemId,
        currentValuation: mockCurrentValuation,
        marketComparisons: [],
        priceHistory: [],
        confidence: 0.85,
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    // Check that valuation information is displayed
    expect(screen.getByText('Current Valuation')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument(); // Confidence score
    expect(screen.getByText('Market Lookup')).toBeInTheDocument();
    expect(screen.getByText('+20.0%')).toBeInTheDocument(); // Value change
  });

  it('displays loading state correctly', () => {
    mockUseCurrentValuation.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    mockUseValuationResponse.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    expect(screen.getByTestId('valuation-loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading valuation...')).toBeInTheDocument();
  });

  it('displays error state correctly', () => {
    const errorMessage = 'Failed to load valuation data';
    
    mockUseCurrentValuation.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error(errorMessage),
      refetch: vi.fn(),
    });

    mockUseValuationResponse.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error(errorMessage),
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    expect(screen.getByText('Error loading valuation')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('displays no valuation state correctly', () => {
    mockUseCurrentValuation.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseValuationResponse.mockReturnValue({
      data: {
        itemId: mockItemId,
        currentValuation: null,
        marketComparisons: [],
        priceHistory: [],
        confidence: null,
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    expect(screen.getByText('No Valuation Available')).toBeInTheDocument();
    expect(screen.getByText('Request market valuation to get an estimated value for this item.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request valuation/i })).toBeInTheDocument();
  });

  it('handles request valuation button click', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn();

    mockUseCurrentValuation.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseRequestMarketValuation.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
      error: null,
      data: null,
    });

    mockUseValuationResponse.mockReturnValue({
      data: {
        itemId: mockItemId,
        currentValuation: null,
        marketComparisons: [],
        priceHistory: [],
        confidence: null,
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    const requestButton = screen.getByRole('button', { name: /request valuation/i });
    await user.click(requestButton);

    expect(mockMutate).toHaveBeenCalledWith({
      itemIds: [mockItemId],
      requestType: 'market_lookup',
      priority: 1,
    });
  });

  it('displays confidence score with correct color coding', () => {
    const highConfidenceValuation = {
      ...mockCurrentValuation,
      confidenceScore: 0.95,
    };

    mockUseCurrentValuation.mockReturnValue({
      data: highConfidenceValuation,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseValuationResponse.mockReturnValue({
      data: {
        itemId: mockItemId,
        currentValuation: highConfidenceValuation,
        marketComparisons: [],
        priceHistory: [],
        confidence: 0.95,
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    const confidenceElement = screen.getByText('95%');
    expect(confidenceElement).toHaveClass('confidence-high'); // High confidence styling
  });

  it('displays value change with correct color coding', () => {
    const negativeChangeValuation = {
      ...mockCurrentValuation,
      valueChangePercent: -15.5,
    };

    mockUseCurrentValuation.mockReturnValue({
      data: negativeChangeValuation,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseValuationResponse.mockReturnValue({
      data: {
        itemId: mockItemId,
        currentValuation: negativeChangeValuation,
        marketComparisons: [],
        priceHistory: [],
        confidence: 0.85,
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    const changeElement = screen.getByText('-15.5%');
    expect(changeElement).toHaveClass('value-change-negative'); // Negative change styling
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn();

    mockUseCurrentValuation.mockReturnValue({
      data: mockCurrentValuation,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    mockUseValuationResponse.mockReturnValue({
      data: {
        itemId: mockItemId,
        currentValuation: mockCurrentValuation,
        marketComparisons: [],
        priceHistory: [],
        confidence: 0.85,
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    const refreshButton = screen.getByRole('button', { name: /refresh valuation/i });
    await user.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows expiration warning for expired valuations', () => {
    const expiredValuation = {
      ...mockCurrentValuation,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired yesterday
    };

    mockUseCurrentValuation.mockReturnValue({
      data: expiredValuation,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseValuationResponse.mockReturnValue({
      data: {
        itemId: mockItemId,
        currentValuation: expiredValuation,
        marketComparisons: [],
        priceHistory: [],
        confidence: 0.85,
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    expect(screen.getByText(/expired/i)).toBeInTheDocument();
    expect(screen.getByTestId('expiration-warning')).toBeInTheDocument();
  });

  it('handles keyboard navigation correctly', async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn();

    mockUseCurrentValuation.mockReturnValue({
      data: mockCurrentValuation,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    mockUseValuationResponse.mockReturnValue({
      data: {
        itemId: mockItemId,
        currentValuation: mockCurrentValuation,
        marketComparisons: [],
        priceHistory: [],
        confidence: 0.85,
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    const refreshButton = screen.getByRole('button', { name: /refresh valuation/i });
    
    // Focus and activate with keyboard
    refreshButton.focus();
    await user.keyboard('{Enter}');

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('displays valuation method correctly', () => {
    const depreciationValuation = {
      ...mockCurrentValuation,
      valuationMethod: 'depreciation_model' as const,
    };

    mockUseCurrentValuation.mockReturnValue({
      data: depreciationValuation,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseValuationResponse.mockReturnValue({
      data: {
        itemId: mockItemId,
        currentValuation: depreciationValuation,
        marketComparisons: [],
        priceHistory: [],
        confidence: 0.85,
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    expect(screen.getByText('Depreciation Model')).toBeInTheDocument();
  });

  it('handles missing confidence score gracefully', () => {
    const valuationWithoutConfidence = {
      ...mockCurrentValuation,
      confidenceScore: null,
    };

    mockUseCurrentValuation.mockReturnValue({
      data: valuationWithoutConfidence,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseValuationResponse.mockReturnValue({
      data: {
        itemId: mockItemId,
        currentValuation: valuationWithoutConfidence,
        marketComparisons: [],
        priceHistory: [],
        confidence: null,
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    expect(screen.getByText('--')).toBeInTheDocument(); // Placeholder for missing confidence
    expect(screen.queryByText('%')).not.toBeInTheDocument(); // No percentage sign
  });

  it('formats currency values correctly', () => {
    const largeValueValuation = {
      ...mockCurrentValuation,
      estimatedValue: 15750.99,
    };

    mockUseCurrentValuation.mockReturnValue({
      data: largeValueValuation,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseValuationResponse.mockReturnValue({
      data: {
        itemId: mockItemId,
        currentValuation: largeValueValuation,
        marketComparisons: [],
        priceHistory: [],
        confidence: 0.85,
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    expect(screen.getByText('$15,750.99')).toBeInTheDocument();
  });
});

// Additional accessibility tests
describe('ValuationCard Accessibility', () => {
  const mockItemId = 'test-item-id-123';

  it('has proper ARIA labels and roles', () => {
    const mockUseCurrentValuation = useCurrentValuation as jest.MockedFunction<typeof useCurrentValuation>;
    const mockUseValuationResponse = useValuationResponse as jest.MockedFunction<typeof useValuationResponse>;

    mockUseCurrentValuation.mockReturnValue({
      data: mockCurrentValuation,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseValuationResponse.mockReturnValue({
      data: {
        itemId: mockItemId,
        currentValuation: mockCurrentValuation,
        marketComparisons: [],
        priceHistory: [],
        confidence: 0.85,
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    // Check ARIA labels
    expect(screen.getByRole('region', { name: /valuation information/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh valuation/i })).toHaveAttribute('aria-label');
    
    // Check that important information is announced to screen readers
    const valuationAmount = screen.getByText('$1,200.00');
    expect(valuationAmount).toHaveAttribute('aria-label', expect.stringContaining('estimated value'));
  });

  it('supports high contrast mode', () => {
    const mockUseCurrentValuation = useCurrentValuation as jest.MockedFunction<typeof useCurrentValuation>;
    const mockUseValuationResponse = useValuationResponse as jest.MockedFunction<typeof useValuationResponse>;

    mockUseCurrentValuation.mockReturnValue({
      data: mockCurrentValuation,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseValuationResponse.mockReturnValue({
      data: {
        itemId: mockItemId,
        currentValuation: mockCurrentValuation,
        marketComparisons: [],
        priceHistory: [],
        confidence: 0.85,
        lastUpdated: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    });

    // Mock high contrast media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query.includes('prefers-contrast: high'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    renderWithQueryClient(<ValuationCard itemId={mockItemId} />);

    // Component should apply high contrast styles
    const card = screen.getByRole('region', { name: /valuation information/i });
    expect(card).toHaveClass('high-contrast-support');
  });
});