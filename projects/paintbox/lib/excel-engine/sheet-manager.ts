/**
 * Sheet Manager
 * Manages worksheets, cells, and named ranges for the Excel engine
 * Handles all 25 sheets from the BART estimator workbook
 */

import {
  Sheet,
  CellValue,
  CellReference,
  NamedRange,
  SheetInfo
} from './types';

export class SheetManager {
  private sheets: Map<string, Sheet> = new Map();
  private namedRanges: Map<string, CellReference | CellReference[]> = new Map();
  private sheetOrder: string[] = [];

  constructor() {}

  /**
   * Create a new sheet
   */
  async createSheet(name: string, options: { maxRows?: number; maxColumns?: number } = {}): Promise<void> {
    if (this.sheets.has(name)) {
      throw new Error(`Sheet '${name}' already exists`);
    }

    const sheet: Sheet = {
      name,
      cells: new Map<string, CellValue>(),
      lastRow: 0,
      lastColumn: 0
    };

    this.sheets.set(name, sheet);
    this.sheetOrder.push(name);

    // Pre-allocate cells if specified (for performance)
    if (options.maxRows && options.maxColumns) {
      await this.preallocateCells(name, options.maxRows, options.maxColumns);
    }
  }

  /**
   * Delete a sheet
   */
  async deleteSheet(name: string): Promise<void> {
    if (!this.sheets.has(name)) {
      throw new Error(`Sheet '${name}' does not exist`);
    }

    this.sheets.delete(name);
    this.sheetOrder = this.sheetOrder.filter(sheetName => sheetName !== name);

    // Remove any named ranges that reference this sheet
    for (const [rangeName, range] of this.namedRanges.entries()) {
      if (Array.isArray(range)) {
        if (range.some(ref => ref.sheet === name)) {
          this.namedRanges.delete(rangeName);
        }
      } else {
        if (range.sheet === name) {
          this.namedRanges.delete(rangeName);
        }
      }
    }
  }

  /**
   * Rename a sheet
   */
  async renameSheet(oldName: string, newName: string): Promise<void> {
    const sheet = this.sheets.get(oldName);
    if (!sheet) {
      throw new Error(`Sheet '${oldName}' does not exist`);
    }

    if (this.sheets.has(newName)) {
      throw new Error(`Sheet '${newName}' already exists`);
    }

    // Update sheet
    sheet.name = newName;
    this.sheets.delete(oldName);
    this.sheets.set(newName, sheet);

    // Update sheet order
    const index = this.sheetOrder.indexOf(oldName);
    if (index !== -1) {
      this.sheetOrder[index] = newName;
    }

    // Update named ranges
    for (const [rangeName, range] of this.namedRanges.entries()) {
      if (Array.isArray(range)) {
        for (const ref of range) {
          if (ref.sheet === oldName) {
            ref.sheet = newName;
          }
        }
      } else {
        if (range.sheet === oldName) {
          range.sheet = newName;
        }
      }
    }
  }

  /**
   * Get a sheet by name
   */
  getSheet(name: string): Sheet | undefined {
    return this.sheets.get(name);
  }

  /**
   * Get all sheets
   */
  getAllSheets(): Map<string, Sheet> {
    return new Map(this.sheets);
  }

  /**
   * Get sheet names in order
   */
  getSheetNames(): string[] {
    return [...this.sheetOrder];
  }

  /**
   * Check if sheet exists
   */
  hasSheet(name: string): boolean {
    return this.sheets.has(name);
  }

  /**
   * Set cell value
   */
  async setCellValue(sheetName: string, cellRef: string, value: CellValue): Promise<void> {
    const sheet = this.sheets.get(sheetName);
    if (!sheet) {
      throw new Error(`Sheet '${sheetName}' does not exist`);
    }

    const parsedRef = this.parseCellReference(cellRef);

    // Update sheet bounds
    if (parsedRef.row > sheet.lastRow) {
      sheet.lastRow = parsedRef.row;
    }

    const colNum = this.columnToNumber(parsedRef.column);
    if (colNum > sheet.lastColumn) {
      sheet.lastColumn = colNum;
    }

    // Store the value
    sheet.cells.set(cellRef.toUpperCase(), value);
  }

  /**
   * Get cell value
   */
  async getCellValue(sheetName: string, cellRef: string): Promise<CellValue | undefined> {
    const sheet = this.sheets.get(sheetName);
    if (!sheet) {
      return undefined;
    }

    return sheet.cells.get(cellRef.toUpperCase());
  }

  /**
   * Set range of values
   */
  async setRangeValues(sheetName: string, startRef: string, endRef: string, values: any[][]): Promise<void> {
    const sheet = this.sheets.get(sheetName);
    if (!sheet) {
      throw new Error(`Sheet '${sheetName}' does not exist`);
    }

    const startParsed = this.parseCellReference(startRef);
    const endParsed = this.parseCellReference(endRef);

    const startCol = this.columnToNumber(startParsed.column);
    const endCol = this.columnToNumber(endParsed.column);
    const startRow = startParsed.row;
    const endRow = endParsed.row;

    if (values.length !== (endRow - startRow + 1)) {
      throw new Error('Values array height does not match range height');
    }

    for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
      const row = values[rowIndex];
      const actualRow = startRow + rowIndex;

      if (row.length !== (endCol - startCol + 1)) {
        throw new Error(`Values array width at row ${rowIndex} does not match range width`);
      }

      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const actualCol = startCol + colIndex;
        const colLetter = this.numberToColumn(actualCol);
        const cellRef = `${colLetter}${actualRow}`;

        await this.setCellValue(sheetName, cellRef, { value: row[colIndex] });
      }
    }
  }

  /**
   * Get range of values
   */
  async getRangeValues(sheetName: string, startRef: string, endRef: string): Promise<any[][]> {
    const sheet = this.sheets.get(sheetName);
    if (!sheet) {
      throw new Error(`Sheet '${sheetName}' does not exist`);
    }

    const startParsed = this.parseCellReference(startRef);
    const endParsed = this.parseCellReference(endRef);

    const startCol = this.columnToNumber(startParsed.column);
    const endCol = this.columnToNumber(endParsed.column);
    const startRow = startParsed.row;
    const endRow = endParsed.row;

    const values: any[][] = [];

    for (let row = startRow; row <= endRow; row++) {
      const rowValues: any[] = [];

      for (let col = startCol; col <= endCol; col++) {
        const colLetter = this.numberToColumn(col);
        const cellRef = `${colLetter}${row}`;
        const cellValue = await this.getCellValue(sheetName, cellRef);
        rowValues.push(cellValue?.value ?? null);
      }

      values.push(rowValues);
    }

    return values;
  }

  /**
   * Clear cell value
   */
  async clearCell(sheetName: string, cellRef: string): Promise<void> {
    const sheet = this.sheets.get(sheetName);
    if (!sheet) {
      throw new Error(`Sheet '${sheetName}' does not exist`);
    }

    sheet.cells.delete(cellRef.toUpperCase());
  }

  /**
   * Clear range of cells
   */
  async clearRange(sheetName: string, startRef: string, endRef: string): Promise<void> {
    const startParsed = this.parseCellReference(startRef);
    const endParsed = this.parseCellReference(endRef);

    const startCol = this.columnToNumber(startParsed.column);
    const endCol = this.columnToNumber(endParsed.column);
    const startRow = startParsed.row;
    const endRow = endParsed.row;

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const colLetter = this.numberToColumn(col);
        const cellRef = `${colLetter}${row}`;
        await this.clearCell(sheetName, cellRef);
      }
    }
  }

  /**
   * Add named range
   */
  async addNamedRange(name: string, range: NamedRange): Promise<void> {
    const cellRefs: CellReference[] = [];

    for (const destination of range.destinations) {
      if (destination.range.includes(':')) {
        // Range like A1:B10
        const [startRef, endRef] = destination.range.split(':');
        const startParsed = this.parseCellReference(startRef);
        const endParsed = this.parseCellReference(endRef);

        const startCol = this.columnToNumber(startParsed.column);
        const endCol = this.columnToNumber(endParsed.column);
        const startRow = startParsed.row;
        const endRow = endParsed.row;

        for (let row = startRow; row <= endRow; row++) {
          for (let col = startCol; col <= endCol; col++) {
            const colLetter = this.numberToColumn(col);
            cellRefs.push({
              sheet: destination.sheet,
              column: colLetter,
              row: row
            });
          }
        }
      } else {
        // Single cell like A1
        const parsed = this.parseCellReference(destination.range);
        cellRefs.push({
          sheet: destination.sheet,
          column: parsed.column,
          row: parsed.row
        });
      }
    }

    if (cellRefs.length === 1) {
      this.namedRanges.set(name, cellRefs[0]);
    } else {
      this.namedRanges.set(name, cellRefs);
    }
  }

  /**
   * Remove named range
   */
  removeNamedRange(name: string): void {
    this.namedRanges.delete(name);
  }

  /**
   * Get named range
   */
  getNamedRange(name: string): CellReference | CellReference[] | undefined {
    return this.namedRanges.get(name);
  }

  /**
   * Get all named ranges
   */
  getNamedRanges(): Map<string, CellReference | CellReference[]> {
    return new Map(this.namedRanges);
  }

  /**
   * Find cells with formulas
   */
  findFormulaCells(sheetName?: string): Array<{ sheetName: string; cellRef: string; formula: string }> {
    const results: Array<{ sheetName: string; cellRef: string; formula: string }> = [];

    const sheetsToSearch = sheetName ? [sheetName] : this.getSheetNames();

    for (const name of sheetsToSearch) {
      const sheet = this.sheets.get(name);
      if (!sheet) continue;

      for (const [cellRef, cellValue] of sheet.cells) {
        if (cellValue.formula) {
          results.push({
            sheetName: name,
            cellRef,
            formula: cellValue.formula
          });
        }
      }
    }

    return results;
  }

  /**
   * Find cells with values matching criteria
   */
  findCells(criteria: (value: CellValue) => boolean, sheetName?: string): Array<{ sheetName: string; cellRef: string; value: CellValue }> {
    const results: Array<{ sheetName: string; cellRef: string; value: CellValue }> = [];

    const sheetsToSearch = sheetName ? [sheetName] : this.getSheetNames();

    for (const name of sheetsToSearch) {
      const sheet = this.sheets.get(name);
      if (!sheet) continue;

      for (const [cellRef, cellValue] of sheet.cells) {
        if (criteria(cellValue)) {
          results.push({
            sheetName: name,
            cellRef,
            value: cellValue
          });
        }
      }
    }

    return results;
  }

  /**
   * Get sheet statistics
   */
  getSheetStats(sheetName: string): SheetStats | undefined {
    const sheet = this.sheets.get(sheetName);
    if (!sheet) return undefined;

    let formulaCells = 0;
    let valueCells = 0;
    let emptyCells = 0;
    let errorCells = 0;

    for (const [, cellValue] of sheet.cells) {
      if (cellValue.error) {
        errorCells++;
      } else if (cellValue.formula) {
        formulaCells++;
      } else if (cellValue.value !== null && cellValue.value !== undefined && cellValue.value !== '') {
        valueCells++;
      } else {
        emptyCells++;
      }
    }

    return {
      sheetName,
      totalCells: sheet.cells.size,
      formulaCells,
      valueCells,
      emptyCells,
      errorCells,
      lastRow: sheet.lastRow,
      lastColumn: sheet.lastColumn,
      usedRange: `A1:${this.numberToColumn(sheet.lastColumn)}${sheet.lastRow}`
    };
  }

  /**
   * Export sheet data
   */
  exportSheet(sheetName: string): any {
    const sheet = this.sheets.get(sheetName);
    if (!sheet) return null;

    const cellData: Record<string, any> = {};

    for (const [cellRef, cellValue] of sheet.cells) {
      cellData[cellRef] = {
        value: cellValue.value,
        formula: cellValue.formula,
        error: cellValue.error,
        formatted: cellValue.formatted
      };
    }

    return {
      name: sheet.name,
      cells: cellData,
      lastRow: sheet.lastRow,
      lastColumn: sheet.lastColumn
    };
  }

  /**
   * Import sheet data
   */
  async importSheet(data: any): Promise<void> {
    if (this.sheets.has(data.name)) {
      throw new Error(`Sheet '${data.name}' already exists`);
    }

    await this.createSheet(data.name);
    const sheet = this.sheets.get(data.name)!;

    if (data.cells) {
      for (const [cellRef, cellData] of Object.entries(data.cells)) {
        sheet.cells.set(cellRef.toUpperCase(), cellData as CellValue);
      }
    }

    sheet.lastRow = data.lastRow || 0;
    sheet.lastColumn = data.lastColumn || 0;
  }

  /**
   * Pre-allocate cells for performance
   */
  private async preallocateCells(sheetName: string, maxRows: number, maxColumns: number): Promise<void> {
    // This is primarily for memory allocation optimization
    // The actual implementation might vary based on performance requirements
  }

  /**
   * Parse cell reference like A1, $A$1, etc.
   */
  private parseCellReference(cellRef: string): { column: string; row: number; absolute?: { column: boolean; row: boolean } } {
    const match = cellRef.match(/^(\$?)([A-Z]+)(\$?)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid cell reference: ${cellRef}`);
    }

    return {
      column: match[2],
      row: parseInt(match[4]),
      absolute: {
        column: match[1] === '$',
        row: match[3] === '$'
      }
    };
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
   * Get workbook statistics
   */
  getWorkbookStats(): WorkbookStats {
    let totalCells = 0;
    let totalFormulas = 0;
    let totalValues = 0;
    let totalErrors = 0;

    const sheetStats: SheetStats[] = [];

    for (const sheetName of this.getSheetNames()) {
      const stats = this.getSheetStats(sheetName);
      if (stats) {
        sheetStats.push(stats);
        totalCells += stats.totalCells;
        totalFormulas += stats.formulaCells;
        totalValues += stats.valueCells;
        totalErrors += stats.errorCells;
      }
    }

    return {
      totalSheets: this.sheets.size,
      totalCells,
      totalFormulas,
      totalValues,
      totalErrors,
      totalNamedRanges: this.namedRanges.size,
      sheetStats
    };
  }

  /**
   * Clear all sheets and data
   */
  clear(): void {
    this.sheets.clear();
    this.namedRanges.clear();
    this.sheetOrder = [];
  }
}

// Type definitions for sheet management

interface SheetStats {
  sheetName: string;
  totalCells: number;
  formulaCells: number;
  valueCells: number;
  emptyCells: number;
  errorCells: number;
  lastRow: number;
  lastColumn: number;
  usedRange: string;
}

interface WorkbookStats {
  totalSheets: number;
  totalCells: number;
  totalFormulas: number;
  totalValues: number;
  totalErrors: number;
  totalNamedRanges: number;
  sheetStats: SheetStats[];
}

export { SheetStats, WorkbookStats };
