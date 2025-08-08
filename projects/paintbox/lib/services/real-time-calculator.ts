/**
 * Real-time Calculator Service
 * Handles optimized calculation execution with caching and delta updates
 */

import { Decimal } from 'decimal.js';
import { getFormulaCache, FormulaInput, FormulaResult } from '@/lib/cache/formula-cache';
import { logger } from '@/lib/logging/simple-logger';
import * as math from 'mathjs';
import FormulaParser from 'formula-parser';

export interface CalculationContext {
  estimateId: string;
  variables: Record<string, any>;
  dependencies: Map<string, Set<string>>;
  version: number;
}

export interface CalculationRequest {
  formulaId: string;
  formula: string;
  inputs: Record<string, any>;
  context?: CalculationContext;
  priority?: 'high' | 'normal' | 'low';
}

export interface CalculationResponse {
  formulaId: string;
  result: any;
  executionTime: number;
  cached: boolean;
  dependencies?: string[];
  errors?: string[];
}

export interface DeltaUpdate {
  formulaId: string;
  oldValue: any;
  newValue: any;
  affectedFormulas: string[];
}

class RealTimeCalculator {
  private formulaCache = getFormulaCache();
  private parser = new FormulaParser();
  private dependencyGraph = new Map<string, Set<string>>();
  private calculationQueue: CalculationRequest[] = [];
  private isProcessing = false;
  private batchSize = 10;
  private maxRetries = 3;

  constructor() {
    // Configure Decimal precision
    Decimal.set({
      precision: 20,
      rounding: Decimal.ROUND_HALF_UP,
    });

    // Start queue processor
    this.startQueueProcessor();
  }

  /**
   * Calculate formula with caching and optimization
   */
  async calculate(request: CalculationRequest): Promise<CalculationResponse> {
    const startTime = performance.now();

    try {
      // Check cache first
      const cacheInput: FormulaInput = {
        formulaId: request.formulaId,
        variables: request.inputs,
        version: request.context?.version?.toString(),
      };

      const cached = await this.formulaCache.get(cacheInput);

      if (cached) {
        const executionTime = performance.now() - startTime;

        logger.debug('Formula cache hit', {
          formulaId: request.formulaId,
          executionTime,
        });

        return {
          formulaId: request.formulaId,
          result: cached.value,
          executionTime,
          cached: true,
          dependencies: cached.dependencies,
        };
      }

      // Execute calculation
      const result = await this.executeFormula(request);

      // Cache the result
      const formulaResult: FormulaResult = {
        value: result.value,
        timestamp: Date.now(),
        executionTime: result.executionTime,
        dependencies: result.dependencies,
      };

      await this.formulaCache.set(cacheInput, formulaResult, 300); // 5 minute TTL

      const executionTime = performance.now() - startTime;

      logger.debug('Formula calculated', {
        formulaId: request.formulaId,
        executionTime,
        cached: false,
      });

      return {
        formulaId: request.formulaId,
        result: result.value,
        executionTime,
        cached: false,
        dependencies: result.dependencies,
      };
    } catch (error) {
      const executionTime = performance.now() - startTime;

      logger.error('Formula calculation failed', {
        formulaId: request.formulaId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        formulaId: request.formulaId,
        result: null,
        executionTime,
        cached: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Batch calculate multiple formulas
   */
  async batchCalculate(requests: CalculationRequest[]): Promise<CalculationResponse[]> {
    const startTime = performance.now();
    const results: CalculationResponse[] = [];

    // Sort by priority
    const sorted = requests.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return (priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal']);
    });

    // Process in parallel batches
    for (let i = 0; i < sorted.length; i += this.batchSize) {
      const batch = sorted.slice(i, i + this.batchSize);

      const batchResults = await Promise.all(
        batch.map(request => this.calculate(request))
      );

      results.push(...batchResults);
    }

    const totalTime = performance.now() - startTime;

    logger.info('Batch calculation completed', {
      count: requests.length,
      totalTime,
      avgTime: totalTime / requests.length,
    });

    return results;
  }

  /**
   * Calculate with delta updates
   */
  async calculateDelta(
    request: CalculationRequest,
    previousValue: any
  ): Promise<DeltaUpdate> {
    const response = await this.calculate(request);

    // Find affected formulas
    const affectedFormulas = this.findAffectedFormulas(request.formulaId);

    return {
      formulaId: request.formulaId,
      oldValue: previousValue,
      newValue: response.result,
      affectedFormulas: Array.from(affectedFormulas),
    };
  }

  /**
   * Execute the actual formula calculation
   */
  private async executeFormula(request: CalculationRequest): Promise<{
    value: any;
    executionTime: number;
    dependencies: string[];
  }> {
    const startTime = performance.now();
    const { formula, inputs } = request;

    try {
      // Parse dependencies
      const dependencies = this.extractDependencies(formula);

      // Replace variables in formula
      let processedFormula = formula;
      const scope: Record<string, any> = {};

      for (const [key, value] of Object.entries(inputs)) {
        // Convert to appropriate type
        let processedValue = value;

        if (typeof value === 'string' && !isNaN(Number(value))) {
          processedValue = new Decimal(value);
        } else if (typeof value === 'number') {
          processedValue = new Decimal(value);
        }

        scope[key] = processedValue;

        // Replace in formula for parser
        const regex = new RegExp(`\\b${key}\\b`, 'g');
        processedFormula = processedFormula.replace(regex,
          processedValue instanceof Decimal ? processedValue.toString() : String(processedValue)
        );
      }

      // Try different calculation methods
      let result: any;

      // Method 1: MathJS for complex formulas
      if (this.isComplexFormula(formula)) {
        try {
          result = math.evaluate(processedFormula, scope);
        } catch {
          // Fallback to formula parser
          this.parser.parse(processedFormula);
          result = this.parser.calculate(scope);
        }
      } else {
        // Method 2: Formula Parser for Excel-like formulas
        this.parser.parse(processedFormula);
        result = this.parser.calculate(scope);
      }

      // Convert result to Decimal for consistency
      if (typeof result === 'number') {
        result = new Decimal(result);
      }

      const executionTime = performance.now() - startTime;

      return {
        value: result,
        executionTime,
        dependencies,
      };
    } catch (error) {
      throw new Error(`Formula execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extract dependencies from formula
   */
  private extractDependencies(formula: string): string[] {
    const dependencies = new Set<string>();

    // Match variable names (alphanumeric and underscore)
    const variableRegex = /\b[A-Za-z_][A-Za-z0-9_]*\b/g;
    const matches = formula.match(variableRegex);

    if (matches) {
      for (const match of matches) {
        // Filter out function names and constants
        if (!this.isFunction(match) && !this.isConstant(match)) {
          dependencies.add(match);
        }
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Check if formula is complex (requires MathJS)
   */
  private isComplexFormula(formula: string): boolean {
    const complexPatterns = [
      /\bmatrix\b/i,
      /\bintegral\b/i,
      /\bderivative\b/i,
      /\bsum\b/i,
      /\bproduct\b/i,
      /\bfactorial\b/i,
    ];

    return complexPatterns.some(pattern => pattern.test(formula));
  }

  /**
   * Check if string is a function name
   */
  private isFunction(name: string): boolean {
    const functions = [
      'SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT',
      'IF', 'AND', 'OR', 'NOT',
      'ROUND', 'FLOOR', 'CEILING', 'ABS',
      'SQRT', 'POW', 'EXP', 'LOG',
      'SIN', 'COS', 'TAN',
      'VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH',
    ];

    return functions.includes(name.toUpperCase());
  }

  /**
   * Check if string is a constant
   */
  private isConstant(name: string): boolean {
    const constants = ['PI', 'E', 'TRUE', 'FALSE', 'NULL'];
    return constants.includes(name.toUpperCase());
  }

  /**
   * Find formulas affected by a change
   */
  private findAffectedFormulas(formulaId: string): Set<string> {
    const affected = new Set<string>();
    const visited = new Set<string>();
    const queue = [formulaId];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current)) continue;
      visited.add(current);

      const dependents = this.dependencyGraph.get(current);
      if (dependents) {
        for (const dependent of dependents) {
          affected.add(dependent);
          queue.push(dependent);
        }
      }
    }

    return affected;
  }

  /**
   * Update dependency graph
   */
  public updateDependencyGraph(formulaId: string, dependencies: string[]): void {
    // Clear old dependencies
    for (const [_, dependents] of this.dependencyGraph) {
      dependents.delete(formulaId);
    }

    // Add new dependencies
    for (const dep of dependencies) {
      if (!this.dependencyGraph.has(dep)) {
        this.dependencyGraph.set(dep, new Set());
      }
      this.dependencyGraph.get(dep)!.add(formulaId);
    }
  }

  /**
   * Queue a calculation for processing
   */
  public queueCalculation(request: CalculationRequest): void {
    this.calculationQueue.push(request);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process calculation queue
   */
  private async processQueue(): Promise<void> {
    if (this.calculationQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    const batch = this.calculationQueue.splice(0, this.batchSize);

    try {
      await this.batchCalculate(batch);
    } catch (error) {
      logger.error('Queue processing failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Continue processing
    if (this.calculationQueue.length > 0) {
      setImmediate(() => this.processQueue());
    } else {
      this.isProcessing = false;
    }
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.isProcessing && this.calculationQueue.length > 0) {
        this.processQueue();
      }
    }, 100);
  }

  /**
   * Warm cache with common calculations
   */
  async warmCache(formulas: Array<{
    formulaId: string;
    formula: string;
    commonInputs: Record<string, any>[];
  }>): Promise<void> {
    logger.info('Warming calculation cache', { count: formulas.length });

    const requests: CalculationRequest[] = [];

    for (const formula of formulas) {
      for (const inputs of formula.commonInputs) {
        requests.push({
          formulaId: formula.formulaId,
          formula: formula.formula,
          inputs,
          priority: 'low',
        });
      }
    }

    await this.batchCalculate(requests);

    logger.info('Cache warming complete');
  }

  /**
   * Get calculation statistics
   */
  async getStats(): Promise<{
    cacheStats: any;
    queueLength: number;
    dependencyGraphSize: number;
  }> {
    const cacheStats = await this.formulaCache.getStats();

    return {
      cacheStats,
      queueLength: this.calculationQueue.length,
      dependencyGraphSize: this.dependencyGraph.size,
    };
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    await this.formulaCache.invalidate(['*']);
    this.dependencyGraph.clear();
    this.calculationQueue = [];

    logger.info('All caches cleared');
  }
}

// Singleton instance
let calculatorInstance: RealTimeCalculator | null = null;

export function getRealTimeCalculator(): RealTimeCalculator {
  if (!calculatorInstance) {
    calculatorInstance = new RealTimeCalculator();
  }
  return calculatorInstance;
}

export function createRealTimeCalculator(): RealTimeCalculator {
  return new RealTimeCalculator();
}

export default RealTimeCalculator;
