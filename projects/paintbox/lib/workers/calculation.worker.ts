// Web Worker for parallel Excel formula calculations
import Decimal from 'decimal.js';
import { create, all } from 'mathjs';
import { Parser } from 'formula-parser';

// Configure math.js
const math = create(all, {
  number: 'BigNumber',
  precision: 64,
});

// Cache for formula results
const formulaCache = new Map<string, any>();
const CACHE_SIZE = 10000;
const CACHE_TTL = 60000; // 1 minute

interface CalculationRequest {
  id: string;
  type: 'formula' | 'batch' | 'excel' | 'aggregate';
  formula?: string;
  formulas?: string[];
  data?: Record<string, any>;
  ranges?: Record<string, any[]>;
}

interface CalculationResponse {
  id: string;
  result: any;
  error?: string;
  timing?: number;
  cached?: boolean;
}

// Initialize formula parser
const parser = new Parser();

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<CalculationRequest>) => {
  const startTime = performance.now();
  const { id, type, formula, formulas, data, ranges } = event.data;

  try {
    let result: any;
    let cached = false;

    switch (type) {
      case 'formula':
        result = await calculateSingleFormula(formula!, data || {});
        break;

      case 'batch':
        result = await calculateBatchFormulas(formulas!, data || {});
        break;

      case 'excel':
        result = await calculateExcelFormulas(formulas!, ranges || {});
        break;

      case 'aggregate':
        result = await calculateAggregates(data || {});
        break;

      default:
        throw new Error(`Unknown calculation type: ${type}`);
    }

    const response: CalculationResponse = {
      id,
      result,
      timing: performance.now() - startTime,
      cached,
    };

    self.postMessage(response);
  } catch (error) {
    const response: CalculationResponse = {
      id,
      result: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: performance.now() - startTime,
    };

    self.postMessage(response);
  }
});

// Calculate single formula with caching
async function calculateSingleFormula(
  formula: string,
  data: Record<string, any>
): Promise<any> {
  const cacheKey = `${formula}_${JSON.stringify(data)}`;
  
  // Check cache
  if (formulaCache.has(cacheKey)) {
    const cached = formulaCache.get(cacheKey);
    if (cached.timestamp > Date.now() - CACHE_TTL) {
      return cached.value;
    }
    formulaCache.delete(cacheKey);
  }

  // Parse and calculate
  const result = evaluateFormula(formula, data);

  // Cache result
  if (formulaCache.size >= CACHE_SIZE) {
    // Remove oldest entries
    const toDelete = Math.floor(CACHE_SIZE * 0.2);
    const keys = Array.from(formulaCache.keys()).slice(0, toDelete);
    keys.forEach(key => formulaCache.delete(key));
  }

  formulaCache.set(cacheKey, {
    value: result,
    timestamp: Date.now(),
  });

  return result;
}

// Calculate batch formulas in parallel
async function calculateBatchFormulas(
  formulas: string[],
  data: Record<string, any>
): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  
  // Process formulas in chunks for better parallelization
  const chunkSize = 100;
  const chunks = [];
  
  for (let i = 0; i < formulas.length; i += chunkSize) {
    chunks.push(formulas.slice(i, i + chunkSize));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (formula, index) => {
        try {
          const result = await calculateSingleFormula(formula, data);
          return { index: i + index, result };
        } catch (error) {
          return { index: i + index, result: null, error };
        }
      })
    );

    chunkResults.forEach(({ index, result }) => {
      results[`formula_${index}`] = result;
    });
  }

  return results;
}

// Calculate Excel-style formulas with ranges
async function calculateExcelFormulas(
  formulas: string[],
  ranges: Record<string, any[]>
): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  // Set up parser variables for ranges
  Object.entries(ranges).forEach(([name, values]) => {
    parser.setVariable(name, values);
  });

  for (const formula of formulas) {
    try {
      const result = parser.parse(formula);
      results[formula] = result.error ? null : result.result;
    } catch (error) {
      results[formula] = null;
    }
  }

  return results;
}

// Calculate aggregates for performance metrics
async function calculateAggregates(
  data: Record<string, any>
): Promise<Record<string, any>> {
  const values = Object.values(data).filter(v => typeof v === 'number');
  
  if (values.length === 0) {
    return {
      sum: 0,
      avg: 0,
      min: 0,
      max: 0,
      count: 0,
      stdDev: 0,
    };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // Calculate standard deviation
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  return {
    sum: new Decimal(sum).toFixed(2),
    avg: new Decimal(avg).toFixed(2),
    min: new Decimal(min).toFixed(2),
    max: new Decimal(max).toFixed(2),
    count: values.length,
    stdDev: new Decimal(stdDev).toFixed(2),
  };
}

// Evaluate formula with math.js
function evaluateFormula(formula: string, data: Record<string, any>): any {
  try {
    // Replace variables in formula
    let processedFormula = formula;
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      processedFormula = processedFormula.replace(regex, String(value));
    });

    // Evaluate with math.js
    const result = math.evaluate(processedFormula);
    
    // Convert to decimal for precision
    if (typeof result === 'number' || result instanceof math.BigNumber) {
      return new Decimal(result.toString()).toFixed(2);
    }
    
    return result;
  } catch (error) {
    // Fallback to formula parser
    parser.setVariable('data', data);
    const parseResult = parser.parse(formula);
    
    if (parseResult.error) {
      throw new Error(parseResult.error);
    }
    
    return parseResult.result;
  }
}

// Performance monitoring
let performanceMetrics = {
  totalCalculations: 0,
  totalTime: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

// Report performance metrics periodically
setInterval(() => {
  if (performanceMetrics.totalCalculations > 0) {
    self.postMessage({
      type: 'metrics',
      data: {
        ...performanceMetrics,
        avgTime: performanceMetrics.totalTime / performanceMetrics.totalCalculations,
        cacheHitRate: performanceMetrics.cacheHits / 
          (performanceMetrics.cacheHits + performanceMetrics.cacheMisses),
      },
    });
  }
}, 30000); // Every 30 seconds

export {};