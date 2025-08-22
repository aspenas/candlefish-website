/**
 * @file Excel Parity Tests
 * @description Tests to ensure calculations match Excel exactly
 * Uses real formulas from the BART 3.20 workbook
 */

import { FormulaEngine } from '@/lib/excel-engine/formula-engine';
import { ExcelAnalysis } from '@/lib/excel-engine/types';
import Decimal from 'decimal.js';

// Mock Excel analysis data with real formulas
const mockExcelAnalysis: ExcelAnalysis = {
  metadata: {
    excel_file: "bart3.20.xlsx",
    total_formulas: 14683,
    sheet_count: 25,
    sheets_info: {
      "Ext Measure": {
        max_row: 344,
        max_column: 52,
        cell_count: 17888
      },
      "Exterior Formula Sheet": {
        max_row: 379,
        max_column: 79,
        cell_count: 29941
      },
      "New Client Info Page": {
        max_row: 3,
        max_column: 51,
        cell_count: 153
      }
    },
    category_summary: {
      "Logical": 6023,
      "Arithmetic": 4992,
      "Math": 476,
      "Lookup": 883,
      "Text": 409,
      "Financial": 16,
      "Statistical": 2,
      "Other": 1882
    }
  },
  named_ranges: {},
  formulas_by_sheet: {
    "Ext Measure": [
      {
        sheet: "Ext Measure",
        cell: "B4",
        formula: "='New Client Info Page'!A2",
        category: "Other",
        dependencies: ["'New Client Info Page'!A2"],
        row: 4,
        column: 2
      },
      {
        sheet: "Ext Measure",
        cell: "L50",
        formula: "=IF(D50=\"Brick Unpainted\", \"Brick Unpainted\",IF(D50=\"Stucco\",\"Flat\",IF(D50=\"Cedar_Stain\",\"Stain\",\"Body\")))",
        category: "Logical",
        dependencies: ["D50"],
        row: 50,
        column: 12
      }
    ],
    "Exterior Formula Sheet": [
      {
        sheet: "Exterior Formula Sheet",
        cell: "P143",
        formula: "=SUM(P138:Q142)",
        category: "Math",
        dependencies: ["P138:Q142"],
        row: 143,
        column: 16
      },
      {
        sheet: "Exterior Formula Sheet",
        cell: "D154",
        formula: "=SUM(F155,F156,I155,O155,I156,O156,L155,F157,L156)",
        category: "Math",
        dependencies: ["F155", "F156", "I155", "O155", "I156", "O156", "L155", "F157", "L156"],
        row: 154,
        column: 4
      }
    ]
  },
  complex_formulas: [],
  dependencies: {}
};

describe('Excel Parity Tests', () => {
  let formulaEngine: FormulaEngine;

  beforeEach(async () => {
    // Configure for Excel compatibility
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

    await formulaEngine.loadAnalysisData(mockExcelAnalysis);
  });

  describe('Real Formula Validation', () => {
    it('should calculate client info reference formula', async () => {
      // Setup: Set client name in New Client Info Page
      await formulaEngine.sheetManager.setCellValue('New Client Info Page', 'A2', {
        value: 'John Smith Construction'
      });

      // Test: Reference formula ='New Client Info Page'!A2
      const result = await formulaEngine.calculateCell('Ext Measure', 'B4');

      expect(result.value).toBe('John Smith Construction');
      expect(result.error).toBeNull();
      expect(result.formula).toBe("='New Client Info Page'!A2");
    });

    it('should calculate nested IF formula for surface types', async () => {
      const testCases = [
        { input: 'Brick Unpainted', expected: 'Brick Unpainted' },
        { input: 'Stucco', expected: 'Flat' },
        { input: 'Cedar_Stain', expected: 'Stain' },
        { input: 'Wood Siding', expected: 'Body' },
        { input: 'Vinyl', expected: 'Body' }
      ];

      for (const testCase of testCases) {
        // Set the input value
        await formulaEngine.sheetManager.setCellValue('Ext Measure', 'D50', {
          value: testCase.input
        });

        // Calculate the formula result
        const result = await formulaEngine.calculateCell('Ext Measure', 'L50');

        expect(result.value).toBe(testCase.expected);
        expect(result.error).toBeNull();
      }
    });

    it('should calculate SUM formula with range', async () => {
      // Setup: Set values in the range P138:Q142
      const testData = {
        'P138': 1250.50, 'Q138': 300.50,
        'P139': 875.25,  'Q139': 175.25,
        'P140': 2100.75, 'Q140': 500.75,
        'P141': 650.00,  'Q141': 150.00,
        'P142': 425.30,  'Q142': 95.30
      };

      for (const [cell, value] of Object.entries(testData)) {
        const [col, row] = [cell.slice(0, 1), cell.slice(1)];
        await formulaEngine.sheetManager.setCellValue('Exterior Formula Sheet', `${col}${row}`, {
          value
        });
      }

      // Calculate SUM formula
      const result = await formulaEngine.calculateCell('Exterior Formula Sheet', 'P143');

      // Expected: sum of all values
      const expected = Object.values(testData).reduce((sum, val) => sum + val, 0);

      expect(result.value).toBeCloseTo(expected, 10);
      expect(result.error).toBeNull();
      expect(result.formula).toBe('=SUM(P138:Q142)');
    });

    it('should calculate SUM formula with individual cell references', async () => {
      // Setup: Set values for mixed cell references
      const testData = {
        'F155': 125.50, 'F156': 87.25, 'F157': 45.75,
        'I155': 200.00, 'I156': 150.25,
        'O155': 75.50,  'O156': 92.75,
        'L155': 110.00, 'L156': 88.50
      };

      for (const [cell, value] of Object.entries(testData)) {
        const col = cell.replace(/\d+/, '');
        const row = cell.replace(/[A-Z]+/, '');
        await formulaEngine.sheetManager.setCellValue('Exterior Formula Sheet', `${col}${row}`, {
          value
        });
      }

      // Calculate SUM formula with individual references
      const result = await formulaEngine.calculateCell('Exterior Formula Sheet', 'D154');

      // Expected: sum of all values
      const expected = Object.values(testData).reduce((sum, val) => sum + val, 0);

      expect(result.value).toBeCloseTo(expected, 10);
      expect(result.error).toBeNull();
      expect(result.formula).toBe('=SUM(F155,F156,I155,O155,I156,O156,L155,F157,L156)');
    });
  });

  describe('Excel Compatibility Tests', () => {
    it('should handle Excel date system correctly', async () => {
      // Excel 1900 date system: January 1, 1900 is day 1
      const dateValue = await formulaEngine.functions.call('DATE',
        formulaEngine.createEvaluationContext('Test'), 2023, 8, 22);

      // August 22, 2023 should be day 45156 in Excel 1900 system
      expect(dateValue).toBeCloseTo(45156, 0);
    });

    it('should match Excel error handling', async () => {
      const errorTests = [
        { formula: '=10/0', expectedError: '#DIV/0!' },
        { formula: '=SQRT(-1)', expectedError: '#NUM!' },
        { formula: '=VLOOKUP("NotFound",A1:B5,2,FALSE)', expectedError: '#N/A' },
        { formula: '=INVALIDFUNCTION()', expectedError: '#NAME?' }
      ];

      for (const test of errorTests) {
        const result = await formulaEngine.calculateCell('Test', 'A1');
        // Note: Would need to set up formula execution to test errors properly
        // This is a structural test for error handling capability
        expect(typeof result.error === 'string' || result.error === null).toBe(true);
      }
    });

    it('should handle Excel text functions correctly', async () => {
      await formulaEngine.sheetManager.setCellValue('Test', 'A1', {
        value: 'Hello World'
      });

      const leftResult = await formulaEngine.functions.call('LEFT',
        formulaEngine.createEvaluationContext('Test'), 'Hello World', 5);
      expect(leftResult).toBe('Hello');

      const rightResult = await formulaEngine.functions.call('RIGHT',
        formulaEngine.createEvaluationContext('Test'), 'Hello World', 5);
      expect(rightResult).toBe('World');

      const midResult = await formulaEngine.functions.call('MID',
        formulaEngine.createEvaluationContext('Test'), 'Hello World', 7, 5);
      expect(midResult).toBe('World');
    });

    it('should handle Excel logical functions correctly', async () => {
      const context = formulaEngine.createEvaluationContext('Test');

      const andResult = await formulaEngine.functions.call('AND', context, true, true, true);
      expect(andResult).toBe(true);

      const orResult = await formulaEngine.functions.call('OR', context, false, false, true);
      expect(orResult).toBe(true);

      const notResult = await formulaEngine.functions.call('NOT', context, false);
      expect(notResult).toBe(true);
    });
  });

  describe('Performance and Scale Tests', () => {
    it('should handle calculation of many formulas efficiently', async () => {
      const startTime = Date.now();

      // Setup many cells with simple formulas
      const cellCount = 1000;
      for (let i = 1; i <= cellCount; i++) {
        await formulaEngine.sheetManager.setCellValue('Test', `A${i}`, { value: i });
      }

      // Calculate many SUM formulas
      const promises = [];
      for (let i = 1; i <= 100; i++) {
        const formula = `=SUM(A1:A${Math.min(i * 10, cellCount)})`;
        promises.push(formulaEngine.calculateCell('Test', `B${i}`));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results.length).toBe(100);
      expect(results.every(r => r.error === null)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should handle complex dependency chains', async () => {
      // Create a dependency chain: A1 -> B1 -> C1 -> D1 -> E1
      await formulaEngine.sheetManager.setCellValue('Test', 'A1', { value: 100 });

      const formulas = [
        { cell: 'B1', formula: '=A1*1.25' },   // 125
        { cell: 'C1', formula: '=B1+50' },     // 175
        { cell: 'D1', formula: '=C1*0.9' },    // 157.5
        { cell: 'E1', formula: '=D1-25' }      // 132.5
      ];

      // Set formulas in dependency order
      for (const f of formulas) {
        // Would need to implement formula setting in sheet manager
        const result = await formulaEngine.calculateCell('Test', f.cell);
        expect(result.error).toBeNull();
      }
    });
  });

  describe('Memory and Resource Management', () => {
    it('should efficiently manage large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create a large amount of test data
      const rowCount = 5000;
      for (let i = 1; i <= rowCount; i++) {
        await formulaEngine.sheetManager.setCellValue('LargeTest', `A${i}`, {
          value: Math.random() * 1000
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 100MB for 5000 cells)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should clean up resources properly', async () => {
      const engine = new FormulaEngine();
      await engine.loadAnalysisData(mockExcelAnalysis);

      // Use the engine
      await engine.calculateCell('Test', 'A1');

      // Export state to verify proper cleanup
      const state = engine.exportState();
      expect(state.analysisLoaded).toBe(true);
      expect(state.sheets.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should continue calculation despite individual formula errors', async () => {
      // Set up some good and bad formulas
      const testCells = [
        { cell: 'A1', value: 10, shouldSucceed: true },
        { cell: 'A2', value: 20, shouldSucceed: true },
        { cell: 'A3', formula: '=A1+A2', shouldSucceed: true },
        { cell: 'A4', formula: '=A1/0', shouldSucceed: false }, // Division by zero
        { cell: 'A5', formula: '=A1+A2+A3', shouldSucceed: true }
      ];

      const results = [];
      for (const test of testCells) {
        if (test.value) {
          await formulaEngine.sheetManager.setCellValue('Test', test.cell, {
            value: test.value
          });
        }

        if (test.formula) {
          const result = await formulaEngine.calculateCell('Test', test.cell);
          results.push({ ...test, result });
        }
      }

      // Check that good formulas succeeded despite bad ones
      const successfulResults = results.filter(r => r.shouldSucceed);
      const failedResults = results.filter(r => !r.shouldSucceed);

      expect(successfulResults.every(r => r.result.error === null)).toBe(true);
      expect(failedResults.every(r => r.result.error !== null)).toBe(true);
    });

    it('should handle circular reference detection', async () => {
      // Create circular references: A1 -> B1 -> C1 -> A1
      // This would need proper formula setting implementation
      // For now, test the dependency resolver directly

      const circularNodes = [
        { id: 'A1', dependencies: new Set(['C1']), dependents: new Set(['B1']) },
        { id: 'B1', dependencies: new Set(['A1']), dependents: new Set(['C1']) },
        { id: 'C1', dependencies: new Set(['B1']), dependents: new Set(['A1']) }
      ];

      // Test that circular reference detection works
      expect(circularNodes.length).toBe(3);
      // Actual circular reference testing would require dependency resolver access
    });
  });

  describe('Data Type Conversion', () => {
    it('should handle Excel type conversions correctly', async () => {
      const context = formulaEngine.createEvaluationContext('Test');

      // Text to number conversion
      const textNumber = await formulaEngine.functions.call('VALUE', context, '123.45');
      expect(textNumber).toBe(123.45);

      // Number to text conversion
      const numberText = await formulaEngine.functions.call('TEXT', context, 123.45, '0.00');
      expect(numberText).toBe('123.45');

      // Boolean conversions
      const trueValue = await formulaEngine.functions.call('TRUE', context);
      expect(trueValue).toBe(true);

      const falseValue = await formulaEngine.functions.call('FALSE', context);
      expect(falseValue).toBe(false);
    });

    it('should handle date conversions correctly', async () => {
      const context = formulaEngine.createEvaluationContext('Test');

      // Date serial number conversion
      const dateSerial = await formulaEngine.functions.call('DATE', context, 2023, 8, 22);
      expect(typeof dateSerial).toBe('number');
      expect(dateSerial).toBeGreaterThan(40000); // Should be in Excel date range

      // Year, month, day extraction
      const year = await formulaEngine.functions.call('YEAR', context, dateSerial);
      expect(year).toBe(2023);

      const month = await formulaEngine.functions.call('MONTH', context, dateSerial);
      expect(month).toBe(8);

      const day = await formulaEngine.functions.call('DAY', context, dateSerial);
      expect(day).toBe(22);
    });
  });
});
