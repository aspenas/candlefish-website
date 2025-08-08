/**
 * Formula Validator
 * Validates formula results against Excel parity and expected behaviors
 * Ensures calculations match the original Excel workbook exactly
 */

import Decimal from 'decimal.js';

export class FormulaValidator {
  private tolerance: Decimal = new Decimal(1e-10);
  private knownResults: Map<string, any> = new Map();
  private validationRules: ValidationRule[] = [];

  constructor(tolerance: number = 1e-10) {
    this.tolerance = new Decimal(tolerance);
    this.initializeValidationRules();
  }

  /**
   * Validate a calculation result
   */
  async validateResult(result: any, cellId: string, expectedValue?: any): Promise<ValidationResult> {
    const validationResult: ValidationResult = {
      valid: true,
      cellId,
      result,
      expectedValue,
      errors: [],
      warnings: []
    };

    // Check against known expected value
    if (expectedValue !== undefined) {
      const comparison = this.compareValues(result, expectedValue);
      if (!comparison.match) {
        validationResult.valid = false;
        validationResult.errors.push(`Value mismatch: expected ${expectedValue}, got ${result} (diff: ${comparison.difference})`);
      }
    }

    // Check against stored known results
    const knownResult = this.knownResults.get(cellId);
    if (knownResult !== undefined) {
      const comparison = this.compareValues(result, knownResult);
      if (!comparison.match) {
        validationResult.valid = false;
        validationResult.errors.push(`Known result mismatch: expected ${knownResult}, got ${result} (diff: ${comparison.difference})`);
      }
    }

    // Apply validation rules
    for (const rule of this.validationRules) {
      const ruleResult = await rule.validate(result, cellId);
      if (!ruleResult.valid) {
        validationResult.valid = false;
        validationResult.errors.push(...ruleResult.errors);
      }
      validationResult.warnings.push(...ruleResult.warnings);
    }

    // Check for Excel errors
    if (this.isExcelError(result)) {
      validationResult.warnings.push(`Excel error returned: ${result}`);
    }

    // Validate numeric precision
    if (typeof result === 'number' || result instanceof Decimal) {
      const precisionCheck = this.validatePrecision(result);
      if (!precisionCheck.valid) {
        validationResult.warnings.push(...precisionCheck.warnings);
      }
    }

    return validationResult;
  }

  /**
   * Compare two values with tolerance
   */
  private compareValues(actual: any, expected: any): { match: boolean; difference: string } {
    // Handle null/undefined cases
    if (actual === expected) {
      return { match: true, difference: '0' };
    }

    if ((actual === null || actual === undefined) !== (expected === null || expected === undefined)) {
      return { match: false, difference: 'null mismatch' };
    }

    // Handle Excel errors
    if (this.isExcelError(actual) || this.isExcelError(expected)) {
      return {
        match: String(actual) === String(expected),
        difference: `${actual} vs ${expected}`
      };
    }

    // Handle boolean values
    if (typeof actual === 'boolean' || typeof expected === 'boolean') {
      return {
        match: Boolean(actual) === Boolean(expected),
        difference: `${actual} vs ${expected}`
      };
    }

    // Handle string values
    if (typeof actual === 'string' || typeof expected === 'string') {
      const actualStr = String(actual).trim();
      const expectedStr = String(expected).trim();
      return {
        match: actualStr === expectedStr,
        difference: `'${actualStr}' vs '${expectedStr}'`
      };
    }

    // Handle numeric values with tolerance
    try {
      const actualDecimal = new Decimal(actual);
      const expectedDecimal = new Decimal(expected);
      const difference = actualDecimal.minus(expectedDecimal).abs();

      const match = difference.lte(this.tolerance) ||
                    difference.div(expectedDecimal.abs()).lte(new Decimal(1e-12)); // Relative tolerance

      return {
        match,
        difference: difference.toString()
      };
    } catch (error) {
      // If conversion to Decimal fails, do string comparison
      return {
        match: String(actual) === String(expected),
        difference: `${actual} vs ${expected}`
      };
    }
  }

  /**
   * Check if value is an Excel error
   */
  private isExcelError(value: any): boolean {
    if (typeof value === 'string') {
      return /^#(DIV\/0!|N\/A|NAME\?|NULL!|NUM!|REF!|VALUE!)$/.test(value);
    }

    if (typeof value === 'object' && value !== null && 'error' in value) {
      return true;
    }

    return false;
  }

  /**
   * Validate numeric precision
   */
  private validatePrecision(value: any): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    try {
      const decimal = new Decimal(value);

      // Check for precision loss
      const originalNumber = Number(value);
      if (Math.abs(originalNumber) > Number.MAX_SAFE_INTEGER) {
        warnings.push(`Value ${value} exceeds JavaScript safe integer range`);
      }

      // Check decimal places
      const decimalPlaces = decimal.decimalPlaces();
      if (decimalPlaces > 15) {
        warnings.push(`Value ${value} has more than 15 decimal places`);
      }

      // Check for infinity
      if (!decimal.isFinite()) {
        warnings.push(`Value ${value} is not finite`);
      }

      return { valid: true, warnings };
    } catch (error) {
      return { valid: false, warnings: [`Invalid numeric value: ${value}`] };
    }
  }

  /**
   * Initialize built-in validation rules
   */
  private initializeValidationRules(): void {
    // Rule: Financial calculations should maintain precision
    this.validationRules.push({
      name: 'financial-precision',
      validate: async (result: any, cellId: string) => {
        if (cellId.includes('PMT') || cellId.includes('PV') || cellId.includes('FV')) {
          if (typeof result === 'number' && Math.abs(result) < 1e-10) {
            return {
              valid: true,
              errors: [],
              warnings: ['Financial calculation result is very small, check for rounding errors']
            };
          }
        }
        return { valid: true, errors: [], warnings: [] };
      }
    });

    // Rule: Division by zero should return Excel error
    this.validationRules.push({
      name: 'division-by-zero',
      validate: async (result: any, cellId: string) => {
        if (result === Infinity || result === -Infinity || result === '#DIV/0!') {
          return {
            valid: true,
            errors: [],
            warnings: ['Division by zero detected']
          };
        }
        return { valid: true, errors: [], warnings: [] };
      }
    });

    // Rule: VLOOKUP results should be valid
    this.validationRules.push({
      name: 'vlookup-validation',
      validate: async (result: any, cellId: string) => {
        if (cellId.toLowerCase().includes('vlookup')) {
          if (result === '#N/A') {
            return {
              valid: true,
              errors: [],
              warnings: ['VLOOKUP returned #N/A - value not found']
            };
          }
          if (result === '#REF!') {
            return {
              valid: false,
              errors: ['VLOOKUP returned #REF! - invalid reference'],
              warnings: []
            };
          }
        }
        return { valid: true, errors: [], warnings: [] };
      }
    });

    // Rule: SUM should handle empty cells as zero
    this.validationRules.push({
      name: 'sum-empty-cells',
      validate: async (result: any, cellId: string) => {
        if (cellId.toLowerCase().includes('sum')) {
          if (result === null || result === undefined) {
            return {
              valid: false,
              errors: ['SUM should return 0 for empty ranges, not null'],
              warnings: []
            };
          }
        }
        return { valid: true, errors: [], warnings: [] };
      }
    });

    // Rule: Date calculations should return valid dates
    this.validationRules.push({
      name: 'date-validation',
      validate: async (result: any, cellId: string) => {
        if (result instanceof Date) {
          if (isNaN(result.getTime())) {
            return {
              valid: false,
              errors: ['Invalid date result'],
              warnings: []
            };
          }

          // Check for reasonable date range (Excel date system limits)
          const year = result.getFullYear();
          if (year < 1900 || year > 9999) {
            return {
              valid: true,
              errors: [],
              warnings: [`Date ${result} is outside Excel date range (1900-9999)`]
            };
          }
        }
        return { valid: true, errors: [], warnings: [] };
      }
    });
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }

  /**
   * Remove validation rule by name
   */
  removeValidationRule(name: string): void {
    this.validationRules = this.validationRules.filter(rule => rule.name !== name);
  }

  /**
   * Set known result for a cell (for regression testing)
   */
  setKnownResult(cellId: string, expectedValue: any): void {
    this.knownResults.set(cellId, expectedValue);
  }

  /**
   * Load known results from Excel file analysis
   */
  loadKnownResults(results: Record<string, any>): void {
    for (const [cellId, value] of Object.entries(results)) {
      this.knownResults.set(cellId, value);
    }
  }

  /**
   * Validate entire sheet results
   */
  async validateSheet(sheetResults: Map<string, any>, expectedResults?: Map<string, any>): Promise<SheetValidationResult> {
    const result: SheetValidationResult = {
      valid: true,
      totalCells: sheetResults.size,
      validCells: 0,
      invalidCells: 0,
      cellResults: new Map(),
      summary: {
        errors: 0,
        warnings: 0,
        matches: 0,
        mismatches: 0
      }
    };

    for (const [cellId, value] of sheetResults) {
      const expectedValue = expectedResults?.get(cellId);
      const cellValidation = await this.validateResult(value, cellId, expectedValue);

      result.cellResults.set(cellId, cellValidation);

      if (cellValidation.valid) {
        result.validCells++;
        result.summary.matches++;
      } else {
        result.valid = false;
        result.invalidCells++;
        result.summary.mismatches++;
      }

      result.summary.errors += cellValidation.errors.length;
      result.summary.warnings += cellValidation.warnings.length;
    }

    return result;
  }

  /**
   * Generate validation report
   */
  generateReport(validationResults: SheetValidationResult): string {
    const lines: string[] = [];

    lines.push('=== Formula Validation Report ===');
    lines.push(`Total Cells: ${validationResults.totalCells}`);
    lines.push(`Valid Cells: ${validationResults.validCells}`);
    lines.push(`Invalid Cells: ${validationResults.invalidCells}`);
    lines.push(`Errors: ${validationResults.summary.errors}`);
    lines.push(`Warnings: ${validationResults.summary.warnings}`);
    lines.push(`Matches: ${validationResults.summary.matches}`);
    lines.push(`Mismatches: ${validationResults.summary.mismatches}`);
    lines.push('');

    if (validationResults.summary.errors > 0) {
      lines.push('=== ERRORS ===');
      for (const [cellId, cellResult] of validationResults.cellResults) {
        if (cellResult.errors.length > 0) {
          lines.push(`${cellId}:`);
          for (const error of cellResult.errors) {
            lines.push(`  ERROR: ${error}`);
          }
        }
      }
      lines.push('');
    }

    if (validationResults.summary.warnings > 0) {
      lines.push('=== WARNINGS ===');
      for (const [cellId, cellResult] of validationResults.cellResults) {
        if (cellResult.warnings.length > 0) {
          lines.push(`${cellId}:`);
          for (const warning of cellResult.warnings) {
            lines.push(`  WARNING: ${warning}`);
          }
        }
      }
      lines.push('');
    }

    return lines.join('\\n');
  }

  /**
   * Set tolerance for numeric comparisons
   */
  setTolerance(tolerance: number): void {
    this.tolerance = new Decimal(tolerance);
  }

  /**
   * Get current tolerance
   */
  getTolerance(): number {
    return this.tolerance.toNumber();
  }

  /**
   * Clear all known results
   */
  clearKnownResults(): void {
    this.knownResults.clear();
  }

  /**
   * Export validation configuration
   */
  exportConfig(): any {
    return {
      tolerance: this.tolerance.toString(),
      knownResults: Object.fromEntries(this.knownResults),
      validationRules: this.validationRules.map(rule => ({
        name: rule.name,
        // Note: functions can't be serialized, so this is just metadata
      }))
    };
  }

  /**
   * Import validation configuration
   */
  importConfig(config: any): void {
    if (config.tolerance) {
      this.tolerance = new Decimal(config.tolerance);
    }

    if (config.knownResults) {
      this.knownResults.clear();
      for (const [cellId, value] of Object.entries(config.knownResults)) {
        this.knownResults.set(cellId, value);
      }
    }

    // Note: Validation rules need to be re-added programmatically
    // as functions can't be deserialized
  }
}

// Type definitions for validation

interface ValidationResult {
  valid: boolean;
  cellId: string;
  result: any;
  expectedValue?: any;
  errors: string[];
  warnings: string[];
}

interface ValidationRule {
  name: string;
  validate: (result: any, cellId: string) => Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
}

interface SheetValidationResult {
  valid: boolean;
  totalCells: number;
  validCells: number;
  invalidCells: number;
  cellResults: Map<string, ValidationResult>;
  summary: {
    errors: number;
    warnings: number;
    matches: number;
    mismatches: number;
  };
}

export { ValidationResult, ValidationRule, SheetValidationResult };
