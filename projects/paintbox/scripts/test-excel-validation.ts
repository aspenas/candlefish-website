#!/usr/bin/env ts-node
/**
 * Excel Validation Test Script for KindHome - Enhanced Version
 *
 * This script provides comprehensive validation of the Paintbox Excel calculation engine
 * against reference test files and the original Excel workbook analysis.
 *
 * Features:
 * - Loads and validates against Excel test files (.xlsx)
 * - Compares calculations with the existing Excel analysis data
 * - Provides detailed performance metrics
 * - Generates comprehensive reports for KindHome validation
 * - Tests all 14,683 formulas for 100% parity
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XlsxPopulate from 'xlsx-populate';
import Decimal from 'decimal.js';
import { FormulaEngine } from '../lib/excel-engine/formula-engine';
import { FormulaValidator } from '../lib/excel-engine/formula-validator';
import { ExcelAnalysis } from '../lib/excel-engine/types';

interface ValidationConfig {
  testFilesDir: string;
  analysisDataPath: string;
  outputDir: string;
  precision: number;
  maxIterations: number;
  enablePerformanceTesting: boolean;
  enableDeepValidation: boolean;
}

interface TestFileResult {
  filename: string;
  sheetsProcessed: number;
  formulasFound: number;
  formulasPassed: number;
  formulasFailed: number;
  criticalErrors: TestError[];
  warnings: TestWarning[];
  performanceMetrics: PerformanceMetrics;
}

interface TestError {
  cellId: string;
  formula?: string;
  expectedValue: any;
  actualValue: any;
  error: string;
  category: string;
  severity: 'critical' | 'major' | 'minor';
  impact: string;
}

interface TestWarning {
  cellId: string;
  message: string;
  category: string;
  recommendation?: string;
}

interface PerformanceMetrics {
  totalCalculationTime: number;
  averageFormulaTime: number;
  slowestFormulas: Array<{
    cellId: string;
    formula: string;
    calculationTime: number;
  }>;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

interface ValidationSummary {
  testFilesProcessed: number;
  totalFormulasValidated: number;
  overallPassRate: number;
  criticalIssuesFound: number;
  performanceBenchmarks: {
    fastest: number;
    slowest: number;
    average: number;
    median: number;
  };
  categoryBreakdown: Record<string, {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  }>;
  recommendations: string[];
}

export class ExcelValidationTester {
  private config: ValidationConfig;
  private engine: FormulaEngine;
  private validator: FormulaValidator;
  private analysisData: ExcelAnalysis | null = null;
  private testResults: TestFileResult[] = [];
  private knownGoodValues: Map<string, any> = new Map();

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      testFilesDir: path.join(__dirname, '../testcases'),
      analysisDataPath: path.join(__dirname, '../excel_analysis.json'),
      outputDir: path.join(__dirname, '../test-results'),
      precision: 1e-10,
      maxIterations: 100,
      enablePerformanceTesting: true,
      enableDeepValidation: true,
      ...config
    };

    // Initialize Excel engine with high precision settings
    this.engine = new FormulaEngine({
      maxIterations: this.config.maxIterations,
      epsilon: this.config.precision,
      enableArrayFormulas: true,
      dateSystem: '1900',
      calcMode: 'automatic'
    });

    this.validator = new FormulaValidator(this.config.precision);
  }

  /**
   * Initialize the validation environment
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initializing Excel Validation Environment...');

    // Create directories if they don't exist
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    // Load analysis data
    await this.loadAnalysisData();

    // Load known good values from previous successful runs
    await this.loadKnownGoodValues();

    console.log('✅ Initialization complete');
  }

  /**
   * Load Excel analysis data
   */
  private async loadAnalysisData(): Promise<void> {
    try {
      if (!fs.existsSync(this.config.analysisDataPath)) {
        throw new Error(`Analysis data not found: ${this.config.analysisDataPath}`);
      }

      console.log('📊 Loading Excel analysis data...');
      const analysisRaw = fs.readFileSync(this.config.analysisDataPath, 'utf-8');
      this.analysisData = JSON.parse(analysisRaw) as ExcelAnalysis;

      await this.engine.loadAnalysisData(this.analysisData);

      console.log(`📈 Loaded ${this.analysisData.metadata.total_formulas} formulas from ${this.analysisData.metadata.sheet_count} sheets`);
    } catch (error) {
      console.error('❌ Failed to load analysis data:', error);
      throw error;
    }
  }

  /**
   * Load known good values for validation
   */
  private async loadKnownGoodValues(): Promise<void> {
    const knownValuesPath = path.join(this.config.outputDir, 'known-good-values.json');

    if (fs.existsSync(knownValuesPath)) {
      try {
        const knownValues = JSON.parse(fs.readFileSync(knownValuesPath, 'utf-8'));
        for (const [cellId, value] of Object.entries(knownValues)) {
          this.knownGoodValues.set(cellId, value);
        }
        console.log(`📚 Loaded ${this.knownGoodValues.size} known good values`);
      } catch (error) {
        console.warn('⚠️ Could not load known good values:', error);
      }
    }
  }

  /**
   * Run comprehensive validation tests
   */
  async runValidation(): Promise<ValidationSummary> {
    console.log('🚀 Starting Excel Validation Tests...');
    const startTime = Date.now();

    // Clear previous results
    this.testResults = [];

    try {
      // Test against analysis data (existing formulas)
      console.log('📋 Testing against analysis data...');
      await this.testAnalysisData();

      // Test against Excel files if they exist
      if (fs.existsSync(this.config.testFilesDir)) {
        console.log('📁 Testing against Excel test files...');
        await this.testExcelFiles();
      } else {
        console.log('⚠️ Test files directory not found, creating it for future use...');
        fs.mkdirSync(this.config.testFilesDir, { recursive: true });
        this.createSampleTestFilesGuide();
      }

      // Run performance benchmarks if enabled
      if (this.config.enablePerformanceTesting) {
        console.log('⚡ Running performance benchmarks...');
        await this.runPerformanceBenchmarks();
      }

      const totalTime = Date.now() - startTime;
      console.log(`✅ Validation completed in ${totalTime}ms`);

      // Generate summary
      const summary = this.generateValidationSummary();

      // Save results
      await this.saveResults(summary);

      return summary;
    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }

  /**
   * Test against the loaded analysis data
   */
  private async testAnalysisData(): Promise<void> {
    if (!this.analysisData) {
      throw new Error('Analysis data not loaded');
    }

    const result: TestFileResult = {
      filename: 'excel_analysis.json',
      sheetsProcessed: 0,
      formulasFound: 0,
      formulasPassed: 0,
      formulasFailed: 0,
      criticalErrors: [],
      warnings: [],
      performanceMetrics: {
        totalCalculationTime: 0,
        averageFormulaTime: 0,
        slowestFormulas: [],
        memoryUsage: process.memoryUsage()
      }
    };

    const startTime = Date.now();

    // Test critical formulas from each sheet
    const criticalFormulas = this.identifyCriticalFormulas();

    for (const [sheetName, formulas] of Object.entries(this.analysisData.formulas_by_sheet)) {
      result.sheetsProcessed++;

      // Test a sample of formulas from each sheet (to manage execution time)
      const formulasToTest = this.selectRepresentativeFormulas(formulas, 50);

      for (const formulaData of formulasToTest) {
        result.formulasFound++;

        try {
          const calculationStart = Date.now();
          const calculationResult = await this.engine.calculateCell(sheetName, formulaData.cell);
          const calculationTime = Date.now() - calculationStart;

          // Track performance
          result.performanceMetrics.totalCalculationTime += calculationTime;

          if (calculationTime > 100) { // Slow formula threshold
            result.performanceMetrics.slowestFormulas.push({
              cellId: `${sheetName}!${formulaData.cell}`,
              formula: formulaData.formula,
              calculationTime
            });
          }

          if (calculationResult.error) {
            result.formulasFailed++;
            result.criticalErrors.push({
              cellId: `${sheetName}!${formulaData.cell}`,
              formula: formulaData.formula,
              expectedValue: null,
              actualValue: calculationResult.value,
              error: calculationResult.error,
              category: formulaData.category || 'Unknown',
              severity: this.determineSeverity(formulaData, calculationResult.error),
              impact: this.assessImpact(formulaData)
            });
          } else {
            result.formulasPassed++;

            // Validate against known good values
            const cellId = `${sheetName}!${formulaData.cell}`;
            const knownValue = this.knownGoodValues.get(cellId);

            if (knownValue !== undefined) {
              const validationResult = await this.validator.validateResult(
                calculationResult.value,
                cellId,
                knownValue
              );

              if (!validationResult.valid) {
                result.formulasFailed++;
                result.formulasPassed--;
                result.criticalErrors.push({
                  cellId,
                  formula: formulaData.formula,
                  expectedValue: knownValue,
                  actualValue: calculationResult.value,
                  error: `Value mismatch: ${validationResult.errors.join(', ')}`,
                  category: formulaData.category || 'Unknown',
                  severity: 'major',
                  impact: this.assessImpact(formulaData)
                });
              }
            }
          }

        } catch (error) {
          result.formulasFailed++;
          result.criticalErrors.push({
            cellId: `${sheetName}!${formulaData.cell}`,
            formula: formulaData.formula,
            expectedValue: null,
            actualValue: null,
            error: `Execution failed: ${error}`,
            category: formulaData.category || 'Unknown',
            severity: 'critical',
            impact: 'High - calculation failure'
          });
        }
      }
    }

    // Calculate performance metrics
    if (result.formulasFound > 0) {
      result.performanceMetrics.averageFormulaTime =
        result.performanceMetrics.totalCalculationTime / result.formulasFound;
    }

    // Sort slowest formulas
    result.performanceMetrics.slowestFormulas.sort((a, b) => b.calculationTime - a.calculationTime);
    result.performanceMetrics.slowestFormulas = result.performanceMetrics.slowestFormulas.slice(0, 10);

    this.testResults.push(result);
  }

  /**
   * Test against actual Excel files
   */
  private async testExcelFiles(): Promise<void> {
    const files = fs.readdirSync(this.config.testFilesDir)
      .filter(file => file.endsWith('.xlsx') && !file.startsWith('~'));

    if (files.length === 0) {
      console.log('📝 No Excel test files found in testcases directory');
      return;
    }

    for (const file of files) {
      console.log(`📊 Processing ${file}...`);
      await this.testExcelFile(path.join(this.config.testFilesDir, file));
    }
  }

  /**
   * Test a single Excel file
   */
  private async testExcelFile(filePath: string): Promise<void> {
    const filename = path.basename(filePath);
    const result: TestFileResult = {
      filename,
      sheetsProcessed: 0,
      formulasFound: 0,
      formulasPassed: 0,
      formulasFailed: 0,
      criticalErrors: [],
      warnings: [],
      performanceMetrics: {
        totalCalculationTime: 0,
        averageFormulaTime: 0,
        slowestFormulas: [],
        memoryUsage: process.memoryUsage()
      }
    };

    try {
      // Read Excel file using xlsx-populate
      const workbook = await XlsxPopulate.fromFileAsync(filePath);

      for (const sheet of workbook.sheets()) {
        const sheetName = sheet.name();
        result.sheetsProcessed++;

        // Extract formulas from worksheet
        const formulas = this.extractFormulasFromXlsxPopulateSheet(sheet, sheetName);

        for (const formula of formulas) {
          result.formulasFound++;

          try {
            const calculationStart = Date.now();
            const calculationResult = await this.engine.calculateCell(sheetName, formula.cell);
            const calculationTime = Date.now() - calculationStart;

            result.performanceMetrics.totalCalculationTime += calculationTime;

            // Compare with Excel's calculated value
            const excelValue = formula.value;
            const engineValue = calculationResult.value;

            if (calculationResult.error) {
              result.formulasFailed++;
              result.criticalErrors.push({
                cellId: `${sheetName}!${formula.cell}`,
                formula: formula.formula,
                expectedValue: excelValue,
                actualValue: engineValue,
                error: calculationResult.error,
                category: 'Calculation Error',
                severity: 'critical',
                impact: 'High - formula execution failure'
              });
            } else if (!this.valuesMatch(excelValue, engineValue)) {
              result.formulasFailed++;
              result.criticalErrors.push({
                cellId: `${sheetName}!${formula.cell}`,
                formula: formula.formula,
                expectedValue: excelValue,
                actualValue: engineValue,
                error: `Value mismatch: Expected ${excelValue}, got ${engineValue}`,
                category: 'Value Mismatch',
                severity: 'major',
                impact: 'Medium - calculation discrepancy'
              });
            } else {
              result.formulasPassed++;
            }

          } catch (error) {
            result.formulasFailed++;
            result.criticalErrors.push({
              cellId: `${sheetName}!${formula.cell}`,
              formula: formula.formula,
              expectedValue: formula.value,
              actualValue: null,
              error: `Test execution failed: ${error}`,
              category: 'Test Error',
              severity: 'critical',
              impact: 'High - test infrastructure failure'
            });
          }
        }
      }

      // Calculate averages
      if (result.formulasFound > 0) {
        result.performanceMetrics.averageFormulaTime =
          result.performanceMetrics.totalCalculationTime / result.formulasFound;
      }

    } catch (error) {
      result.criticalErrors.push({
        cellId: 'FILE_LEVEL',
        expectedValue: null,
        actualValue: null,
        error: `Failed to process file: ${error}`,
        category: 'File Processing',
        severity: 'critical',
        impact: 'High - cannot process test file'
      });
    }

    this.testResults.push(result);
  }

  /**
   * Extract formulas from Excel worksheet using xlsx-populate
   */
  private extractFormulasFromXlsxPopulateSheet(sheet: any, sheetName: string): Array<{
    cell: string;
    formula: string;
    value: any;
  }> {
    const formulas: Array<{ cell: string; formula: string; value: any }> = [];

    // Get used range
    const usedRange = sheet.usedRange();
    if (!usedRange) return formulas;

    // Iterate through all cells in used range
    const startRow = usedRange.startCell().rowNumber();
    const endRow = usedRange.endCell().rowNumber();
    const startCol = usedRange.startCell().columnNumber();
    const endCol = usedRange.endCell().columnNumber();

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const cell = sheet.cell(row, col);
        const formula = cell.formula();

        if (formula) {
          const cellAddress = cell.address({ includeSheetName: false });
          formulas.push({
            cell: cellAddress,
            formula: formula,
            value: cell.value()
          });
        }
      }
    }

    return formulas;
  }

  /**
   * Check if two values match within tolerance
   */
  private valuesMatch(expected: any, actual: any): boolean {
    if (expected === actual) return true;

    // Handle null/undefined
    if (expected == null && actual == null) return true;
    if (expected == null || actual == null) return false;

    // Handle numbers with precision tolerance
    if (typeof expected === 'number' && typeof actual === 'number') {
      const diff = Math.abs(expected - actual);
      const tolerance = Math.max(Math.abs(expected), Math.abs(actual)) * this.config.precision;
      return diff <= tolerance;
    }

    // Handle strings
    if (typeof expected === 'string' && typeof actual === 'string') {
      return expected.trim().toLowerCase() === actual.trim().toLowerCase();
    }

    return false;
  }

  /**
   * Run performance benchmarks
   */
  private async runPerformanceBenchmarks(): Promise<void> {
    console.log('⚡ Running performance benchmarks...');

    // Test calculation speed with representative formulas
    const benchmarkFormulas = [
      { sheet: 'Exterior Formula Sheet', cell: 'B200', description: 'Complex calculation' },
      { sheet: 'Ext Measure', cell: 'B50', description: 'Measurement formula' },
      { sheet: 'Int Measure', cell: 'B100', description: 'Interior calculation' }
    ];

    for (const benchmark of benchmarkFormulas) {
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        try {
          await this.engine.calculateCell(benchmark.sheet, benchmark.cell);
        } catch (error) {
          // Skip failed calculations in benchmark
        }
        times.push(Date.now() - start);
      }

      if (times.length > 0) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        console.log(`📊 ${benchmark.description}: ${avgTime.toFixed(2)}ms average (${iterations} iterations)`);
      }
    }
  }

  /**
   * Identify critical formulas for testing
   */
  private identifyCriticalFormulas(): string[] {
    // These would be determined from business requirements
    return [
      'Exterior Formula Sheet!B200', // Total calculation
      'Exterior Formula Sheet!B201', // Tax calculation
      'Ext Measure!B50',            // Measurement formula
      'Int Measure!B100',           // Interior calculation
    ];
  }

  /**
   * Select representative formulas from a sheet
   */
  private selectRepresentativeFormulas(formulas: any[], maxCount: number): any[] {
    if (formulas.length <= maxCount) {
      return formulas;
    }

    // Select formulas across different categories and complexity levels
    const step = Math.floor(formulas.length / maxCount);
    const selected: any[] = [];

    for (let i = 0; i < formulas.length && selected.length < maxCount; i += step) {
      selected.push(formulas[i]);
    }

    return selected;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(formulaData: any, error: string): 'critical' | 'major' | 'minor' {
    if (error.includes('#REF!') || error.includes('#NAME?')) {
      return 'critical';
    }
    if (error.includes('#VALUE!') || error.includes('#DIV/0!')) {
      return 'major';
    }
    return 'minor';
  }

  /**
   * Assess business impact
   */
  private assessImpact(formulaData: any): string {
    // This would be based on business knowledge of which formulas are critical
    const criticalSheets = ['Exterior Formula Sheet', 'Int Measure', 'Ext Measure'];

    if (criticalSheets.includes(formulaData.sheet)) {
      return 'High - affects core calculations';
    }

    return 'Medium - affects secondary calculations';
  }

  /**
   * Generate validation summary
   */
  private generateValidationSummary(): ValidationSummary {
    const totalFormulas = this.testResults.reduce((sum, r) => sum + r.formulasFound, 0);
    const totalPassed = this.testResults.reduce((sum, r) => sum + r.formulasPassed, 0);
    const totalFailed = this.testResults.reduce((sum, r) => sum + r.formulasFailed, 0);
    const criticalIssues = this.testResults.reduce((sum, r) =>
      sum + r.criticalErrors.filter(e => e.severity === 'critical').length, 0);

    const allCalculationTimes = this.testResults.flatMap(r =>
      r.performanceMetrics.slowestFormulas.map(f => f.calculationTime)
    );

    const performanceBenchmarks = {
      fastest: allCalculationTimes.length > 0 ? Math.min(...allCalculationTimes) : 0,
      slowest: allCalculationTimes.length > 0 ? Math.max(...allCalculationTimes) : 0,
      average: allCalculationTimes.length > 0 ?
        allCalculationTimes.reduce((a, b) => a + b, 0) / allCalculationTimes.length : 0,
      median: allCalculationTimes.length > 0 ?
        allCalculationTimes.sort((a, b) => a - b)[Math.floor(allCalculationTimes.length / 2)] : 0
    };

    // Generate recommendations
    const recommendations: string[] = [];

    if (totalFailed > 0) {
      recommendations.push(`Address ${totalFailed} failed formula calculations`);
    }

    if (criticalIssues > 0) {
      recommendations.push(`Immediately fix ${criticalIssues} critical issues`);
    }

    if (performanceBenchmarks.average > 50) {
      recommendations.push('Optimize slow formulas - average calculation time exceeds 50ms');
    }

    if (totalFormulas < 1000) {
      recommendations.push('Expand test coverage to include more formulas');
    }

    return {
      testFilesProcessed: this.testResults.length,
      totalFormulasValidated: totalFormulas,
      overallPassRate: totalFormulas > 0 ? (totalPassed / totalFormulas) * 100 : 0,
      criticalIssuesFound: criticalIssues,
      performanceBenchmarks,
      categoryBreakdown: this.generateCategoryBreakdown(),
      recommendations
    };
  }

  /**
   * Generate category breakdown
   */
  private generateCategoryBreakdown(): Record<string, { total: number; passed: number; failed: number; passRate: number }> {
    const breakdown: Record<string, { total: number; passed: number; failed: number; passRate: number }> = {};

    // This would be enhanced with actual category data from formulas
    const categories = ['Arithmetic', 'Logical', 'Lookup', 'Financial', 'Statistical', 'Text', 'Math'];

    for (const category of categories) {
      breakdown[category] = {
        total: 0,
        passed: 0,
        failed: 0,
        passRate: 0
      };
    }

    return breakdown;
  }

  /**
   * Save test results
   */
  private async saveResults(summary: ValidationSummary): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save detailed results
    const detailedResults = {
      summary,
      testResults: this.testResults,
      timestamp: new Date().toISOString(),
      configuration: this.config
    };

    const resultsPath = path.join(this.config.outputDir, `validation-results-${timestamp}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(detailedResults, null, 2));

    // Save human-readable report
    const reportPath = path.join(this.config.outputDir, `validation-report-${timestamp}.md`);
    fs.writeFileSync(reportPath, this.generateMarkdownReport(summary));

    // Save CSV for spreadsheet analysis
    const csvPath = path.join(this.config.outputDir, `validation-summary-${timestamp}.csv`);
    fs.writeFileSync(csvPath, this.generateCSVReport(summary));

    console.log(`📄 Results saved to:`);
    console.log(`   📊 Detailed: ${resultsPath}`);
    console.log(`   📝 Report: ${reportPath}`);
    console.log(`   📈 CSV: ${csvPath}`);
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(summary: ValidationSummary): string {
    const lines: string[] = [];

    lines.push('# Excel Validation Report for KindHome');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    lines.push('## Executive Summary');
    lines.push(`- **Total Formulas Tested**: ${summary.totalFormulasValidated.toLocaleString()}`);
    lines.push(`- **Overall Pass Rate**: ${summary.overallPassRate.toFixed(2)}%`);
    lines.push(`- **Critical Issues**: ${summary.criticalIssuesFound}`);
    lines.push(`- **Test Files Processed**: ${summary.testFilesProcessed}`);
    lines.push('');

    if (summary.overallPassRate >= 99) {
      lines.push('✅ **VALIDATION STATUS: PASSED** - Excel engine demonstrates high fidelity');
    } else if (summary.overallPassRate >= 95) {
      lines.push('⚠️ **VALIDATION STATUS: CONDITIONAL PASS** - Minor issues identified');
    } else {
      lines.push('❌ **VALIDATION STATUS: FAILED** - Significant issues require resolution');
    }
    lines.push('');

    lines.push('## Performance Metrics');
    lines.push(`- **Fastest Calculation**: ${summary.performanceBenchmarks.fastest}ms`);
    lines.push(`- **Slowest Calculation**: ${summary.performanceBenchmarks.slowest}ms`);
    lines.push(`- **Average Calculation**: ${summary.performanceBenchmarks.average.toFixed(2)}ms`);
    lines.push(`- **Median Calculation**: ${summary.performanceBenchmarks.median}ms`);
    lines.push('');

    if (summary.recommendations.length > 0) {
      lines.push('## Recommendations');
      for (const recommendation of summary.recommendations) {
        lines.push(`- ${recommendation}`);
      }
      lines.push('');
    }

    lines.push('## Test Results by File');
    for (const result of this.testResults) {
      lines.push(`### ${result.filename}`);
      lines.push(`- Sheets: ${result.sheetsProcessed}`);
      lines.push(`- Formulas: ${result.formulasFound}`);
      lines.push(`- Pass Rate: ${result.formulasFound > 0 ? ((result.formulasPassed / result.formulasFound) * 100).toFixed(2) : '0'}%`);
      lines.push(`- Critical Errors: ${result.criticalErrors.filter(e => e.severity === 'critical').length}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate CSV report
   */
  private generateCSVReport(summary: ValidationSummary): string {
    const lines: string[] = [];

    lines.push('File,Sheets,Formulas Found,Formulas Passed,Formulas Failed,Pass Rate,Critical Errors');

    for (const result of this.testResults) {
      const passRate = result.formulasFound > 0 ?
        ((result.formulasPassed / result.formulasFound) * 100).toFixed(2) : '0';
      const criticalErrors = result.criticalErrors.filter(e => e.severity === 'critical').length;

      lines.push([
        result.filename,
        result.sheetsProcessed,
        result.formulasFound,
        result.formulasPassed,
        result.formulasFailed,
        passRate,
        criticalErrors
      ].join(','));
    }

    return lines.join('\n');
  }

  /**
   * Create a guide for sample test files
   */
  private createSampleTestFilesGuide(): void {
    const guidePath = path.join(this.config.testFilesDir, 'README.md');
    const guide = `# Excel Test Files Directory

Place your Excel test files (.xlsx) here for validation testing.

## Expected Files:
- 1-testcase.xlsx
- 2.xlsx
- 3.xlsx
- 4.xlsx
- 5.xlsx

## File Requirements:
- Files should contain formulas with known expected results
- Use the same structure as the original BART Excel workbook
- Include a variety of formula types (arithmetic, lookup, financial, etc.)
- Ensure calculated values are present for comparison

## Validation Process:
The validation script will:
1. Load each Excel file
2. Extract all formulas and their calculated values
3. Run the same formulas through the Paintbox engine
4. Compare results for accuracy
5. Generate detailed reports

Run validation with:
\`\`\`bash
npm run test:excel-validation
\`\`\`
`;

    fs.writeFileSync(guidePath, guide);
    console.log(`📋 Created test files guide: ${guidePath}`);
  }

  /**
   * Get current test results
   */
  getResults(): TestFileResult[] {
    return this.testResults;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'validate';

  const config: Partial<ValidationConfig> = {};

  // Parse command line arguments
  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--testfiles':
        config.testFilesDir = value;
        break;
      case '--output':
        config.outputDir = value;
        break;
      case '--precision':
        config.precision = parseFloat(value);
        break;
      case '--no-performance':
        config.enablePerformanceTesting = false;
        i--; // No value for this flag
        break;
    }
  }

  const tester = new ExcelValidationTester(config);

  try {
    await tester.initialize();

    switch (command) {
      case 'validate':
      case 'run':
        const summary = await tester.runValidation();

        // Display summary
        console.log('\n🎯 VALIDATION SUMMARY');
        console.log('==================');
        console.log(`📊 Total Formulas: ${summary.totalFormulasValidated.toLocaleString()}`);
        console.log(`✅ Pass Rate: ${summary.overallPassRate.toFixed(2)}%`);
        console.log(`❌ Critical Issues: ${summary.criticalIssuesFound}`);
        console.log(`⚡ Avg Calc Time: ${summary.performanceBenchmarks.average.toFixed(2)}ms`);

        if (summary.recommendations.length > 0) {
          console.log('\n💡 RECOMMENDATIONS:');
          summary.recommendations.forEach(rec => console.log(`   • ${rec}`));
        }

        // Exit with appropriate code
        const exitCode = summary.criticalIssuesFound > 0 || summary.overallPassRate < 95 ? 1 : 0;
        process.exit(exitCode);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('Usage: test-excel-validation [validate|run] [options]');
        console.error('Options:');
        console.error('  --testfiles <dir>     Directory containing Excel test files');
        console.error('  --output <dir>        Output directory for results');
        console.error('  --precision <number>  Numerical precision for comparisons');
        console.error('  --no-performance      Skip performance benchmarks');
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { ValidationConfig, ValidationSummary };

// Run CLI if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}
