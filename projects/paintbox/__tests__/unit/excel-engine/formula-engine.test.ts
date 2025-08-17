/**
 * @file Formula Engine Tests
 * @description Comprehensive tests for the Excel formula engine
 */

import { FormulaEngine } from '@/lib/excel-engine/formula-engine';
import { DependencyResolver } from '@/lib/excel-engine/dependency-resolver';
import { FormulaValidator } from '@/lib/excel-engine/formula-validator';
import { createExcelFormula, createFormulaCategories, createComplexFormula } from '@/__tests__/factories';
import Decimal from 'decimal.js';

// Mock dependencies
jest.mock('@/lib/excel-engine/dependency-resolver');
jest.mock('@/lib/excel-engine/formula-validator');
jest.mock('@/lib/cache/formula-cache');

describe('FormulaEngine', () => {
  let formulaEngine: FormulaEngine;
  let mockDependencyResolver: jest.Mocked<DependencyResolver>;
  let mockValidator: jest.Mocked<FormulaValidator>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDependencyResolver = new DependencyResolver() as jest.Mocked<DependencyResolver>;
    mockValidator = new FormulaValidator() as jest.Mocked<FormulaValidator>;

    formulaEngine = new FormulaEngine({
      dependencyResolver: mockDependencyResolver,
      validator: mockValidator,
      enableCache: false, // Disable cache for unit tests
    });
  });

  describe('Basic Formula Evaluation', () => {
    it('should evaluate simple arithmetic formulas', async () => {
      const formula = createExcelFormula({
        cellReference: 'A1',
        formula: '=5+3',
        expectedResult: 8,
        dependencies: [],
        category: 'measurement',
        complexity: 'simple',
      });

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue([]);

      const result = await formulaEngine.evaluate(formula.cellReference, formula.formula);

      expect(result.value).toBe(8);
      expect(result.type).toBe('number');
      expect(result.error).toBeNull();
    });

    it('should evaluate formulas with cell references', async () => {
      const formula = createExcelFormula({
        cellReference: 'C1',
        formula: '=A1+B1',
        dependencies: ['A1', 'B1'],
      });

      const mockData = { A1: 10, B1: 20 };

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['A1', 'B1']);

      formulaEngine.setWorksheetData(mockData);

      const result = await formulaEngine.evaluate(formula.cellReference, formula.formula);

      expect(result.value).toBe(30);
      expect(result.dependencies).toEqual(['A1', 'B1']);
    });

    it('should handle multiplication and division', async () => {
      const testCases = [
        { formula: '=10*5', expected: 50 },
        { formula: '=100/4', expected: 25 },
        { formula: '=2*3*4', expected: 24 },
        { formula: '=144/12/3', expected: 4 },
      ];

      for (const testCase of testCases) {
        mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
        mockDependencyResolver.resolveDependencies.mockResolvedValue([]);

        const result = await formulaEngine.evaluate('A1', testCase.formula);
        expect(result.value).toBe(testCase.expected);
      }
    });
  });

  describe('SUM Function', () => {
    it('should evaluate SUM with range', async () => {
      const mockData = {
        A1: 10, A2: 20, A3: 30, A4: 40, A5: 50
      };

      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['A1', 'A2', 'A3', 'A4', 'A5']);

      const result = await formulaEngine.evaluate('B1', '=SUM(A1:A5)');

      expect(result.value).toBe(150);
      expect(result.dependencies).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);
    });

    it('should evaluate SUM with individual cells', async () => {
      const mockData = { A1: 25, B1: 35, C1: 15 };

      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['A1', 'B1', 'C1']);

      const result = await formulaEngine.evaluate('D1', '=SUM(A1,B1,C1)');

      expect(result.value).toBe(75);
    });

    it('should handle SUM with mixed ranges and cells', async () => {
      const mockData = {
        A1: 10, A2: 20, A3: 30,
        B1: 5, C1: 15
      };

      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['A1', 'A2', 'A3', 'B1', 'C1']);

      const result = await formulaEngine.evaluate('D1', '=SUM(A1:A3,B1,C1)');

      expect(result.value).toBe(80);
    });
  });

  describe('IF Function', () => {
    it('should evaluate simple IF condition', async () => {
      const mockData = { A1: 10 };

      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['A1']);

      const result = await formulaEngine.evaluate('B1', '=IF(A1>5,100,50)');

      expect(result.value).toBe(100);
    });

    it('should evaluate IF with FALSE condition', async () => {
      const mockData = { A1: 3 };

      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['A1']);

      const result = await formulaEngine.evaluate('B1', '=IF(A1>5,100,50)');

      expect(result.value).toBe(50);
    });

    it('should handle nested IF statements', async () => {
      const mockData = { A1: 75 };

      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['A1']);

      const result = await formulaEngine.evaluate('B1', '=IF(A1>=90,"A",IF(A1>=80,"B",IF(A1>=70,"C","F")))');

      expect(result.value).toBe('C');
    });
  });

  describe('VLOOKUP Function', () => {
    it('should perform exact VLOOKUP', async () => {
      const mockData = {
        A1: 'Product1', B1: 100,
        A2: 'Product2', B2: 200,
        A3: 'Product3', B3: 300,
        D1: 'Product2'
      };

      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['D1', 'A1:B3']);

      const result = await formulaEngine.evaluate('E1', '=VLOOKUP(D1,A1:B3,2,FALSE)');

      expect(result.value).toBe(200);
    });

    it('should return error for VLOOKUP when value not found', async () => {
      const mockData = {
        A1: 'Product1', B1: 100,
        A2: 'Product2', B2: 200,
        D1: 'Product4'
      };

      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['D1', 'A1:B2']);

      const result = await formulaEngine.evaluate('E1', '=VLOOKUP(D1,A1:B2,2,FALSE)');

      expect(result.error).toContain('#N/A');
    });
  });

  describe('Pricing Formulas', () => {
    it('should calculate basic room pricing', async () => {
      const mockData = {
        // Room dimensions
        length: 12,
        width: 10,
        height: 9,

        // Rates
        labor_rate: 45,
        material_rate: 25,
        markup: 1.35,

        // Calculated areas (would be from other formulas)
        wall_area: 396, // (12+10)*2*9
        ceiling_area: 120, // 12*10
        total_area: 516,
      };

      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['total_area', 'labor_rate', 'material_rate', 'markup']);

      // Basic pricing formula: (area * labor_rate + area * material_rate) * markup
      const result = await formulaEngine.evaluate('total_price', '=(total_area*labor_rate + total_area*material_rate)*markup');

      expect(result.value).toBe(48762); // (516*45 + 516*25)*1.35
    });

    it('should apply condition-based pricing adjustments', async () => {
      const mockData = {
        base_price: 5000,
        condition: 'poor',
      };

      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['base_price', 'condition']);

      const result = await formulaEngine.evaluate('adjusted_price',
        '=IF(condition="poor",base_price*1.5,IF(condition="fair",base_price*1.25,base_price))');

      expect(result.value).toBe(7500); // poor condition = 1.5x multiplier
    });
  });

  describe('Complex Formulas', () => {
    it('should handle complex nested formulas', async () => {
      const complex = createComplexFormula();
      const mockData = {
        A1: 100, B1: 50, C1: 'StandardPaint', D1: 'Type1', E1: 5, F1: 0.15,
        PriceTable: { StandardPaint: { Type1: 25 } },
        HeaderRow: ['Type1', 'Type2', 'Type3']
      };

      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(complex.dependencies);

      const result = await formulaEngine.evaluate(complex.cellReference, complex.formula);

      expect(result.error).toBeNull();
      expect(typeof result.value).toBe('number');
    });

    it('should handle array formulas', async () => {
      const mockData = {
        A1: 10, A2: 20, A3: 30,
        B1: 2, B2: 3, B3: 4
      };

      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['A1:A3', 'B1:B3']);

      const result = await formulaEngine.evaluate('C1', '=SUM(A1:A3*B1:B3)');

      expect(result.value).toBe(200); // 10*2 + 20*3 + 30*4 = 20+60+120
    });
  });

  describe('Error Handling', () => {
    it('should handle division by zero', async () => {
      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue([]);

      const result = await formulaEngine.evaluate('A1', '=10/0');

      expect(result.error).toContain('#DIV/0!');
      expect(result.value).toBeNull();
    });

    it('should handle invalid cell references', async () => {
      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['XYZ999']);

      const result = await formulaEngine.evaluate('A1', '=XYZ999+5');

      expect(result.error).toContain('#REF!');
    });

    it('should handle circular references', async () => {
      mockValidator.validate.mockResolvedValue({
        isValid: false,
        errors: ['Circular reference detected: A1 -> B1 -> A1']
      });

      const result = await formulaEngine.evaluate('A1', '=B1+5');

      expect(result.error).toContain('Circular reference');
    });

    it('should handle invalid function names', async () => {
      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue([]);

      const result = await formulaEngine.evaluate('A1', '=INVALIDFUNCTION(5,10)');

      expect(result.error).toContain('Unknown function');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large numbers of formulas efficiently', async () => {
      const startTime = Date.now();
      const formulaCount = 1000;

      const mockData = {};
      for (let i = 1; i <= formulaCount; i++) {
        mockData[`A${i}`] = i;
      }

      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });

      const promises = [];
      for (let i = 1; i <= formulaCount; i++) {
        mockDependencyResolver.resolveDependencies.mockResolvedValue([`A${i}`]);
        promises.push(formulaEngine.evaluate(`B${i}`, `=A${i}*2`));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(formulaCount);
      expect(results.every(r => r.error === null)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should handle complex dependency chains', async () => {
      const mockData = { A1: 10 };
      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });

      // Create a chain: A1 -> B1 -> C1 -> D1 -> E1
      const formulas = [
        { cell: 'B1', formula: '=A1*2', deps: ['A1'] },
        { cell: 'C1', formula: '=B1+5', deps: ['B1'] },
        { cell: 'D1', formula: '=C1*1.5', deps: ['C1'] },
        { cell: 'E1', formula: '=D1-10', deps: ['D1'] },
      ];

      for (const f of formulas) {
        mockDependencyResolver.resolveDependencies.mockResolvedValue(f.deps);
        const result = await formulaEngine.evaluate(f.cell, f.formula);

        // Update data with result for next formula
        mockData[f.cell] = result.value;
        formulaEngine.setWorksheetData(mockData);
      }

      expect(mockData.E1).toBe(27.5); // ((10*2)+5)*1.5-10 = 27.5
    });
  });

  describe('Precision Tests', () => {
    it('should maintain precision with Decimal.js', async () => {
      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue([]);

      const result = await formulaEngine.evaluate('A1', '=0.1+0.2');

      expect(result.value).toBe(0.3); // Should be exact, not 0.30000000000000004
    });

    it('should handle large financial calculations', async () => {
      const mockData = {
        principal: 1000000,
        rate: 0.05,
        periods: 360
      };

      formulaEngine.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['principal', 'rate', 'periods']);

      // Simplified payment calculation
      const result = await formulaEngine.evaluate('payment', '=principal*rate*(1+rate)^periods/((1+rate)^periods-1)');

      expect(typeof result.value).toBe('number');
      expect(result.value).toBeCloseTo(5368.22, 2); // Approximate monthly payment
    });
  });

  describe('Formula Categories', () => {
    it('should handle all formula categories correctly', async () => {
      const categories = createFormulaCategories();

      for (const category of categories) {
        for (const formula of category.formulas) {
          mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
          mockDependencyResolver.resolveDependencies.mockResolvedValue(formula.dependencies);

          const result = await formulaEngine.evaluate(formula.cellReference, formula.formula);

          expect(result.error).toBeNull();
          expect(result.type).toMatch(/number|string|boolean/);
        }
      }
    });
  });

  describe('Caching', () => {
    it('should cache formula results when enabled', async () => {
      const formulaEngineWithCache = new FormulaEngine({
        dependencyResolver: mockDependencyResolver,
        validator: mockValidator,
        enableCache: true,
      });

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue([]);

      // First evaluation
      const result1 = await formulaEngineWithCache.evaluate('A1', '=5+3');

      // Second evaluation (should be cached)
      const result2 = await formulaEngineWithCache.evaluate('A1', '=5+3');

      expect(result1.value).toBe(8);
      expect(result2.value).toBe(8);
      expect(result2.cached).toBe(true);
    });

    it('should invalidate cache when dependencies change', async () => {
      const formulaEngineWithCache = new FormulaEngine({
        dependencyResolver: mockDependencyResolver,
        validator: mockValidator,
        enableCache: true,
      });

      const mockData = { A1: 10 };
      formulaEngineWithCache.setWorksheetData(mockData);

      mockValidator.validate.mockResolvedValue({ isValid: true, errors: [] });
      mockDependencyResolver.resolveDependencies.mockResolvedValue(['A1']);

      // First evaluation
      const result1 = await formulaEngineWithCache.evaluate('B1', '=A1*2');
      expect(result1.value).toBe(20);

      // Change dependency
      mockData.A1 = 15;
      formulaEngineWithCache.setWorksheetData(mockData);

      // Second evaluation (cache should be invalidated)
      const result2 = await formulaEngineWithCache.evaluate('B1', '=A1*2');
      expect(result2.value).toBe(30);
      expect(result2.cached).toBe(false);
    });
  });
});
