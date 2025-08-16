/**
 * @file Excel formula test data factory
 * @description Provides factory functions for creating Excel formula test data
 */

import { faker } from '@faker-js/faker';
import Decimal from 'decimal.js';

export interface ExcelFormula {
  cellReference: string;
  formula: string;
  expectedResult: number | string | boolean;
  dependencies: string[];
  category: 'pricing' | 'measurement' | 'labor' | 'material' | 'markup' | 'condition';
  complexity: 'simple' | 'medium' | 'complex';
  description: string;
}

export interface ExcelWorksheet {
  name: string;
  formulas: ExcelFormula[];
  data: Record<string, any>;
}

export interface ExcelValidationCase {
  id: string;
  description: string;
  inputs: Record<string, any>;
  expectedOutputs: Record<string, any>;
  tolerance: number;
}

export interface FormulaCategory {
  name: string;
  formulas: ExcelFormula[];
  testCases: ExcelValidationCase[];
}

/**
 * Creates a basic Excel formula
 */
export function createExcelFormula(overrides?: Partial<ExcelFormula>): ExcelFormula {
  const categories = ['pricing', 'measurement', 'labor', 'material', 'markup', 'condition'] as const;
  const category = faker.helpers.arrayElement(categories);

  const formulasByCategory = {
    pricing: [
      '=B2*C2*D2',
      '=SUM(E2:E10)*1.25',
      '=IF(A2>100,B2*1.1,B2)',
      '=VLOOKUP(A2,PriceTable,3,FALSE)',
    ],
    measurement: [
      '=(A2+B2)*2*C2',
      '=A2*B2',
      '=PI()*POWER(A2/2,2)',
      '=A2*B2-C2*D2',
    ],
    labor: [
      '=E2/F2',
      '=IF(G2="extensive",H2*1.5,IF(G2="standard",H2*1.2,H2))',
      '=CEILING(I2/8,1)*8',
    ],
    material: [
      '=J2/350',
      '=CEILING(K2*L2/M2,1)',
      '=N2*O2*P2',
    ],
    markup: [
      '=Q2*1.35',
      '=R2*(1+S2)',
      '=T2+U2*0.15',
    ],
    condition: [
      '=IF(V2="poor",W2*1.5,IF(V2="fair",W2*1.25,W2))',
      '=SWITCH(X2,"excellent",Y2,"good",Y2*1.1,"fair",Y2*1.25,"poor",Y2*1.5)',
    ],
  };

  const cellRef = `${faker.helpers.arrayElement(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'])}${faker.number.int({
    min: 1,
    max: 1000,
  })}`;

  return {
    cellReference: cellRef,
    formula: faker.helpers.arrayElement(formulasByCategory[category]),
    expectedResult: faker.number.float({ min: 0, max: 10000, fractionDigits: 2 }),
    dependencies: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () =>
      `${faker.helpers.arrayElement(['A', 'B', 'C', 'D', 'E'])}${faker.number.int({
        min: 1,
        max: 100,
      })}`
    ),
    category,
    complexity: faker.helpers.arrayElement(['simple', 'medium', 'complex']),
    description: `${category} calculation for ${faker.lorem.words(3)}`,
    ...overrides,
  };
}

/**
 * Creates pricing formulas specifically
 */
export function createPricingFormulas(): ExcelFormula[] {
  return [
    createExcelFormula({
      cellReference: 'D15',
      formula: '=C15*$B$5',
      category: 'pricing',
      complexity: 'simple',
      description: 'Basic pricing calculation with fixed rate',
      expectedResult: 1250.0,
      dependencies: ['C15', 'B5'],
    }),
    createExcelFormula({
      cellReference: 'E20',
      formula: '=IF(D20>500,D20*1.1,D20)',
      category: 'pricing',
      complexity: 'medium',
      description: 'Conditional pricing with volume discount',
      expectedResult: 550.0,
      dependencies: ['D20'],
    }),
    createExcelFormula({
      cellReference: 'F25',
      formula: '=VLOOKUP(A25,PriceTable,3,FALSE)*B25',
      category: 'pricing',
      complexity: 'complex',
      description: 'Price lookup with quantity multiplication',
      expectedResult: 2500.0,
      dependencies: ['A25', 'B25', 'PriceTable'],
    }),
  ];
}

/**
 * Creates measurement formulas
 */
export function createMeasurementFormulas(): ExcelFormula[] {
  return [
    createExcelFormula({
      cellReference: 'G10',
      formula: '=(A10+B10)*2*C10',
      category: 'measurement',
      complexity: 'medium',
      description: 'Room perimeter times height calculation',
      expectedResult: 432.0,
      dependencies: ['A10', 'B10', 'C10'],
    }),
    createExcelFormula({
      cellReference: 'H15',
      formula: '=A15*B15',
      category: 'measurement',
      complexity: 'simple',
      description: 'Area calculation (length times width)',
      expectedResult: 144.0,
      dependencies: ['A15', 'B15'],
    }),
    createExcelFormula({
      cellReference: 'I20',
      formula: '=PI()*POWER(A20/2,2)',
      category: 'measurement',
      complexity: 'complex',
      description: 'Circular area calculation',
      expectedResult: 78.54,
      dependencies: ['A20'],
    }),
  ];
}

/**
 * Creates labor calculation formulas
 */
export function createLaborFormulas(): ExcelFormula[] {
  return [
    createExcelFormula({
      cellReference: 'J30',
      formula: '=G30/25',
      category: 'labor',
      complexity: 'simple',
      description: 'Hours calculation based on square footage',
      expectedResult: 17.28,
      dependencies: ['G30'],
    }),
    createExcelFormula({
      cellReference: 'K35',
      formula: '=IF(H35="extensive",J35*1.5,IF(H35="standard",J35*1.2,J35))',
      category: 'labor',
      complexity: 'complex',
      description: 'Labor adjustment based on prep work level',
      expectedResult: 20.736,
      dependencies: ['H35', 'J35'],
    }),
  ];
}

/**
 * Creates material calculation formulas
 */
export function createMaterialFormulas(): ExcelFormula[] {
  return [
    createExcelFormula({
      cellReference: 'L40',
      formula: '=G40/350',
      category: 'material',
      complexity: 'simple',
      description: 'Paint gallons needed (350 sq ft per gallon)',
      expectedResult: 1.237,
      dependencies: ['G40'],
    }),
    createExcelFormula({
      cellReference: 'M45',
      formula: '=CEILING(L45,1)',
      category: 'material',
      complexity: 'medium',
      description: 'Round up gallons to whole number',
      expectedResult: 2.0,
      dependencies: ['L45'],
    }),
  ];
}

/**
 * Creates an Excel worksheet with formulas
 */
export function createExcelWorksheet(overrides?: Partial<ExcelWorksheet>): ExcelWorksheet {
  const formulaCount = faker.number.int({ min: 50, max: 200 });
  const formulas = Array.from({ length: formulaCount }, () => createExcelFormula());

  return {
    name: faker.helpers.arrayElement([
      'Pricing',
      'Measurements',
      'Labor',
      'Materials',
      'Calculations',
      'Summary',
    ]),
    formulas,
    data: generateWorksheetData(formulas),
    ...overrides,
  };
}

/**
 * Creates Excel validation test cases
 */
export function createExcelValidationCase(overrides?: Partial<ExcelValidationCase>): ExcelValidationCase {
  return {
    id: faker.string.uuid(),
    description: `Test case for ${faker.lorem.words(3)} calculation`,
    inputs: {
      length: faker.number.int({ min: 8, max: 20 }),
      width: faker.number.int({ min: 8, max: 16 }),
      height: faker.number.int({ min: 8, max: 12 }),
      doors: faker.number.int({ min: 1, max: 3 }),
      windows: faker.number.int({ min: 0, max: 4 }),
      prep_level: faker.helpers.arrayElement(['minimal', 'standard', 'extensive']),
      paint_type: faker.helpers.arrayElement(['flat', 'eggshell', 'satin', 'semi-gloss']),
      condition: faker.helpers.arrayElement(['excellent', 'good', 'fair', 'poor']),
    },
    expectedOutputs: {
      wall_area: faker.number.float({ min: 200, max: 800, fractionDigits: 2 }),
      ceiling_area: faker.number.float({ min: 64, max: 320, fractionDigits: 2 }),
      paint_gallons: faker.number.float({ min: 1, max: 10, fractionDigits: 2 }),
      labor_hours: faker.number.float({ min: 8, max: 40, fractionDigits: 2 }),
      good_price: faker.number.float({ min: 500, max: 2000, fractionDigits: 2 }),
      better_price: faker.number.float({ min: 1000, max: 3000, fractionDigits: 2 }),
      best_price: faker.number.float({ min: 1500, max: 4000, fractionDigits: 2 }),
    },
    tolerance: 0.01, // 1% tolerance for floating point comparisons
    ...overrides,
  };
}

/**
 * Creates formula categories for testing
 */
export function createFormulaCategories(): FormulaCategory[] {
  return [
    {
      name: 'Pricing Calculations',
      formulas: createPricingFormulas(),
      testCases: Array.from({ length: 10 }, () =>
        createExcelValidationCase({
          description: 'Pricing calculation test case',
        })
      ),
    },
    {
      name: 'Measurement Calculations',
      formulas: createMeasurementFormulas(),
      testCases: Array.from({ length: 15 }, () =>
        createExcelValidationCase({
          description: 'Measurement calculation test case',
        })
      ),
    },
    {
      name: 'Labor Calculations',
      formulas: createLaborFormulas(),
      testCases: Array.from({ length: 8 }, () =>
        createExcelValidationCase({
          description: 'Labor calculation test case',
        })
      ),
    },
    {
      name: 'Material Calculations',
      formulas: createMaterialFormulas(),
      testCases: Array.from({ length: 12 }, () =>
        createExcelValidationCase({
          description: 'Material calculation test case',
        })
      ),
    },
  ];
}

/**
 * Creates performance test data with many formulas
 */
export function createPerformanceTestData(): {
  worksheets: ExcelWorksheet[];
  totalFormulas: number;
} {
  const worksheets = Array.from({ length: 10 }, () => createExcelWorksheet());
  const totalFormulas = worksheets.reduce((sum, sheet) => sum + sheet.formulas.length, 0);

  return { worksheets, totalFormulas };
}

/**
 * Creates edge case test data
 */
export function createEdgeCaseTestData(): ExcelValidationCase[] {
  return [
    createExcelValidationCase({
      description: 'Zero area room',
      inputs: { length: 0, width: 0, height: 9 },
      expectedOutputs: { wall_area: 0, ceiling_area: 0, paint_gallons: 0 },
    }),
    createExcelValidationCase({
      description: 'Very large room',
      inputs: { length: 100, width: 50, height: 20 },
      expectedOutputs: { wall_area: 6000, ceiling_area: 5000, paint_gallons: 31.43 },
    }),
    createExcelValidationCase({
      description: 'Single dimension room',
      inputs: { length: 1, width: 20, height: 9 },
      expectedOutputs: { wall_area: 378, ceiling_area: 20, paint_gallons: 1.14 },
    }),
    createExcelValidationCase({
      description: 'Maximum doors and windows',
      inputs: { length: 12, width: 12, height: 9, doors: 10, windows: 20 },
      expectedOutputs: { wall_area: 232, ceiling_area: 144, paint_gallons: 1.07 }, // Reduced for openings
    }),
  ];
}

/**
 * Helper function to generate worksheet data based on formulas
 */
function generateWorksheetData(formulas: ExcelFormula[]): Record<string, any> {
  const data: Record<string, any> = {};

  // Generate sample input data
  for (let i = 1; i <= 100; i++) {
    data[`A${i}`] = faker.number.float({ min: 1, max: 100, fractionDigits: 2 });
    data[`B${i}`] = faker.number.float({ min: 1, max: 100, fractionDigits: 2 });
    data[`C${i}`] = faker.number.float({ min: 1, max: 20, fractionDigits: 2 });
  }

  // Add some specific test values
  data['B5'] = 25.0; // Hourly rate
  data['A25'] = 'StandardPaint'; // Paint type for lookup
  data['B25'] = 5.0; // Quantity
  data['H35'] = 'extensive'; // Prep level

  return data;
}

/**
 * Creates formula dependency graph for testing
 */
export function createFormulaDependencyGraph(): {
  formulas: ExcelFormula[];
  dependencies: Record<string, string[]>;
} {
  const formulas = [
    createExcelFormula({
      cellReference: 'A1',
      formula: '=10',
      dependencies: [],
    }),
    createExcelFormula({
      cellReference: 'B1',
      formula: '=A1*2',
      dependencies: ['A1'],
    }),
    createExcelFormula({
      cellReference: 'C1',
      formula: '=A1+B1',
      dependencies: ['A1', 'B1'],
    }),
    createExcelFormula({
      cellReference: 'D1',
      formula: '=C1*1.25',
      dependencies: ['C1'],
    }),
  ];

  const dependencies: Record<string, string[]> = {};
  formulas.forEach((formula) => {
    dependencies[formula.cellReference] = formula.dependencies;
  });

  return { formulas, dependencies };
}

/**
 * Creates complex nested formula for testing
 */
export function createComplexFormula(): ExcelFormula {
  return createExcelFormula({
    cellReference: 'Z100',
    formula: '=IF(AND(A1>0,B1>0),VLOOKUP(C1,PriceTable,MATCH(D1,HeaderRow,0),FALSE)*E1*(1+F1),0)',
    category: 'pricing',
    complexity: 'complex',
    description: 'Complex nested formula with multiple functions',
    dependencies: ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'PriceTable', 'HeaderRow'],
  });
}