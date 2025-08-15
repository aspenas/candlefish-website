import { PricingCalculator } from '../../services/PricingCalculator';
import { MaterialType, ComplexityLevel, PricingTier } from '../../types';

describe('PricingCalculator', () => {
  let calculator: PricingCalculator;

  beforeEach(() => {
    calculator = new PricingCalculator();
  });

  describe('Kind Home Paint Formula Validation', () => {
    // Test cases based on the Excel validation data
    const testCases = [
      {
        name: 'Paul Sakry - Standard Exterior',
        input: {
          squareFootage: 2800.0,
          laborHours: 28.0,
          materialType: 'STANDARD' as MaterialType,
          complexity: 'MODERATE' as ComplexityLevel,
        },
        expected: {
          laborRate: 60.0, // $60/hour standard rate
          materialCostPerSqFt: 0.45, // Kind Home Paint standard rate
          overheadPercentage: 0.20, // 20% overhead
          profitMargin: 0.24, // 24% profit margin
          taxRate: 0.08, // 8% sales tax
        },
      },
      {
        name: 'Delores Huss - Premium Exterior',
        input: {
          squareFootage: 3200.0,
          laborHours: 35.0,
          materialType: 'PREMIUM' as MaterialType,
          complexity: 'COMPLEX' as ComplexityLevel,
        },
        expected: {
          laborRate: 60.0,
          materialCostPerSqFt: 0.58, // Premium 30% markup
          overheadPercentage: 0.25, // Higher overhead for complex work
          profitMargin: 0.24,
          taxRate: 0.08,
        },
      },
      {
        name: 'Grant Norell - Interior Standard',
        input: {
          squareFootage: 1800.0,
          laborHours: 22.0,
          materialType: 'STANDARD' as MaterialType,
          complexity: 'SIMPLE' as ComplexityLevel,
        },
        expected: {
          laborRate: 60.0,
          materialCostPerSqFt: 0.45,
          overheadPercentage: 0.18, // Lower overhead for simple interior
          profitMargin: 0.24,
          taxRate: 0.08,
        },
      },
    ];

    testCases.forEach(({ name, input, expected }) => {
      describe(name, () => {
        let result: any;

        beforeEach(async () => {
          result = await calculator.calculatePricing(input);
        });

        it('should calculate labor cost correctly', () => {
          const expectedLaborCost = input.laborHours * expected.laborRate;
          expect(result.laborCost).toBeCloseTo(expectedLaborCost, 2);
        });

        it('should calculate material cost correctly', () => {
          const expectedMaterialCost = input.squareFootage * expected.materialCostPerSqFt;
          expect(result.materialCost).toBeCloseTo(expectedMaterialCost, 2);
        });

        it('should calculate overhead cost correctly', () => {
          const expectedOverhead = (result.laborCost + result.materialCost) * expected.overheadPercentage;
          expect(result.overheadCost).toBeCloseTo(expectedOverhead, 2);
        });

        it('should calculate subtotal before tax', () => {
          const expectedSubtotal = result.laborCost + result.materialCost + result.overheadCost;
          const profitAmount = expectedSubtotal * expected.profitMargin;
          expect(result.subtotal).toBeCloseTo(expectedSubtotal + profitAmount, 2);
        });

        it('should apply correct tax calculation', () => {
          const expectedTax = result.subtotal * expected.taxRate;
          expect(result.tax).toBeCloseTo(expectedTax, 2);
        });

        it('should calculate total correctly', () => {
          const expectedTotal = result.subtotal + result.tax;
          expect(result.total).toBeCloseTo(expectedTotal, 2);
        });

        it('should match Kind Home Paint formula: (Labor + Material) / 0.45 + discount', () => {
          const kindHomeBase = (result.laborCost + result.materialCost) / 0.45;
          // The formula suggests a base calculation that should be close to our subtotal
          expect(result.subtotal).toBeLessThanOrEqual(kindHomeBase * 1.1); // Allow 10% variance
          expect(result.subtotal).toBeGreaterThanOrEqual(kindHomeBase * 0.9);
        });
      });
    });
  });

  describe('Material Type Multipliers', () => {
    const baseInput = {
      squareFootage: 1000.0,
      laborHours: 12.0,
      complexity: 'SIMPLE' as ComplexityLevel,
    };

    const materialTests = [
      { type: 'ECONOMY', expectedMultiplier: 0.8, description: 'Economy paint 20% discount' },
      { type: 'STANDARD', expectedMultiplier: 1.0, description: 'Standard paint baseline' },
      { type: 'PREMIUM', expectedMultiplier: 1.3, description: 'Premium paint 30% markup' },
      { type: 'LUXURY', expectedMultiplier: 1.8, description: 'Luxury paint 80% markup' },
    ];

    materialTests.forEach(({ type, expectedMultiplier, description }) => {
      it(`should apply correct multiplier for ${type} material - ${description}`, async () => {
        const input = { ...baseInput, materialType: type as MaterialType };
        const result = await calculator.calculatePricing(input);
        
        const baseMaterialCost = baseInput.squareFootage * 0.45; // Standard rate
        const expectedMaterialCost = baseMaterialCost * expectedMultiplier;
        
        expect(result.materialCost).toBeCloseTo(expectedMaterialCost, 2);
      });
    });
  });

  describe('Complexity Level Adjustments', () => {
    const baseInput = {
      squareFootage: 1500.0,
      laborHours: 18.0,
      materialType: 'STANDARD' as MaterialType,
    };

    const complexityTests = [
      { level: 'SIMPLE', overheadMultiplier: 0.9, laborMultiplier: 1.0 },
      { level: 'MODERATE', overheadMultiplier: 1.0, laborMultiplier: 1.0 },
      { level: 'COMPLEX', overheadMultiplier: 1.25, laborMultiplier: 1.1 },
      { level: 'HIGHLY_COMPLEX', overheadMultiplier: 1.5, laborMultiplier: 1.25 },
    ];

    complexityTests.forEach(({ level, overheadMultiplier, laborMultiplier }) => {
      it(`should apply correct adjustments for ${level} complexity`, async () => {
        const input = { ...baseInput, complexity: level as ComplexityLevel };
        const result = await calculator.calculatePricing(input);
        
        const expectedLaborCost = baseInput.laborHours * 60.0 * laborMultiplier;
        expect(result.laborCost).toBeCloseTo(expectedLaborCost, 2);
        
        const baseOverhead = (result.laborCost + result.materialCost) * 0.20;
        const expectedOverhead = baseOverhead * overheadMultiplier;
        expect(result.overheadCost).toBeCloseTo(expectedOverhead, 1);
      });
    });
  });

  describe('Three-Tier Pricing System', () => {
    const baseInput = {
      squareFootage: 2000.0,
      laborHours: 24.0,
      materialType: 'STANDARD' as MaterialType,
      complexity: 'MODERATE' as ComplexityLevel,
    };

    it('should calculate Good, Better, Best pricing tiers', async () => {
      const goodTier = await calculator.calculateTierPricing(baseInput, PricingTier.GOOD);
      const betterTier = await calculator.calculateTierPricing(baseInput, PricingTier.BETTER);
      const bestTier = await calculator.calculateTierPricing(baseInput, PricingTier.BEST);

      // Good tier should be base price with economy materials
      expect(goodTier.total).toBeLessThan(betterTier.total);
      
      // Better tier should be standard pricing
      expect(betterTier.total).toBeLessThan(bestTier.total);
      
      // Best tier should include premium materials and additional services
      expect(bestTier.total).toBeGreaterThan(betterTier.total * 1.15); // At least 15% more
      
      // Verify tier differences are reasonable
      const goodToBetter = (betterTier.total - goodTier.total) / goodTier.total;
      const betterToBest = (bestTier.total - betterTier.total) / betterTier.total;
      
      expect(goodToBetter).toBeGreaterThan(0.15); // At least 15% increase
      expect(goodToBetter).toBeLessThan(0.35); // But not more than 35%
      expect(betterToBest).toBeGreaterThan(0.15);
      expect(betterToBest).toBeLessThan(0.35);
    });

    it('should maintain consistent labor costs across tiers', async () => {
      const goodTier = await calculator.calculateTierPricing(baseInput, PricingTier.GOOD);
      const betterTier = await calculator.calculateTierPricing(baseInput, PricingTier.BETTER);
      const bestTier = await calculator.calculateTierPricing(baseInput, PricingTier.BEST);

      // Labor costs should be the same or similar across tiers
      expect(goodTier.laborCost).toBeCloseTo(betterTier.laborCost, 1);
      expect(betterTier.laborCost).toBeLessThanOrEqual(bestTier.laborCost * 1.1); // Best might include more labor
    });

    it('should apply appropriate material upgrades per tier', async () => {
      const goodTier = await calculator.calculateTierPricing(baseInput, PricingTier.GOOD);
      const betterTier = await calculator.calculateTierPricing(baseInput, PricingTier.BETTER);
      const bestTier = await calculator.calculateTierPricing(baseInput, PricingTier.BEST);

      // Material costs should increase with tier
      expect(goodTier.materialCost).toBeLessThan(betterTier.materialCost);
      expect(betterTier.materialCost).toBeLessThan(bestTier.materialCost);
      
      // Best tier should use premium materials
      const premiumMaterialCost = baseInput.squareFootage * 0.45 * 1.3; // 30% premium
      expect(bestTier.materialCost).toBeGreaterThanOrEqual(premiumMaterialCost);
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle zero square footage', async () => {
      const input = {
        squareFootage: 0,
        laborHours: 8.0,
        materialType: 'STANDARD' as MaterialType,
        complexity: 'SIMPLE' as ComplexityLevel,
      };

      await expect(calculator.calculatePricing(input)).rejects.toThrow('Square footage must be greater than 0');
    });

    it('should handle negative values', async () => {
      const input = {
        squareFootage: -100,
        laborHours: -5,
        materialType: 'STANDARD' as MaterialType,
        complexity: 'SIMPLE' as ComplexityLevel,
      };

      await expect(calculator.calculatePricing(input)).rejects.toThrow('Values must be positive');
    });

    it('should handle extremely large values', async () => {
      const input = {
        squareFootage: 1000000, // 1 million sq ft
        laborHours: 10000, // 10,000 hours
        materialType: 'STANDARD' as MaterialType,
        complexity: 'SIMPLE' as ComplexityLevel,
      };

      const result = await calculator.calculatePricing(input);
      expect(result.total).toBeGreaterThan(0);
      expect(Number.isFinite(result.total)).toBe(true);
    });

    it('should maintain precision for small values', async () => {
      const input = {
        squareFootage: 0.5,
        laborHours: 0.25,
        materialType: 'STANDARD' as MaterialType,
        complexity: 'SIMPLE' as ComplexityLevel,
      };

      const result = await calculator.calculatePricing(input);
      expect(result.materialCost).toBeCloseTo(0.225, 3); // 0.5 * 0.45
      expect(result.laborCost).toBeCloseTo(15.0, 2); // 0.25 * 60
    });
  });

  describe('Performance Tests', () => {
    it('should calculate pricing within acceptable time limits', async () => {
      const input = {
        squareFootage: 2500.0,
        laborHours: 30.0,
        materialType: 'STANDARD' as MaterialType,
        complexity: 'MODERATE' as ComplexityLevel,
      };

      const startTime = Date.now();
      await calculator.calculatePricing(input);
      const endTime = Date.now();

      // Should complete within 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle concurrent calculations', async () => {
      const inputs = Array.from({ length: 10 }, (_, i) => ({
        squareFootage: 1000 + i * 100,
        laborHours: 10 + i * 2,
        materialType: 'STANDARD' as MaterialType,
        complexity: 'SIMPLE' as ComplexityLevel,
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        inputs.map(input => calculator.calculatePricing(input))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.total).toBeGreaterThan(0);
      });

      // Should complete all calculations within 500ms
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});