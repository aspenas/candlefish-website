/**
 * Type definitions for Excel Formula Engine
 * Based on analysis of 14,683 formulas from bart3.20.xlsx
 */

export interface ExcelFormula {
  sheet: string;
  cell: string;
  formula: string;
  category: FormulaCategory;
  dependencies: string[];
  row: number;
  column: number;
}

export type FormulaCategory =
  | 'Financial'
  | 'Lookup'
  | 'Statistical'
  | 'Math'
  | 'Logical'
  | 'Text'
  | 'DateTime'
  | 'Arithmetic'
  | 'Other';

export interface NamedRange {
  name: string;
  scope?: string;
  destinations: Array<{
    sheet: string;
    range: string;
  }>;
  value?: string;
}

export interface SheetInfo {
  max_row: number;
  max_column: number;
  cell_count: number;
}

export interface ExcelAnalysis {
  metadata: {
    excel_file: string;
    total_formulas: number;
    sheet_count: number;
    sheets_info: Record<string, SheetInfo>;
    category_summary: Record<FormulaCategory, number>;
  };
  named_ranges: Record<string, NamedRange>;
  formulas_by_sheet: Record<string, ExcelFormula[]>;
  complex_formulas: ExcelFormula[];
  dependencies: Record<string, string[]>;
}

export interface CellValue {
  value: any;
  formula?: string;
  error?: string;
  formatted?: string;
}

export interface CellReference {
  sheet?: string;
  column: string;
  row: number;
  absolute?: {
    column: boolean;
    row: boolean;
  };
}

export interface Sheet {
  name: string;
  cells: Map<string, CellValue>;
  lastRow: number;
  lastColumn: number;
}

export interface EvaluationContext {
  currentSheet: string;
  sheets: Map<string, Sheet>;
  namedRanges: Map<string, CellReference | CellReference[]>;
  iteration: number;
  maxIterations: number;
  epsilon: number;
}

export type ExcelFunction = (
  context: EvaluationContext,
  ...args: any[]
) => any;

export interface FunctionRegistry {
  [functionName: string]: ExcelFunction;
}

export interface DependencyNode {
  id: string; // sheet!cell format
  formula?: string;
  dependents: Set<string>;
  dependencies: Set<string>;
  value?: any;
  error?: string;
  dirty: boolean;
}

export interface CalculationOptions {
  maxIterations?: number;
  epsilon?: number;
  enableArrayFormulas?: boolean;
  dateSystem?: '1900' | '1904';
  calcMode?: 'automatic' | 'manual';
}

export interface FormulaParseResult {
  type: 'value' | 'formula' | 'error';
  value?: any;
  formula?: string;
  dependencies?: string[];
  error?: string;
}

// Measurement-specific types for BART estimator
export interface Measurement {
  id: string;
  type: 'exterior' | 'interior' | 'cabinet' | 'gutter' | 'holiday';
  description: string;
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
    quantity?: number;
  };
  surface?: string;
  condition?: string;
  notes?: string;
}

export interface PricingTier {
  name: 'Good' | 'Better' | 'Best';
  multiplier: number;
  features: string[];
}

export interface EstimateData {
  clientInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    projectType: string;
  };
  measurements: Measurement[];
  pricing: {
    laborRate: number;
    paintPrice: number;
    tier: PricingTier;
  };
  calculations: {
    subtotal: number;
    tax: number;
    total: number;
    laborHours: number;
    paintGallons: number;
  };
}
