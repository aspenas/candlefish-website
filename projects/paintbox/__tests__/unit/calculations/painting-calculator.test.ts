/**
 * @file Painting Calculator Tests
 * @description Unit tests for painting calculation service
 */

import { PaintingCalculator } from '@/lib/calculations/painting-calculator';
import { createTestRoom, createBasicExterior } from '@/__tests__/factories';
import Decimal from 'decimal.js';

// Mock cache to prevent Redis dependency
jest.mock('@/lib/cache/formula-cache', () => ({
  FormulaCache: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
  }))
}));

describe('PaintingCalculator', () => {
  let calculator: PaintingCalculator;

  beforeEach(() => {
    calculator = new PaintingCalculator({
      enableCache: false,
      precision: 2,
    });
  });

  describe('Room Area Calculations', () => {
    it('should calculate wall area correctly', () => {
      const room = createTestRoom({
        dimensions: { length: 12, width: 10, height: 9 },
        doors: 2,
        windows: 3,
      });

      const result = calculator.calculateWallArea(room);

      // (12+10)*2*9 = 396 sq ft
      expect(result.area).toBe(396);
      expect(result.adjustedArea).toBeLessThan(396); // Should be reduced for doors/windows
    });

    it('should calculate ceiling area correctly', () => {
      const room = createTestRoom({
        dimensions: { length: 12, width: 10, height: 9 },
      });

      const result = calculator.calculateCeilingArea(room);

      // 12 * 10 = 120 sq ft
      expect(result.area).toBe(120);
      expect(result.adjustedArea).toBe(120); // No adjustments for ceiling
    });

    it('should calculate trim area correctly', () => {
      const room = createTestRoom({
        dimensions: { length: 12, width: 10, height: 9 },
        doors: 2,
        windows: 3,
      });

      const result = calculator.calculateTrimArea(room);

      // Perimeter * height + door/window trim
      const expectedLinearFeet = (12 + 10) * 2; // 44 ft perimeter
      expect(result.linearFeet).toBe(expectedLinearFeet);
      expect(result.area).toBeGreaterThan(0);
    });

    it('should apply door and window deductions', () => {
      const room = createTestRoom({
        dimensions: { length: 12, width: 10, height: 9 },
        doors: 2,
        windows: 3,
      });

      const result = calculator.calculateWallArea(room, {
        doorArea: 21, // 7ft x 3ft
        windowArea: 15, // 5ft x 3ft
      });

      const baseArea = 396; // (12+10)*2*9
      const deductions = (2 * 21) + (3 * 15); // 42 + 45 = 87
      const expectedArea = baseArea - deductions; // 309

      expect(result.adjustedArea).toBe(expectedArea);
    });
  });

  describe('Paint Coverage Calculations', () => {
    it('should calculate paint gallons needed', () => {
      const totalArea = 500; // sq ft
      const coverage = 350; // sq ft per gallon (standard)

      const result = calculator.calculatePaintGallons(totalArea, {
        coveragePerGallon: coverage,
        coats: 2,
        wastePercentage: 0.1, // 10% waste
      });

      // 500 sq ft * 2 coats = 1000 sq ft total
      // 1000 / 350 = 2.86 gallons base
      // 2.86 * 1.1 (waste) = 3.14 gallons
      // Rounded up = 4 gallons
      expect(result.gallons).toBeCloseTo(3.14, 2);
      expect(result.gallonsRounded).toBe(4);
    });

    it('should adjust coverage based on surface type', () => {
      const testCases = [
        { surface: 'smooth_wall', expectedCoverage: 400 },
        { surface: 'textured_wall', expectedCoverage: 300 },
        { surface: 'ceiling', expectedCoverage: 350 },
        { surface: 'trim', expectedCoverage: 250 },
      ];

      testCases.forEach(({ surface, expectedCoverage }) => {
        const result = calculator.calculatePaintGallons(350, {
          surfaceType: surface,
        });

        const expectedGallons = 350 / expectedCoverage;
        expect(result.gallons).toBeCloseTo(expectedGallons, 2);
      });
    });

    it('should handle primer calculations separately', () => {
      const area = 400;

      const result = calculator.calculatePaintGallons(area, {
        needsPrimer: true,
        primerCoveragePerGallon: 300,
        paintCoveragePerGallon: 350,
      });

      const primerGallons = area / 300; // 1.33 gallons
      const paintGallons = area / 350; // 1.14 gallons

      expect(result.primerGallons).toBeCloseTo(primerGallons, 2);
      expect(result.paintGallons).toBeCloseTo(paintGallons, 2);
    });
  });

  describe('Labor Hour Calculations', () => {
    it('should calculate prep work hours', () => {
      const area = 500;
      const prepLevel = 'standard';

      const result = calculator.calculatePrepHours(area, prepLevel);

      // Standard prep: 100 sq ft per hour
      expect(result.hours).toBe(5);
      expect(result.rate).toBe(100);
    });

    it('should adjust hours based on prep complexity', () => {
      const area = 300;
      const testCases = [
        { prep: 'minimal', expectedRate: 150 },
        { prep: 'standard', expectedRate: 100 },
        { prep: 'extensive', expectedRate: 50 },
      ];

      testCases.forEach(({ prep, expectedRate }) => {
        const result = calculator.calculatePrepHours(area, prep as any);
        expect(result.rate).toBe(expectedRate);
        expect(result.hours).toBe(area / expectedRate);
      });
    });

    it('should calculate painting hours', () => {
      const area = 600;
      const coats = 2;

      const result = calculator.calculatePaintingHours(area, {
        coats,
        applicationRate: 200, // sq ft per hour
      });

      // 600 sq ft * 2 coats = 1200 sq ft total
      // 1200 / 200 = 6 hours
      expect(result.hours).toBe(6);
    });

    it('should add setup and cleanup time', () => {
      const baseHours = 10;

      const result = calculator.calculateTotalLaborHours(baseHours, {
        setupHours: 2,
        cleanupHours: 1.5,
        touchupPercentage: 0.1, // 10% touchup time
      });

      // 10 base + 2 setup + 1.5 cleanup + 1 touchup (10% of 10) = 14.5 hours
      expect(result.totalHours).toBe(14.5);
      expect(result.breakdown.touchup).toBe(1);
    });
  });

  describe('Material Cost Calculations', () => {
    it('should calculate paint costs', () => {
      const gallons = 5;
      const pricePerGallon = 45.99;

      const result = calculator.calculatePaintCosts(gallons, {
        pricePerGallon,
        taxRate: 0.08,
      });

      const subtotal = gallons * pricePerGallon; // 229.95
      const tax = subtotal * 0.08; // 18.40
      const total = subtotal + tax; // 248.35

      expect(result.subtotal).toBeCloseTo(subtotal, 2);
      expect(result.tax).toBeCloseTo(tax, 2);
      expect(result.total).toBeCloseTo(total, 2);
    });

    it('should calculate supply costs', () => {
      const room = createTestRoom({
        dimensions: { length: 12, width: 10, height: 9 },
      });

      const result = calculator.calculateSupplyCosts(room, {
        brushes: 2,
        rollers: 3,
        dropCloths: 4,
        tape: 5,
        other: 25,
      });

      expect(result.total).toBeGreaterThan(0);
      expect(result.breakdown.brushes).toBe(2);
      expect(result.breakdown.other).toBe(25);
    });

    it('should calculate material costs with waste factor', () => {
      const baseCost = 200;
      const wastePercentage = 0.15; // 15% waste

      const result = calculator.applyWasteFactor(baseCost, wastePercentage);

      expect(result.adjustedCost).toBe(230); // 200 * 1.15
      expect(result.wasteCost).toBe(30); // 200 * 0.15
    });
  });

  describe('Pricing Calculations', () => {
    it('should calculate Good/Better/Best pricing', () => {
      const baseCost = 1000;

      const result = calculator.calculateTieredPricing(baseCost, {
        goodMultiplier: 1.0,
        betterMultiplier: 1.25,
        bestMultiplier: 1.55,
        overhead: 0.20,
        profit: 0.25,
      });

      // Apply overhead and profit first: 1000 * 1.20 * 1.25 = 1500
      const adjustedBase = baseCost * 1.20 * 1.25;

      expect(result.good).toBeCloseTo(adjustedBase * 1.0, 2);
      expect(result.better).toBeCloseTo(adjustedBase * 1.25, 2);
      expect(result.best).toBeCloseTo(adjustedBase * 1.55, 2);
    });

    it('should apply condition adjustments', () => {
      const basePrice = 2000;
      const conditions = [
        { condition: 'excellent', multiplier: 1.0 },
        { condition: 'good', multiplier: 1.1 },
        { condition: 'fair', multiplier: 1.25 },
        { condition: 'poor', multiplier: 1.5 },
      ];

      conditions.forEach(({ condition, multiplier }) => {
        const result = calculator.applyConditionAdjustment(basePrice, condition as any);
        expect(result.adjustedPrice).toBe(basePrice * multiplier);
        expect(result.adjustment).toBe(basePrice * (multiplier - 1));
      });
    });

    it('should calculate room complexity factors', () => {
      const complexRoom = createTestRoom({
        dimensions: { length: 20, width: 15, height: 12 }, // Large room
        doors: 4,
        windows: 8,
        surfaces: [
          { type: 'wall', area: 840, condition: 'poor' as any },
          { type: 'ceiling', area: 300, condition: 'fair' as any },
          { type: 'trim', area: 140, condition: 'good' as any },
        ],
      });

      const result = calculator.calculateComplexityFactor(complexRoom);

      expect(result.factor).toBeGreaterThan(1.0); // Should have complexity multiplier
      expect(result.factors.size).toBeGreaterThan(1.0); // Large room factor
      expect(result.factors.openings).toBeGreaterThan(1.0); // Many doors/windows
      expect(result.factors.condition).toBeGreaterThan(1.0); // Poor condition factor
    });
  });

  describe('Exterior Calculations', () => {
    it('should calculate siding area', () => {
      const exterior = createBasicExterior();
      exterior.siding.area = 1500;

      const result = calculator.calculateExteriorSidingArea(exterior);

      expect(result.area).toBe(1500);
      expect(result.adjustedArea).toBeLessThanOrEqual(1500); // May be reduced for openings
    });

    it('should calculate trim linear footage', () => {
      const exterior = createBasicExterior();
      exterior.trim.linearFeet = 200;

      const result = calculator.calculateExteriorTrimArea(exterior);

      expect(result.linearFeet).toBe(200);
      expect(result.area).toBeGreaterThan(0); // Should convert to area
    });

    it('should add pressure washing costs', () => {
      const exterior = createBasicExterior();
      exterior.pressure_washing = true;

      const result = calculator.calculatePressureWashingCost(exterior, {
        pricePerSqFt: 0.50,
        minimumCharge: 150,
      });

      const expectedCost = Math.max(exterior.siding.area * 0.50, 150);
      expect(result.cost).toBe(expectedCost);
    });
  });

  describe('Complex Project Calculations', () => {
    it('should calculate complete room estimate', () => {
      const room = createTestRoom({
        dimensions: { length: 12, width: 10, height: 9 },
        doors: 2,
        windows: 3,
        paintType: 'eggshell',
        prep: 'standard',
      });

      const result = calculator.calculateCompleteRoomEstimate(room, {
        laborRate: 45,
        materialMarkup: 1.25,
        overhead: 0.20,
        profit: 0.25,
      });

      expect(result.areas.wall).toBeGreaterThan(0);
      expect(result.areas.ceiling).toBeGreaterThan(0);
      expect(result.materials.paint.gallons).toBeGreaterThan(0);
      expect(result.labor.total).toBeGreaterThan(0);
      expect(result.pricing.good).toBeGreaterThan(0);
      expect(result.pricing.better).toBeGreaterThan(result.pricing.good);
      expect(result.pricing.best).toBeGreaterThan(result.pricing.better);
    });

    it('should handle multi-room projects', () => {
      const rooms = [
        createTestRoom({ name: 'Living Room', dimensions: { length: 15, width: 12, height: 9 } }),
        createTestRoom({ name: 'Kitchen', dimensions: { length: 12, width: 10, height: 9 } }),
        createTestRoom({ name: 'Bedroom', dimensions: { length: 10, width: 10, height: 9 } }),
      ];

      const result = calculator.calculateMultiRoomEstimate(rooms, {
        laborRate: 45,
        bulkDiscount: 0.05, // 5% discount for multiple rooms
      });

      expect(result.rooms).toHaveLength(3);
      expect(result.totals.area).toBeGreaterThan(0);
      expect(result.totals.laborHours).toBeGreaterThan(0);
      expect(result.totals.materials).toBeGreaterThan(0);
      expect(result.bulkDiscount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle zero dimensions gracefully', () => {
      const invalidRoom = createTestRoom({
        dimensions: { length: 0, width: 10, height: 9 },
      });

      expect(() => calculator.calculateWallArea(invalidRoom)).not.toThrow();

      const result = calculator.calculateWallArea(invalidRoom);
      expect(result.area).toBe(0);
    });

    it('should handle negative values', () => {
      expect(() => calculator.calculatePaintGallons(-100)).not.toThrow();

      const result = calculator.calculatePaintGallons(-100);
      expect(result.gallons).toBe(0);
    });

    it('should validate input parameters', () => {
      expect(() => calculator.calculateTieredPricing(1000, {
        goodMultiplier: -1, // Invalid negative multiplier
      })).toThrow('Invalid pricing multiplier');
    });
  });

  describe('Performance Tests', () => {
    it('should calculate estimates efficiently', () => {
      const startTime = Date.now();
      const rooms = Array.from({ length: 50 }, () => createTestRoom());

      const result = calculator.calculateMultiRoomEstimate(rooms);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.rooms).toHaveLength(50);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle complex calculations without performance degradation', () => {
      const complexRoom = createTestRoom({
        dimensions: { length: 50, width: 30, height: 15 }, // Very large room
        doors: 10,
        windows: 20,
        surfaces: Array.from({ length: 20 }, () => ({
          type: 'wall' as any,
          area: 100,
          condition: 'fair' as any,
        })),
      });

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        calculator.calculateCompleteRoomEstimate(complexRoom);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // 100 complex calculations in under 2 seconds
    });
  });

  describe('Precision and Rounding', () => {
    it('should maintain precision in financial calculations', () => {
      const result = calculator.calculateTieredPricing(1234.56, {
        goodMultiplier: 1.0,
        betterMultiplier: 1.25,
        bestMultiplier: 1.55,
        overhead: 0.2034,
        profit: 0.2567,
      });

      // All results should have proper decimal precision
      expect(Number.isInteger(result.good * 100)).toBe(true); // Cents precision
      expect(Number.isInteger(result.better * 100)).toBe(true);
      expect(Number.isInteger(result.best * 100)).toBe(true);
    });

    it('should round gallons appropriately', () => {
      const testCases = [
        { area: 100, expected: 1 }, // 0.29 gallons rounds to 1
        { area: 350, expected: 1 }, // 1.0 gallons stays 1
        { area: 375, expected: 2 }, // 1.07 gallons rounds to 2
        { area: 700, expected: 2 }, // 2.0 gallons stays 2
      ];

      testCases.forEach(({ area, expected }) => {
        const result = calculator.calculatePaintGallons(area);
        expect(result.gallonsRounded).toBe(expected);
      });
    });
  });
});
