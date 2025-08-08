/**
 * Excel Formula Engine - Main Engine
 * Processes 14,683 formulas from bart3.20.xlsx with Excel parity
 * Supports all Excel function categories and maintains decimal precision
 */

import Decimal from 'decimal.js';
import { parse as parseFormula } from 'formula-parser';
import { FormulaParser } from './formula-parser';
import { FormulaExecutor } from './formula-executor';
import { ExcelFunctions } from './excel-functions';
import { DependencyResolver } from './dependency-resolver';
import { SheetManager } from './sheet-manager';
import { FormulaValidator } from './formula-validator';
import {
  ExcelFormula,
  ExcelAnalysis,
  EvaluationContext,
  Sheet,
  CellValue,
  CellReference,
  CalculationOptions,
  DependencyNode,
  EstimateData,
  FormulaParseResult
} from './types';

// Configure Decimal.js for Excel-compatible precision
Decimal.set({
  precision: 15,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -7,
  toExpPos: 21,
  minE: -9e15,
  maxE: 9e15
});

export class FormulaEngine {
  private parser: FormulaParser;
  private executor: FormulaExecutor;
  private functions: ExcelFunctions;
  private dependencyResolver: DependencyResolver;
  private sheetManager: SheetManager;
  private validator: FormulaValidator;
  private analysisData: ExcelAnalysis | null = null;
  private calculationOptions: CalculationOptions;

  constructor(options: CalculationOptions = {}) {
    this.calculationOptions = {
      maxIterations: 100,
      epsilon: 1e-10,
      enableArrayFormulas: true,
      dateSystem: '1900',
      calcMode: 'automatic',
      ...options
    };

    this.parser = new FormulaParser();
    this.executor = new FormulaExecutor(this.calculationOptions);
    this.functions = new ExcelFunctions();
    this.dependencyResolver = new DependencyResolver();
    this.sheetManager = new SheetManager();
    this.validator = new FormulaValidator();
  }

  /**
   * Load Excel analysis data containing all 14,683 formulas
   */
  async loadAnalysisData(analysisData: ExcelAnalysis): Promise<void> {
    this.analysisData = analysisData;

    // Initialize sheets from analysis
    for (const [sheetName, sheetInfo] of Object.entries(analysisData.metadata.sheets_info)) {
      await this.sheetManager.createSheet(sheetName, {
        maxRows: sheetInfo.max_row,
        maxColumns: sheetInfo.max_column
      });
    }

    // Load named ranges
    for (const [name, range] of Object.entries(analysisData.named_ranges)) {
      await this.sheetManager.addNamedRange(name, range);
    }

    // Process all formulas and build dependency graph
    await this.buildDependencyGraph();
  }

  /**
   * Build dependency graph from all formulas in the analysis
   */
  private async buildDependencyGraph(): Promise<void> {
    if (!this.analysisData) {
      throw new Error('Analysis data not loaded');
    }

    // Process formulas by sheet
    for (const [sheetName, formulas] of Object.entries(this.analysisData.formulas_by_sheet)) {
      for (const formula of formulas) {
        const cellId = `${sheetName}!${formula.cell}`;

        // Parse formula to extract dependencies
        const parseResult = await this.parser.parse(formula.formula, sheetName);

        if (parseResult.type === 'formula') {
          // Add to dependency graph
          this.dependencyResolver.addNode({
            id: cellId,
            formula: formula.formula,
            dependents: new Set(),
            dependencies: new Set(parseResult.dependencies || []),
            dirty: true
          });
        }
      }
    }

    // Build dependency relationships
    this.dependencyResolver.buildGraph();
  }

  /**
   * Calculate a specific cell value
   */
  async calculateCell(sheetName: string, cellRef: string): Promise<CellValue> {
    const cellId = `${sheetName}!${cellRef}`;
    const context = this.createEvaluationContext(sheetName);

    // Check if cell has a formula
    const formula = await this.getFormulaForCell(sheetName, cellRef);

    if (!formula) {
      // Return stored value or empty
      return await this.sheetManager.getCellValue(sheetName, cellRef) || { value: '' };
    }

    try {
      // Parse formula
      const parseResult = await this.parser.parse(formula, sheetName);

      if (parseResult.type === 'error') {
        return { value: null, error: parseResult.error };
      }

      if (parseResult.type === 'value') {
        return { value: parseResult.value };
      }

      // Execute formula
      const result = await this.executor.execute(parseResult, context);

      // Validate result
      const isValid = await this.validator.validateResult(result, cellId);

      if (!isValid.valid) {
        return { value: result, error: isValid.error };
      }

      return { value: result, formula };
    } catch (error) {
      return {
        value: null,
        error: `Calculation error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Calculate all formulas in calculation order
   */
  async calculateAll(): Promise<Map<string, CellValue>> {
    const results = new Map<string, CellValue>();

    if (!this.analysisData) {
      throw new Error('Analysis data not loaded');
    }

    // Get calculation order from dependency graph
    const calculationOrder = this.dependencyResolver.getCalculationOrder();

    for (const cellId of calculationOrder) {
      const [sheetName, cellRef] = cellId.split('!');
      const result = await this.calculateCell(sheetName, cellRef);
      results.set(cellId, result);

      // Store result for dependent calculations
      await this.sheetManager.setCellValue(sheetName, cellRef, result);
    }

    return results;
  }

  /**
   * Recalculate after cell value change
   */
  async recalculate(changedCells: string[]): Promise<Map<string, CellValue>> {
    const results = new Map<string, CellValue>();

    // Mark changed cells and their dependents as dirty
    const affectedCells = this.dependencyResolver.markDirty(changedCells);

    // Recalculate only affected cells
    const calculationOrder = this.dependencyResolver.getCalculationOrder(affectedCells);

    for (const cellId of calculationOrder) {
      const [sheetName, cellRef] = cellId.split('!');
      const result = await this.calculateCell(sheetName, cellRef);
      results.set(cellId, result);

      await this.sheetManager.setCellValue(sheetName, cellRef, result);
    }

    return results;
  }

  /**
   * Calculate estimate totals for BART estimator
   */
  async calculateEstimate(estimateData: EstimateData): Promise<EstimateData> {
    // Set input values
    await this.setEstimateInputs(estimateData);

    // Calculate all formulas
    const results = await this.calculateAll();

    // Extract calculated values
    const calculations = await this.extractCalculations(results);

    return {
      ...estimateData,
      calculations
    };
  }

  /**
   * Set estimate input values in appropriate cells
   */
  private async setEstimateInputs(estimateData: EstimateData): Promise<void> {
    // Client info
    await this.sheetManager.setCellValue('New Client Info Page', 'A2', { value: estimateData.clientInfo.name });
    await this.sheetManager.setCellValue('New Client Info Page', 'B2', { value: estimateData.clientInfo.address });
    await this.sheetManager.setCellValue('New Client Info Page', 'D2', { value: estimateData.clientInfo.phone });
    await this.sheetManager.setCellValue('New Client Info Page', 'E2', { value: estimateData.clientInfo.email });

    // Measurements
    for (let i = 0; i < estimateData.measurements.length; i++) {
      const measurement = estimateData.measurements[i];
      const startRow = 50 + i; // Assuming measurements start at row 50

      if (measurement.type === 'exterior') {
        await this.sheetManager.setCellValue('Ext Measure', `D${startRow}`, { value: measurement.description });
        await this.sheetManager.setCellValue('Ext Measure', `F${startRow}`, { value: measurement.dimensions.length || 0 });
        await this.sheetManager.setCellValue('Ext Measure', `H${startRow}`, { value: measurement.dimensions.height || 0 });
      }
    }

    // Pricing settings
    await this.sheetManager.setCellValue('Exterior Formula Sheet', 'F177', { value: estimateData.pricing.tier.multiplier });
  }

  /**
   * Extract calculation results for estimate
   */
  private async extractCalculations(results: Map<string, CellValue>): Promise<EstimateData['calculations']> {
    // These cell references would be determined from the actual Excel analysis
    const subtotalCell = results.get('Exterior Formula Sheet!B200');
    const taxCell = results.get('Exterior Formula Sheet!B201');
    const totalCell = results.get('Exterior Formula Sheet!B202');
    const laborHoursCell = results.get('Exterior Formula Sheet!B203');
    const paintGallonsCell = results.get('Exterior Formula Sheet!B204');

    return {
      subtotal: this.getNumericValue(subtotalCell?.value, 0),
      tax: this.getNumericValue(taxCell?.value, 0),
      total: this.getNumericValue(totalCell?.value, 0),
      laborHours: this.getNumericValue(laborHoursCell?.value, 0),
      paintGallons: this.getNumericValue(paintGallonsCell?.value, 0)
    };
  }

  /**
   * Get numeric value with decimal precision
   */
  private getNumericValue(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }

    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    }

    if (value instanceof Decimal) {
      return value.toNumber();
    }

    return defaultValue;
  }

  /**
   * Get formula for a specific cell
   */
  private async getFormulaForCell(sheetName: string, cellRef: string): Promise<string | null> {
    if (!this.analysisData) {
      return null;
    }

    const sheetFormulas = this.analysisData.formulas_by_sheet[sheetName];
    if (!sheetFormulas) {
      return null;
    }

    const formula = sheetFormulas.find(f => f.cell === cellRef);
    return formula?.formula || null;
  }

  /**
   * Create evaluation context
   */
  private createEvaluationContext(currentSheet: string): EvaluationContext {
    return {
      currentSheet,
      sheets: this.sheetManager.getAllSheets(),
      namedRanges: this.sheetManager.getNamedRanges(),
      iteration: 0,
      maxIterations: this.calculationOptions.maxIterations || 100,
      epsilon: this.calculationOptions.epsilon || 1e-10
    };
  }

  /**
   * Export current state for debugging
   */
  exportState(): any {
    return {
      options: this.calculationOptions,
      sheets: Array.from(this.sheetManager.getAllSheets().entries()).map(([name, sheet]) => ({
        name,
        cellCount: sheet.cells.size,
        lastRow: sheet.lastRow,
        lastColumn: sheet.lastColumn
      })),
      dependencies: this.dependencyResolver.exportGraph(),
      analysisLoaded: !!this.analysisData
    };
  }

  /**
   * Get statistics about loaded formulas
   */
  getFormulaStats(): any {
    if (!this.analysisData) {
      return null;
    }

    return {
      totalFormulas: this.analysisData.metadata.total_formulas,
      sheetCount: this.analysisData.metadata.sheet_count,
      categoryBreakdown: this.analysisData.metadata.category_summary,
      complexFormulas: this.analysisData.complex_formulas?.length || 0
    };
  }
}
