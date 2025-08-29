/**
 * Client-side GraphQL Query Examples for Valuation System
 * 
 * Comprehensive examples demonstrating how to use the valuation GraphQL API
 * including queries, mutations, subscriptions, and error handling
 */

import { gql } from '@apollo/client';

// =====================================================
// BASIC QUERY EXAMPLES
// =====================================================

/**
 * Get current valuation for a specific item
 */
export const GET_ITEM_CURRENT_VALUATION = gql`
  query GetItemCurrentValuation($itemId: UUID!) {
    currentValuation(itemId: $itemId) {
      itemId
      valuationId
      valuationMethod
      estimatedValue
      confidenceScore
      valuationDate
      expiresAt
      itemName
      purchasePrice
      askingPrice
      valueChangePercent
      
      item {
        id
        name
        category
        condition
        source
        purchaseDate
      }
      
      valuation {
        id
        notes
        valuerType
        depreciationRate
        conditionFactor
      }
    }
  }
`;

/**
 * Get comprehensive pricing history for an item
 */
export const GET_ITEM_PRICING_HISTORY = gql`
  query GetItemPricingHistory($itemId: UUID!, $limit: Int = 50) {
    itemPricingHistory(itemId: $itemId, limit: $limit) {
      id
      priceType
      price
      changeReason
      sourceType
      effectiveDate
      createdAt
      metadata
    }
    
    itemMarketComparisons(itemId: $itemId, limit: 10) {
      id
      source
      sourceUrl
      title
      price
      originalPrice
      condition
      location
      similarityScore
      listingDate
      soldDate
      imageUrls
      description
    }
  }
`;

/**
 * Complex valuations query with filtering and pagination
 */
export const GET_VALUATIONS_WITH_FILTERS = gql`
  query GetValuationsWithFilters(
    $filter: ValuationFilter,
    $sort: ValuationSort,
    $pagination: PaginationInput
  ) {
    valuations(filter: $filter, sort: $sort, pagination: $pagination) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      nodes {
        id
        itemId
        valuationMethod
        estimatedValue
        confidenceScore
        createdAt
        expiresAt
        notes
        
        item {
          id
          name
          category
          purchasePrice
          askingPrice
          
          room {
            name
            floor
          }
        }
        
        marketComparisons {
          id
          source
          price
          similarityScore
        }
      }
    }
  }
`;

/**
 * Comprehensive portfolio analytics dashboard query
 */
export const GET_PRICING_INSIGHTS_DASHBOARD = gql`
  query GetPricingInsightsDashboard(
    $roomIds: [UUID!],
    $categories: [ItemCategory!],
    $timeRange: DateRange
  ) {
    pricingInsights(
      roomIds: $roomIds, 
      categories: $categories, 
      timeRange: $timeRange
    ) {
      totalItems
      itemsWithValuations
      totalPurchaseValue
      totalCurrentValue
      overallAppreciation
      avgConfidenceScore
      
      roomSummaries {
        roomId
        roomName
        floor
        itemsWithValuations
        totalPurchaseValue
        totalEstimatedValue
        avgConfidence
        totalAppreciation
        appreciationPercent
        
        topValuedItems(limit: 3) {
          itemId
          itemName
          estimatedValue
          valueChangePercent
        }
      }
      
      marketInsights {
        category
        brand
        itemCount
        avgCurrentValue
        avgPurchasePrice
        retentionPercent
        marketComparisonsAvailable
      }
      
      topPerformers {
        itemId
        itemName
        estimatedValue
        valueChangePercent
        confidenceScore
      }
      
      needsUpdate {
        itemId
        itemName
        estimatedValue
        confidenceScore
        expiresAt
        valuationDate
      }
    }
  }
`;

/**
 * Advanced portfolio analytics with risk assessment
 */
export const GET_PORTFOLIO_ANALYTICS = gql`
  query GetPortfolioAnalytics($timeHorizon: Int, $riskTolerance: String) {
    portfolioAnalytics(timeHorizon: $timeHorizon, riskTolerance: $riskTolerance) {
      totalValue
      totalCost
      unrealizedGainLoss
      returnOnInvestment
      annualizedReturn
      volatility
      sharpeRatio
      maxDrawdown
      valueAtRisk
      
      categoryDistribution {
        category
        count
        currentValue
        percentage
        performance
      }
      
      performanceMetrics {
        alpha
        beta
        informationRatio
        trackingError
      }
    }
    
    portfolioRiskAssessment {
      overallRisk
      riskScore
      
      riskFactors {
        factor
        impact
        probability
        description
        mitigation
      }
      
      concentrationRisk {
        categoryConcentration
        valueConcentration
        riskLevel
        recommendations
      }
      
      liquidityRisk {
        averageLiquidityScore
        liquidityBuffer
        recommendations
      }
    }
  }
`;

// =====================================================
// MUTATION EXAMPLES
// =====================================================

/**
 * Create a new manual valuation
 */
export const CREATE_VALUATION = gql`
  mutation CreateValuation($input: ValuationInput!) {
    createValuation(input: $input) {
      id
      itemId
      valuationMethod
      estimatedValue
      confidenceScore
      notes
      createdAt
      expiresAt
      
      item {
        name
        category
        purchasePrice
      }
    }
  }
`;

/**
 * Request batch valuations for multiple items
 */
export const REQUEST_BATCH_VALUATIONS = gql`
  mutation RequestBatchValuations($input: ValuationRequestInput!) {
    requestValuations(input: $input) {
      requestId
      totalItems
      successCount
      failureCount
      estimatedCompletion
      status
      progressPercent
      
      errors {
        itemId
        itemName
        error
        code
        retryable
      }
    }
  }
`;

/**
 * Record a price change with market context
 */
export const RECORD_PRICE_CHANGE = gql`
  mutation RecordPriceChange($input: PriceHistoryInput!) {
    recordPriceChange(input: $input) {
      id
      itemId
      priceType
      price
      changeReason
      sourceType
      effectiveDate
      createdAt
      
      item {
        name
        currentValuation {
          estimatedValue
        }
      }
    }
  }
`;

/**
 * Perform market research for comparable items
 */
export const PERFORM_MARKET_RESEARCH = gql`
  mutation PerformMarketResearch($input: MarketResearchInput!) {
    performMarketResearch(input: $input) {
      id
      source
      sourceUrl
      title
      price
      condition
      location
      similarityScore
      imageUrls
      description
      listingDate
      soldDate
    }
  }
`;

/**
 * Bulk price updates with validation
 */
export const BULK_UPDATE_PRICES = gql`
  mutation BulkUpdatePrices($updates: [BulkPriceUpdate!]!) {
    bulkUpdatePrices(updates: $updates) {
      id
      itemId
      priceType
      price
      changeReason
      effectiveDate
      
      item {
        name
        category
      }
    }
  }
`;

// =====================================================
// SUBSCRIPTION EXAMPLES
// =====================================================

/**
 * Real-time valuation updates for specific items
 */
export const VALUATION_UPDATES_SUBSCRIPTION = gql`
  subscription ValuationUpdates($itemIds: [UUID!], $minChangePercent: Float) {
    valuationUpdated(itemIds: $itemIds, minChangePercent: $minChangePercent) {
      itemId
      valuationId
      oldValue
      newValue
      method
      confidence
      changeReason
      timestamp
      
      item {
        name
        category
      }
      
      valuation {
        estimatedValue
        confidenceScore
        notes
      }
    }
  }
`;

/**
 * Price movement alerts
 */
export const PRICE_ALERTS_SUBSCRIPTION = gql`
  subscription PriceAlerts(
    $itemIds: [UUID!], 
    $alertTypes: [String!], 
    $minChangePercent: Float
  ) {
    priceAlert(
      itemIds: $itemIds,
      alertTypes: $alertTypes,
      minChangePercent: $minChangePercent
    ) {
      itemId
      alertType
      currentPrice
      previousPrice
      changePercent
      source
      message
      timestamp
      
      item {
        name
        category
        room {
          name
          floor
        }
      }
    }
  }
`;

/**
 * Portfolio performance streaming
 */
export const PORTFOLIO_UPDATES_SUBSCRIPTION = gql`
  subscription PortfolioUpdates {
    portfolioValueUpdate {
      totalItems
      totalPurchaseValue
      totalCurrentValue
      overallAppreciation
      
      roomSummaries {
        roomName
        totalEstimatedValue
        appreciationPercent
      }
    }
  }
`;

/**
 * Batch operation progress tracking
 */
export const BATCH_PROGRESS_SUBSCRIPTION = gql`
  subscription BatchProgress($requestId: UUID!) {
    batchProgress(requestId: $requestId) {
      requestId
      status
      completedItems
      totalItems
      progressPercent
      estimatedRemaining
      currentItem
      
      errors {
        itemId
        itemName
        error
        code
      }
    }
  }
`;

// =====================================================
// RECOMMENDATION AND ANALYSIS QUERIES
// =====================================================

/**
 * Get investment opportunities
 */
export const GET_INVESTMENT_OPPORTUNITIES = gql`
  query GetInvestmentOpportunities(
    $budget: Decimal!,
    $riskProfile: String!,
    $categories: [ItemCategory!],
    $limit: Int = 10
  ) {
    investmentOpportunities(
      budget: $budget,
      riskProfile: $riskProfile,
      categories: $categories,
      limit: $limit
    ) {
      category
      suggestedBudget
      expectedReturn
      riskLevel
      timeHorizon
      rationale
      marketConditions
      entryStrategy
      exitStrategy
      
      similarItems {
        id
        name
        purchasePrice
        currentValuation {
          estimatedValue
          valueChangePercent
        }
      }
    }
  }
`;

/**
 * Get selling recommendations
 */
export const GET_SELLING_RECOMMENDATIONS = gql`
  query GetSellingRecommendations($maxItems: Int = 10, $minAppreciation: Float = 0) {
    sellRecommendations(maxItems: $maxItems, minAppreciation: $minAppreciation) {
      itemId
      itemName
      estimatedValue
      purchasePrice
      valueChangePercent
      confidenceScore
      
      item {
        category
        condition
        source
        room {
          name
          floor
        }
        
        marketComparisons(limit: 3) {
          source
          price
          soldDate
          similarityScore
        }
        
        liquidityScore
        marketPerformance
      }
    }
  }
`;

/**
 * Market timing recommendations
 */
export const GET_MARKET_TIMING_RECOMMENDATIONS = gql`
  query GetMarketTimingRecommendations {
    marketTimingRecommendations {
      action
      category
      confidence
      timeframe
      rationale
      marketSignals
      
      priceTargets {
        entry
        target
        stop
      }
    }
  }
`;

// =====================================================
// FEDERATED QUERIES (INVENTORY INTEGRATION)
// =====================================================

/**
 * Extended item query with valuation data
 */
export const GET_ITEM_WITH_VALUATION_DATA = gql`
  query GetItemWithValuationData($itemId: UUID!) {
    item(id: $itemId) {
      # Core item fields from inventory service
      id
      name
      description
      category
      purchasePrice
      askingPrice
      condition
      source
      purchaseDate
      
      room {
        name
        floor
      }
      
      # Extended valuation fields
      currentValuation {
        estimatedValue
        confidenceScore
        valuationMethod
        valuationDate
      }
      
      estimatedValue
      valueAppreciation
      valuationConfidence
      lastValuationDate
      needsValuationUpdate
      
      # Market analysis
      marketPerformance
      investmentGrade
      liquidityScore
      annualizedReturn
      
      # Related valuation data
      marketComparisons {
        source
        price
        similarityScore
        soldDate
      }
      
      priceHistory(limit: 10) {
        priceType
        price
        effectiveDate
        changeReason
      }
    }
  }
`;

/**
 * Room with comprehensive valuation summary
 */
export const GET_ROOM_WITH_VALUATION_SUMMARY = gql`
  query GetRoomWithValuationSummary($roomId: UUID!) {
    room(id: $roomId) {
      # Core room fields
      id
      name
      floor
      squareFootage
      
      # Valuation summary
      valuationSummary {
        itemsWithValuations
        totalPurchaseValue
        totalEstimatedValue
        avgConfidence
        totalAppreciation
        appreciationPercent
      }
      
      # Computed valuation fields
      totalEstimatedValue
      valueAppreciation
      avgItemValue
      roomROI
      roomMarketHealth
      
      # Performance metrics
      topValuedItems(limit: 5) {
        itemName
        estimatedValue
        valueChangePercent
      }
      
      recentPriceChanges(days: 30) {
        priceType
        price
        changeReason
        effectiveDate
      }
    }
  }
`;

// =====================================================
// ERROR HANDLING EXAMPLES
// =====================================================

/**
 * Example of handling GraphQL errors with proper error codes
 */
export const handleValuationErrors = (error: any) => {
  if (error.graphQLErrors) {
    error.graphQLErrors.forEach((gqlError: any) => {
      const { extensions } = gqlError;
      
      switch (extensions?.code) {
        case 'QUERY_COMPLEXITY_TOO_HIGH':
          console.warn(`Query too complex: ${extensions.complexity}/${extensions.maxComplexity}`);
          // Suggest query simplification
          break;
          
        case 'RATE_LIMIT_EXCEEDED':
          console.warn(`Rate limit exceeded. Retry after ${extensions.retryAfter} seconds`);
          // Implement exponential backoff
          break;
          
        case 'VALUATION_NOT_FOUND':
          console.error('Valuation not found for item');
          // Handle missing valuation gracefully
          break;
          
        case 'MARKET_DATA_UNAVAILABLE':
          console.warn('Market data temporarily unavailable');
          // Use cached data or show warning
          break;
          
        case 'BATCH_OPERATION_FAILED':
          console.error('Batch operation failed:', extensions.failureCount);
          // Show partial success and retry options
          break;
          
        default:
          console.error('GraphQL Error:', gqlError.message);
      }
    });
  }
  
  if (error.networkError) {
    console.error('Network Error:', error.networkError);
    // Handle network connectivity issues
  }
};

// =====================================================
// CLIENT CONFIGURATION EXAMPLES
// =====================================================

/**
 * Apollo Client configuration for valuation system
 */
export const apolloClientConfig = {
  // GraphQL endpoint
  uri: process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:4000/graphql',
  
  // WebSocket for subscriptions
  wsUri: process.env.REACT_APP_WS_URL || 'ws://localhost:4000/graphql',
  
  // Caching configuration
  cache: {
    typePolicies: {
      Item: {
        fields: {
          currentValuation: {
            merge: true
          },
          valuations: {
            merge: false // Always replace the array
          },
          marketComparisons: {
            merge: false
          }
        }
      },
      
      ValuationConnection: {
        fields: {
          nodes: {
            merge: false
          }
        }
      }
    }
  },
  
  // Error handling
  errorPolicy: 'all', // Return both data and errors
  
  // Default options
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'ignore'
    },
    query: {
      errorPolicy: 'all'
    },
    mutate: {
      errorPolicy: 'all'
    }
  }
};

/**
 * Variable examples for common queries
 */
export const queryVariables = {
  // Complex filtering example
  valuationsFilter: {
    filter: {
      confidenceRange: { min: 0.7, max: 1.0 },
      valueRange: { min: 100, max: 10000 },
      categories: ['FURNITURE', 'ART_DECOR'],
      needsUpdate: false,
      hasComparisons: true
    },
    sort: {
      field: 'ESTIMATED_VALUE',
      direction: 'DESC'
    },
    pagination: {
      first: 20,
      after: null
    }
  },
  
  // Batch valuation request
  batchValuationRequest: {
    input: {
      itemIds: ['uuid1', 'uuid2', 'uuid3'],
      requestType: 'FULL_ANALYSIS',
      priority: 5,
      forceRefresh: true
    }
  },
  
  // Market research configuration
  marketResearchInput: {
    input: {
      itemId: 'item-uuid',
      sources: ['EBAY', 'CHAIRISH', 'FACEBOOK_MARKETPLACE'],
      maxResults: 20,
      includeImages: true,
      similarityThreshold: 0.7
    }
  }
};

export default {
  queries: {
    GET_ITEM_CURRENT_VALUATION,
    GET_ITEM_PRICING_HISTORY,
    GET_VALUATIONS_WITH_FILTERS,
    GET_PRICING_INSIGHTS_DASHBOARD,
    GET_PORTFOLIO_ANALYTICS,
    GET_INVESTMENT_OPPORTUNITIES,
    GET_SELLING_RECOMMENDATIONS,
    GET_MARKET_TIMING_RECOMMENDATIONS,
    GET_ITEM_WITH_VALUATION_DATA,
    GET_ROOM_WITH_VALUATION_SUMMARY
  },
  
  mutations: {
    CREATE_VALUATION,
    REQUEST_BATCH_VALUATIONS,
    RECORD_PRICE_CHANGE,
    PERFORM_MARKET_RESEARCH,
    BULK_UPDATE_PRICES
  },
  
  subscriptions: {
    VALUATION_UPDATES_SUBSCRIPTION,
    PRICE_ALERTS_SUBSCRIPTION,
    PORTFOLIO_UPDATES_SUBSCRIPTION,
    BATCH_PROGRESS_SUBSCRIPTION
  },
  
  utils: {
    handleValuationErrors,
    apolloClientConfig,
    queryVariables
  }
};