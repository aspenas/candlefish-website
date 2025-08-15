#!/usr/bin/env ts-node

// Excel Structure Analysis Tool
// Analyzes the Kind Home Paint Excel files to understand their structure

import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

interface SheetAnalysis {
  sheetName: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  sampleData: any[];
  containsNumbers: boolean;
  containsMeasurements: boolean;
}

interface FileAnalysis {
  fileName: string;
  sheets: SheetAnalysis[];
  recommendedMeasurementSheet: string | null;
  recommendedPricingSheet: string | null;
}

class ExcelStructureAnalyzer {
  private testCasesDir: string;

  constructor() {
    this.testCasesDir = '/Users/patricksmith/candlefish-ai/projects/paintbox/testcases';
  }

  async analyzeAllFiles(): Promise<void> {
    console.log('🔍 Analyzing Excel File Structure');
    console.log('=' .repeat(60));
    console.log();

    const files = fs.readdirSync(this.testCasesDir);
    const excelFiles = files.filter(file => file.endsWith('.xlsx') && file.includes('BART'));

    for (const fileName of excelFiles) {
      const analysis = await this.analyzeFile(fileName);
      this.displayAnalysis(analysis);
    }
  }

  private async analyzeFile(fileName: string): Promise<FileAnalysis> {
    console.log(`📊 Analyzing: ${fileName}`);
    
    const filePath = path.join(this.testCasesDir, fileName);
    const workbook = XLSX.readFile(filePath);
    
    const sheets: SheetAnalysis[] = [];
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const analysis = this.analyzeSheet(sheet, sheetName);
      sheets.push(analysis);
    }
    
    return {
      fileName,
      sheets,
      recommendedMeasurementSheet: this.findRecommendedSheet(sheets, 'measurements'),
      recommendedPricingSheet: this.findRecommendedSheet(sheets, 'pricing'),
    };
  }

  private analyzeSheet(sheet: XLSX.WorkSheet, sheetName: string): SheetAnalysis {
    // Get the range of the sheet
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    const rowCount = range.e.r - range.s.r + 1;
    const columnCount = range.e.c - range.s.c + 1;
    
    // Convert to JSON to analyze structure
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Extract headers (first non-empty row)
    let headers: string[] = [];
    for (const row of jsonData) {
      if (Array.isArray(row) && row.some(cell => cell)) {
        headers = row.map(cell => String(cell || '').trim()).filter(h => h);
        break;
      }
    }
    
    // Get sample data (first few data rows)
    const sampleData = jsonData.slice(1, 6).filter(row => 
      Array.isArray(row) && row.some(cell => cell !== undefined && cell !== '')
    );
    
    // Check if sheet contains numbers and measurements
    const allText = JSON.stringify(jsonData).toLowerCase();
    const containsNumbers = /\d+\.?\d*/.test(allText);
    const containsMeasurements = this.detectMeasurementKeywords(allText, headers);
    
    return {
      sheetName,
      rowCount,
      columnCount,
      headers,
      sampleData,
      containsNumbers,
      containsMeasurements,
    };
  }

  private detectMeasurementKeywords(text: string, headers: string[]): boolean {
    const measurementKeywords = [
      'length', 'width', 'height', 'sq ft', 'square footage', 'square feet',
      'measurement', 'dimension', 'area', 'perimeter', 'linear feet', 'lf',
      'door', 'window', 'siding', 'trim', 'fascia', 'soffit',
      'paint', 'primer', 'coating', 'gallons', 'coverage',
      'labor', 'hours', 'cost', 'price', 'estimate'
    ];
    
    const headerText = headers.join(' ').toLowerCase();
    
    return measurementKeywords.some(keyword => 
      text.includes(keyword) || headerText.includes(keyword)
    );
  }

  private findRecommendedSheet(sheets: SheetAnalysis[], type: 'measurements' | 'pricing'): string | null {
    if (type === 'measurements') {
      // Look for sheets with measurement-related content
      const candidates = sheets.filter(sheet => 
        sheet.containsMeasurements && 
        sheet.rowCount > 5 &&
        (sheet.sheetName.toLowerCase().includes('measure') ||
         sheet.sheetName.toLowerCase().includes('ext') ||
         sheet.sheetName.toLowerCase().includes('int') ||
         sheet.sheetName.toLowerCase().includes('takeoff'))
      );
      
      // Prioritize by name patterns
      const priorities = ['ext measure', 'int measure', 'measure', 'takeoff', 'estimate'];
      for (const priority of priorities) {
        const match = candidates.find(sheet => 
          sheet.sheetName.toLowerCase().includes(priority)
        );
        if (match) return match.sheetName;
      }
      
      return candidates.length > 0 ? candidates[0].sheetName : null;
    }
    
    if (type === 'pricing') {
      // Look for sheets with pricing information
      const candidates = sheets.filter(sheet =>
        sheet.containsNumbers &&
        (sheet.sheetName.toLowerCase().includes('price') ||
         sheet.sheetName.toLowerCase().includes('formula') ||
         sheet.sheetName.toLowerCase().includes('total') ||
         sheet.sheetName.toLowerCase().includes('summary'))
      );
      
      const priorities = ['formula sheet', 'pricing', 'summary', 'total'];
      for (const priority of priorities) {
        const match = candidates.find(sheet => 
          sheet.sheetName.toLowerCase().includes(priority)
        );
        if (match) return match.sheetName;
      }
      
      return candidates.length > 0 ? candidates[0].sheetName : null;
    }
    
    return null;
  }

  private displayAnalysis(analysis: FileAnalysis): void {
    console.log(`\n📄 File: ${analysis.fileName}`);
    console.log(`   Total Sheets: ${analysis.sheets.length}`);
    console.log(`   Recommended Measurement Sheet: ${analysis.recommendedMeasurementSheet || 'None found'}`);
    console.log(`   Recommended Pricing Sheet: ${analysis.recommendedPricingSheet || 'None found'}`);
    
    console.log('\n   📋 Sheet Details:');
    for (const sheet of analysis.sheets) {
      console.log(`   ${sheet.sheetName}:`);
      console.log(`     - Rows: ${sheet.rowCount}, Columns: ${sheet.columnCount}`);
      console.log(`     - Contains Numbers: ${sheet.containsNumbers ? '✅' : '❌'}`);
      console.log(`     - Contains Measurements: ${sheet.containsMeasurements ? '✅' : '❌'}`);
      
      if (sheet.headers.length > 0) {
        console.log(`     - Headers: ${sheet.headers.slice(0, 10).join(', ')}${sheet.headers.length > 10 ? '...' : ''}`);
      }
      
      // Show sample data for measurement sheets
      if (sheet.containsMeasurements && sheet.sampleData.length > 0) {
        console.log(`     - Sample Data Row: ${JSON.stringify(sheet.sampleData[0])}`);
      }
    }
    
    console.log('\n' + '-'.repeat(60));
  }

  async extractSampleMeasurements(fileName: string): Promise<void> {
    console.log(`\n🔬 Extracting Sample Measurements from: ${fileName}`);
    
    const filePath = path.join(this.testCasesDir, fileName);
    const workbook = XLSX.readFile(filePath);
    
    // Try common measurement sheet names
    const measurementSheetNames = [
      'Ext Measure', 'Int Measure', 'Exterior Measure', 'Interior Measure',
      'Measurements', 'Takeoff', 'Estimate', 'Details'
    ];
    
    for (const sheetName of measurementSheetNames) {
      if (workbook.SheetNames.includes(sheetName)) {
        console.log(`\n📊 Analyzing Sheet: ${sheetName}`);
        
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        console.log(`   Total Rows: ${jsonData.length}`);
        
        if (jsonData.length > 0) {
          console.log('\n   📋 Headers (first row):');
          const firstRow = jsonData[0] as any;
          if (firstRow && typeof firstRow === 'object') {
            Object.keys(firstRow).forEach(key => {
              console.log(`     - ${key}`);
            });
          }
          
          console.log('\n   📄 Sample Data (first 3 rows):');
          jsonData.slice(0, 3).forEach((row, index) => {
            console.log(`     Row ${index + 1}:`, JSON.stringify(row, null, 2));
          });
        }
        
        break;
      }
    }
  }
}

// Run analysis if called directly
async function main() {
  const analyzer = new ExcelStructureAnalyzer();
  await analyzer.analyzeAllFiles();
  
  // Extract sample measurements from first file for detailed analysis
  console.log('\n🔬 DETAILED SAMPLE EXTRACTION');
  console.log('=' .repeat(60));
  
  const firstFile = 'Beta - Paul Sakry - BART 3.2 (1).xlsx';
  await analyzer.extractSampleMeasurements(firstFile);
}

if (process.argv[1]?.includes('analyze-excel-structure')) {
  main().catch(console.error);
}

export { ExcelStructureAnalyzer };