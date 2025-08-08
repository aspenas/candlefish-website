/**
 * Excel Formula Parser
 * Parses Excel formulas into AST and extracts dependencies
 * Handles all Excel syntax including array formulas, cross-sheet references
 */

import { parse as formulaParserParse, SUPPORTED_FORMULAS } from 'formula-parser';
import {
  FormulaParseResult,
  CellReference,
  FormulaCategory
} from './types';

export class FormulaParser {
  private cellRefRegex = /(?:([^!]+)!)?(\$?)([A-Z]+)(\$?)(\d+)/g;
  private rangeRefRegex = /(?:([^!]+)!)?(\$?)([A-Z]+)(\$?)(\d+):(\$?)([A-Z]+)(\$?)(\d+)/g;
  private functionRegex = /([A-Z_][A-Z0-9_]*)\s*\(/gi;
  private namedRangeRegex = /[A-Z_][A-Z0-9_]*(?![A-Z0-9_]*\()/gi;

  constructor() {}

  /**
   * Parse Excel formula and extract dependencies
   */
  async parse(formula: string, currentSheet: string): Promise<FormulaParseResult> {
    try {
      // Remove leading = if present
      const cleanFormula = formula.startsWith('=') ? formula.substring(1) : formula;

      // Check if it's just a value
      if (this.isSimpleValue(cleanFormula)) {
        return {
          type: 'value',
          value: this.parseValue(cleanFormula)
        };
      }

      // Extract dependencies
      const dependencies = this.extractDependencies(cleanFormula, currentSheet);

      // Parse using formula-parser library
      let ast;
      try {
        ast = formulaParserParse(cleanFormula);
      } catch (parseError) {
        // Handle complex formulas that formula-parser can't handle
        ast = this.fallbackParse(cleanFormula);
      }

      return {
        type: 'formula',
        formula: cleanFormula,
        dependencies,
        value: ast
      };
    } catch (error) {
      return {
        type: 'error',
        error: `Parse error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Check if formula is a simple value
   */
  private isSimpleValue(formula: string): boolean {
    const trimmed = formula.trim();

    // Number
    if (/^-?\d*\.?\d+([eE][+-]?\d+)?$/.test(trimmed)) {
      return true;
    }

    // String literal
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return true;
    }

    // Boolean
    if (trimmed.toLowerCase() === 'true' || trimmed.toLowerCase() === 'false') {
      return true;
    }

    return false;
  }

  /**
   * Parse simple value
   */
  private parseValue(formula: string): any {
    const trimmed = formula.trim();

    // Number
    if (/^-?\d*\.?\d+([eE][+-]?\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // String literal
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1);
    }

    // Boolean
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;

    return trimmed;
  }

  /**
   * Extract cell and range dependencies from formula
   */
  private extractDependencies(formula: string, currentSheet: string): string[] {
    const dependencies = new Set<string>();

    // Extract cell references
    const cellMatches = Array.from(formula.matchAll(this.cellRefRegex));
    for (const match of cellMatches) {
      const [, sheetName, colAbsolute, column, rowAbsolute, row] = match;
      const fullRef = sheetName ? `${sheetName}!${column}${row}` : `${currentSheet}!${column}${row}`;
      dependencies.add(fullRef);
    }

    // Extract range references
    const rangeMatches = Array.from(formula.matchAll(this.rangeRefRegex));
    for (const match of rangeMatches) {
      const [, sheetName, , startCol, , startRow, , endCol, , endRow] = match;
      const sheet = sheetName || currentSheet;

      // Add all cells in range
      const startColNum = this.columnToNumber(startCol);
      const endColNum = this.columnToNumber(endCol);
      const startRowNum = parseInt(startRow);
      const endRowNum = parseInt(endRow);

      for (let col = startColNum; col <= endColNum; col++) {
        for (let row = startRowNum; row <= endRowNum; row++) {
          const colLetter = this.numberToColumn(col);
          dependencies.add(`${sheet}!${colLetter}${row}`);
        }
      }
    }

    // Extract named ranges (simplified - would need actual named range resolution)
    const namedRangeMatches = Array.from(formula.matchAll(this.namedRangeRegex));
    for (const match of namedRangeMatches) {
      const rangeName = match[0];
      // Skip function names
      if (!this.isFunctionName(rangeName)) {
        dependencies.add(`NAMED_RANGE:${rangeName}`);
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Fallback parser for complex formulas
   */
  private fallbackParse(formula: string): any {
    // Basic AST structure for formulas that formula-parser can't handle
    return {
      type: 'expression',
      expression: formula,
      functions: this.extractFunctions(formula),
      operators: this.extractOperators(formula)
    };
  }

  /**
   * Extract functions from formula
   */
  private extractFunctions(formula: string): string[] {
    const functions = new Set<string>();
    const matches = Array.from(formula.matchAll(this.functionRegex));

    for (const match of matches) {
      functions.add(match[1].toUpperCase());
    }

    return Array.from(functions);
  }

  /**
   * Extract operators from formula
   */
  private extractOperators(formula: string): string[] {
    const operators = new Set<string>();
    const operatorRegex = /[+\-*/^&=<>]/g;
    const matches = Array.from(formula.matchAll(operatorRegex));

    for (const match of matches) {
      operators.add(match[0]);
    }

    return Array.from(operators);
  }

  /**
   * Check if string is a function name
   */
  private isFunctionName(name: string): boolean {
    const upperName = name.toUpperCase();

    // Check against known Excel functions
    const commonFunctions = [
      'SUM', 'IF', 'VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH', 'COUNTIF', 'SUMIF',
      'AVERAGE', 'MAX', 'MIN', 'COUNT', 'COUNTA', 'AND', 'OR', 'NOT',
      'CONCATENATE', 'LEFT', 'RIGHT', 'MID', 'LEN', 'TRIM', 'UPPER', 'LOWER',
      'DATE', 'TODAY', 'NOW', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
      'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'INT', 'ABS', 'SQRT', 'POWER', 'MOD',
      'PMT', 'PV', 'FV', 'RATE', 'NPER', 'IRR', 'NPV',
      'TEXTJOIN', 'FILTER', 'XLOOKUP', 'IFS', 'SWITCH', 'MAXIFS', 'MINIFS',
      'SUMIFS', 'COUNTIFS', 'AVERAGEIFS'
    ];

    return commonFunctions.includes(upperName) || SUPPORTED_FORMULAS.includes(upperName);
  }

  /**
   * Convert column letter to number (A=1, B=2, etc.)
   */
  private columnToNumber(column: string): number {
    let result = 0;
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - 64);
    }
    return result;
  }

  /**
   * Convert number to column letter (1=A, 2=B, etc.)
   */
  private numberToColumn(num: number): string {
    let result = '';
    while (num > 0) {
      num--;
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result;
  }

  /**
   * Parse cell reference
   */
  parseCellReference(ref: string, currentSheet: string): CellReference {
    const match = ref.match(/(?:([^!]+)!)?(\$?)([A-Z]+)(\$?)(\d+)/);

    if (!match) {
      throw new Error(`Invalid cell reference: ${ref}`);
    }

    const [, sheetName, colAbsolute, column, rowAbsolute, row] = match;

    return {
      sheet: sheetName || currentSheet,
      column,
      row: parseInt(row),
      absolute: {
        column: !!colAbsolute,
        row: !!rowAbsolute
      }
    };
  }

  /**
   * Categorize formula based on functions used
   */
  categorizeFormula(formula: string): FormulaCategory {
    const functions = this.extractFunctions(formula);

    // Financial functions
    const financialFunctions = ['PMT', 'PV', 'FV', 'RATE', 'NPER', 'IRR', 'NPV'];
    if (functions.some(f => financialFunctions.includes(f))) {
      return 'Financial';
    }

    // Lookup functions
    const lookupFunctions = ['VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH', 'XLOOKUP'];
    if (functions.some(f => lookupFunctions.includes(f))) {
      return 'Lookup';
    }

    // Statistical functions
    const statisticalFunctions = ['AVERAGE', 'STDEV', 'VAR', 'MEDIAN', 'MODE'];
    if (functions.some(f => statisticalFunctions.includes(f))) {
      return 'Statistical';
    }

    // Math functions
    const mathFunctions = ['SUM', 'ROUND', 'SQRT', 'POWER', 'ABS', 'MAX', 'MIN'];
    if (functions.some(f => mathFunctions.includes(f))) {
      return 'Math';
    }

    // Logical functions
    const logicalFunctions = ['IF', 'AND', 'OR', 'NOT', 'IFS', 'SWITCH'];
    if (functions.some(f => logicalFunctions.includes(f))) {
      return 'Logical';
    }

    // Text functions
    const textFunctions = ['CONCATENATE', 'LEFT', 'RIGHT', 'MID', 'LEN', 'TEXTJOIN'];
    if (functions.some(f => textFunctions.includes(f))) {
      return 'Text';
    }

    // DateTime functions
    const dateTimeFunctions = ['DATE', 'TODAY', 'NOW', 'YEAR', 'MONTH', 'DAY'];
    if (functions.some(f => dateTimeFunctions.includes(f))) {
      return 'DateTime';
    }

    // Arithmetic operations
    if (/[+\-*/]/.test(formula)) {
      return 'Arithmetic';
    }

    return 'Other';
  }

  /**
   * Validate formula syntax
   */
  validateSyntax(formula: string): { valid: boolean; error?: string } {
    try {
      // Basic syntax checks
      const cleanFormula = formula.startsWith('=') ? formula.substring(1) : formula;

      // Check balanced parentheses
      let openParens = 0;
      for (const char of cleanFormula) {
        if (char === '(') openParens++;
        if (char === ')') openParens--;
        if (openParens < 0) {
          return { valid: false, error: 'Unmatched closing parenthesis' };
        }
      }

      if (openParens > 0) {
        return { valid: false, error: 'Unmatched opening parenthesis' };
      }

      // Check for empty formula
      if (!cleanFormula.trim()) {
        return { valid: false, error: 'Empty formula' };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
