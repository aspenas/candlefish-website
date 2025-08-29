import type {
  CurrentValuation,
  ValuationResponse,
  PricingInsightsResponse,
  MarketComparison,
  PriceHistory,
  Item,
  RoomValuationSummary,
  MarketInsight,
} from '../../src/types/valuation';

// Mock Current Valuation
export const mockCurrentValuation: CurrentValuation = {
  itemId: 'test-item-id-123',
  valuationId: 'test-valuation-id-456',
  valuationMethod: 'market_lookup',
  estimatedValue: 1200.00,
  confidenceScore: 0.85,
  valuationDate: '2024-01-15T10:30:00Z',
  expiresAt: '2024-02-15T10:30:00Z',
  itemName: 'Modern Leather Sofa',
  purchasePrice: 1000.00,
  askingPrice: 1150.00,
  valueChangePercent: 20.0,
};

// Mock Item
export const mockItem: Item = {
  id: 'test-item-id-123',
  roomId: 'test-room-id-789',
  name: 'Modern Leather Sofa',
  description: 'Contemporary leather sofa in excellent condition',
  category: 'Furniture',
  decision: 'Keep',
  purchasePrice: 1000.00,
  askingPrice: 1150.00,
  quantity: 1,
  isFixture: false,
  source: 'West Elm',
  condition: 'excellent',
  purchaseDate: '2023-06-15T00:00:00Z',
  createdAt: '2023-06-15T12:00:00Z',
  updatedAt: '2024-01-10T15:30:00Z',
};

// Mock Market Comparisons
export const mockMarketComparisons: MarketComparison[] = [
  {
    id: 'comp-1',
    itemId: 'test-item-id-123',
    source: 'ebay',
    sourceUrl: 'https://ebay.com/item/123456',
    title: 'West Elm Modern Leather Sofa - Excellent',
    price: 1300.00,
    originalPrice: 1500.00,
    condition: 'excellent',
    location: 'Los Angeles, CA',
    similarityScore: 0.92,
    listingDate: '2024-01-10T00:00:00Z',
    shippingCost: 50.00,
    description: 'Beautiful West Elm leather sofa in excellent condition',
    sellerRating: 4.8,
    createdAt: '2024-01-11T09:00:00Z',
    updatedAt: '2024-01-11T09:00:00Z',
  },
  {
    id: 'comp-2',
    itemId: 'test-item-id-123',
    source: 'chairish',
    sourceUrl: 'https://chairish.com/product/789012',
    title: 'Mid-Century Modern Leather Sofa',
    price: 1100.00,
    condition: 'very good',
    location: 'San Francisco, CA',
    similarityScore: 0.78,
    listingDate: '2024-01-05T00:00:00Z',
    description: 'Vintage-style leather sofa, professionally cleaned',
    sellerRating: 4.9,
    createdAt: '2024-01-11T09:15:00Z',
    updatedAt: '2024-01-11T09:15:00Z',
  },
  {
    id: 'comp-3',
    itemId: 'test-item-id-123',
    source: 'facebook_marketplace',
    title: 'Leather Couch - Moving Sale',
    price: 800.00,
    condition: 'good',
    location: 'Seattle, WA',
    similarityScore: 0.65,
    listingDate: '2024-01-12T00:00:00Z',
    description: 'Comfortable leather couch, minor wear on arms',
    createdAt: '2024-01-13T14:20:00Z',
    updatedAt: '2024-01-13T14:20:00Z',
  },
];

// Mock Price History
export const mockPriceHistory: PriceHistory[] = [
  {
    id: 'history-1',
    itemId: 'test-item-id-123',
    priceType: 'purchase',
    price: 1000.00,
    changeReason: 'initial_purchase',
    sourceType: 'owner',
    effectiveDate: '2023-06-15T00:00:00Z',
    createdAt: '2023-06-15T12:00:00Z',
  },
  {
    id: 'history-2',
    itemId: 'test-item-id-123',
    priceType: 'valuation',
    price: 950.00,
    changeReason: 'depreciation_model',
    sourceType: 'system',
    metadata: '{"age_months": 6, "condition_factor": 0.95}',
    effectiveDate: '2023-12-15T00:00:00Z',
    createdAt: '2023-12-15T10:30:00Z',
  },
  {
    id: 'history-3',
    itemId: 'test-item-id-123',
    priceType: 'asking',
    price: 1150.00,
    changeReason: 'owner_adjustment',
    sourceType: 'owner',
    effectiveDate: '2024-01-10T00:00:00Z',
    createdAt: '2024-01-10T15:30:00Z',
  },
  {
    id: 'history-4',
    itemId: 'test-item-id-123',
    priceType: 'valuation',
    price: 1200.00,
    changeReason: 'market_lookup',
    sourceType: 'system',
    metadata: '{"comparisons_count": 8, "avg_similarity": 0.82}',
    effectiveDate: '2024-01-15T00:00:00Z',
    createdAt: '2024-01-15T10:30:00Z',
  },
];

// Mock Valuation Response
export const mockValuationResponse: ValuationResponse = {
  itemId: 'test-item-id-123',
  currentValuation: mockCurrentValuation,
  marketComparisons: mockMarketComparisons,
  priceHistory: mockPriceHistory,
  confidence: 0.85,
  lastUpdated: '2024-01-15T10:30:00Z',
};

// Mock Room Summaries
export const mockRoomSummaries: RoomValuationSummary[] = [
  {
    roomId: 'room-living-1',
    roomName: 'Living Room',
    floor: 'Main Floor',
    itemsWithValuations: 8,
    totalPurchaseValue: 18500.00,
    totalEstimatedValue: 15200.00,
    avgConfidence: 0.85,
    totalAppreciation: -3300.00,
    appreciationPercent: -17.8,
  },
  {
    roomId: 'room-bedroom-1',
    roomName: 'Bedroom',
    floor: 'Upper Floor',
    itemsWithValuations: 6,
    totalPurchaseValue: 12400.00,
    totalEstimatedValue: 10800.00,
    avgConfidence: 0.78,
    totalAppreciation: -1600.00,
    appreciationPercent: -12.9,
  },
  {
    roomId: 'room-kitchen-1',
    roomName: 'Kitchen',
    floor: 'Main Floor',
    itemsWithValuations: 4,
    totalPurchaseValue: 8200.00,
    totalEstimatedValue: 7400.00,
    avgConfidence: 0.82,
    totalAppreciation: -800.00,
    appreciationPercent: -9.8,
  },
  {
    roomId: 'room-office-1',
    roomName: 'Home Office',
    floor: 'Main Floor',
    itemsWithValuations: 5,
    totalPurchaseValue: 6500.00,
    totalEstimatedValue: 5400.00,
    avgConfidence: 0.80,
    totalAppreciation: -1100.00,
    appreciationPercent: -16.9,
  },
];

// Mock Market Insights
export const mockMarketInsights: MarketInsight[] = [
  {
    category: 'Furniture',
    brand: 'West Elm',
    itemCount: 12,
    avgCurrentValue: 850.00,
    avgPurchasePrice: 1200.00,
    avgConfidence: 0.83,
    retentionPercent: 72.0,
    marketComparisonsAvailable: 96,
  },
  {
    category: 'Electronics',
    brand: 'Samsung',
    itemCount: 8,
    avgCurrentValue: 420.00,
    avgPurchasePrice: 780.00,
    avgConfidence: 0.76,
    retentionPercent: 45.0,
    marketComparisonsAvailable: 64,
  },
  {
    category: 'Art / Decor',
    brand: 'Local Artists',
    itemCount: 15,
    avgCurrentValue: 180.00,
    avgPurchasePrice: 220.00,
    avgConfidence: 0.68,
    retentionPercent: 82.0,
    marketComparisonsAvailable: 32,
  },
  {
    category: 'Lighting',
    brand: 'Pottery Barn',
    itemCount: 6,
    avgCurrentValue: 125.00,
    avgPurchasePrice: 160.00,
    avgConfidence: 0.85,
    retentionPercent: 78.0,
    marketComparisonsAvailable: 48,
  },
];

// Mock Top Performers
export const mockTopPerformers: CurrentValuation[] = [
  {
    itemId: 'item-vintage-chair',
    valuationId: 'val-vintage-chair',
    valuationMethod: 'professional_appraisal',
    estimatedValue: 1250.00,
    confidenceScore: 0.95,
    valuationDate: '2024-01-10T00:00:00Z',
    itemName: 'Vintage Armchair',
    purchasePrice: 1000.00,
    askingPrice: 1300.00,
    valueChangePercent: 25.0,
  },
  {
    itemId: 'item-designer-lamp',
    valuationId: 'val-designer-lamp',
    valuationMethod: 'market_lookup',
    estimatedValue: 460.00,
    confidenceScore: 0.88,
    valuationDate: '2024-01-12T00:00:00Z',
    itemName: 'Designer Table Lamp',
    purchasePrice: 400.00,
    askingPrice: 450.00,
    valueChangePercent: 15.0,
  },
  {
    itemId: 'item-art-piece',
    valuationId: 'val-art-piece',
    valuationMethod: 'comparable_sales',
    estimatedValue: 850.00,
    confidenceScore: 0.79,
    valuationDate: '2024-01-08T00:00:00Z',
    itemName: 'Abstract Canvas Painting',
    purchasePrice: 750.00,
    askingPrice: 800.00,
    valueChangePercent: 13.3,
  },
];

// Mock Items Needing Update
export const mockNeedsUpdate: CurrentValuation[] = [
  {
    itemId: 'item-stale-sofa',
    valuationId: 'val-stale-sofa',
    valuationMethod: 'depreciation_model',
    estimatedValue: 800.00,
    confidenceScore: 0.65,
    valuationDate: '2023-10-15T00:00:00Z', // 90+ days old
    expiresAt: '2023-11-15T00:00:00Z',
    itemName: 'Modern Sofa',
    purchasePrice: 1200.00,
    askingPrice: 850.00,
    valueChangePercent: -33.3,
  },
  {
    itemId: 'item-stale-table',
    valuationId: 'val-stale-table',
    valuationMethod: 'market_lookup',
    estimatedValue: 320.00,
    confidenceScore: 0.58,
    valuationDate: '2023-09-20T00:00:00Z', // 120+ days old
    expiresAt: '2023-10-20T00:00:00Z',
    itemName: 'Coffee Table',
    purchasePrice: 450.00,
    askingPrice: 350.00,
    valueChangePercent: -28.9,
  },
  {
    itemId: 'item-stale-electronics',
    valuationId: 'val-stale-electronics',
    valuationMethod: 'depreciation_model',
    estimatedValue: 180.00,
    confidenceScore: 0.70,
    valuationDate: '2023-08-30T00:00:00Z', // 150+ days old
    expiresAt: '2023-09-30T00:00:00Z',
    itemName: 'Bluetooth Speaker',
    purchasePrice: 300.00,
    askingPrice: 200.00,
    valueChangePercent: -40.0,
  },
];

// Mock Pricing Insights Response
export const mockPricingInsights: PricingInsightsResponse = {
  totalItems: 156,
  itemsWithValuations: 124,
  totalPurchaseValue: 45600.00,
  totalCurrentValue: 38800.00,
  overallAppreciation: -6800.00,
  roomSummaries: mockRoomSummaries,
  marketInsights: mockMarketInsights,
  topPerformers: mockTopPerformers,
  needsUpdate: mockNeedsUpdate,
};

// Mock Error Responses
export const mockApiError = {
  message: 'Failed to fetch valuation data',
  status: 500,
  details: 'Internal server error occurred while processing valuation request',
};

export const mockNetworkError = {
  message: 'Network request failed',
  status: 0,
  details: 'Unable to connect to the valuation service',
};

// Mock Loading States
export const mockLoadingState = {
  isLoading: true,
  data: null,
  error: null,
};

// Helper Functions for Test Data
export const createMockValuation = (overrides: Partial<CurrentValuation> = {}): CurrentValuation => ({
  ...mockCurrentValuation,
  ...overrides,
});

export const createMockItem = (overrides: Partial<Item> = {}): Item => ({
  ...mockItem,
  ...overrides,
});

export const createMockMarketComparison = (overrides: Partial<MarketComparison> = {}): MarketComparison => ({
  ...mockMarketComparisons[0],
  id: `comp-${Date.now()}`,
  ...overrides,
});

export const createMockPriceHistoryEntry = (overrides: Partial<PriceHistory> = {}): PriceHistory => ({
  ...mockPriceHistory[0],
  id: `history-${Date.now()}`,
  ...overrides,
});

// Test Scenarios
export const testScenarios = {
  // High-value items
  expensiveItem: createMockItem({
    name: 'Designer Dining Table',
    purchasePrice: 5000.00,
    askingPrice: 4200.00,
  }),

  expensiveValuation: createMockValuation({
    estimatedValue: 4500.00,
    purchasePrice: 5000.00,
    valueChangePercent: -10.0,
    confidenceScore: 0.92,
  }),

  // Depreciated electronics
  electronicsItem: createMockItem({
    name: 'Smart TV 55"',
    category: 'Electronics',
    purchasePrice: 1200.00,
    askingPrice: 600.00,
  }),

  electronicsValuation: createMockValuation({
    estimatedValue: 650.00,
    purchasePrice: 1200.00,
    valueChangePercent: -45.8,
    confidenceScore: 0.78,
    valuationMethod: 'depreciation_model',
  }),

  // Appreciated vintage items
  vintageItem: createMockItem({
    name: 'Mid-Century Armchair',
    condition: 'excellent',
    purchasePrice: 800.00,
    askingPrice: 1200.00,
  }),

  vintageValuation: createMockValuation({
    estimatedValue: 1300.00,
    purchasePrice: 800.00,
    valueChangePercent: 62.5,
    confidenceScore: 0.88,
    valuationMethod: 'professional_appraisal',
  }),

  // Low confidence valuation
  uncertainValuation: createMockValuation({
    estimatedValue: 450.00,
    confidenceScore: 0.35,
    valuationMethod: 'depreciation_model',
  }),

  // Expired valuation
  expiredValuation: createMockValuation({
    expiresAt: '2023-12-01T00:00:00Z', // Expired
    valuationDate: '2023-11-01T00:00:00Z',
  }),

  // Empty data scenarios
  emptyRoomSummaries: [] as RoomValuationSummary[],
  emptyMarketComparisons: [] as MarketComparison[],
  emptyPriceHistory: [] as PriceHistory[],
  
  emptyPricingInsights: {
    ...mockPricingInsights,
    totalItems: 0,
    itemsWithValuations: 0,
    totalPurchaseValue: 0,
    totalCurrentValue: 0,
    overallAppreciation: 0,
    roomSummaries: [],
    marketInsights: [],
    topPerformers: [],
    needsUpdate: [],
  } as PricingInsightsResponse,
};

// Mock API Response Builders
export const mockApiResponses = {
  success: <T>(data: T) => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  }),

  error: (message: string, status: number = 500) => ({
    response: {
      data: { error: message },
      status,
      statusText: status === 404 ? 'Not Found' : 'Internal Server Error',
    },
  }),

  loading: {
    data: null,
    isLoading: true,
    error: null,
  },
};