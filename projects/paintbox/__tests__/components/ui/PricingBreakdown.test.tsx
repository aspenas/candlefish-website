import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { PricingBreakdown } from '@/components/ui/PricingBreakdown';
import { CALCULATE_PRICING } from '@/lib/graphql/queries';

// Mock data
const mockPricingInput = {
  squareFootage: 2000,
  laborHours: 24,
  materialType: 'STANDARD',
  complexity: 'MODERATE',
};

const mockCalculationResult = {
  laborCost: 1440.00,
  materialCost: 900.00,
  overheadCost: 468.00,
  profitMargin: 562.32,
  subtotal: 3370.32,
  tax: 269.63,
  total: 3639.95,
};

const mockTieredPricing = {
  good: {
    ...mockCalculationResult,
    total: 3100.00,
    materialType: 'ECONOMY',
  },
  better: {
    ...mockCalculationResult,
    total: 3639.95,
    materialType: 'STANDARD',
  },
  best: {
    ...mockCalculationResult,
    total: 4550.00,
    materialType: 'PREMIUM',
  },
};

const mocks = [
  {
    request: {
      query: CALCULATE_PRICING,
      variables: { input: mockPricingInput },
    },
    result: {
      data: {
        calculatePricing: mockCalculationResult,
      },
    },
  },
];

describe('PricingBreakdown Component', () => {
  const defaultProps = {
    squareFootage: 2000,
    laborHours: 24,
    materialType: 'STANDARD' as const,
    complexity: 'MODERATE' as const,
    onTierSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render pricing breakdown with loading state', () => {
    render(
      <MockedProvider mocks={mocks}>
        <PricingBreakdown {...defaultProps} />
      </MockedProvider>
    );

    expect(screen.getByText('Calculating pricing...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should display calculated pricing after loading', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <PricingBreakdown {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Labor Cost')).toBeInTheDocument();
    });

    expect(screen.getByText('$1,440.00')).toBeInTheDocument();
    expect(screen.getByText('Material Cost')).toBeInTheDocument();
    expect(screen.getByText('$900.00')).toBeInTheDocument();
    expect(screen.getByText('Overhead')).toBeInTheDocument();
    expect(screen.getByText('$468.00')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('$3,639.95')).toBeInTheDocument();
  });

  it('should show three pricing tiers (Good, Better, Best)', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <PricingBreakdown {...defaultProps} showTiers={true} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    expect(screen.getByText('Better')).toBeInTheDocument();
    expect(screen.getByText('Best')).toBeInTheDocument();

    // Check tier pricing
    expect(screen.getByText('$3,100')).toBeInTheDocument(); // Good tier
    expect(screen.getByText('$3,640')).toBeInTheDocument(); // Better tier
    expect(screen.getByText('$4,550')).toBeInTheDocument(); // Best tier
  });

  it('should highlight selected tier', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <PricingBreakdown {...defaultProps} showTiers={true} selectedTier="BETTER" />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Better')).toBeInTheDocument();
    });

    const betterTierCard = screen.getByText('Better').closest('.tier-card');
    expect(betterTierCard).toHaveClass('selected');
  });

  it('should call onTierSelect when tier is clicked', async () => {
    const onTierSelect = jest.fn();

    render(
      <MockedProvider mocks={mocks}>
        <PricingBreakdown {...defaultProps} showTiers={true} onTierSelect={onTierSelect} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Best')).toBeInTheDocument();
    });

    const bestTierButton = screen.getByText('Best').closest('button');
    fireEvent.click(bestTierButton!);

    expect(onTierSelect).toHaveBeenCalledWith('BEST', {
      ...mockTieredPricing.best,
    });
  });

  it('should display breakdown with detailed line items', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <PricingBreakdown {...defaultProps} showDetails={true} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Pricing Breakdown')).toBeInTheDocument();
    });

    // Check for detailed breakdown items
    expect(screen.getByText('Labor (24 hrs × $60/hr)')).toBeInTheDocument();
    expect(screen.getByText('Materials (2,000 sqft × $0.45/sqft)')).toBeInTheDocument();
    expect(screen.getByText('Overhead (20%)')).toBeInTheDocument();
    expect(screen.getByText('Profit Margin (24%)')).toBeInTheDocument();
    expect(screen.getByText('Tax (8%)')).toBeInTheDocument();
  });

  it('should handle calculation errors gracefully', async () => {
    const errorMocks = [
      {
        request: {
          query: CALCULATE_PRICING,
          variables: { input: mockPricingInput },
        },
        error: new Error('Calculation failed'),
      },
    ];

    render(
      <MockedProvider mocks={errorMocks}>
        <PricingBreakdown {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to calculate pricing')).toBeInTheDocument();
    });

    expect(screen.getByText('Please check your inputs and try again')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('should recalculate when inputs change', async () => {
    const { rerender } = render(
      <MockedProvider mocks={mocks}>
        <PricingBreakdown {...defaultProps} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('$3,639.95')).toBeInTheDocument();
    });

    const updatedMocks = [
      {
        request: {
          query: CALCULATE_PRICING,
          variables: { 
            input: { 
              ...mockPricingInput, 
              squareFootage: 3000,
            },
          },
        },
        result: {
          data: {
            calculatePricing: {
              ...mockCalculationResult,
              materialCost: 1350.00,
              total: 4189.95,
            },
          },
        },
      },
    ];

    rerender(
      <MockedProvider mocks={updatedMocks}>
        <PricingBreakdown {...defaultProps} squareFootage={3000} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('$4,189.95')).toBeInTheDocument();
    });
  });

  it('should display material type descriptions', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <PricingBreakdown {...defaultProps} showTiers={true} showMaterialDetails={true} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    expect(screen.getByText('Economy Paint')).toBeInTheDocument();
    expect(screen.getByText('Standard Paint')).toBeInTheDocument();
    expect(screen.getByText('Premium Paint')).toBeInTheDocument();

    // Check for material descriptions
    expect(screen.getByText('Basic quality paint suitable for standard projects')).toBeInTheDocument();
    expect(screen.getByText('High-quality paint with enhanced durability')).toBeInTheDocument();
    expect(screen.getByText('Top-tier paint with maximum coverage and longevity')).toBeInTheDocument();
  });

  it('should handle complex projects with additional fees', async () => {
    const complexMocks = [
      {
        request: {
          query: CALCULATE_PRICING,
          variables: { 
            input: { 
              ...mockPricingInput, 
              complexity: 'HIGHLY_COMPLEX',
            },
          },
        },
        result: {
          data: {
            calculatePricing: {
              ...mockCalculationResult,
              laborCost: 1800.00, // Higher labor for complex work
              overheadCost: 650.00, // Higher overhead
              total: 4500.00,
            },
          },
        },
      },
    ];

    render(
      <MockedProvider mocks={complexMocks}>
        <PricingBreakdown {...defaultProps} complexity="HIGHLY_COMPLEX" showDetails={true} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('$4,500.00')).toBeInTheDocument();
    });

    expect(screen.getByText('Complex Project Surcharge')).toBeInTheDocument();
    expect(screen.getByText('Additional setup and specialized techniques')).toBeInTheDocument();
  });

  it('should be accessible with proper ARIA labels', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <PricingBreakdown {...defaultProps} showTiers={true} />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Better')).toBeInTheDocument();
    });

    // Check ARIA labels
    expect(screen.getByRole('region', { name: 'Pricing breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Pricing tiers' })).toBeInTheDocument();

    // Check tier buttons have proper labels
    const tierButtons = screen.getAllByRole('button');
    tierButtons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
  });

  it('should format currency correctly for different locales', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <PricingBreakdown {...defaultProps} locale="en-US" currency="USD" />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('$3,639.95')).toBeInTheDocument();
    });

    // All currency values should be formatted consistently
    const currencyElements = screen.getAllByText(/\$[\d,]+\.\d{2}/);
    expect(currencyElements.length).toBeGreaterThan(0);

    currencyElements.forEach(element => {
      expect(element.textContent).toMatch(/^\$[\d,]+\.\d{2}$/);
    });
  });

  it('should handle real-time price updates via subscription', async () => {
    const mockSubscriptionData = {
      calculationProgress: {
        estimateId: 'estimate1',
        stage: 'FINALIZATION',
        progress: 1.0,
        message: 'Calculation complete',
        completed: true,
      },
    };

    render(
      <MockedProvider mocks={mocks}>
        <PricingBreakdown 
          {...defaultProps} 
          estimateId="estimate1" 
          enableRealTimeUpdates={true} 
        />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('$3,639.95')).toBeInTheDocument();
    });

    // Simulate subscription update
    fireEvent(window, new CustomEvent('pricing-update', {
      detail: {
        ...mockCalculationResult,
        total: 3700.00, // Updated price
      },
    }));

    await waitFor(() => {
      expect(screen.getByText('$3,700.00')).toBeInTheDocument();
    });
  });
});