import { getCache, CachePrefix, CacheTTL } from '@/lib/cache/three-tier-cache';

/**
 * Progressive Excel Data Loader
 * Loads Excel formulas and data progressively to improve initial load time
 */

interface ExcelChunk {
  id: string;
  priority: number;
  formulas: string[];
  data: Record<string, any>;
  size: number;
  loaded: boolean;
}

interface LoaderOptions {
  chunkSize: number;
  parallelLoads: number;
  priorityThreshold: number;
  cacheEnabled: boolean;
}

const DEFAULT_OPTIONS: LoaderOptions = {
  chunkSize: 100, // Number of formulas per chunk
  parallelLoads: 3, // Number of parallel chunk loads
  priorityThreshold: 10, // Load priority chunks first
  cacheEnabled: true,
};

export class ProgressiveExcelLoader {
  private chunks: Map<string, ExcelChunk> = new Map();
  private loadQueue: string[] = [];
  private loadingChunks: Set<string> = new Set();
  private options: LoaderOptions;
  private cache = getCache();
  private onProgress?: (loaded: number, total: number) => void;
  private worker?: Worker;

  constructor(options: Partial<LoaderOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.initializeWorker();
  }

  private initializeWorker() {
    if (typeof window !== 'undefined' && window.Worker) {
      this.worker = new Worker(
        new URL('../workers/calculation.worker.ts', import.meta.url)
      );
    }
  }

  /**
   * Initialize chunks from Excel data
   */
  async initialize(
    formulas: string[],
    data: Record<string, any>
  ): Promise<void> {
    // Split formulas into chunks based on priority and dependencies
    const chunks = this.createChunks(formulas, data);
    
    chunks.forEach(chunk => {
      this.chunks.set(chunk.id, chunk);
    });

    // Sort chunks by priority
    this.loadQueue = Array.from(this.chunks.keys()).sort((a, b) => {
      const chunkA = this.chunks.get(a)!;
      const chunkB = this.chunks.get(b)!;
      return chunkB.priority - chunkA.priority;
    });

    // Start loading high-priority chunks
    await this.loadInitialChunks();
  }

  /**
   * Create chunks from formulas
   */
  private createChunks(
    formulas: string[],
    data: Record<string, any>
  ): ExcelChunk[] {
    const chunks: ExcelChunk[] = [];
    const { chunkSize } = this.options;

    // Analyze formula dependencies and complexity
    const formulaAnalysis = this.analyzeFormulas(formulas);

    // Group formulas by sheet/category
    const groups = this.groupFormulas(formulaAnalysis);

    // Create chunks from groups
    Object.entries(groups).forEach(([groupName, groupFormulas], groupIndex) => {
      for (let i = 0; i < groupFormulas.length; i += chunkSize) {
        const chunkFormulas = groupFormulas.slice(i, i + chunkSize);
        const chunkData = this.extractRelevantData(chunkFormulas, data);
        
        chunks.push({
          id: `${groupName}_${Math.floor(i / chunkSize)}`,
          priority: this.calculatePriority(groupName, groupIndex),
          formulas: chunkFormulas,
          data: chunkData,
          size: JSON.stringify(chunkFormulas).length + JSON.stringify(chunkData).length,
          loaded: false,
        });
      }
    });

    return chunks;
  }

  /**
   * Analyze formulas for dependencies and complexity
   */
  private analyzeFormulas(formulas: string[]): Array<{
    formula: string;
    complexity: number;
    dependencies: string[];
    category: string;
  }> {
    return formulas.map(formula => {
      // Extract cell references and function calls
      const cellRefs = formula.match(/[A-Z]+\d+/g) || [];
      const functions = formula.match(/[A-Z]+\(/g) || [];
      
      // Determine category based on formula pattern
      let category = 'general';
      if (formula.includes('SUM') || formula.includes('AVERAGE')) {
        category = 'aggregation';
      } else if (formula.includes('IF') || formula.includes('VLOOKUP')) {
        category = 'logic';
      } else if (formula.includes('price') || formula.includes('cost')) {
        category = 'pricing';
      }

      return {
        formula,
        complexity: cellRefs.length + functions.length * 2,
        dependencies: cellRefs,
        category,
      };
    });
  }

  /**
   * Group formulas by category
   */
  private groupFormulas(
    analysis: Array<{ formula: string; category: string }>
  ): Record<string, string[]> {
    const groups: Record<string, string[]> = {};

    analysis.forEach(({ formula, category }) => {
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(formula);
    });

    return groups;
  }

  /**
   * Extract relevant data for chunk
   */
  private extractRelevantData(
    formulas: string[],
    allData: Record<string, any>
  ): Record<string, any> {
    const relevantData: Record<string, any> = {};
    
    // Extract referenced cells from formulas
    formulas.forEach(formula => {
      const cellRefs = formula.match(/[A-Z]+\d+/g) || [];
      cellRefs.forEach(ref => {
        if (allData[ref] !== undefined) {
          relevantData[ref] = allData[ref];
        }
      });
    });

    return relevantData;
  }

  /**
   * Calculate chunk priority
   */
  private calculatePriority(category: string, index: number): number {
    const priorities: Record<string, number> = {
      pricing: 100, // Highest priority
      aggregation: 80,
      logic: 60,
      general: 40,
    };

    return (priorities[category] || 40) - index;
  }

  /**
   * Load initial high-priority chunks
   */
  private async loadInitialChunks(): Promise<void> {
    const highPriorityChunks = this.loadQueue
      .slice(0, this.options.parallelLoads)
      .filter(id => {
        const chunk = this.chunks.get(id);
        return chunk && chunk.priority >= this.options.priorityThreshold;
      });

    await Promise.all(highPriorityChunks.map(id => this.loadChunk(id)));
  }

  /**
   * Load a specific chunk
   */
  async loadChunk(chunkId: string): Promise<void> {
    const chunk = this.chunks.get(chunkId);
    if (!chunk || chunk.loaded || this.loadingChunks.has(chunkId)) {
      return;
    }

    this.loadingChunks.add(chunkId);

    try {
      // Check cache first
      if (this.options.cacheEnabled) {
        const cacheKey = `${CachePrefix.EXCEL}${chunkId}`;
        const cached = await this.cache.get(cacheKey);
        
        if (cached) {
          chunk.loaded = true;
          this.loadingChunks.delete(chunkId);
          this.updateProgress();
          return;
        }
      }

      // Load and process chunk
      if (this.worker) {
        await this.processInWorker(chunk);
      } else {
        await this.processInMainThread(chunk);
      }

      chunk.loaded = true;

      // Cache the processed chunk
      if (this.options.cacheEnabled) {
        const cacheKey = `${CachePrefix.EXCEL}${chunkId}`;
        await this.cache.set(cacheKey, chunk, CacheTTL.EXCEL);
      }

    } catch (error) {
      console.error(`Failed to load chunk ${chunkId}:`, error);
    } finally {
      this.loadingChunks.delete(chunkId);
      this.updateProgress();
    }

    // Load next chunk in queue
    this.loadNextChunk();
  }

  /**
   * Process chunk in Web Worker
   */
  private async processInWorker(chunk: ExcelChunk): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const messageHandler = (event: MessageEvent) => {
        if (event.data.id === chunk.id) {
          this.worker!.removeEventListener('message', messageHandler);
          
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve();
          }
        }
      };

      this.worker.addEventListener('message', messageHandler);
      
      this.worker.postMessage({
        id: chunk.id,
        type: 'batch',
        formulas: chunk.formulas,
        data: chunk.data,
      });
    });
  }

  /**
   * Process chunk in main thread (fallback)
   */
  private async processInMainThread(chunk: ExcelChunk): Promise<void> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Process formulas (simplified)
    chunk.formulas.forEach(formula => {
      // Formula processing logic here
    });
  }

  /**
   * Load next chunk in queue
   */
  private loadNextChunk(): void {
    const nextChunkId = this.loadQueue.find(id => {
      const chunk = this.chunks.get(id);
      return chunk && !chunk.loaded && !this.loadingChunks.has(id);
    });

    if (nextChunkId) {
      this.loadChunk(nextChunkId);
    }
  }

  /**
   * Update loading progress
   */
  private updateProgress(): void {
    const loaded = Array.from(this.chunks.values()).filter(c => c.loaded).length;
    const total = this.chunks.size;
    
    if (this.onProgress) {
      this.onProgress(loaded, total);
    }
  }

  /**
   * Get loading progress
   */
  getProgress(): { loaded: number; total: number; percentage: number } {
    const loaded = Array.from(this.chunks.values()).filter(c => c.loaded).length;
    const total = this.chunks.size;
    
    return {
      loaded,
      total,
      percentage: total > 0 ? (loaded / total) * 100 : 0,
    };
  }

  /**
   * Load all remaining chunks
   */
  async loadAll(): Promise<void> {
    const unloadedChunks = Array.from(this.chunks.keys()).filter(id => {
      const chunk = this.chunks.get(id);
      return chunk && !chunk.loaded;
    });

    // Load in batches
    for (let i = 0; i < unloadedChunks.length; i += this.options.parallelLoads) {
      const batch = unloadedChunks.slice(i, i + this.options.parallelLoads);
      await Promise.all(batch.map(id => this.loadChunk(id)));
    }
  }

  /**
   * Prefetch chunks based on user interaction
   */
  async prefetchChunks(category: string): Promise<void> {
    const relevantChunks = Array.from(this.chunks.entries())
      .filter(([id, chunk]) => id.startsWith(category) && !chunk.loaded)
      .map(([id]) => id);

    // Prefetch first few chunks of this category
    const toPrefetch = relevantChunks.slice(0, this.options.parallelLoads);
    await Promise.all(toPrefetch.map(id => this.loadChunk(id)));
  }

  /**
   * Set progress callback
   */
  onProgressUpdate(callback: (loaded: number, total: number) => void): void {
    this.onProgress = callback;
  }

  /**
   * Clear loaded chunks (for memory management)
   */
  clearLoadedChunks(): void {
    this.chunks.forEach(chunk => {
      if (chunk.loaded && chunk.priority < this.options.priorityThreshold) {
        chunk.loaded = false;
        // Clear from memory but keep in cache
      }
    });
  }

  /**
   * Destroy loader and cleanup
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
    }
    this.chunks.clear();
    this.loadQueue = [];
    this.loadingChunks.clear();
  }
}

// Singleton instance
let loaderInstance: ProgressiveExcelLoader | null = null;

export function getExcelLoader(
  options?: Partial<LoaderOptions>
): ProgressiveExcelLoader {
  if (!loaderInstance) {
    loaderInstance = new ProgressiveExcelLoader(options);
  }
  return loaderInstance;
}

export default ProgressiveExcelLoader;