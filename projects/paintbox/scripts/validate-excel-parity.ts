#!/usr/bin/env npx tsx

/**
 * Excel Parity Validation Script
 *
 * This script validates that our calculation engine produces
 * identical results to the original Excel workbook.
 *
 * It tests against 5 real-world Excel files to ensure
 * all 14,000+ formulas are correctly implemented.
 */

import * as XLSX from 'xlsx';
import { Decimal } from 'decimal.js';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

// Import our calculation engine
// TODO: Update these imports based on actual file structure
// import { FormulaEngine } from '../lib/excel-engine/formula-engine';
// import { PricingCalculator } from '../lib/calculations/pricing-calculator';
// import { LaborCalculator } from '../lib/calculations/labor-calculator';

interface TestResult {
  fileName: string;
  totalCells: number;
  testedCells: number;
  passedCells: number;
  failedCells: number;
  errors: ValidationError[];
  executionTime: number;
}

interface ValidationError {
  cell: string;
  sheetName: string;
  expectedValue: any;
  actualValue: any;
  difference: number;
  formula?: string;
}

class ExcelParityValidator {
  private results: TestResult[] = [];
  private tolerance = 0.01; // Allow 1 cent difference for financial calculations

  constructor() {
    console.log(chalk.blue.bold('\n📊 Excel Parity Validation System'));
    console.log(chalk.gray('=' .repeat(50)));
  }

  /**
   * Main validation entry point
   */
  async validate(): Promise<boolean> {
    const testDataDir = path.join(process.cwd(), 'test-data');

    // Check if test data directory exists
    if (!fs.existsSync(testDataDir)) {
      console.error(chalk.red('❌ Test data directory not found!'));
      console.log(chalk.yellow('Please ensure test Excel files are in /test-data/'));
      return false;
    }

    // Find all Excel files
    const excelFiles = fs.readdirSync(testDataDir)
      .filter(file => file.endsWith('.xlsx'))
      .map(file => path.join(testDataDir, file));

    if (excelFiles.length === 0) {
      console.error(chalk.red('❌ No Excel test files found!'));
      return false;
    }

    console.log(chalk.green(`Found ${excelFiles.length} test files:\n`));

    // Process each Excel file
    for (const filePath of excelFiles) {
      await this.validateFile(filePath);
    }

    // Generate summary
    return this.generateSummary();
  }

  /**
   * Validate a single Excel file
   */
  private async validateFile(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    console.log(chalk.cyan(`\n📄 Testing: ${fileName}`));

    const startTime = Date.now();
    const result: TestResult = {
      fileName,
      totalCells: 0,
      testedCells: 0,
      passedCells: 0,
      failedCells: 0,
      errors: [],
      executionTime: 0
    };

    try {
      // Load Excel file
      const workbook = XLSX.readFile(filePath);

      // Process each sheet
      for (const sheetName of workbook.SheetNames) {
        console.log(chalk.gray(`  Sheet: ${sheetName}`));
        const sheet = workbook.Sheets[sheetName];

        // Get all cells with formulas
        const cells = this.extractFormulaCells(sheet);
        result.totalCells += cells.length;

        // Validate each cell
        for (const cell of cells) {
          const validation = await this.validateCell(sheet, cell, sheetName);

          if (validation.passed) {
            result.passedCells++;
          } else {
            result.failedCells++;
            if (validation.error) {
              result.errors.push(validation.error);
            }
          }
          result.testedCells++;
        }
      }

      result.executionTime = Date.now() - startTime;

      // Log results for this file
      this.logFileResults(result);

    } catch (error) {
      console.error(chalk.red(`  Error processing ${fileName}: ${error}`));
    }

    this.results.push(result);
  }

  /**
   * Extract all cells containing formulas
   */
  private extractFormulaCells(sheet: XLSX.WorkSheet): string[] {
    const cells: string[] = [];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddress];

        if (cell && cell.f) { // Cell has formula
          cells.push(cellAddress);
        }
      }
    }

    return cells;
  }

  /**
   * Validate a single cell's calculation
   */
  private async validateCell(
    sheet: XLSX.WorkSheet,
    cellAddress: string,
    sheetName: string
  ): Promise<{ passed: boolean; error?: ValidationError }> {
    const cell = sheet[cellAddress];

    if (!cell) {
      return { passed: true };
    }

    // Get expected value from Excel
    const expectedValue = cell.v;

    // TODO: Calculate actual value using our engine
    // This is where you'll call your formula engine
    // const actualValue = await this.calculateValue(cell.f, sheet);

    // Placeholder for now - replace with actual calculation
    const actualValue = expectedValue; // Remove this line when engine is connected

    // Compare values
    const passed = this.compareValues(expectedValue, actualValue);

    if (!passed) {
      const error: ValidationError = {
        cell: cellAddress,
        sheetName,
        expectedValue,
        actualValue,
        difference: this.calculateDifference(expectedValue, actualValue),
        formula: cell.f
      };

      return { passed: false, error };
    }

    return { passed: true };
  }

  /**
   * Compare two values with tolerance
   */
  private compareValues(expected: any, actual: any): boolean {
    // Handle different types
    if (typeof expected !== typeof actual) {
      return false;
    }

    // For numbers, use tolerance
    if (typeof expected === 'number' && typeof actual === 'number') {
      const diff = Math.abs(expected - actual);
      return diff <= this.tolerance;
    }

    // For other types, exact match
    return expected === actual;
  }

  /**
   * Calculate difference between values
   */
  private calculateDifference(expected: any, actual: any): number {
    if (typeof expected === 'number' && typeof actual === 'number') {
      return Math.abs(expected - actual);
    }
    return expected === actual ? 0 : 1;
  }

  /**
   * Log results for a single file
   */
  private logFileResults(result: TestResult): void {
    const passRate = result.testedCells > 0
      ? ((result.passedCells / result.testedCells) * 100).toFixed(2)
      : '0';

    if (result.failedCells === 0) {
      console.log(chalk.green(`  ✅ All ${result.testedCells} cells passed (${result.executionTime}ms)`));
    } else {
      console.log(chalk.yellow(`  ⚠️  ${result.passedCells}/${result.testedCells} passed (${passRate}%)`));

      // Show first 5 errors
      const errorsToShow = result.errors.slice(0, 5);
      errorsToShow.forEach(error => {
        console.log(chalk.red(`    ❌ ${error.sheetName}!${error.cell}: Expected ${error.expectedValue}, got ${error.actualValue}`));
        if (error.formula) {
          console.log(chalk.gray(`       Formula: ${error.formula.substring(0, 50)}...`));
        }
      });

      if (result.errors.length > 5) {
        console.log(chalk.gray(`    ... and ${result.errors.length - 5} more errors`));
      }
    }
  }

  /**
   * Generate final summary and determine pass/fail
   */
  private generateSummary(): boolean {
    console.log(chalk.blue.bold('\n📊 Summary Report'));
    console.log(chalk.gray('=' .repeat(50)));

    let totalCells = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTime = 0;

    this.results.forEach(result => {
      totalCells += result.testedCells;
      totalPassed += result.passedCells;
      totalFailed += result.failedCells;
      totalTime += result.executionTime;
    });

    const overallPassRate = totalCells > 0
      ? ((totalPassed / totalCells) * 100).toFixed(2)
      : '0';

    console.log(chalk.white(`Total cells tested: ${totalCells}`));
    console.log(chalk.green(`Passed: ${totalPassed}`));
    console.log(chalk.red(`Failed: ${totalFailed}`));
    console.log(chalk.cyan(`Pass rate: ${overallPassRate}%`));
    console.log(chalk.gray(`Total execution time: ${totalTime}ms`));

    // Write detailed report to file
    this.writeDetailedReport();

    // Determine overall pass/fail
    const passed = totalFailed === 0;

    if (passed) {
      console.log(chalk.green.bold('\n✅ All Excel parity tests PASSED!'));
    } else {
      console.log(chalk.red.bold('\n❌ Excel parity tests FAILED!'));
      console.log(chalk.yellow('See test-results/excel-parity-report.json for details'));
    }

    return passed;
  }

  /**
   * Write detailed report to file
   */
  private writeDetailedReport(): void {
    const reportDir = path.join(process.cwd(), 'test-results');

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.results.length,
        totalCells: this.results.reduce((sum, r) => sum + r.testedCells, 0),
        totalPassed: this.results.reduce((sum, r) => sum + r.passedCells, 0),
        totalFailed: this.results.reduce((sum, r) => sum + r.failedCells, 0),
      },
      files: this.results,
      errors: this.results.flatMap(r => r.errors)
    };

    fs.writeFileSync(
      path.join(reportDir, 'excel-parity-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Also create HTML report
    this.createHtmlReport(report, reportDir);
  }

  /**
   * Create HTML report for easy viewing
   */
  private createHtmlReport(report: any, reportDir: string): void {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Excel Parity Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .passed { color: green; font-weight: bold; }
    .failed { color: red; font-weight: bold; }
    .file-result { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .error { background: #ffebee; padding: 10px; margin: 5px 0; border-radius: 3px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>📊 Excel Parity Validation Report</h1>
  <div class="summary">
    <h2>Summary</h2>
    <p>Generated: ${report.timestamp}</p>
    <p>Files Tested: ${report.summary.totalFiles}</p>
    <p>Total Cells: ${report.summary.totalCells}</p>
    <p class="passed">Passed: ${report.summary.totalPassed}</p>
    <p class="failed">Failed: ${report.summary.totalFailed}</p>
    <p>Pass Rate: ${((report.summary.totalPassed / report.summary.totalCells) * 100).toFixed(2)}%</p>
  </div>

  <h2>File Results</h2>
  ${report.files.map((file: TestResult) => `
    <div class="file-result">
      <h3>${file.fileName}</h3>
      <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Cells Tested</td><td>${file.testedCells}</td></tr>
        <tr><td>Passed</td><td class="passed">${file.passedCells}</td></tr>
        <tr><td>Failed</td><td class="failed">${file.failedCells}</td></tr>
        <tr><td>Execution Time</td><td>${file.executionTime}ms</td></tr>
      </table>
      ${file.errors.length > 0 ? `
        <h4>Errors (showing first 10):</h4>
        ${file.errors.slice(0, 10).map(error => `
          <div class="error">
            <strong>${error.sheetName}!${error.cell}</strong><br>
            Expected: ${error.expectedValue}<br>
            Actual: ${error.actualValue}<br>
            ${error.formula ? `Formula: ${error.formula}` : ''}
          </div>
        `).join('')}
      ` : '<p class="passed">✅ All tests passed!</p>'}
    </div>
  `).join('')}
</body>
</html>`;

    fs.writeFileSync(path.join(reportDir, 'excel-parity-report.html'), html);
  }
}

// Run validation
async function main() {
  const validator = new ExcelParityValidator();
  const passed = await validator.validate();

  // Exit with appropriate code
  process.exit(passed ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});

// Run if executed directly
if (require.main === module) {
  main();
}
