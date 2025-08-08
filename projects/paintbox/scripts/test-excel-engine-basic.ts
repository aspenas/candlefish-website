#!/usr/bin/env tsx
/**
 * Basic Excel Engine Test
 * Tests core functionality of the Excel formula engine with simple formulas
 */

import { FormulaEngine } from '../lib/excel-engine/formula-engine';
import { FormulaParser } from '../lib/excel-engine/formula-parser';
import { ExcelFunctions } from '../lib/excel-engine/excel-functions';
import { DependencyResolver } from '../lib/excel-engine/dependency-resolver';
import { SheetManager } from '../lib/excel-engine/sheet-manager';
import { FormulaValidator } from '../lib/excel-engine/formula-validator';

interface BasicTestResult {
  testName: string;
  success: boolean;
  error?: string;
  result?: any;
  expectedResult?: any;
}

async function testBasicComponents(): Promise<void> {
  console.log('🧪 Testing Basic Excel Engine Components\n');

  const results: BasicTestResult[] = [];

  // Test 1: SheetManager
  console.log('1️⃣ Testing SheetManager...');
  try {
    const sheetManager = new SheetManager();

    // Create a test sheet
    await sheetManager.createSheet('TestSheet');

    // Set some values
    await sheetManager.setCellValue('TestSheet', 'A1', { value: 10 });
    await sheetManager.setCellValue('TestSheet', 'A2', { value: 20 });
    await sheetManager.setCellValue('TestSheet', 'B1', { value: 5 });

    // Get values
    const a1Value = await sheetManager.getCellValue('TestSheet', 'A1');
    const a2Value = await sheetManager.getCellValue('TestSheet', 'A2');

    if (a1Value?.value === 10 && a2Value?.value === 20) {
      results.push({ testName: 'SheetManager Basic Operations', success: true });
      console.log('✅ SheetManager working correctly');
    } else {
      results.push({ testName: 'SheetManager Basic Operations', success: false, error: 'Value mismatch' });
      console.log('❌ SheetManager failed');
    }
  } catch (error) {
    results.push({ testName: 'SheetManager Basic Operations', success: false, error: String(error) });
    console.log('❌ SheetManager error:', error);
  }

  // Test 2: Formula Parser
  console.log('\n2️⃣ Testing FormulaParser...');
  try {
    const parser = new FormulaParser();

    // Test simple formulas
    const testFormulas = [
      { formula: '=10+5', expected: 'formula' },
      { formula: '=A1+B1', expected: 'formula' },
      { formula: '=SUM(A1:A10)', expected: 'formula' },
      { formula: '42', expected: 'value' },
      { formula: '"Hello"', expected: 'value' }
    ];

    let parserSuccess = true;

    for (const test of testFormulas) {
      const result = await parser.parse(test.formula, 'TestSheet');
      if (result.type !== test.expected) {
        parserSuccess = false;
        console.log(`❌ Formula "${test.formula}" - expected ${test.expected}, got ${result.type}`);
      }
    }

    if (parserSuccess) {
      results.push({ testName: 'FormulaParser Basic Parsing', success: true });
      console.log('✅ FormulaParser working correctly');
    } else {
      results.push({ testName: 'FormulaParser Basic Parsing', success: false, error: 'Parsing type mismatch' });
    }
  } catch (error) {
    results.push({ testName: 'FormulaParser Basic Parsing', success: false, error: String(error) });
    console.log('❌ FormulaParser error:', error);
  }

  // Test 3: Excel Functions
  console.log('\n3️⃣ Testing ExcelFunctions...');
  try {
    const functions = new ExcelFunctions();
    const context = {
      currentSheet: 'TestSheet',
      sheets: new Map(),
      namedRanges: new Map(),
      iteration: 0,
      maxIterations: 100,
      epsilon: 1e-10
    };

    // Test basic math functions
    const sumResult = await functions.call('SUM', context, [1, 2, 3, 4, 5]);
    const avgResult = await functions.call('AVERAGE', context, [10, 20, 30]);
    const ifResult = await functions.call('IF', context, true, 'Yes', 'No');
    const roundResult = await functions.call('ROUND', context, 3.14159, 2);

    if (sumResult.toString() === '15' &&
        avgResult.toString() === '20' &&
        ifResult === 'Yes' &&
        roundResult.toString() === '3.14') {
      results.push({ testName: 'ExcelFunctions Basic Operations', success: true });
      console.log('✅ ExcelFunctions working correctly');
      console.log(`   SUM([1,2,3,4,5]) = ${sumResult}`);
      console.log(`   AVERAGE([10,20,30]) = ${avgResult}`);
      console.log(`   IF(TRUE, "Yes", "No") = ${ifResult}`);
      console.log(`   ROUND(3.14159, 2) = ${roundResult}`);
    } else {
      results.push({ testName: 'ExcelFunctions Basic Operations', success: false, error: 'Function result mismatch' });
      console.log('❌ ExcelFunctions failed');
    }
  } catch (error) {
    results.push({ testName: 'ExcelFunctions Basic Operations', success: false, error: String(error) });
    console.log('❌ ExcelFunctions error:', error);
  }

  // Test 4: Dependency Resolver
  console.log('\n4️⃣ Testing DependencyResolver...');
  try {
    const resolver = new DependencyResolver();

    // Create test nodes
    resolver.addNode({
      id: 'A1',
      formula: '=10',
      dependencies: new Set(),
      dependents: new Set(),
      dirty: true
    });

    resolver.addNode({
      id: 'A2',
      formula: '=A1+5',
      dependencies: new Set(['A1']),
      dependents: new Set(),
      dirty: true
    });

    resolver.addNode({
      id: 'A3',
      formula: '=A1*A2',
      dependencies: new Set(['A1', 'A2']),
      dependents: new Set(),
      dirty: true
    });

    resolver.buildGraph();
    const order = resolver.getCalculationOrder();

    // A1 should be first, then A2, then A3
    if (order[0] === 'A1' && order[1] === 'A2' && order[2] === 'A3') {
      results.push({ testName: 'DependencyResolver Calculation Order', success: true });
      console.log('✅ DependencyResolver working correctly');
      console.log(`   Calculation order: ${order.join(' → ')}`);
    } else {
      results.push({ testName: 'DependencyResolver Calculation Order', success: false, error: 'Wrong calculation order' });
      console.log('❌ DependencyResolver failed - wrong order:', order);
    }
  } catch (error) {
    results.push({ testName: 'DependencyResolver Calculation Order', success: false, error: String(error) });
    console.log('❌ DependencyResolver error:', error);
  }

  // Test 5: Formula Validator
  console.log('\n5️⃣ Testing FormulaValidator...');
  try {
    const validator = new FormulaValidator();

    // Test validation
    const validResult = await validator.validateResult(42, 'A1', 42);
    const invalidResult = await validator.validateResult(42, 'A1', 24);

    if (validResult.valid && !invalidResult.valid) {
      results.push({ testName: 'FormulaValidator Basic Validation', success: true });
      console.log('✅ FormulaValidator working correctly');
    } else {
      results.push({ testName: 'FormulaValidator Basic Validation', success: false, error: 'Validation logic failed' });
      console.log('❌ FormulaValidator failed');
    }
  } catch (error) {
    results.push({ testName: 'FormulaValidator Basic Validation', success: false, error: String(error) });
    console.log('❌ FormulaValidator error:', error);
  }

  // Test 6: Complete FormulaEngine Integration
  console.log('\n6️⃣ Testing Complete FormulaEngine...');
  try {
    const engine = new FormulaEngine();

    // Create sample analysis data
    const sampleAnalysis = {
      metadata: {
        excel_file: 'test.xlsx',
        total_formulas: 3,
        sheet_count: 1,
        sheets_info: {
          'TestSheet': {
            max_row: 10,
            max_column: 10,
            cell_count: 100
          }
        },
        category_summary: {
          'Math': 2,
          'Other': 1
        }
      },
      named_ranges: {},
      formulas_by_sheet: {
        'TestSheet': [
          {
            sheet: 'TestSheet',
            cell: 'A1',
            formula: '=10',
            category: 'Other',
            dependencies: [],
            row: 1,
            column: 1
          },
          {
            sheet: 'TestSheet',
            cell: 'A2',
            formula: '=A1+5',
            category: 'Math',
            dependencies: ['TestSheet!A1'],
            row: 2,
            column: 1
          },
          {
            sheet: 'TestSheet',
            cell: 'A3',
            formula: '=SUM(A1:A2)',
            category: 'Math',
            dependencies: ['TestSheet!A1', 'TestSheet!A2'],
            row: 3,
            column: 1
          }
        ]
      },
      complex_formulas: [],
      dependencies: {}
    };

    await engine.loadAnalysisData(sampleAnalysis);

    // Test calculation
    const a1Result = await engine.calculateCell('TestSheet', 'A1');
    const a2Result = await engine.calculateCell('TestSheet', 'A2');

    if (a1Result.value == 10 && a2Result.value == 15) {
      results.push({ testName: 'Complete FormulaEngine Integration', success: true });
      console.log('✅ Complete FormulaEngine working correctly');
      console.log(`   A1 = ${a1Result.value}`);
      console.log(`   A2 = ${a2Result.value}`);
    } else {
      results.push({
        testName: 'Complete FormulaEngine Integration',
        success: false,
        error: `Expected A1=10, A2=15, got A1=${a1Result.value}, A2=${a2Result.value}`
      });
      console.log('❌ Complete FormulaEngine failed');
    }
  } catch (error) {
    results.push({ testName: 'Complete FormulaEngine Integration', success: false, error: String(error) });
    console.log('❌ Complete FormulaEngine error:', error);
  }

  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('=' + '='.repeat(49));

  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
  console.log(`Success Rate: ${(passedTests/totalTests*100).toFixed(1)}%`);
  console.log('');

  if (failedTests > 0) {
    console.log('❌ FAILED TESTS:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   • ${result.testName}: ${result.error}`);
    });
    console.log('');
  }

  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Excel engine components are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please fix the issues before proceeding to integration tests.');
  }
}

async function main(): Promise<void> {
  try {
    await testBasicComponents();
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

export { testBasicComponents };
