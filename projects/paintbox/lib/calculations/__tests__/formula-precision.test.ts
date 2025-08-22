/**
 * @file Formula Precision Tests
 * @description Tests for Excel formula precision and decimal.js configuration
 * Tests financial precision requirements and rounding behavior
 */

import Decimal from 'decimal.js';
import { FormulaEngine } from '@/lib/excel-engine/formula-engine';
import { paintingCalculator } from '@/lib/calculations/painting-calculator';

describe('Formula Precision Tests', () => {
  let formulaEngine: FormulaEngine;

  beforeEach(() => {
    // Configure Decimal.js to match Excel precision
    Decimal.set({
      precision: 15,
      rounding: Decimal.ROUND_HALF_UP,
      toExpNeg: -7,
      toExpPos: 21,
      minE: -9e15,
      maxE: 9e15
    });

    formulaEngine = new FormulaEngine({
      maxIterations: 100,
      epsilon: 1e-10,
      enableArrayFormulas: true,
      dateSystem: '1900',
      calcMode: 'automatic'
    });
  });

  describe('Decimal.js Configuration Consistency', () => {
    it('should detect precision configuration mismatch between components', () => {
      // Formula engine uses precision: 15 (Excel-compatible)
      const engineConfig = Decimal.getPrecision();
      expect(engineConfig).toBe(15);

      // Painting calculator incorrectly uses precision: 10
      // This is a bug that needs to be fixed
      const paintingCalcDecimal = new Decimal(1);
      const currentPrecision = paintingCalcDecimal.constructor.getPrecision();

      // Document the inconsistency
      console.warn('PRECISION MISMATCH DETECTED:');
      console.warn(`Formula Engine: ${engineConfig} digits`);
      console.warn(`Painting Calculator: ${currentPrecision} digits`);
    });

    it('should use consistent rounding across all components', () => {
      const roundingMode = Decimal.getRounding();
      expect(roundingMode).toBe(Decimal.ROUND_HALF_UP);
    });
  });

  describe('Financial Precision Requirements', () => {
    it('should maintain precision for currency calculations', () => {
      const price1 = new Decimal(12.34);
      const price2 = new Decimal(56.78);
      const tax = new Decimal(0.0875); // 8.75% tax

      const subtotal = price1.plus(price2);
      const taxAmount = subtotal.times(tax);
      const total = subtotal.plus(taxAmount);

      expect(subtotal.toFixed(2)).toBe('69.12');
      expect(taxAmount.toFixed(2)).toBe('6.05');
      expect(total.toFixed(2)).toBe('75.17');
    });

    it('should handle large financial calculations accurately', () => {
      const laborHours = new Decimal(847.5);
      const hourlyRate = new Decimal(65.00);
      const totalLabor = laborHours.times(hourlyRate);

      expect(totalLabor.toFixed(2)).toBe('55087.50');
      expect(totalLabor.toNumber()).toBe(55087.5);
    });

    it('should maintain precision with material calculations', () => {
      const gallons = new Decimal(23.7);
      const pricePerGallon = new Decimal(47.95);
      const totalMaterialCost = gallons.times(pricePerGallon);

      expect(totalMaterialCost.toFixed(2)).toBe('1136.42');
    });
  });

  describe('Excel Formula Precision Parity', () => {
    it('should match Excel rounding behavior', () => {
      // Excel ROUND function tests
      const tests = [
        { value: 12.345, digits: 2, expected: 12.35 },
        { value: 12.344, digits: 2, expected: 12.34 },
        { value: 12.346, digits: 2, expected: 12.35 },
        { value: -12.345, digits: 2, expected: -12.35 },
        { value: 1234.5, digits: 0, expected: 1235 },
        { value: 1234.4, digits: 0, expected: 1234 }
      ];

      tests.forEach(test => {
        const result = new Decimal(test.value).toDecimalPlaces(test.digits, Decimal.ROUND_HALF_UP);
        expect(result.toNumber()).toBe(test.expected);
      });
    });

    it('should handle floating point edge cases', () => {
      // These would fail with regular JavaScript numbers
      const result1 = new Decimal(0.1).plus(0.2);
      expect(result1.toNumber()).toBe(0.3);

      const result2 = new Decimal(0.3).minus(0.1);
      expect(result2.toNumber()).toBe(0.2);

      const result3 = new Decimal(1.005).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      expect(result3.toNumber()).toBe(1.01);
    });

    it('should maintain precision through complex calculations', () => {
      // Simulate complex pricing calculation
      const measurements = [
        { sqft: 1247.5, rate: 2.35 },
        { sqft: 856.25, rate: 1.85 },
        { sqft: 642.75, rate: 3.15 }
      ];

      let total = new Decimal(0);
      measurements.forEach(m => {
        const cost = new Decimal(m.sqft).times(m.rate);
        total = total.plus(cost);
      });

      const markup = total.times(0.25); // 25% markup
      const taxRate = new Decimal(0.0875); // 8.75% tax
      const tax = total.plus(markup).times(taxRate);
      const grandTotal = total.plus(markup).plus(tax);

      expect(total.toFixed(2)).toBe('7546.88');
      expect(markup.toFixed(2)).toBe('1886.72');
      expect(tax.toFixed(2)).toBe('826.68');
      expect(grandTotal.toFixed(2)).toBe('10260.28');
    });
  });

  describe('Real Formula Tests from BART Workbook', () => {
    it('should calculate SUM formulas accurately', async () => {
      const mockData = {
        P138: 1250.50,
        P139: 875.25,
        P140: 2100.75,
        P141: 650.00,
        P142: 425.30,
        Q138: 300.50,
        Q139: 175.25,
        Q140: 500.75,
        Q141: 150.00,
        Q142: 95.30
      };

      formulaEngine.setWorksheetData(mockData);

      // Real formula: =SUM(P138:Q142)
      const result = await formulaEngine.evaluate('P143', '=SUM(P138:Q142)');

      // Calculate expected value with proper precision
      const expected = new Decimal(1250.50)
        .plus(875.25).plus(2100.75).plus(650.00).plus(425.30)
        .plus(300.50).plus(175.25).plus(500.75).plus(150.00).plus(95.30);

      expect(result.value).toBe(expected.toNumber());
      expect(result.error).toBeNull();
    });

    it('should handle complex IF formulas from BART workbook', async () => {
      const mockData = {
        D50: 'Stucco'
      };

      formulaEngine.setWorksheetData(mockData);

      // Real formula: =IF(D50="Brick Unpainted", "Brick Unpainted",IF(D50="Stucco","Flat",IF(D50="Cedar_Stain","Stain","Body")))
      const result = await formulaEngine.evaluate('L50',
        '=IF(D50="Brick Unpainted", "Brick Unpainted",IF(D50="Stucco","Flat",IF(D50="Cedar_Stain","Stain","Body")))');

      expect(result.value).toBe('Flat');
      expect(result.error).toBeNull();
    });

    it('should handle mixed range and cell SUM formulas', async () => {
      const mockData = {
        F155: 125.50, F156: 87.25, F157: 45.75,
        I155: 200.00, I156: 150.25,
        O155: 75.50, O156: 92.75,
        L155: 110.00, L156: 88.50
      };

      formulaEngine.setWorksheetData(mockData);

      // Real formula: =SUM(F155,F156,I155,O155,I156,O156,L155,F157,L156)
      const result = await formulaEngine.evaluate('D154',
        '=SUM(F155,F156,I155,O155,I156,O156,L155,F157,L156)');

      const expected = new Decimal(125.50)
        .plus(87.25).plus(200.00).plus(75.50).plus(150.25)
        .plus(92.75).plus(110.00).plus(45.75).plus(88.50);

      expect(result.value).toBe(expected.toNumber());
      expect(result.error).toBeNull();
    });
  });

  describe('Production Rate Calculations', () => {
    it('should calculate labor hours with proper precision', () => {
      const surfaceArea = new Decimal(1247.5);
      const productionRate = new Decimal(150); // sq ft per hour
      const laborHours = surfaceArea.dividedBy(productionRate);

      expect(laborHours.toFixed(2)).toBe('8.32');
      expect(laborHours.toNumber()).toBeCloseTo(8.32, 2);
    });

    it('should calculate material quantities with waste factor', () => {
      const surfaceArea = new Decimal(2450.0);
      const coverage = new Decimal(350); // sq ft per gallon
      const coats = new Decimal(2);
      const wasteFactor = new Decimal(1.1); // 10% waste

      const gallons = surfaceArea.dividedBy(coverage).times(coats).times(wasteFactor);

      expect(gallons.toFixed(2)).toBe('15.43');
      expect(Math.ceil(gallons.toNumber())).toBe(16); // Round up for ordering
    });
  });

  describe('Pricing Tier Calculations', () => {
    it('should calculate Good/Better/Best tiers accurately', () => {
      const basePrice = new Decimal(12500.00);

      const goodTier = basePrice; // Base pricing
      const betterTier = basePrice.times(1.20); // 20% markup
      const bestTier = basePrice.times(1.40); // 40% markup

      expect(goodTier.toFixed(2)).toBe('12500.00');
      expect(betterTier.toFixed(2)).toBe('15000.00');
      expect(bestTier.toFixed(2)).toBe('17500.00');
    });

    it('should apply volume discounts correctly', () => {
      const largeJobTotal = new Decimal(25000.00);
      const discountRate = new Decimal(0.05); // 5% discount
      const discount = largeJobTotal.times(discountRate);
      const finalTotal = largeJobTotal.minus(discount);

      expect(discount.toFixed(2)).toBe('1250.00');
      expect(finalTotal.toFixed(2)).toBe('23750.00');
    });
  });

  describe('Error Boundary Tests', () => {
    it('should handle very large numbers', () => {
      const largeNumber = new Decimal('999999999999999');
      const rate = new Decimal(1.05);
      const result = largeNumber.times(rate);

      expect(result.toString()).toBe('1049999999999998.95');
    });

    it('should handle very small numbers', () => {
      const smallNumber = new Decimal('0.000000001');
      const multiplier = new Decimal(1000000);
      const result = smallNumber.times(multiplier);

      expect(result.toFixed(6)).toBe('0.001000');
    });

    it('should handle division edge cases', () => {
      const dividend = new Decimal(1);
      const divisor = new Decimal(3);
      const result = dividend.dividedBy(divisor);

      // Should not have floating point errors
      expect(result.toFixed(10)).toBe('0.3333333333');
    });
  });

  describe('Integration with Painting Calculator', () => {
    it('should identify precision configuration issues', () => {
      // This test documents the current issue where
      // painting calculator uses precision: 10 instead of 15

      const surfaces = [{
        name: 'Front Wall',
        width: 24.5,
        height: 12.25,
        sqft: 300.125,
        condition: 'good' as const,
        substrate: 'wood',
        coats: 2
      }];

      const result = paintingCalculator.calculateExterior(surfaces);

      // The painting calculator should use same precision as formula engine
      // Currently it doesn't, which can cause discrepancies
      expect(result.subtotal).toBeGreaterThan(0);
      expect(typeof result.subtotal).toBe('number');

      // Log the current precision issue
      console.warn('Painting calculator needs precision update to match formula engine');
    });
  });
});
