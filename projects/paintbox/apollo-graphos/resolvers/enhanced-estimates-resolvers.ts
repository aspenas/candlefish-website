// Enhanced Estimates Resolvers with Kind Home Paint Integration
// Handles complex calculations, pricing tiers, and measurement organization

import { Resolvers } from '../src/__generated__/resolvers-types';
import { DataSource } from 'apollo-datasource';
import { PubSub } from 'graphql-subscriptions';
import DataLoader from 'dataloader';

interface EstimatesDataSources {
  estimatesDB: EstimatesDatabase;
  measurementsDB: MeasurementsDatabase;
  pricingService: PricingService;
  collaborationService: CollaborationService;
  pdfService: PDFService;
  salesforceAPI: SalesforceAPI;
  companyCamAPI: CompanyCamAPI;
}

interface Context {
  dataSources: EstimatesDataSources;
  pubsub: PubSub;
  user: { id: string; role: string; name: string };
  loaders: {
    measurementsByEstimate: DataLoader<string, Measurement[]>;
    elevationsByEstimate: DataLoader<string, Elevation[]>;
    colorPlacementsByMeasurement: DataLoader<string, ColorPlacement>;
    wwTagsByMeasurement: DataLoader<string, WWTag[]>;
    photosForMeasurement: DataLoader<string, ProjectPhoto[]>;
  };
}

// Pricing Formula Constants (Kind Home Paint methodology)
const PRICING_FORMULA = {
  MARKUP_DIVISOR: 0.45, // (Labor + Material) / 0.45
  TIER_MULTIPLIERS: {
    GOOD: 1.0,
    BETTER: 1.3,
    BEST: 1.6,
  },
  COMPLEXITY_MULTIPLIERS: {
    SIMPLE: 1.0,
    MODERATE: 1.2,
    COMPLEX: 1.5,
    HIGHLY_COMPLEX: 2.0,
  },
};

export const enhancedEstimatesResolvers: Resolvers = {
  Query: {
    estimate: async (_, { id }, { dataSources, loaders }) => {
      return await dataSources.estimatesDB.findById(id);
    },

    estimates: async (_, { filter, limit, offset }, { dataSources }) => {
      const result = await dataSources.estimatesDB.findMany({
        filter,
        limit,
        offset,
      });
      
      return {
        edges: result.estimates.map(estimate => ({
          node: estimate,
          cursor: Buffer.from(estimate.id).toString('base64'),
        })),
        pageInfo: {
          hasNextPage: result.hasNextPage,
          hasPreviousPage: offset > 0,
          startCursor: result.estimates.length > 0 ? 
            Buffer.from(result.estimates[0].id).toString('base64') : null,
          endCursor: result.estimates.length > 0 ? 
            Buffer.from(result.estimates[result.estimates.length - 1].id).toString('base64') : null,
        },
        totalCount: result.totalCount,
      };
    },

    measurementsByElevation: async (_, { estimateId, elevation }, { loaders }) => {
      const measurements = await loaders.measurementsByEstimate.load(estimateId);
      return measurements.filter(m => m.elevation === elevation);
    },

    measurementSummary: async (_, { estimateId }, { dataSources, loaders }) => {
      return await calculateMeasurementSummary(estimateId, dataSources, loaders);
    },

    calculatePricing: async (_, { input }, { dataSources }) => {
      return await dataSources.pricingService.calculateBasicPricing(input);
    },

    calculatePricingTiers: async (_, { input }, { dataSources }) => {
      return await calculateComprehensivePricingTiers(input, dataSources);
    },

    roomTypeAnalysis: async (_, { estimateId }, { dataSources, loaders }) => {
      return await analyzeRoomTypes(estimateId, dataSources, loaders);
    },

    colorPlacementOptions: async (_, { roomType, measurements }, { dataSources }) => {
      return await generateColorPlacementOptions(roomType, measurements, dataSources);
    },
  },

  Mutation: {
    createEstimate: async (_, { input }, { dataSources, pubsub, user }) => {
      const estimate = await dataSources.estimatesDB.create({
        ...input,
        createdBy: user.id,
        status: 'DRAFT',
        version: 1,
      });

      // Initialize with basic measurements if provided
      if (input.initialMeasurements) {
        await Promise.all(
          input.initialMeasurements.map(measurement =>
            dataSources.measurementsDB.create({
              ...measurement,
              estimateId: estimate.id,
            })
          )
        );
      }

      // Notify collaborators
      await pubsub.publish('ESTIMATE_UPDATED', { estimateUpdated: estimate });

      return estimate;
    },

    updateEstimate: async (_, { id, input }, { dataSources, pubsub, user }) => {
      const estimate = await dataSources.estimatesDB.update(id, {
        ...input,
        lastModifiedBy: user.id,
        updatedAt: new Date().toISOString(),
      });

      await pubsub.publish('ESTIMATE_UPDATED', { estimateUpdated: estimate });
      return estimate;
    },

    addMeasurement: async (_, { estimateId, input }, { dataSources, pubsub, user }) => {
      // Calculate square footage based on measurement type
      const squareFootage = calculateSquareFootage(input);
      
      const measurement = await dataSources.measurementsDB.create({
        ...input,
        estimateId,
        squareFootage,
        laborHours: await calculateLaborHours(input, dataSources),
        materialQuantity: await calculateMaterialQuantity(input, dataSources),
        difficulty: assessDifficulty(input),
        createdBy: user.id,
      });

      // Update estimate totals
      await recalculateEstimateTotals(estimateId, dataSources);

      // Notify real-time updates
      await pubsub.publish('MEASUREMENT_UPDATED', {
        measurementUpdated: {
          estimateId,
          measurement,
          changeType: 'ADDED',
          user: user.name,
        },
      });

      return measurement;
    },

    updateMeasurement: async (_, { measurementId, input }, { dataSources, pubsub, user }) => {
      const measurement = await dataSources.measurementsDB.update(measurementId, {
        ...input,
        squareFootage: input.length && input.width ? input.length * input.width : undefined,
        lastEditedBy: user.id,
        updatedAt: new Date().toISOString(),
      });

      // Recalculate estimate totals
      await recalculateEstimateTotals(measurement.estimateId, dataSources);

      await pubsub.publish('MEASUREMENT_UPDATED', {
        measurementUpdated: {
          estimateId: measurement.estimateId,
          measurement,
          changeType: 'UPDATED',
          user: user.name,
        },
      });

      return measurement;
    },

    bulkUpdateMeasurements: async (_, { estimateId, measurements }, { dataSources, pubsub, user }) => {
      let updated = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const measurementUpdate of measurements) {
        try {
          await dataSources.measurementsDB.update(measurementUpdate.id, {
            ...measurementUpdate.input,
            lastEditedBy: user.id,
          });
          updated++;
        } catch (error) {
          failed++;
          errors.push(`Failed to update measurement ${measurementUpdate.id}: ${error.message}`);
        }
      }

      // Recalculate estimate totals once for all updates
      await recalculateEstimateTotals(estimateId, dataSources);

      await pubsub.publish('MEASUREMENT_UPDATED', {
        measurementUpdated: {
          estimateId,
          changeType: 'BULK_UPDATED',
          user: user.name,
        },
      });

      return { updated, failed, errors };
    },

    excludeElevationFromPainting: async (_, { estimateId, elevation }, { dataSources, pubsub }) => {
      const estimate = await dataSources.estimatesDB.addExcludedElevation(estimateId, elevation);
      await recalculateEstimateTotals(estimateId, dataSources);
      
      await pubsub.publish('ESTIMATE_UPDATED', { estimateUpdated: estimate });
      return estimate;
    },

    updateColorPlacement: async (_, { measurementId, input }, { dataSources, pubsub, user }) => {
      const measurement = await dataSources.measurementsDB.updateColorPlacement(measurementId, input);
      
      await pubsub.publish('MEASUREMENT_UPDATED', {
        measurementUpdated: {
          estimateId: measurement.estimateId,
          measurement,
          changeType: 'COLOR_UPDATED',
          user: user.name,
        },
      });

      return measurement;
    },

    selectPricingTier: async (_, { estimateId, tier }, { dataSources, pubsub, user }) => {
      const estimate = await dataSources.estimatesDB.update(estimateId, {
        selectedTier: tier,
        lastModifiedBy: user.id,
      });

      // Trigger pricing recalculation
      await recalculatePricingTiers(estimateId, dataSources);

      await pubsub.publish('ESTIMATE_UPDATED', { estimateUpdated: estimate });
      return estimate;
    },

    applyDiscount: async (_, { estimateId, input }, { dataSources, pubsub }) => {
      const estimate = await dataSources.estimatesDB.applyDiscount(estimateId, input);
      await recalculateFinalPricing(estimateId, dataSources);
      
      await pubsub.publish('ESTIMATE_UPDATED', { estimateUpdated: estimate });
      return estimate;
    },

    generatePDF: async (_, { estimateId, options }, { dataSources }) => {
      try {
        const estimate = await dataSources.estimatesDB.findById(estimateId);
        const url = await dataSources.pdfService.generateEstimatePDF(estimate, options);
        
        // Update estimate with PDF URL
        await dataSources.estimatesDB.update(estimateId, { pdfUrl: url });

        return { success: true, url, error: null };
      } catch (error) {
        return { success: false, url: null, error: error.message };
      }
    },
  },

  Subscription: {
    estimateUpdated: {
      subscribe: (_, { id }, { pubsub }) => pubsub.asyncIterator(['ESTIMATE_UPDATED']),
      resolve: (payload) => payload.estimateUpdated,
    },

    measurementUpdated: {
      subscribe: (_, { estimateId }, { pubsub }) => pubsub.asyncIterator(['MEASUREMENT_UPDATED']),
      resolve: (payload) => payload.measurementUpdated,
    },

    calculationProgress: {
      subscribe: (_, { estimateId }, { pubsub }) => pubsub.asyncIterator(['CALCULATION_PROGRESS']),
      resolve: (payload) => payload.calculationProgress,
    },

    userJoinedEstimate: {
      subscribe: (_, { estimateId }, { pubsub }) => pubsub.asyncIterator(['USER_JOINED_ESTIMATE']),
      resolve: (payload) => payload.userJoinedEstimate,
    },

    measurementBeingEdited: {
      subscribe: (_, { estimateId }, { pubsub }) => pubsub.asyncIterator(['MEASUREMENT_EDITING']),
      resolve: (payload) => payload.measurementBeingEdited,
    },
  },

  // Type Resolvers
  Estimate: {
    elevations: async (parent, _, { loaders }) => {
      return await loaders.elevationsByEstimate.load(parent.id);
    },

    measurements: async (parent, _, { loaders }) => {
      return await loaders.measurementsByEstimate.load(parent.id);
    },

    measurementSummary: async (parent, _, { dataSources, loaders }) => {
      return await calculateMeasurementSummary(parent.id, dataSources, loaders);
    },

    pricingTiers: async (parent, _, { dataSources }) => {
      return await calculatePricingTiers(parent, dataSources);
    },

    finalPricing: async (parent, _, { dataSources }) => {
      return await calculateFinalPricing(parent, dataSources);
    },

    conditions: async (parent, _, { dataSources }) => {
      return await analyzeProjectConditions(parent.id, dataSources);
    },

    currentCollaborators: async (parent, _, { dataSources }) => {
      return await dataSources.collaborationService.getActiveCollaborators(parent.id);
    },

    completionPercentage: async (parent, _, { dataSources }) => {
      return await calculateCompletionPercentage(parent, dataSources);
    },
  },

  Measurement: {
    colorPlacement: async (parent, _, { loaders }) => {
      return await loaders.colorPlacementsByMeasurement.load(parent.id);
    },

    associatedPhotos: async (parent, _, { loaders }) => {
      return await loaders.photosForMeasurement.load(parent.id);
    },

    wwTags: async (parent, _, { loaders }) => {
      return await loaders.wwTagsByMeasurement.load(parent.id);
    },

    laborHours: async (parent, _, { dataSources }) => {
      return await calculateLaborHours(parent, dataSources);
    },

    materialQuantity: async (parent, _, { dataSources }) => {
      return await calculateMaterialQuantity(parent, dataSources);
    },
  },

  PricingTiers: {
    good: async (parent, _, { dataSources }) => {
      return await calculateTierDetail(parent.estimate, 'GOOD', dataSources);
    },

    better: async (parent, _, { dataSources }) => {
      return await calculateTierDetail(parent.estimate, 'BETTER', dataSources);
    },

    best: async (parent, _, { dataSources }) => {
      return await calculateTierDetail(parent.estimate, 'BEST', dataSources);
    },

    comparison: async (parent, _, { dataSources }) => {
      return await generatePricingComparison(parent, dataSources);
    },
  },
};

// Helper Functions

async function calculateMeasurementSummary(
  estimateId: string, 
  dataSources: EstimatesDataSources, 
  loaders: Context['loaders']
): Promise<MeasurementSummary> {
  const measurements = await loaders.measurementsByEstimate.load(estimateId);
  
  // Group by elevation
  const elevationTotals = measurements.reduce((acc, measurement) => {
    const elevation = measurement.elevation;
    if (!acc[elevation]) {
      acc[elevation] = {
        elevation,
        squareFootage: 0,
        laborHours: 0,
        materialCost: 0,
        measurementCount: 0,
      };
    }
    
    acc[elevation].squareFootage += measurement.squareFootage;
    acc[elevation].laborHours += measurement.laborHours;
    acc[elevation].materialCost += measurement.materialQuantity * getMaterialCost(measurement.surfaceType);
    acc[elevation].measurementCount += 1;
    
    return acc;
  }, {});

  // Group by measurement type
  const typeTotals = measurements.reduce((acc, measurement) => {
    const type = measurement.type;
    if (!acc[type]) {
      acc[type] = {
        type,
        squareFootage: 0,
        count: 0,
        averageSize: 0,
      };
    }
    
    acc[type].squareFootage += measurement.squareFootage;
    acc[type].count += 1;
    
    return acc;
  }, {});

  // Calculate averages
  Object.values(typeTotals).forEach((total: any) => {
    total.averageSize = total.squareFootage / total.count;
  });

  return {
    estimateId,
    elevationTotals: Object.values(elevationTotals),
    typeTotals: Object.values(typeTotals),
    totalSquareFootage: measurements.reduce((sum, m) => sum + m.squareFootage, 0),
    totalLaborHours: measurements.reduce((sum, m) => sum + m.laborHours, 0),
    totalMaterialCost: measurements.reduce((sum, m) => sum + (m.materialQuantity * getMaterialCost(m.surfaceType)), 0),
    conditionBreakdown: analyzeConditions(measurements),
    overallComplexity: assessOverallComplexity(measurements),
    accessAnalysis: analyzeAccess(measurements),
  };
}

async function calculateComprehensivePricingTiers(
  input: ComprehensivePricingInput, 
  dataSources: EstimatesDataSources
): Promise<PricingTiers> {
  const estimate = await dataSources.estimatesDB.findById(input.estimateId);
  const measurements = await dataSources.measurementsDB.findByEstimateId(input.estimateId);
  
  const baseLaborCost = measurements.reduce((sum, m) => sum + (m.laborHours * input.laborRatePerHour), 0);
  const baseMaterialCost = measurements.reduce((sum, m) => sum + (m.materialQuantity * getMaterialCost(m.surfaceType)), 0);
  
  // Apply Kind Home Paint formula: (Labor + Material) / 0.45 + discount = price
  const calculateTierPricing = (tierMultiplier: number) => {
    const adjustedLaborCost = baseLaborCost * tierMultiplier;
    const adjustedMaterialCost = baseMaterialCost * (1 + input.materialMarkup) * tierMultiplier;
    const subtotal = adjustedLaborCost + adjustedMaterialCost;
    const basePrice = subtotal / PRICING_FORMULA.MARKUP_DIVISOR;
    
    return {
      laborCost: adjustedLaborCost,
      materialCost: adjustedMaterialCost,
      subtotal,
      basePrice,
      discountAmount: 0, // Applied separately
      finalPrice: basePrice,
      marginPercentage: ((basePrice - subtotal) / basePrice) * 100,
      profitAmount: basePrice - subtotal,
    };
  };

  return {
    good: {
      tier: 'GOOD',
      ...calculateTierPricing(PRICING_FORMULA.TIER_MULTIPLIERS.GOOD),
      productSelection: input.goodTierProducts,
      warranty: { years: 5 },
      laborSpecifications: { hours: baseLaborCost / input.laborRatePerHour },
    },
    better: {
      tier: 'BETTER',
      ...calculateTierPricing(PRICING_FORMULA.TIER_MULTIPLIERS.BETTER),
      productSelection: input.betterTierProducts,
      warranty: { years: 10 },
      laborSpecifications: { hours: (baseLaborCost / input.laborRatePerHour) * 1.2 },
    },
    best: {
      tier: 'BEST',
      ...calculateTierPricing(PRICING_FORMULA.TIER_MULTIPLIERS.BEST),
      productSelection: input.bestTierProducts,
      warranty: { years: 15 },
      laborSpecifications: { hours: (baseLaborCost / input.laborRatePerHour) * 1.4 },
    },
    comparison: await generatePricingComparison(estimate, dataSources),
  };
}

async function recalculateEstimateTotals(estimateId: string, dataSources: EstimatesDataSources): Promise<void> {
  const measurements = await dataSources.measurementsDB.findByEstimateId(estimateId);
  
  const totals = {
    totalSquareFootage: measurements.reduce((sum, m) => sum + m.squareFootage, 0),
    laborHours: measurements.reduce((sum, m) => sum + m.laborHours, 0),
    materialCost: measurements.reduce((sum, m) => sum + (m.materialQuantity * getMaterialCost(m.surfaceType)), 0),
  };

  await dataSources.estimatesDB.update(estimateId, totals);
}

function calculateSquareFootage(measurement: MeasurementInput): number {
  if (measurement.length && measurement.width) {
    return measurement.length * measurement.width;
  }
  
  if (measurement.length && measurement.height) {
    return measurement.length * measurement.height;
  }
  
  // Default calculation based on measurement type
  switch (measurement.type) {
    case 'DOOR':
      return 20; // Standard door size
    case 'WINDOW':
      return 15; // Standard window size
    default:
      return measurement.length || 0;
  }
}

async function calculateLaborHours(measurement: any, dataSources: EstimatesDataSources): Promise<number> {
  const baseHours = measurement.squareFootage * getBaseHoursPerSquareFoot(measurement.type);
  const complexityMultiplier = PRICING_FORMULA.COMPLEXITY_MULTIPLIERS[measurement.difficulty] || 1.0;
  const conditionMultiplier = getConditionMultiplier(measurement);
  
  return baseHours * complexityMultiplier * conditionMultiplier;
}

async function calculateMaterialQuantity(measurement: any, dataSources: EstimatesDataSources): Promise<number> {
  // Calculate based on surface type and measurement type
  const coverage = getCoveragePerUnit(measurement.surfaceType, measurement.type);
  return measurement.squareFootage / coverage;
}

function assessDifficulty(measurement: MeasurementInput): string {
  let difficultyScore = 0;
  
  // Elevation difficulty
  if (measurement.elevation === 'DETACHED_GARAGE' || measurement.elevation === 'SHED') {
    difficultyScore += 1;
  }
  
  // Story height (if provided)
  if (measurement.story && measurement.story > 1) {
    difficultyScore += measurement.story;
  }
  
  // Surface type difficulty
  if (measurement.surfaceType === 'ROUGH' || measurement.surfaceType === 'TEXTURED') {
    difficultyScore += 2;
  }
  
  // Condition difficulty
  if (measurement.nailCondition === 'LOOSE' || measurement.nailCondition === 'MISSING') {
    difficultyScore += 1;
  }
  
  if (difficultyScore <= 2) return 'SIMPLE';
  if (difficultyScore <= 4) return 'MODERATE';
  if (difficultyScore <= 6) return 'COMPLEX';
  return 'HIGHLY_COMPLEX';
}

// Utility functions
function getBaseHoursPerSquareFoot(measurementType: string): number {
  const rates = {
    SIDING: 0.15,
    TRIM: 0.25,
    DOOR: 0.5,
    WINDOW: 0.3,
    FASCIA: 0.2,
    RAILINGS: 0.4,
  };
  return rates[measurementType] || 0.2;
}

function getMaterialCost(surfaceType: string): number {
  const costs = {
    SMOOTH: 3.50,
    TEXTURED: 4.00,
    ROUGH: 4.50,
    METAL: 5.00,
    COMPOSITE: 4.25,
  };
  return costs[surfaceType] || 3.75;
}

function getConditionMultiplier(measurement: any): number {
  let multiplier = 1.0;
  
  if (measurement.nailCondition === 'LOOSE' || measurement.nailCondition === 'MISSING') {
    multiplier += 0.2;
  }
  
  if (measurement.edgeCondition === 'DAMAGED' || measurement.edgeCondition === 'REQUIRES_REPAIR') {
    multiplier += 0.15;
  }
  
  if (measurement.faceCondition === 'DAMAGED' || measurement.faceCondition === 'NEEDS_PREPARATION') {
    multiplier += 0.25;
  }
  
  return multiplier;
}

function getCoveragePerUnit(surfaceType: string, measurementType: string): number {
  // Coverage in square feet per gallon
  const baseCoverage = {
    SMOOTH: 400,
    TEXTURED: 350,
    ROUGH: 300,
    METAL: 450,
    COMPOSITE: 375,
  };
  
  return baseCoverage[surfaceType] || 375;
}

// Additional helper functions would be implemented for:
// - analyzeConditions
// - assessOverallComplexity
// - analyzeAccess
// - analyzeRoomTypes
// - generateColorPlacementOptions
// - calculateCompletionPercentage
// - analyzeProjectConditions
// - calculatePricingTiers
// - calculateFinalPricing
// - generatePricingComparison

export default enhancedEstimatesResolvers;