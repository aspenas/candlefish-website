/**
 * GraphQL Federation Configuration for Valuation and Pricing System
 * 
 * Integrates valuation services with the existing inventory GraphQL API
 * using Apollo Federation 2.0 for distributed schema composition
 */

import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'apollo-server-express';
import { readFileSync } from 'fs';
import { join } from 'path';
import { valuationResolvers, createValuationDataLoaders } from '../resolvers/valuation-resolvers';
import { Context } from '../types/context';

// =====================================================
// FEDERATION TYPE DEFINITIONS
// =====================================================

const federationTypeDefs = gql`
  # Import the valuation schema
  ${readFileSync(join(__dirname, '../schema/valuation-pricing.graphql'), 'utf-8')}

  # Federation directives and extensions
  directive @key(fields: String!, resolvable: Boolean = true) on OBJECT | INTERFACE
  directive @requires(fields: String!) on FIELD_DEFINITION
  directive @provides(fields: String!) on FIELD_DEFINITION
  directive @external on OBJECT | FIELD_DEFINITION
  directive @tag(name: String!) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
  directive @override(from: String!) on FIELD_DEFINITION
  directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
  directive @shareable on FIELD_DEFINITION | OBJECT

  # External type definitions from other subgraphs
  type Item @key(fields: "id") {
    id: UUID!
    name: String @external
    category: ItemCategory @external
    purchasePrice: Decimal @external
    askingPrice: Decimal @external
    roomId: UUID @external
    condition: String @external
    source: String @external
    purchaseDate: DateTime @external
    
    # Extended valuation fields
    currentValuation: CurrentValuation
    valuations: [ItemValuation!]!
    marketComparisons: [MarketComparison!]!
    priceHistory: [PriceHistory!]!
    valuationRequests: [ValuationRequest!]!
    
    # Computed valuation fields
    estimatedValue: Decimal
    valueAppreciation: Decimal
    valuationConfidence: Float
    lastValuationDate: DateTime
    needsValuationUpdate: Boolean!
    
    # Market analysis fields
    marketPerformance: String # 'outperforming', 'underperforming', 'stable'
    investmentGrade: String # 'A', 'B', 'C', 'D'
    liquidityScore: Float # How easy to sell (0-1)
    
    # Performance metrics
    annualizedReturn: Float
    riskAdjustedReturn: Float
    volatilityScore: Float
  }

  type Room @key(fields: "id") {
    id: UUID!
    name: String @external
    floor: FloorLevel @external
    squareFootage: Int @external
    
    # Extended valuation fields
    valuationSummary: RoomValuationSummary
    totalEstimatedValue: Decimal
    totalPurchaseValue: Decimal @requires(fields: "items { purchasePrice }")
    valueAppreciation: Decimal
    avgItemValue: Decimal
    
    # Performance metrics
    topValuedItems(limit: Int = 5): [CurrentValuation!]!
    recentPriceChanges(days: Int = 30): [PriceHistory!]!
    roomMarketHealth: String # 'strong', 'stable', 'declining'
    roomInvestmentGrade: String
    
    # Portfolio analytics
    roomROI: Float # Return on investment percentage
    roomRiskScore: Float # Risk assessment (0-1)
    appreciationVelocity: Float # Rate of value change
  }

  # Define external enums that exist in other subgraphs
  enum ItemCategory @external {
    FURNITURE
    ART_DECOR
    ELECTRONICS
    LIGHTING
    RUG_CARPET
    PLANT_INDOOR
    PLANTER_INDOOR
    OUTDOOR_PLANTER
    PLANTER_ACCESS
    OTHER
  }

  enum FloorLevel @external {
    LOWER_LEVEL
    MAIN_FLOOR
    UPPER_FLOOR
    OUTDOOR
    GARAGE
  }

  enum UserRole @external {
    OWNER
    BUYER
  }

  # Extended query interface for valuation subgraph
  extend type Query {
    # Valuation-specific analytics
    portfolioAnalytics(
      timeHorizon: Int # days
      riskTolerance: String # 'conservative', 'moderate', 'aggressive'
    ): PortfolioAnalytics!
    
    # Advanced market analysis
    marketSegmentAnalysis(
      category: ItemCategory
      priceRange: DecimalRange
      timeRange: DateRange
    ): MarketSegmentAnalysis!
    
    # Investment recommendations
    investmentOpportunities(
      budget: Decimal
      riskProfile: String
      categories: [ItemCategory!]
      limit: Int = 10
    ): [InvestmentOpportunity!]!
    
    # Liquidation planning
    liquidationStrategy(
      targetAmount: Decimal
      timeframe: Int # days
      preferredCategories: [ItemCategory!]
    ): LiquidationStrategy!
    
    # Risk assessment
    portfolioRiskAssessment: RiskAssessment!
    
    # Market timing analysis
    marketTimingRecommendations: [MarketTimingRecommendation!]!
  }
`;

// =====================================================
// ADDITIONAL TYPE DEFINITIONS FOR ADVANCED FEATURES
// =====================================================

const advancedTypeDefs = gql`
  # Portfolio analytics type
  type PortfolioAnalytics {
    totalValue: Decimal!
    totalCost: Decimal!
    unrealizedGainLoss: Decimal!
    realizedGainLoss: Decimal!
    returnOnInvestment: Float!
    annualizedReturn: Float!
    volatility: Float!
    sharpeRatio: Float!
    maxDrawdown: Float!
    valueAtRisk: Decimal!
    
    # Diversification metrics
    categoryDistribution: [CategoryAllocation!]!
    riskDistribution: [RiskAllocation!]!
    
    # Performance attribution
    performanceAttribution: [PerformanceAttribution!]!
    
    # Time series data
    valueOverTime: [PortfolioSnapshot!]!
    performanceMetrics: PerformanceMetrics!
  }

  type CategoryAllocation {
    category: ItemCategory!
    count: Int!
    currentValue: Decimal!
    percentage: Float!
    performance: Float!
  }

  type RiskAllocation {
    riskLevel: String!
    count: Int!
    currentValue: Decimal!
    percentage: Float!
  }

  type PerformanceAttribution {
    factor: String!
    contribution: Float!
    description: String!
  }

  type PortfolioSnapshot {
    date: DateTime!
    totalValue: Decimal!
    itemCount: Int!
    cashflow: Decimal!
    return: Float!
  }

  type PerformanceMetrics {
    alpha: Float!
    beta: Float!
    informationRatio: Float!
    trackingError: Float!
    upturnCapture: Float!
    downturnCapture: Float!
  }

  # Market segment analysis
  type MarketSegmentAnalysis {
    segment: String!
    averagePrice: Decimal!
    medianPrice: Decimal!
    priceRange: DecimalRange!
    liquidityScore: Float!
    volatility: Float!
    trendDirection: TrendDirection!
    seasonality: [SeasonalPattern!]!
    competitivePosition: CompetitivePosition!
    marketOutlook: MarketOutlook!
  }

  type SeasonalPattern {
    period: String!
    averageChange: Float!
    confidence: Float!
  }

  type CompetitivePosition {
    marketShare: Float!
    pricePosition: String! # 'premium', 'mid-market', 'value'
    differentiators: [String!]!
  }

  type MarketOutlook {
    shortTerm: String! # 3-month outlook
    mediumTerm: String! # 12-month outlook
    longTerm: String! # 36-month outlook
    keyDrivers: [String!]!
    risks: [String!]!
  }

  # Investment opportunities
  type InvestmentOpportunity {
    category: ItemCategory!
    suggestedBudget: Decimal!
    expectedReturn: Float!
    riskLevel: String!
    timeHorizon: String!
    rationale: String!
    similarItems: [Item!]!
    marketConditions: String!
    entryStrategy: String!
    exitStrategy: String!
  }

  # Liquidation strategy
  type LiquidationStrategy {
    recommendedItems: [LiquidationRecommendation!]!
    totalExpectedValue: Decimal!
    estimatedTimeframe: Int! # days
    riskAssessment: String!
    marketConditions: String!
    optimizationStrategy: String!
  }

  type LiquidationRecommendation {
    item: Item!
    priority: Int!
    expectedPrice: Decimal!
    timeToSell: Int! # estimated days
    liquidityScore: Float!
    reasonCode: String!
    suggestedChannels: [MarketSource!]!
  }

  # Risk assessment
  type RiskAssessment {
    overallRisk: String!
    riskScore: Float! # 0-1 scale
    riskFactors: [RiskFactor!]!
    concentrationRisk: ConcentrationRisk!
    liquidityRisk: LiquidityRisk!
    marketRisk: MarketRisk!
    recommendations: [RiskRecommendation!]!
  }

  type RiskFactor {
    factor: String!
    impact: String! # 'low', 'medium', 'high'
    probability: Float!
    description: String!
    mitigation: String!
  }

  type ConcentrationRisk {
    categoryConcentration: Float!
    valueConcentration: Float!
    riskLevel: String!
    recommendations: [String!]!
  }

  type LiquidityRisk {
    averageLiquidityScore: Float!
    illiquidItems: [Item!]!
    liquidityBuffer: Decimal!
    recommendations: [String!]!
  }

  type MarketRisk {
    marketCorrelation: Float!
    beta: Float!
    volatility: Float!
    downside: Float!
    recommendations: [String!]!
  }

  type RiskRecommendation {
    type: String!
    priority: String!
    action: String!
    expectedImpact: String!
    timeframe: String!
  }

  # Market timing recommendations
  type MarketTimingRecommendation {
    action: String! # 'buy', 'sell', 'hold'
    category: ItemCategory!
    confidence: Float!
    timeframe: String!
    rationale: String!
    marketSignals: [String!]!
    priceTargets: PriceTargets!
  }

  type PriceTargets {
    entry: Decimal
    target: Decimal
    stop: Decimal
  }
`;

// =====================================================
// FEDERATION RESOLVERS WITH REFERENCE RESOLVERS
// =====================================================

const federationResolvers = {
  ...valuationResolvers,
  
  // Reference resolvers for federated types
  Item: {
    ...valuationResolvers.Item,
    
    // Reference resolver for federation
    __resolveReference: async (reference: { id: string }, context: Context) => {
      return context.loaders.itemsById.load(reference.id);
    },

    // Advanced computed fields
    marketPerformance: async (parent: any, _: any, context: Context) => {
      const current = await context.loaders.currentValuationsByItemId.load(parent.id);
      if (!current || !parent.purchasePrice) return 'unknown';
      
      const changePercent = ((current.estimatedValue - parent.purchasePrice) / parent.purchasePrice) * 100;
      
      if (changePercent > 10) return 'outperforming';
      if (changePercent < -10) return 'underperforming';
      return 'stable';
    },

    investmentGrade: async (parent: any, _: any, context: Context) => {
      const current = await context.loaders.currentValuationsByItemId.load(parent.id);
      if (!current?.confidenceScore) return 'D';
      
      if (current.confidenceScore >= 0.9) return 'A';
      if (current.confidenceScore >= 0.8) return 'B';
      if (current.confidenceScore >= 0.7) return 'C';
      return 'D';
    },

    liquidityScore: async (parent: any, _: any, context: Context) => {
      // Calculate liquidity based on market comparisons and category
      const comparisons = await context.loaders.marketComparisonsByItemId.load(parent.id);
      
      if (!comparisons.length) return 0.3; // Low liquidity without market data
      
      const recentSales = comparisons.filter(c => 
        c.soldDate && 
        new Date(c.soldDate) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days
      );
      
      const liquidityScore = Math.min(recentSales.length / 5, 1.0); // Max score with 5+ recent sales
      return liquidityScore;
    },

    annualizedReturn: async (parent: any, _: any, context: Context) => {
      if (!parent.purchasePrice || !parent.purchaseDate) return null;
      
      const current = await context.loaders.currentValuationsByItemId.load(parent.id);
      if (!current) return null;
      
      const yearsOwned = (new Date().getTime() - new Date(parent.purchaseDate).getTime()) / (365 * 24 * 60 * 60 * 1000);
      if (yearsOwned <= 0) return null;
      
      const totalReturn = (current.estimatedValue - parent.purchasePrice) / parent.purchasePrice;
      return Math.pow(1 + totalReturn, 1 / yearsOwned) - 1;
    }
  },

  Room: {
    ...valuationResolvers.Room,
    
    // Reference resolver for federation
    __resolveReference: async (reference: { id: string }, context: Context) => {
      return context.loaders.roomsById.load(reference.id);
    },

    totalPurchaseValue: async (parent: any, _: any, context: Context) => {
      const result = await context.db.query(`
        SELECT COALESCE(SUM(purchase_price), 0) as total
        FROM items 
        WHERE room_id = $1 AND purchase_price IS NOT NULL
      `, [parent.id]);
      return parseFloat(result[0].total);
    },

    valueAppreciation: async (parent: any, _: any, context: Context) => {
      const [estimated, purchase] = await Promise.all([
        parent.totalEstimatedValue || context.db.query(`
          SELECT COALESCE(SUM(cv.estimated_value), 0) as total
          FROM current_valuations cv
          JOIN items i ON cv.item_id = i.id
          WHERE i.room_id = $1
        `, [parent.id]).then(r => parseFloat(r[0].total)),
        
        context.db.query(`
          SELECT COALESCE(SUM(purchase_price), 0) as total
          FROM items 
          WHERE room_id = $1 AND purchase_price IS NOT NULL
        `, [parent.id]).then(r => parseFloat(r[0].total))
      ]);
      
      return estimated - purchase;
    },

    roomROI: async (parent: any, _: any, context: Context) => {
      const purchase = await context.db.query(`
        SELECT COALESCE(SUM(purchase_price), 0) as total
        FROM items 
        WHERE room_id = $1 AND purchase_price IS NOT NULL
      `, [parent.id]).then(r => parseFloat(r[0].total));
      
      if (purchase === 0) return null;
      
      const estimated = await context.db.query(`
        SELECT COALESCE(SUM(cv.estimated_value), 0) as total
        FROM current_valuations cv
        JOIN items i ON cv.item_id = i.id
        WHERE i.room_id = $1
      `, [parent.id]).then(r => parseFloat(r[0].total));
      
      return ((estimated - purchase) / purchase) * 100;
    }
  },

  // Advanced query resolvers
  Query: {
    ...valuationResolvers.Query,
    
    portfolioAnalytics: async (_: any, { timeHorizon = 365, riskTolerance = 'moderate' }, context: Context) => {
      // Complex portfolio analytics implementation
      const portfolioData = await context.db.query(`
        SELECT 
          COALESCE(SUM(cv.estimated_value), 0) as total_value,
          COALESCE(SUM(i.purchase_price), 0) as total_cost,
          COUNT(*) as item_count
        FROM current_valuations cv
        JOIN items i ON cv.item_id = i.id
        WHERE i.purchase_price IS NOT NULL
      `);
      
      const data = portfolioData[0];
      const totalValue = parseFloat(data.total_value);
      const totalCost = parseFloat(data.total_cost);
      const unrealizedGainLoss = totalValue - totalCost;
      const roi = totalCost > 0 ? (unrealizedGainLoss / totalCost) * 100 : 0;
      
      // TODO: Implement more sophisticated analytics
      return {
        totalValue,
        totalCost,
        unrealizedGainLoss,
        realizedGainLoss: 0, // TODO: Calculate from sold items
        returnOnInvestment: roi,
        annualizedReturn: roi, // TODO: Time-weighted returns
        volatility: 0.15, // TODO: Calculate actual volatility
        sharpeRatio: roi > 0 ? roi / 15 : 0, // Simple approximation
        maxDrawdown: 0, // TODO: Calculate maximum drawdown
        valueAtRisk: totalValue * 0.05, // 5% VaR approximation
        categoryDistribution: [], // TODO: Implement
        riskDistribution: [], // TODO: Implement
        performanceAttribution: [], // TODO: Implement
        valueOverTime: [], // TODO: Implement
        performanceMetrics: {
          alpha: 0,
          beta: 1,
          informationRatio: 0,
          trackingError: 0,
          upturnCapture: 1,
          downturnCapture: 1
        }
      };
    }
  }
};

// =====================================================
// SUBGRAPH SCHEMA CREATION
// =====================================================

export const valuationSubgraphSchema = buildSubgraphSchema([
  {
    typeDefs: [federationTypeDefs, advancedTypeDefs],
    resolvers: federationResolvers
  }
]);

// =====================================================
# FEDERATION CONFIGURATION
// =====================================================

export const federationConfig = {
  // Service definition for Apollo Gateway
  serviceName: 'valuation-service',
  serviceVersion: '1.0.0',
  
  // Schema composition configuration
  composition: {
    extends: ['inventory-service'],
    provides: [
      'Item.currentValuation',
      'Item.estimatedValue',
      'Item.valueAppreciation',
      'Room.totalEstimatedValue',
      'Room.valueAppreciation'
    ],
    requires: [
      'Item.purchasePrice',
      'Item.purchaseDate',
      'Item.category',
      'Room.id'
    ]
  },
  
  // Gateway routing hints
  routing: {
    // Route valuation queries to this subgraph
    queries: [
      'valuations',
      'marketComparisons', 
      'pricingInsights',
      'portfolioAnalytics'
    ],
    
    // Route valuation mutations to this subgraph
    mutations: [
      'createValuation',
      'updateValuation',
      'requestValuations'
    ],
    
    // Route valuation subscriptions to this subgraph
    subscriptions: [
      'valuationUpdated',
      'priceAlert'
    ]
  }
};

// =====================================================
// CONTEXT FACTORY WITH DATALOADER INTEGRATION
// =====================================================

export function createValuationContext(baseContext: any): Context {
  return {
    ...baseContext,
    loaders: {
      ...baseContext.loaders,
      ...createValuationDataLoaders(baseContext)
    }
  };
}