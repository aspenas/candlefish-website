/**
 * @file Excel Parity Tests
 * @description Tests to validate formulas match Excel calculations exactly
 */

import { FormulaEngine } from '@/lib/excel-engine/formula-engine';
import { createExcelValidationCase, createExcelParityEstimate } from '@/__tests__/factories';
import * as fs from 'fs';
import * as path from 'path';

// Load Excel analysis data
const excelAnalysisPath = path.join(process.cwd(), 'excel_analysis.json');
let excelAnalysis: any = {};

try {
  if (fs.existsSync(excelAnalysisPath)) {
    excelAnalysis = JSON.parse(fs.readFileSync(excelAnalysisPath, 'utf8'));
  }
} catch (error) {
  console.warn('Excel analysis file not found, using mock data for tests');
}

describe('Excel Parity Tests', () => {
  let formulaEngine: FormulaEngine;

  beforeEach(() => {
    formulaEngine = new FormulaEngine({
      enableCache: false,
      precision: 10, // Match Excel precision
    });
  });

  describe('Basic Formula Parity', () => {
    it('should match Excel SUM calculations', async () => {
      const testData = {
        A1: 10.5, A2: 20.25, A3: 30.75, A4: 40.1, A5: 50.9
      };

      formulaEngine.setWorksheetData(testData);

      const result = await formulaEngine.evaluate('B1', '=SUM(A1:A5)');
      const expectedSum = 152.5; // Excel result

      expect(result.value).toBeCloseTo(expectedSum, 2);
      expect(result.error).toBeNull();
    });

    it('should match Excel AVERAGE calculations', async () => {
      const testData = {
        A1: 10, A2: 20, A3: 30, A4: 40, A5: 50
      };

      formulaEngine.setWorksheetData(testData);

      const result = await formulaEngine.evaluate('B1', '=AVERAGE(A1:A5)');
      const expectedAverage = 30; // Excel result

      expect(result.value).toBe(expectedAverage);
    });

    it('should match Excel percentage calculations', async () => {
      const testData = {
        A1: 100,
        B1: 0.15 // 15%
      };

      formulaEngine.setWorksheetData(testData);

      const result = await formulaEngine.evaluate('C1', '=A1*B1');
      const expectedResult = 15; // Excel result

      expect(result.value).toBe(expectedResult);
    });
  });

  describe('Pricing Formula Parity', () => {
    it('should match Excel Good/Better/Best calculations', async () => {
      const testData = {
        // Room measurements
        length: 12,
        width: 10,
        height: 9,
        doors: 2,
        windows: 3,

        // Rates (from Excel)
        base_rate: 4.50,
        good_multiplier: 1.0,
        better_multiplier: 1.25,
        best_multiplier: 1.55,

        // Door/window deductions
        door_area: 21, // 7ft x 3ft standard door
        window_area: 15, // 5ft x 3ft standard window
      };

      formulaEngine.setWorksheetData(testData);

      // Wall area calculation: (length + width) * 2 * height - door_area * doors - window_area * windows
      const wallAreaResult = await formulaEngine.evaluate('wall_area',
        '=(length+width)*2*height-door_area*doors-window_area*windows');

      // Ceiling area: length * width
      const ceilingAreaResult = await formulaEngine.evaluate('ceiling_area', '=length*width');

      // Total area
      const totalAreaResult = await formulaEngine.evaluate('total_area', '=wall_area+ceiling_area');

      // Pricing calculations
      const goodPriceResult = await formulaEngine.evaluate('good_price',
        '=total_area*base_rate*good_multiplier');
      const betterPriceResult = await formulaEngine.evaluate('better_price',
        '=total_area*base_rate*better_multiplier');
      const bestPriceResult = await formulaEngine.evaluate('best_price',
        '=total_area*base_rate*best_multiplier');

      // Expected results (from Excel)
      expect(wallAreaResult.value).toBe(315); // (12+10)*2*9-21*2-15*3 = 396-42-45 = 309
      expect(ceilingAreaResult.value).toBe(120); // 12*10
      expect(totalAreaResult.value).toBe(435); // 315+120

      expect(goodPriceResult.value).toBeCloseTo(1957.50, 2); // 435*4.50*1.0
      expect(betterPriceResult.value).toBeCloseTo(2446.88, 2); // 435*4.50*1.25
      expect(bestPriceResult.value).toBeCloseTo(3034.13, 2); // 435*4.50*1.55
    });

    it('should match Excel condition multiplier calculations', async () => {
      const testData = {
        base_price: 2000,
        condition: 'fair'
      };

      formulaEngine.setWorksheetData(testData);

      // Excel formula for condition adjustment
      const result = await formulaEngine.evaluate('adjusted_price',
        '=IF(condition="excellent",base_price*1.0,IF(condition="good",base_price*1.1,IF(condition="fair",base_price*1.25,base_price*1.5)))');

      expect(result.value).toBe(2500); // 2000 * 1.25 for "fair" condition
    });
  });

  describe('Excel Function Parity', () => {
    it('should match Excel VLOOKUP behavior', async () => {
      const testData = {
        // Lookup table (A1:B4)
        A1: 'Small', B1: 100,
        A2: 'Medium', B2: 200,
        A3: 'Large', B3: 300,
        A4: 'XLarge', B4: 400,

        // Lookup value
        D1: 'Medium'
      };

      formulaEngine.setWorksheetData(testData);

      const result = await formulaEngine.evaluate('E1', '=VLOOKUP(D1,A1:B4,2,FALSE)');

      expect(result.value).toBe(200); // Excel VLOOKUP result
    });

    it('should match Excel IF nested functions', async () => {
      const testData = {
        score: 85
      };

      formulaEngine.setWorksheetData(testData);

      const result = await formulaEngine.evaluate('grade',
        '=IF(score>=90,"A",IF(score>=80,"B",IF(score>=70,"C",IF(score>=60,"D","F"))))');

      expect(result.value).toBe('B'); // Excel nested IF result
    });

    it('should match Excel ROUND function', async () => {
      const testData = {
        value: 123.456789
      };

      formulaEngine.setWorksheetData(testData);

      const result1 = await formulaEngine.evaluate('rounded_2', '=ROUND(value,2)');
      const result2 = await formulaEngine.evaluate('rounded_0', '=ROUND(value,0)');
      const result3 = await formulaEngine.evaluate('rounded_neg1', '=ROUND(value,-1)');

      expect(result1.value).toBe(123.46); // Excel ROUND result
      expect(result2.value).toBe(123);
      expect(result3.value).toBe(120);
    });
  });

  describe('Complex Excel Formulas', () => {
    it('should match Excel complex nested calculations', async () => {
      const testData = {
        // Material costs
        primer_cost: 45.99,
        paint_cost: 89.99,
        supplies_cost: 25.50,

        // Labor
        hours: 24,
        hourly_rate: 65,

        // Overhead and profit
        overhead_rate: 0.20,
        profit_margin: 0.25,

        // Tax
        tax_rate: 0.08
      };

      formulaEngine.setWorksheetData(testData);

      // Complex Excel formula for total project cost
      const result = await formulaEngine.evaluate('total_cost',
        '=((primer_cost+paint_cost+supplies_cost)+(hours*hourly_rate))*(1+overhead_rate)*(1+profit_margin)*(1+tax_rate)');

      // Expected calculation from Excel:
      // Materials: 45.99 + 89.99 + 25.50 = 161.48
      // Labor: 24 * 65 = 1560
      // Subtotal: 161.48 + 1560 = 1721.48
      // With overhead: 1721.48 * 1.20 = 2065.78
      // With profit: 2065.78 * 1.25 = 2582.22
      // With tax: 2582.22 * 1.08 = 2788.80

      expect(result.value).toBeCloseTo(2788.80, 2);
    });

    it('should handle Excel array formulas', async () => {
      const testData = {
        A1: 2, A2: 3, A3: 4,
        B1: 5, B2: 6, B3: 7
      };

      formulaEngine.setWorksheetData(testData);

      // Array multiplication and sum (Excel behavior)
      const result = await formulaEngine.evaluate('array_sum', '=SUM(A1:A3*B1:B3)');

      // Expected: (2*5) + (3*6) + (4*7) = 10 + 18 + 28 = 56
      expect(result.value).toBe(56);
    });
  });

  describe('Excel Error Handling Parity', () => {
    it('should match Excel #DIV/0! error', async () => {
      const result = await formulaEngine.evaluate('error_test', '=10/0');

      expect(result.error).toContain('#DIV/0!');
      expect(result.value).toBeNull();
    });

    it('should match Excel #N/A error for VLOOKUP', async () => {
      const testData = {
        A1: 'Apple', B1: 100,
        A2: 'Banana', B2: 200,
        lookup_value: 'Orange'
      };

      formulaEngine.setWorksheetData(testData);

      const result = await formulaEngine.evaluate('lookup_result',
        '=VLOOKUP(lookup_value,A1:B2,2,FALSE)');

      expect(result.error).toContain('#N/A');
    });

    it('should match Excel #REF! error for invalid references', async () => {
      const result = await formulaEngine.evaluate('ref_error', '=A1048577'); // Beyond Excel limits

      expect(result.error).toContain('#REF!');
    });
  });

  describe('Excel Precision Parity', () => {
    it('should match Excel floating point precision', async () => {
      const testData = {
        value1: 0.1,
        value2: 0.2
      };

      formulaEngine.setWorksheetData(testData);

      const result = await formulaEngine.evaluate('sum_test', '=value1+value2');

      // Excel shows 0.3, not 0.30000000000000004
      expect(result.value).toBeCloseTo(0.3, 10);
    });

    it('should handle Excel large number precision', async () => {
      const testData = {
        large_num1: 999999999999999,
        large_num2: 1
      };

      formulaEngine.setWorksheetData(testData);

      const result = await formulaEngine.evaluate('large_sum', '=large_num1+large_num2');

      expect(result.value).toBe(1000000000000000);
    });
  });

  describe('Real Excel Data Validation', () => {
    it('should validate against known Excel results', async () => {
      // Skip if no Excel analysis data available
      if (!excelAnalysis.formulas || excelAnalysis.formulas.length === 0) {
        console.warn('Skipping Excel validation - no analysis data available');
        return;
      }

      const sampleFormulas = excelAnalysis.formulas.slice(0, 50); // Test first 50 formulas

      for (const excelFormula of sampleFormulas) {
        if (excelFormula.result && excelFormula.formula) {
          formulaEngine.setWorksheetData(excelFormula.input_data || {});

          const result = await formulaEngine.evaluate(
            excelFormula.cell_reference,
            excelFormula.formula
          );

          if (typeof excelFormula.result === 'number') {
            expect(result.value).toBeCloseTo(excelFormula.result, 2);
          } else {
            expect(result.value).toBe(excelFormula.result);
          }
        }
      }
    });
  });

  describe('Performance Parity', () => {
    it('should calculate large datasets efficiently like Excel', async () => {
      const dataSize = 1000;
      const testData: Record<string, number> = {};

      // Create large dataset
      for (let i = 1; i <= dataSize; i++) {
        testData[`A${i}`] = i;
        testData[`B${i}`] = i * 2;
      }

      formulaEngine.setWorksheetData(testData);

      const startTime = Date.now();

      // Perform calculations similar to Excel
      const sumResult = await formulaEngine.evaluate('sum_all', `=SUM(A1:A${dataSize})`);
      const avgResult = await formulaEngine.evaluate('avg_all', `=AVERAGE(B1:B${dataSize})`);
      const maxResult = await formulaEngine.evaluate('max_all', `=MAX(A1:A${dataSize})`);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify results
      expect(sumResult.value).toBe(500500); // Sum of 1 to 1000
      expect(avgResult.value).toBe(1001); // Average of 2,4,6...2000
      expect(maxResult.value).toBe(1000);

      // Should be reasonably fast (Excel-like performance)
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Excel Compatibility Edge Cases', () => {
    it('should handle Excel text-to-number conversions', async () => {
      const testData = {
        text_number: '123',
        regular_number: 456
      };

      formulaEngine.setWorksheetData(testData);

      const result = await formulaEngine.evaluate('conversion_test', '=text_number+regular_number');

      expect(result.value).toBe(579); // Excel auto-converts "123" to 123
    });

    it('should handle Excel date calculations', async () => {
      const testData = {
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31')
      };

      formulaEngine.setWorksheetData(testData);

      // Excel date difference calculation
      const result = await formulaEngine.evaluate('date_diff', '=end_date-start_date');

      expect(result.value).toBe(30); // 30 days difference
    });

    it('should handle Excel boolean logic consistently', async () => {
      const testData = {
        true_val: true,
        false_val: false,
        number_val: 5
      };

      formulaEngine.setWorksheetData(testData);

      const andResult = await formulaEngine.evaluate('and_test', '=AND(true_val,number_val>0)');
      const orResult = await formulaEngine.evaluate('or_test', '=OR(false_val,number_val>10)');

      expect(andResult.value).toBe(true);
      expect(orResult.value).toBe(false);
    });
  });
});
