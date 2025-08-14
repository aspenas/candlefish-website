#!/usr/bin/env ts-node
/**
 * Create Sample Excel Test Files for Validation
 *
 * This script creates sample Excel files that demonstrate the validation
 * capabilities and can be used for testing the Excel engine.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XlsxPopulate from 'xlsx-populate';

interface TestCase {
  filename: string;
  description: string;
  sheets: TestSheet[];
}

interface TestSheet {
  name: string;
  cells: TestCell[];
}

interface TestCell {
  address: string;
  formula?: string;
  value?: any;
  description: string;
}

class SampleTestFileGenerator {
  private testCasesDir: string;

  constructor() {
    this.testCasesDir = path.join(__dirname, '../testcases');
  }

  /**
   * Create all sample test files
   */
  async createSampleFiles(): Promise<void> {
    console.log('📋 Creating sample Excel test files...');

    if (!fs.existsSync(this.testCasesDir)) {
      fs.mkdirSync(this.testCasesDir, { recursive: true });
    }

    const testCases = this.defineTestCases();

    for (const testCase of testCases) {
      await this.createTestFile(testCase);
    }

    console.log('✅ Sample test files created successfully');
  }

  /**
   * Define test cases
   */
  private defineTestCases(): TestCase[] {
    return [
      {
        filename: '1-testcase.xlsx',
        description: 'Basic arithmetic and simple formulas',
        sheets: [
          {
            name: 'BasicTests',
            cells: [
              { address: 'A1', value: 10, description: 'Simple number' },
              { address: 'A2', value: 20, description: 'Simple number' },
              { address: 'A3', formula: '=A1+A2', description: 'Basic addition' },
              { address: 'A4', formula: '=A1*A2', description: 'Basic multiplication' },
              { address: 'A5', formula: '=A2/A1', description: 'Basic division' },
              { address: 'A6', formula: '=SUM(A1:A2)', description: 'SUM function' },
              { address: 'B1', value: 'Test', description: 'Text value' },
              { address: 'B2', formula: '=CONCATENATE("Hello ",B1)', description: 'Text concatenation' },
              { address: 'C1', value: true, description: 'Boolean true' },
              { address: 'C2', value: false, description: 'Boolean false' },
              { address: 'C3', formula: '=IF(A1>5,"Large","Small")', description: 'IF function' }
            ]
          }
        ]
      },
      {
        filename: '2.xlsx',
        description: 'VLOOKUP and lookup functions',
        sheets: [
          {
            name: 'LookupTests',
            cells: [
              // Lookup table
              { address: 'A1', value: 'Product', description: 'Header' },
              { address: 'B1', value: 'Price', description: 'Header' },
              { address: 'A2', value: 'Paint', description: 'Product name' },
              { address: 'B2', value: 25.99, description: 'Product price' },
              { address: 'A3', value: 'Brush', description: 'Product name' },
              { address: 'B3', value: 8.50, description: 'Product price' },
              { address: 'A4', value: 'Roller', description: 'Product name' },
              { address: 'B4', value: 12.75, description: 'Product price' },

              // Lookup formulas
              { address: 'D1', value: 'Paint', description: 'Lookup value' },
              { address: 'E1', formula: '=VLOOKUP(D1,A2:B4,2,FALSE)', description: 'VLOOKUP exact match' },
              { address: 'D2', value: 'Brush', description: 'Lookup value' },
              { address: 'E2', formula: '=VLOOKUP(D2,A2:B4,2,FALSE)', description: 'VLOOKUP exact match' }
            ]
          }
        ]
      },
      {
        filename: '3.xlsx',
        description: 'Complex calculations and nested functions',
        sheets: [
          {
            name: 'ComplexTests',
            cells: [
              { address: 'A1', value: 100, description: 'Base value' },
              { address: 'A2', value: 0.08, description: 'Tax rate' },
              { address: 'A3', formula: '=A1*(1+A2)', description: 'Calculate with tax' },
              { address: 'A4', formula: '=ROUND(A3,2)', description: 'Round to 2 decimals' },
              { address: 'B1', value: 5, description: 'Quantity' },
              { address: 'B2', value: 25.50, description: 'Unit price' },
              { address: 'B3', formula: '=B1*B2', description: 'Subtotal' },
              { address: 'B4', formula: '=IF(B3>100,B3*0.9,B3)', description: 'Bulk discount' },
              { address: 'C1', formula: '=SUM(A4,B4)', description: 'Total calculation' },
              { address: 'C2', formula: '=MAX(A1:A4)', description: 'MAX function' },
              { address: 'C3', formula: '=MIN(B1:B4)', description: 'MIN function' },
              { address: 'C4', formula: '=AVERAGE(A1:A4)', description: 'AVERAGE function' }
            ]
          }
        ]
      },
      {
        filename: '4.xlsx',
        description: 'Performance test with many calculations',
        sheets: [
          {
            name: 'PerformanceTests',
            cells: this.generatePerformanceTestCells()
          }
        ]
      },
      {
        filename: '5.xlsx',
        description: 'Integration scenarios similar to BART estimator',
        sheets: [
          {
            name: 'EstimatorTests',
            cells: [
              // Client info simulation
              { address: 'A1', value: 'John Doe', description: 'Client name' },
              { address: 'A2', value: '123 Main St', description: 'Client address' },
              { address: 'A3', value: '555-1234', description: 'Client phone' },

              // Measurements
              { address: 'B1', value: 12, description: 'Length (feet)' },
              { address: 'B2', value: 8, description: 'Height (feet)' },
              { address: 'B3', formula: '=B1*B2', description: 'Area calculation' },

              // Pricing
              { address: 'C1', value: 2.50, description: 'Price per sq ft' },
              { address: 'C2', formula: '=B3*C1', description: 'Material cost' },
              { address: 'C3', value: 50, description: 'Labor hours' },
              { address: 'C4', value: 35, description: 'Labor rate' },
              { address: 'C5', formula: '=C3*C4', description: 'Labor cost' },
              { address: 'C6', formula: '=C2+C5', description: 'Subtotal' },
              { address: 'C7', value: 0.0825, description: 'Tax rate' },
              { address: 'C8', formula: '=C6*C7', description: 'Tax amount' },
              { address: 'C9', formula: '=C6+C8', description: 'Total estimate' }
            ]
          }
        ]
      }
    ];
  }

  /**
   * Generate performance test cells (many calculations)
   */
  private generatePerformanceTestCells(): TestCell[] {
    const cells: TestCell[] = [];

    // Create a series of calculations
    for (let i = 1; i <= 50; i++) {
      cells.push({
        address: `A${i}`,
        value: i,
        description: `Value ${i}`
      });

      if (i > 1) {
        cells.push({
          address: `B${i}`,
          formula: `=A${i}+A${i-1}`,
          description: `Sum of current and previous`
        });

        cells.push({
          address: `C${i}`,
          formula: `=B${i}*2`,
          description: `Double the sum`
        });
      }
    }

    // Add summary calculations
    cells.push({
      address: 'D1',
      formula: '=SUM(A1:A50)',
      description: 'Sum of all values'
    });

    cells.push({
      address: 'D2',
      formula: '=AVERAGE(B2:B50)',
      description: 'Average of sums'
    });

    cells.push({
      address: 'D3',
      formula: '=MAX(C2:C50)',
      description: 'Maximum doubled value'
    });

    return cells;
  }

  /**
   * Create a single test file
   */
  private async createTestFile(testCase: TestCase): Promise<void> {
    console.log(`📄 Creating ${testCase.filename} - ${testCase.description}`);

    const workbook = await XlsxPopulate.fromBlankAsync();

    // Remove default sheet and create test sheets
    const defaultSheet = workbook.sheet(0);

    for (let i = 0; i < testCase.sheets.length; i++) {
      const sheetData = testCase.sheets[i];
      let sheet;

      if (i === 0) {
        // Use the default sheet for the first test sheet
        sheet = defaultSheet.name(sheetData.name);
      } else {
        // Add additional sheets
        sheet = workbook.addSheet(sheetData.name);
      }

      // Populate cells
      for (const cellData of sheetData.cells) {
        const cell = sheet.cell(cellData.address);

        if (cellData.formula) {
          cell.formula(cellData.formula);
        } else if (cellData.value !== undefined) {
          cell.value(cellData.value);
        }

        // Add comment with description
        if (cellData.description) {
          // Note: xlsx-populate doesn't support comments directly,
          // so we'll add the description to a nearby cell
          const commentCell = this.getCommentCell(cellData.address);
          if (commentCell && !sheetData.cells.find(c => c.address === commentCell)) {
            try {
              sheet.cell(commentCell).value(`Comment: ${cellData.description}`);
            } catch (error) {
              // Ignore if comment cell is not valid
            }
          }
        }
      }
    }

    // Save the file
    const filePath = path.join(this.testCasesDir, testCase.filename);
    await workbook.toFileAsync(filePath);

    console.log(`✅ Created ${testCase.filename}`);
  }

  /**
   * Get a cell address for storing comments
   */
  private getCommentCell(cellAddress: string): string | null {
    // Try to find a nearby cell for comments
    const match = cellAddress.match(/([A-Z]+)(\d+)/);
    if (!match) return null;

    const col = match[1];
    const row = parseInt(match[2]);

    // Use the next column for comments if it's not already used
    const nextCol = String.fromCharCode(col.charCodeAt(0) + 3); // Skip a few columns
    return `${nextCol}${row}`;
  }

  /**
   * Create a summary file explaining the test files
   */
  async createSummaryFile(): Promise<void> {
    const summaryPath = path.join(this.testCasesDir, 'TEST_FILES_SUMMARY.md');

    const summary = `# Excel Test Files Summary

These files were created to demonstrate and validate the Paintbox Excel calculation engine.

## Test Files:

### 1-testcase.xlsx - Basic arithmetic and simple formulas
- Basic addition, multiplication, division
- SUM function
- Text concatenation
- IF function with conditions
- Expected to pass 100% validation

### 2.xlsx - VLOOKUP and lookup functions
- VLOOKUP with exact match
- Product price lookup scenarios
- Table-based data retrieval
- Tests lookup function accuracy

### 3.xlsx - Complex calculations and nested functions
- Tax calculations with percentages
- Conditional bulk discounts
- ROUND, MAX, MIN, AVERAGE functions
- Nested formula combinations

### 4.xlsx - Performance test with many calculations
- 50 rows of sequential calculations
- Dependent formulas (each row depends on previous)
- SUM, AVERAGE, MAX functions on large ranges
- Tests calculation speed and efficiency

### 5.xlsx - Integration scenarios similar to BART estimator
- Client information fields
- Area calculations (length × height)
- Material and labor cost calculations
- Tax calculations
- Total estimate formula
- Mirrors real estimation workflow

## Running Tests:

\`\`\`bash
npm run test:excel-validation
\`\`\`

## Expected Results:
- All basic arithmetic should pass (100%)
- VLOOKUP functions should return correct values
- Complex calculations should match Excel results
- Performance tests should complete under 100ms total
- Integration scenarios should produce accurate estimates

## For KindHome:
These test files demonstrate the validation framework capabilities.
Replace with actual BART estimator scenarios for production validation.
`;

    fs.writeFileSync(summaryPath, summary);
    console.log(`📋 Created test files summary: ${summaryPath}`);
  }
}

// CLI interface
async function main() {
  const generator = new SampleTestFileGenerator();

  try {
    await generator.createSampleFiles();
    await generator.createSummaryFile();

    console.log('\n🎯 SAMPLE TEST FILES CREATED');
    console.log('============================');
    console.log('✅ 5 Excel test files created in testcases/');
    console.log('✅ Test summary documentation created');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Run: npm run test:excel-validation');
    console.log('   2. Review validation results');
    console.log('   3. Replace with actual BART scenarios');

  } catch (error) {
    console.error('❌ Failed to create test files:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { SampleTestFileGenerator };
