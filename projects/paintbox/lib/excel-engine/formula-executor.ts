/**
 * Formula Executor
 * Executes parsed formulas with decimal.js precision
 * Handles all Excel operations and maintains Excel-compatible behavior
 */

import Decimal from 'decimal.js';
import { evaluate } from 'mathjs';
import {
  FormulaParseResult,
  EvaluationContext,
  CalculationOptions,
  CellValue
} from './types';
import { ExcelFunctions } from './excel-functions';

export class FormulaExecutor {
  private functions: ExcelFunctions;
  private options: CalculationOptions;

  constructor(options: CalculationOptions) {
    this.options = options;
    this.functions = new ExcelFunctions();

    // Configure Decimal.js for Excel compatibility
    Decimal.set({
      precision: 15,
      rounding: Decimal.ROUND_HALF_UP
    });
  }

  /**
   * Execute parsed formula with given context
   */
  async execute(parseResult: FormulaParseResult, context: EvaluationContext): Promise<any> {
    if (parseResult.type === 'value') {
      return parseResult.value;
    }

    if (parseResult.type === 'error') {
      throw new Error(parseResult.error);
    }

    if (parseResult.type !== 'formula' || !parseResult.value) {
      throw new Error('Invalid parse result for execution');
    }

    try {
      return await this.executeAST(parseResult.value, context);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Execution error: ${String(error)}`);
    }
  }

  /**
   * Execute AST node
   */
  private async executeAST(ast: any, context: EvaluationContext): Promise<any> {
    if (!ast || typeof ast !== 'object') {
      return ast;
    }

    switch (ast.type) {
      case 'number':
        return new Decimal(ast.value);

      case 'string':
        return ast.value;

      case 'boolean':
        return ast.value;

      case 'cell':
        return await this.resolveCellReference(ast.key, context);

      case 'range':
        return await this.resolveRangeReference(ast, context);

      case 'function':
        return await this.executeFunction(ast, context);

      case 'operator':
        return await this.executeOperator(ast, context);

      case 'expression':
        // For fallback parsed formulas
        return await this.executeExpression(ast, context);

      default:
        // Try to evaluate as mathematical expression
        try {
          const result = await this.evaluateMathExpression(ast, context);
          return result;
        } catch {
          return ast;
        }
    }
  }

  /**
   * Resolve cell reference
   */
  private async resolveCellReference(cellRef: string, context: EvaluationContext): Promise<any> {
    const [sheetName, cellAddress] = cellRef.includes('!') ? cellRef.split('!') : [context.currentSheet, cellRef];

    const sheet = context.sheets.get(sheetName);
    if (!sheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }

    const cellValue = sheet.cells.get(cellAddress);
    if (!cellValue) {
      return 0; // Excel returns 0 for empty cells in calculations
    }

    if (cellValue.error) {
      throw new Error(`Cell error in ${cellRef}: ${cellValue.error}`);
    }

    return cellValue.value;
  }

  /**
   * Resolve range reference
   */
  private async resolveRangeReference(rangeAST: any, context: EvaluationContext): Promise<any[]> {
    const startCell = rangeAST.start;
    const endCell = rangeAST.end;

    // Parse range bounds
    const [startSheet, startAddr] = startCell.includes('!') ? startCell.split('!') : [context.currentSheet, startCell];
    const [endSheet, endAddr] = endCell.includes('!') ? endCell.split('!') : [context.currentSheet, endCell];

    if (startSheet !== endSheet) {
      throw new Error('Cross-sheet ranges not supported');
    }

    const sheet = context.sheets.get(startSheet);
    if (!sheet) {
      throw new Error(`Sheet not found: ${startSheet}`);
    }

    // Extract row and column bounds
    const startMatch = startAddr.match(/([A-Z]+)(\d+)/);
    const endMatch = endAddr.match(/([A-Z]+)(\d+)/);

    if (!startMatch || !endMatch) {
      throw new Error('Invalid range format');
    }

    const startCol = this.columnToNumber(startMatch[1]);
    const startRow = parseInt(startMatch[2]);
    const endCol = this.columnToNumber(endMatch[1]);
    const endRow = parseInt(endMatch[2]);

    const values: any[] = [];

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const colLetter = this.numberToColumn(col);
        const cellAddr = `${colLetter}${row}`;
        const cellValue = sheet.cells.get(cellAddr);

        if (cellValue?.error) {
          values.push(cellValue.error);
        } else {
          values.push(cellValue?.value ?? 0);
        }
      }
    }

    return values;
  }

  /**
   * Execute function call
   */
  private async executeFunction(funcAST: any, context: EvaluationContext): Promise<any> {
    const functionName = funcAST.name.toUpperCase();
    const args = [];

    // Evaluate all arguments
    for (const arg of funcAST.arguments || []) {
      const argValue = await this.executeAST(arg, context);
      args.push(argValue);
    }

    // Call Excel function
    return await this.functions.call(functionName, context, ...args);
  }

  /**
   * Execute operator
   */
  private async executeOperator(opAST: any, context: EvaluationContext): Promise<any> {
    const operator = opAST.operator;
    const left = await this.executeAST(opAST.left, context);
    const right = await this.executeAST(opAST.right, context);

    return this.applyOperator(operator, left, right);
  }

  /**
   * Apply arithmetic operator with Decimal precision
   */
  private applyOperator(operator: string, left: any, right: any): any {
    // Convert to Decimal for precise arithmetic
    const leftDecimal = this.toDecimal(left);
    const rightDecimal = this.toDecimal(right);

    switch (operator) {
      case '+':
        return leftDecimal.plus(rightDecimal);
      case '-':
        return leftDecimal.minus(rightDecimal);
      case '*':
        return leftDecimal.mul(rightDecimal);
      case '/':
        if (rightDecimal.isZero()) {
          throw new Error('#DIV/0!');
        }
        return leftDecimal.div(rightDecimal);
      case '^':
        return leftDecimal.pow(rightDecimal);
      case '%':
        return leftDecimal.div(100);
      case '&':
        // String concatenation
        return String(left) + String(right);
      case '=':
        return this.compareValues(left, right) === 0;
      case '<>':
        return this.compareValues(left, right) !== 0;
      case '<':
        return this.compareValues(left, right) < 0;
      case '>':
        return this.compareValues(left, right) > 0;
      case '<=':
        return this.compareValues(left, right) <= 0;
      case '>=':
        return this.compareValues(left, right) >= 0;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Execute expression (fallback for complex formulas)
   */
  private async executeExpression(exprAST: any, context: EvaluationContext): Promise<any> {
    let expression = exprAST.expression;

    // Replace cell references with values
    const cellRefRegex = /(?:([^!]+)!)?([A-Z]+\d+)/g;
    const matches = Array.from(expression.matchAll(cellRefRegex));

    for (const match of matches) {
      const fullRef = match[0];
      const sheetName = match[1] || context.currentSheet;
      const cellAddr = match[2];

      try {
        const value = await this.resolveCellReference(`${sheetName}!${cellAddr}`, context);
        const numericValue = this.toNumeric(value);
        expression = expression.replace(fullRef, numericValue.toString());
      } catch (error) {
        expression = expression.replace(fullRef, '0');
      }
    }

    // Evaluate using mathjs for complex expressions
    try {
      return evaluate(expression);
    } catch (error) {
      throw new Error(`Expression evaluation failed: ${error}`);
    }
  }

  /**
   * Evaluate mathematical expression
   */
  private async evaluateMathExpression(expr: any, context: EvaluationContext): Promise<any> {
    if (typeof expr === 'string') {
      // Replace Excel functions with JavaScript equivalents where possible
      let jsExpr = expr
        .replace(/\bSUM\(/g, 'sum(')
        .replace(/\bAVERAGE\(/g, 'mean(')
        .replace(/\bMAX\(/g, 'max(')
        .replace(/\bMIN\(/g, 'min(');

      return evaluate(jsExpr);
    }

    return expr;
  }

  /**
   * Convert value to Decimal for precise arithmetic
   */
  private toDecimal(value: any): Decimal {
    if (value instanceof Decimal) {
      return value;
    }

    if (typeof value === 'number') {
      return new Decimal(value);
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? new Decimal(0) : new Decimal(parsed);
    }

    if (typeof value === 'boolean') {
      return new Decimal(value ? 1 : 0);
    }

    return new Decimal(0);
  }

  /**
   * Convert value to numeric for calculations
   */
  private toNumeric(value: any): number {
    if (typeof value === 'number') {
      return value;
    }

    if (value instanceof Decimal) {
      return value.toNumber();
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }

    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    return 0;
  }

  /**
   * Compare values for logical operators
   */
  private compareValues(left: any, right: any): number {
    // Convert to comparable types
    const leftNum = this.toNumeric(left);
    const rightNum = this.toNumeric(right);

    if (!isNaN(leftNum) && !isNaN(rightNum)) {
      return leftNum - rightNum;
    }

    // String comparison
    const leftStr = String(left).toLowerCase();
    const rightStr = String(right).toLowerCase();
    
    if (leftStr < rightStr) return -1;
    if (leftStr > rightStr) return 1;
    return 0;
  }

  /**
   * Convert column letter to number
   */
  private columnToNumber(column: string): number {
    let result = 0;
    for (let i = 0; i < column.length; i++) {
      result = result * 26 + (column.charCodeAt(i) - 64);
    }
    return result;
  }

  /**
   * Convert number to column letter
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
   * Handle Excel errors
   */
  private handleExcelError(error: string): any {
    switch (error) {
      case '#DIV/0!':
        return { error: '#DIV/0!' };
      case '#N/A':
        return { error: '#N/A' };
      case '#NAME?':
        return { error: '#NAME?' };
      case '#NULL!':
        return { error: '#NULL!' };
      case '#NUM!':
        return { error: '#NUM!' };
      case '#REF!':
        return { error: '#REF!' };
      case '#VALUE!':
        return { error: '#VALUE!' };
      default:
        return { error: error };
    }
  }
}
