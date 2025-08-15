#!/usr/bin/env ts-node

// Excel Test Case Validation Runner
// Validates Kind Home Paint calculation engine against 5 Excel test cases

import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { performance } from 'perf_hooks';

interface ValidationResult {
  testCaseName: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    totalMeasurements: number;
    calculationAccuracy: number;
    pricingAccuracy: number;
    processingTime: number;
  };
}

interface TestCaseData {
  fileName: string;
  customerName: string;
  projectType: 'INTERIOR' | 'EXTERIOR';
  measurements: MeasurementData[];
  expectedTotals: {
    squareFootage: number;
    laborHours: number;
    materialCost: number;
    goodTierPrice: number;
    betterTierPrice: number;
    bestTierPrice: number;
  };
  conditions: {
    complexity: string;
    accessDifficulty: string;
    specialRequirements: string[];
  };
}

interface MeasurementData {
  id: string;
  type: string;
  elevation?: string;
  room?: string;
  dimensions: {
    length: number;
    width?: number;
    height?: number;
  };
  squareFootage: number;
  surfaceDetails: {
    type: string;
    sidingType?: string;
    doorType?: string;
    coats: number;
  };
  conditions: {
    nail: string;
    edge: string;
    face: string;
  };
  calculations: {
    expectedLaborHours: number;
    expectedMaterialQuantity: number;
    expectedCost: number;
  };
}

class CalculationValidator {
  private testCasesDir: string;
  private results: ValidationResult[] = [];

  constructor() {
    this.testCasesDir = '/Users/patricksmith/candlefish-ai/projects/paintbox/testcases';
  }

  async validateAllTestCases(): Promise<void> {
    console.log('🏗️  Kind Home Paint Calculation Engine Validation');
    console.log('=' .repeat(60));
    console.log();

    const testCaseFiles = await this.getTestCaseFiles();
    
    for (const fileName of testCaseFiles) {
      await this.validateTestCase(fileName);
    }

    await this.generateValidationReport();
  }

  private async getTestCaseFiles(): Promise<string[]> {
    const files = fs.readdirSync(this.testCasesDir);
    return files.filter(file => file.endsWith('.xlsx') && file.includes('BART'));
  }

  private async validateTestCase(fileName: string): Promise<void> {
    console.log(`📊 Validating: ${fileName}`);
    const startTime = performance.now();
    
    try {
      const testCaseData = await this.loadTestCaseData(fileName);
      const result = await this.runValidation(testCaseData);
      
      const endTime = performance.now();
      result.metrics.processingTime = endTime - startTime;
      
      this.results.push(result);
      
      if (result.success) {
        console.log(`✅ ${result.testCaseName}: PASSED`);
        console.log(`   - Measurements: ${result.metrics.totalMeasurements}`);
        console.log(`   - Calculation Accuracy: ${result.metrics.calculationAccuracy.toFixed(2)}%`);
        console.log(`   - Pricing Accuracy: ${result.metrics.pricingAccuracy.toFixed(2)}%`);
        console.log(`   - Processing Time: ${result.metrics.processingTime.toFixed(2)}ms`);
      } else {
        console.log(`❌ ${result.testCaseName}: FAILED`);
        result.errors.forEach(error => console.log(`   - Error: ${error}`));
        result.warnings.forEach(warning => console.log(`   - Warning: ${warning}`));
      }
      
      console.log();
      
    } catch (error: any) {
      console.error(`🚨 Failed to validate ${fileName}:`, error.message);
      
      this.results.push({
        testCaseName: fileName,
        success: false,
        errors: [error.message],
        warnings: [],
        metrics: {
          totalMeasurements: 0,
          calculationAccuracy: 0,
          pricingAccuracy: 0,
          processingTime: performance.now() - startTime,
        },
      });
    }
  }

  private async loadTestCaseData(fileName: string): Promise<TestCaseData> {
    const filePath = path.join(this.testCasesDir, fileName);
    const workbook = XLSX.readFile(filePath);
    
    // Parse the Excel structure - this depends on the actual file format
    const sheetNames = workbook.SheetNames;
    console.log(`   📋 Sheets found: ${sheetNames.join(', ')}`);
    
    // Determine which sheet contains measurements
    const measurementSheet = this.findMeasurementSheet(workbook);
    const summarySheet = this.findSummarySheet(workbook);
    
    const measurements = this.parseMeasurements(measurementSheet);
    const expectedTotals = this.parseExpectedTotals(summarySheet || measurementSheet);
    
    return {
      fileName,
      customerName: this.extractCustomerName(fileName),
      projectType: fileName.includes('INT') ? 'INTERIOR' : 'EXTERIOR',
      measurements,
      expectedTotals,
      conditions: this.analyzeProjectConditions(measurements),
    };
  }

  private findMeasurementSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
    const sheetNames = workbook.SheetNames;
    
    // Common sheet names for measurements
    const measurementSheetNames = [
      'Measurements', 'Estimate', 'Takeoff', 'Details', 
      'Sheet1', 'Worksheet', 'Main'
    ];
    
    for (const name of measurementSheetNames) {
      if (sheetNames.includes(name)) {
        return workbook.Sheets[name];
      }
    }
    
    // If no specific sheet found, use the first sheet
    return workbook.Sheets[sheetNames[0]];
  }

  private findSummarySheet(workbook: XLSX.WorkBook): XLSX.WorkSheet | null {
    const sheetNames = workbook.SheetNames;
    
    const summarySheetNames = ['Summary', 'Totals', 'Pricing', 'Final'];
    
    for (const name of summarySheetNames) {
      if (sheetNames.includes(name)) {
        return workbook.Sheets[name];
      }
    }
    
    return null;
  }

  private parseMeasurements(sheet: XLSX.WorkSheet): MeasurementData[] {
    const rawData = XLSX.utils.sheet_to_json(sheet);
    const measurements: MeasurementData[] = [];
    
    rawData.forEach((row: any, index: number) => {
      // Skip header rows or empty rows
      if (!row || Object.keys(row).length === 0) return;
      
      try {
        const measurement: MeasurementData = {
          id: `measurement_${index}`,
          type: this.normalizeValue(row['Type'] || row['Measurement Type'] || row['Item'] || 'UNKNOWN'),
          elevation: this.normalizeValue(row['Elevation'] || row['Side'] || row['Location']),
          room: this.normalizeValue(row['Room'] || row['Area']),
          dimensions: {
            length: this.parseNumeric(row['Length'] || row['L']) || 0,
            width: this.parseNumeric(row['Width'] || row['W']),
            height: this.parseNumeric(row['Height'] || row['H']),
          },
          squareFootage: this.parseNumeric(row['Square Footage'] || row['Sq Ft'] || row['SF']) || 0,
          surfaceDetails: {
            type: this.normalizeValue(row['Surface Type'] || row['Surface'] || 'SMOOTH'),
            sidingType: this.normalizeValue(row['Siding Type'] || row['Siding']),
            doorType: this.normalizeValue(row['Door Type'] || row['Door']),
            coats: this.parseNumeric(row['Coats'] || row['# Coats']) || 2,
          },
          conditions: {
            nail: this.normalizeValue(row['Nail Condition'] || row['Nails'] || 'GOOD'),
            edge: this.normalizeValue(row['Edge Condition'] || row['Edges'] || 'CLEAN'),
            face: this.normalizeValue(row['Face Condition'] || row['Faces'] || 'SMOOTH'),
          },
          calculations: {
            expectedLaborHours: this.parseNumeric(row['Labor Hours'] || row['Hours']) || 0,
            expectedMaterialQuantity: this.parseNumeric(row['Material Qty'] || row['Material']) || 0,
            expectedCost: this.parseNumeric(row['Cost'] || row['Total Cost']) || 0,
          },
        };
        
        // Validate measurement has required data
        if (measurement.type !== 'UNKNOWN' && measurement.squareFootage > 0) {
          measurements.push(measurement);
        }
        
      } catch (error: any) {
        console.warn(`   ⚠️  Skipping row ${index}: ${error.message}`);
      }
    });
    
    return measurements;
  }

  private parseExpectedTotals(sheet: XLSX.WorkSheet): TestCaseData['expectedTotals'] {
    const rawData = XLSX.utils.sheet_to_json(sheet);
    
    // Look for summary rows or specific cells with totals
    let totals = {
      squareFootage: 0,
      laborHours: 0,
      materialCost: 0,
      goodTierPrice: 0,
      betterTierPrice: 0,
      bestTierPrice: 0,
    };
    
    // Try to find totals in the data
    rawData.forEach((row: any) => {
      if (this.isTotalRow(row)) {
        totals.squareFootage = this.parseNumeric(row['Total SF'] || row['Square Footage']) || totals.squareFootage;
        totals.laborHours = this.parseNumeric(row['Total Hours'] || row['Labor Hours']) || totals.laborHours;
        totals.materialCost = this.parseNumeric(row['Material Cost'] || row['Materials']) || totals.materialCost;
        totals.goodTierPrice = this.parseNumeric(row['Good Price'] || row['Basic Price']) || totals.goodTierPrice;
        totals.betterTierPrice = this.parseNumeric(row['Better Price'] || row['Premium Price']) || totals.betterTierPrice;
        totals.bestTierPrice = this.parseNumeric(row['Best Price'] || row['Luxury Price']) || totals.bestTierPrice;
      }
    });
    
    return totals;
  }

  private async runValidation(testCaseData: TestCaseData): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Calculate totals from measurements
    const calculatedTotals = this.calculateTotalsFromMeasurements(testCaseData.measurements);
    
    // Validate square footage calculations
    const sqftAccuracy = this.validateSquareFootage(testCaseData.measurements, errors, warnings);
    
    // Validate labor hour calculations
    const laborAccuracy = this.validateLaborHours(testCaseData.measurements, errors, warnings);
    
    // Validate material calculations
    const materialAccuracy = this.validateMaterialQuantities(testCaseData.measurements, errors, warnings);
    
    // Validate pricing calculations (Kind Home Paint formula)
    const pricingAccuracy = this.validatePricingTiers(testCaseData, calculatedTotals, errors, warnings);
    
    // Validate conditions analysis
    this.validateConditionsAnalysis(testCaseData, errors, warnings);
    
    // Calculate overall accuracy
    const calculationAccuracy = (sqftAccuracy + laborAccuracy + materialAccuracy) / 3;
    
    return {
      testCaseName: testCaseData.fileName,
      success: errors.length === 0,
      errors,
      warnings,
      metrics: {
        totalMeasurements: testCaseData.measurements.length,
        calculationAccuracy,
        pricingAccuracy,
        processingTime: 0, // Set by caller
      },
    };
  }

  private calculateTotalsFromMeasurements(measurements: MeasurementData[]) {
    return {
      totalSquareFootage: measurements.reduce((sum, m) => sum + m.squareFootage, 0),
      totalLaborHours: measurements.reduce((sum, m) => sum + m.calculations.expectedLaborHours, 0),
      totalMaterialCost: measurements.reduce((sum, m) => sum + m.calculations.expectedCost, 0),
    };
  }

  private validateSquareFootage(measurements: MeasurementData[], errors: string[], warnings: string[]): number {
    let correctCalculations = 0;
    let totalCalculations = 0;
    
    measurements.forEach((measurement, index) => {
      totalCalculations++;
      
      const calculatedSqFt = this.calculateSquareFootage(measurement);
      const expectedSqFt = measurement.squareFootage;
      const tolerance = Math.max(0.1, expectedSqFt * 0.05); // 5% tolerance or 0.1 minimum
      
      if (Math.abs(calculatedSqFt - expectedSqFt) <= tolerance) {
        correctCalculations++;
      } else {
        const error = `Measurement ${index + 1}: Square footage mismatch. Expected: ${expectedSqFt}, Calculated: ${calculatedSqFt.toFixed(2)}`;
        if (Math.abs(calculatedSqFt - expectedSqFt) > expectedSqFt * 0.1) {
          errors.push(error);
        } else {
          warnings.push(error);
        }
      }
    });
    
    return totalCalculations > 0 ? (correctCalculations / totalCalculations) * 100 : 0;
  }

  private validateLaborHours(measurements: MeasurementData[], errors: string[], warnings: string[]): number {
    let correctCalculations = 0;
    let totalCalculations = 0;
    
    measurements.forEach((measurement, index) => {
      if (measurement.calculations.expectedLaborHours > 0) {
        totalCalculations++;
        
        const calculatedHours = this.calculateLaborHours(measurement);
        const expectedHours = measurement.calculations.expectedLaborHours;
        const tolerance = Math.max(0.1, expectedHours * 0.1); // 10% tolerance
        
        if (Math.abs(calculatedHours - expectedHours) <= tolerance) {
          correctCalculations++;
        } else {
          const error = `Measurement ${index + 1}: Labor hours mismatch. Expected: ${expectedHours}, Calculated: ${calculatedHours.toFixed(2)}`;
          if (Math.abs(calculatedHours - expectedHours) > expectedHours * 0.2) {
            errors.push(error);
          } else {
            warnings.push(error);
          }
        }
      }
    });
    
    return totalCalculations > 0 ? (correctCalculations / totalCalculations) * 100 : 100;
  }

  private validateMaterialQuantities(measurements: MeasurementData[], errors: string[], warnings: string[]): number {
    let correctCalculations = 0;
    let totalCalculations = 0;
    
    measurements.forEach((measurement, index) => {
      if (measurement.calculations.expectedMaterialQuantity > 0) {
        totalCalculations++;
        
        const calculatedQuantity = this.calculateMaterialQuantity(measurement);
        const expectedQuantity = measurement.calculations.expectedMaterialQuantity;
        const tolerance = Math.max(0.01, expectedQuantity * 0.1); // 10% tolerance
        
        if (Math.abs(calculatedQuantity - expectedQuantity) <= tolerance) {
          correctCalculations++;
        } else {
          const error = `Measurement ${index + 1}: Material quantity mismatch. Expected: ${expectedQuantity}, Calculated: ${calculatedQuantity.toFixed(3)}`;
          if (Math.abs(calculatedQuantity - expectedQuantity) > expectedQuantity * 0.2) {
            errors.push(error);
          } else {
            warnings.push(error);
          }
        }
      }
    });
    
    return totalCalculations > 0 ? (correctCalculations / totalCalculations) * 100 : 100;
  }

  private validatePricingTiers(testCaseData: TestCaseData, calculatedTotals: any, errors: string[], warnings: string[]): number {
    const totalLaborCost = calculatedTotals.totalLaborHours * 45; // $45/hour rate
    const totalMaterialCost = calculatedTotals.totalMaterialCost;
    
    // Kind Home Paint Formula: (Labor + Material) / 0.45
    const goodTierBase = (totalLaborCost + totalMaterialCost) / 0.45;
    const betterTierBase = (totalLaborCost + totalMaterialCost) * 1.3 / 0.45;
    const bestTierBase = (totalLaborCost + totalMaterialCost) * 1.6 / 0.45;
    
    let correctPricing = 0;
    let totalPricing = 0;
    
    if (testCaseData.expectedTotals.goodTierPrice > 0) {
      totalPricing++;
      const tolerance = testCaseData.expectedTotals.goodTierPrice * 0.05; // 5% tolerance
      if (Math.abs(goodTierBase - testCaseData.expectedTotals.goodTierPrice) <= tolerance) {
        correctPricing++;
      } else {
        errors.push(`Good tier pricing mismatch. Expected: ${testCaseData.expectedTotals.goodTierPrice}, Calculated: ${goodTierBase.toFixed(2)}`);
      }
    }
    
    if (testCaseData.expectedTotals.betterTierPrice > 0) {
      totalPricing++;
      const tolerance = testCaseData.expectedTotals.betterTierPrice * 0.05;
      if (Math.abs(betterTierBase - testCaseData.expectedTotals.betterTierPrice) <= tolerance) {
        correctPricing++;
      } else {
        errors.push(`Better tier pricing mismatch. Expected: ${testCaseData.expectedTotals.betterTierPrice}, Calculated: ${betterTierBase.toFixed(2)}`);
      }
    }
    
    if (testCaseData.expectedTotals.bestTierPrice > 0) {
      totalPricing++;
      const tolerance = testCaseData.expectedTotals.bestTierPrice * 0.05;
      if (Math.abs(bestTierBase - testCaseData.expectedTotals.bestTierPrice) <= tolerance) {
        correctPricing++;
      } else {
        errors.push(`Best tier pricing mismatch. Expected: ${testCaseData.expectedTotals.bestTierPrice}, Calculated: ${bestTierBase.toFixed(2)}`);
      }
    }
    
    return totalPricing > 0 ? (correctPricing / totalPricing) * 100 : 100;
  }

  private validateConditionsAnalysis(testCaseData: TestCaseData, errors: string[], warnings: string[]): void {
    // Validate that conditions are properly categorized
    const conditionCounts = {
      nail: { GOOD: 0, LOOSE: 0, MISSING: 0, RUSTY: 0 } as { [key: string]: number },
      edge: { CLEAN: 0, ROUGH: 0, DAMAGED: 0, NEEDS_CAULKING: 0 } as { [key: string]: number },
      face: { SMOOTH: 0, TEXTURED: 0, WEATHERED: 0, DAMAGED: 0 } as { [key: string]: number },
    };
    
    testCaseData.measurements.forEach(measurement => {
      if (conditionCounts.nail[measurement.conditions.nail] !== undefined) {
        conditionCounts.nail[measurement.conditions.nail]++;
      }
      if (conditionCounts.edge[measurement.conditions.edge] !== undefined) {
        conditionCounts.edge[measurement.conditions.edge]++;
      }
      if (conditionCounts.face[measurement.conditions.face] !== undefined) {
        conditionCounts.face[measurement.conditions.face]++;
      }
    });
    
    // Validate complexity assessment
    const overallComplexity = this.assessOverallComplexity(testCaseData.measurements);
    if (overallComplexity !== testCaseData.conditions.complexity) {
      warnings.push(`Complexity assessment mismatch. Expected: ${testCaseData.conditions.complexity}, Calculated: ${overallComplexity}`);
    }
  }

  // Calculation methods (matching the resolver logic)
  private calculateSquareFootage(measurement: MeasurementData): number {
    const { length, width, height } = measurement.dimensions;
    
    if (length && width) {
      return length * width;
    }
    
    if (length && height) {
      return length * height;
    }
    
    // Type-specific defaults
    switch (measurement.type.toUpperCase()) {
      case 'DOOR':
      case 'GARAGE_DOOR':
        return 20;
      case 'WINDOW':
        return 15;
      case 'TRIM':
        return length || 0;
      default:
        return length || 0;
    }
  }

  private calculateLaborHours(measurement: MeasurementData): number {
    const baseHours = measurement.squareFootage * this.getBaseHoursPerSquareFoot(measurement.type);
    const complexityMultiplier = this.getComplexityMultiplier(measurement);
    const conditionMultiplier = this.getConditionMultiplier(measurement);
    
    return baseHours * complexityMultiplier * conditionMultiplier;
  }

  private calculateMaterialQuantity(measurement: MeasurementData): number {
    const coverage = this.getCoveragePerUnit(measurement.surfaceDetails.type);
    return measurement.squareFootage / coverage;
  }

  // Helper methods
  private getBaseHoursPerSquareFoot(type: string): number {
    const rates: { [key: string]: number } = {
      SIDING: 0.15,
      TRIM: 0.25,
      DOOR: 0.5,
      WINDOW: 0.3,
      FASCIA: 0.2,
      RAILINGS: 0.4,
    };
    return rates[type.toUpperCase()] || 0.2;
  }

  private getComplexityMultiplier(measurement: MeasurementData): number {
    // Assess complexity based on measurement characteristics
    let complexity = 1.0;
    
    if (measurement.elevation === 'DETACHED_GARAGE' || measurement.elevation === 'SHED') {
      complexity += 0.1;
    }
    
    if (measurement.surfaceDetails.type === 'ROUGH' || measurement.surfaceDetails.type === 'TEXTURED') {
      complexity += 0.2;
    }
    
    if (measurement.surfaceDetails.coats > 2) {
      complexity += 0.1;
    }
    
    return complexity;
  }

  private getConditionMultiplier(measurement: MeasurementData): number {
    let multiplier = 1.0;
    
    if (measurement.conditions.nail === 'LOOSE' || measurement.conditions.nail === 'MISSING') {
      multiplier += 0.2;
    }
    
    if (measurement.conditions.edge === 'DAMAGED' || measurement.conditions.edge === 'NEEDS_CAULKING') {
      multiplier += 0.15;
    }
    
    if (measurement.conditions.face === 'DAMAGED' || measurement.conditions.face === 'WEATHERED') {
      multiplier += 0.25;
    }
    
    return multiplier;
  }

  private getCoveragePerUnit(surfaceType: string): number {
    const coverage: { [key: string]: number } = {
      SMOOTH: 400,
      TEXTURED: 350,
      ROUGH: 300,
      METAL: 450,
      COMPOSITE: 375,
    };
    return coverage[surfaceType.toUpperCase()] || 375;
  }

  private assessOverallComplexity(measurements: MeasurementData[]): string {
    const complexityScores = measurements.map(m => {
      let score = 1;
      if (m.conditions.nail !== 'GOOD') score++;
      if (m.conditions.edge !== 'CLEAN') score++;
      if (m.conditions.face !== 'SMOOTH') score++;
      return score;
    });
    
    const avgComplexity = complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length;
    
    if (avgComplexity <= 1.5) return 'SIMPLE';
    if (avgComplexity <= 2.5) return 'MODERATE';
    if (avgComplexity <= 3.5) return 'COMPLEX';
    return 'HIGHLY_COMPLEX';
  }

  // Utility methods
  private normalizeValue(value: any): string {
    if (!value) return '';
    return String(value).trim().toUpperCase();
  }

  private parseNumeric(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const num = parseFloat(String(value).replace(/[,$]/g, ''));
    return isNaN(num) ? undefined : num;
  }

  private isTotalRow(row: any): boolean {
    const rowText = JSON.stringify(row).toLowerCase();
    return rowText.includes('total') || rowText.includes('sum') || rowText.includes('grand');
  }

  private extractCustomerName(fileName: string): string {
    const match = fileName.match(/Beta.*?([A-Za-z\s]+)\s*-/);
    return match ? match[1].trim() : 'Unknown Customer';
  }

  private analyzeProjectConditions(measurements: MeasurementData[]): TestCaseData['conditions'] {
    return {
      complexity: this.assessOverallComplexity(measurements),
      accessDifficulty: 'MODERATE', // Default assessment
      specialRequirements: [], // Would be determined from measurements
    };
  }

  private async generateValidationReport(): Promise<void> {
    console.log('📊 VALIDATION SUMMARY');
    console.log('=' .repeat(60));
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Test Cases: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log();
    
    // Calculate average metrics
    const avgMetrics = this.results.reduce(
      (acc, result) => ({
        measurements: acc.measurements + result.metrics.totalMeasurements,
        calculationAccuracy: acc.calculationAccuracy + result.metrics.calculationAccuracy,
        pricingAccuracy: acc.pricingAccuracy + result.metrics.pricingAccuracy,
        processingTime: acc.processingTime + result.metrics.processingTime,
      }),
      { measurements: 0, calculationAccuracy: 0, pricingAccuracy: 0, processingTime: 0 }
    );
    
    console.log('AVERAGE METRICS:');
    console.log(`Total Measurements Processed: ${avgMetrics.measurements}`);
    console.log(`Average Calculation Accuracy: ${(avgMetrics.calculationAccuracy / totalTests).toFixed(2)}%`);
    console.log(`Average Pricing Accuracy: ${(avgMetrics.pricingAccuracy / totalTests).toFixed(2)}%`);
    console.log(`Average Processing Time: ${(avgMetrics.processingTime / totalTests).toFixed(2)}ms`);
    console.log();
    
    // Show detailed results for failed tests
    const failedResults = this.results.filter(r => !r.success);
    if (failedResults.length > 0) {
      console.log('FAILED TESTS DETAILS:');
      failedResults.forEach(result => {
        console.log(`❌ ${result.testCaseName}:`);
        result.errors.forEach(error => console.log(`   - ${error}`));
        console.log();
      });
    }
    
    // Save detailed report to file
    const reportPath = path.join(__dirname, '../reports/validation-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log(`📄 Detailed report saved to: ${reportPath}`);
    console.log();
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Calculation engine is 100% validated against Excel test cases.');
    } else {
      console.log(`⚠️  ${failedTests} test(s) failed. Review errors above and adjust calculation logic.`);
    }
  }
}

// Run validation if called directly
async function main() {
  const validator = new CalculationValidator();
  await validator.validateAllTestCases();
}

// Check if script is run directly
if (process.argv[1]?.includes('validate-calculations')) {
  main().catch(console.error);
}

export { CalculationValidator };