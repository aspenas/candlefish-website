import { Query } from '../../../subgraph-estimates/src/resolvers/Query';
import { PricingTier, EstimateStatus } from '../../../subgraph-estimates/src/__generated__/resolvers-types';

describe('Estimate Resolver', () => {
  describe('estimate query', () => {
    it('should return a single estimate by id', () => {
      const mockContext = {};
      const estimateId = 'test-estimate-123';

      const result = Query.Query.estimate(null, { id: estimateId }, mockContext);

      expect(result).toBeDefined();
      expect(result.id).toBe(estimateId);
      expect(result.customerId).toBe('customer-123');
      expect(result.projectId).toBe('project-456');
      expect(result.goodPrice).toBe(1500.00);
      expect(result.betterPrice).toBe(2000.00);
      expect(result.bestPrice).toBe(2500.00);
      expect(result.selectedTier).toBe(PricingTier.Good);
      expect(result.status).toBe(EstimateStatus.Draft);
      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
      expect(result.createdBy).toBe('user-123');
      expect(result.totalSquareFootage).toBe(2500);
      expect(result.laborHours).toBe(40);
      expect(result.materialCost).toBe(800);
      expect(result.pdfUrl).toBeNull();
      expect(result.notes).toBe('Sample estimate for testing');
    });

    it('should have consistent timestamp format', () => {
      const result = Query.Query.estimate(null, { id: 'test' }, {});

      expect(new Date(result.createdAt)).toBeInstanceOf(Date);
      expect(new Date(result.updatedAt)).toBeInstanceOf(Date);
      expect(isNaN(new Date(result.createdAt).getTime())).toBe(false);
      expect(isNaN(new Date(result.updatedAt).getTime())).toBe(false);
    });
  });

  describe('estimates query', () => {
    it('should return paginated estimates list', () => {
      const result = Query.Query.estimates(
        null,
        { filter: {}, limit: 10, offset: 0 },
        {}
      );

      expect(result).toBeDefined();
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]).toHaveProperty('node');
      expect(result.edges[0]).toHaveProperty('cursor');
      expect(result.pageInfo).toEqual({
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'cursor-1',
        endCursor: 'cursor-1'
      });
      expect(result.totalCount).toBe(1);
    });

    it('should handle pagination parameters', () => {
      const result1 = Query.Query.estimates(
        null,
        { filter: {}, limit: 5, offset: 0 },
        {}
      );
      const result2 = Query.Query.estimates(
        null,
        { filter: {}, limit: 20, offset: 10 },
        {}
      );

      expect(result1.edges).toHaveLength(1);
      expect(result2.edges).toHaveLength(1);
    });

    it('should handle filter parameters', () => {
      const filterParams = {
        status: EstimateStatus.Draft,
        customerId: 'customer-123'
      };

      const result = Query.Query.estimates(
        null,
        { filter: filterParams, limit: 10, offset: 0 },
        {}
      );

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.status).toBe(EstimateStatus.Draft);
    });

    it('should default pagination parameters when not provided', () => {
      const result = Query.Query.estimates(null, { filter: {} }, {});

      expect(result).toBeDefined();
      expect(result.edges).toHaveLength(1);
    });
  });

  describe('calculatePricing query', () => {
    const basePricingInput = {
      squareFootage: 1000,
      laborHours: 20,
      materialType: 'STANDARD' as const,
      complexity: 'SIMPLE' as const
    };

    it('should calculate pricing for standard materials and simple complexity', () => {
      const result = Query.Query.calculatePricing(
        null,
        { input: basePricingInput },
        {}
      );

      expect(result).toBeDefined();
      expect(result.laborCost).toBe(1000); // 20 hours * $50 * 1.0 complexity
      expect(result.materialCost).toBe(2500); // 1000 sqft * $2.5
      expect(result.overheadCost).toBe(525); // (1000 + 2500) * 0.15
      expect(result.profitMargin).toBe(805); // (1000 + 2500 + 525) * 0.20
      expect(result.subtotal).toBe(4830); // sum of above
      expect(result.tax).toBe(386.4); // 4830 * 0.08
      expect(result.total).toBe(5216.4); // subtotal + tax
    });

    it('should calculate pricing for luxury materials', () => {
      const luxuryInput = {
        ...basePricingInput,
        materialType: 'LUXURY' as const
      };

      const result = Query.Query.calculatePricing(
        null,
        { input: luxuryInput },
        {}
      );

      expect(result.materialCost).toBe(5000); // 1000 sqft * $5.0 for luxury
      expect(result.laborCost).toBe(1000); // unchanged
      expect(result.total).toBeGreaterThan(5216.4); // higher than standard
    });

    it('should calculate pricing for premium materials', () => {
      const premiumInput = {
        ...basePricingInput,
        materialType: 'PREMIUM' as const
      };

      const result = Query.Query.calculatePricing(
        null,
        { input: premiumInput },
        {}
      );

      expect(result.materialCost).toBe(3500); // 1000 sqft * $3.5 for premium
      expect(result.laborCost).toBe(1000); // unchanged
    });

    it('should calculate pricing for budget materials', () => {
      const budgetInput = {
        ...basePricingInput,
        materialType: 'BUDGET' as const
      };

      const result = Query.Query.calculatePricing(
        null,
        { input: budgetInput },
        {}
      );

      expect(result.materialCost).toBe(1500); // 1000 sqft * $1.5 for budget
      expect(result.total).toBeLessThan(5216.4); // lower than standard
    });

    it('should apply complexity multiplier correctly', () => {
      const complexInput = {
        ...basePricingInput,
        complexity: 'COMPLEX' as const
      };

      const result = Query.Query.calculatePricing(
        null,
        { input: complexInput },
        {}
      );

      expect(result.laborCost).toBe(1300); // 20 hours * $50 * 1.3 complexity
      expect(result.total).toBeGreaterThan(5216.4); // higher due to complexity
    });

    it('should apply highly complex multiplier correctly', () => {
      const highlyComplexInput = {
        ...basePricingInput,
        complexity: 'HIGHLY_COMPLEX' as const
      };

      const result = Query.Query.calculatePricing(
        null,
        { input: highlyComplexInput },
        {}
      );

      expect(result.laborCost).toBe(1500); // 20 hours * $50 * 1.5 complexity
      expect(result.total).toBeGreaterThan(5216.4); // highest due to high complexity
    });

    it('should apply moderate complexity multiplier correctly', () => {
      const moderateInput = {
        ...basePricingInput,
        complexity: 'MODERATE' as const
      };

      const result = Query.Query.calculatePricing(
        null,
        { input: moderateInput },
        {}
      );

      expect(result.laborCost).toBe(1150); // 20 hours * $50 * 1.15 complexity
    });

    it('should handle edge cases with zero values', () => {
      const zeroInput = {
        squareFootage: 0,
        laborHours: 0,
        materialType: 'STANDARD' as const,
        complexity: 'SIMPLE' as const
      };

      const result = Query.Query.calculatePricing(
        null,
        { input: zeroInput },
        {}
      );

      expect(result.laborCost).toBe(0);
      expect(result.materialCost).toBe(0);
      expect(result.overheadCost).toBe(0);
      expect(result.profitMargin).toBe(0);
      expect(result.subtotal).toBe(0);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should maintain proper cost relationships', () => {
      const result = Query.Query.calculatePricing(
        null,
        { input: basePricingInput },
        {}
      );

      expect(result.overheadCost).toBe((result.laborCost + result.materialCost) * 0.15);
      expect(result.profitMargin).toBe(
        (result.laborCost + result.materialCost + result.overheadCost) * 0.20
      );
      expect(result.subtotal).toBe(
        result.laborCost + result.materialCost + result.overheadCost + result.profitMargin
      );
      expect(result.tax).toBe(result.subtotal * 0.08);
      expect(result.total).toBe(result.subtotal + result.tax);
    });
  });
});
