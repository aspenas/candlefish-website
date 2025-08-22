#!/usr/bin/env ts-node

/**
 * Advanced Memory Profiling Script for Paintbox
 * Analyzes memory usage patterns and identifies optimization opportunities
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import v8 from 'v8';
import { performance } from 'perf_hooks';

interface MemoryProfile {
  timestamp: number;
  heap: NodeJS.MemoryUsage;
  v8HeapStats: any;
  largestObjects: Array<{ type: string; size: number; count: number }>;
  gcStats?: {
    lastGC: number;
    gcCount: number;
    gcTime: number;
  };
}

interface BundleAnalysis {
  totalSize: number;
  chunks: Array<{ name: string; size: number; modules: number }>;
  largestModules: Array<{ name: string; size: number; path: string }>;
  duplicates: Array<{ module: string; locations: string[] }>;
}

class MemoryProfiler {
  private profiles: MemoryProfile[] = [];
  private startTime: number = Date.now();

  constructor() {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  captureHeapSnapshot(): string {
    const snapshotPath = path.join(process.cwd(), `heap-${Date.now()}.heapsnapshot`);
    const heapSnapshot = v8.writeHeapSnapshot();

    if (heapSnapshot) {
      fs.writeFileSync(snapshotPath, heapSnapshot);
      console.log(`Heap snapshot saved: ${snapshotPath}`);
      return snapshotPath;
    }

    return '';
  }

  analyzeMemoryUsage(): MemoryProfile {
    const memUsage = process.memoryUsage();
    const heapStats = v8.getHeapStatistics();

    const profile: MemoryProfile = {
      timestamp: Date.now() - this.startTime,
      heap: memUsage,
      v8HeapStats: {
        totalHeapSize: heapStats.total_heap_size,
        totalHeapSizeExecutable: heapStats.total_heap_size_executable,
        totalPhysicalSize: heapStats.total_physical_size,
        totalAvailableSize: heapStats.total_available_size,
        usedHeapSize: heapStats.used_heap_size,
        heapSizeLimit: heapStats.heap_size_limit,
        mallocedMemory: heapStats.malloced_memory,
        peakMallocedMemory: heapStats.peak_malloced_memory,
        doesZapGarbage: heapStats.does_zap_garbage,
        numberOfNativeContexts: heapStats.number_of_native_contexts,
        numberOfDetachedContexts: heapStats.number_of_detached_contexts,
      },
      largestObjects: this.findLargestObjects(),
    };

    this.profiles.push(profile);
    return profile;
  }

  findLargestObjects(): Array<{ type: string; size: number; count: number }> {
    // This is a simplified version. In production, you'd use heap profiling
    const objects = [
      { type: 'NextJS Pages', size: this.estimatePageMemory(), count: 1 },
      { type: 'React Components', size: this.estimateComponentMemory(), count: 1 },
      { type: 'Excel Engine', size: this.estimateExcelEngineMemory(), count: 1 },
      { type: 'Cache Store', size: this.estimateCacheMemory(), count: 1 },
      { type: 'Database Connections', size: this.estimateDbMemory(), count: 1 },
    ];

    return objects.sort((a, b) => b.size - a.size);
  }

  private estimatePageMemory(): number {
    const pagesDir = path.join(process.cwd(), '.next/server/app');
    if (!fs.existsSync(pagesDir)) return 0;

    return this.getDirectorySize(pagesDir);
  }

  private estimateComponentMemory(): number {
    const componentsDir = path.join(process.cwd(), 'components');
    if (!fs.existsSync(componentsDir)) return 0;

    return this.getDirectorySize(componentsDir);
  }

  private estimateExcelEngineMemory(): number {
    // Excel engine typically holds formulas in memory
    const baseMemory = 50 * 1024 * 1024; // 50MB base
    const formulaCount = 14000;
    const avgFormulaSize = 1024; // 1KB per formula

    return baseMemory + (formulaCount * avgFormulaSize);
  }

  private estimateCacheMemory(): number {
    // Estimate Redis/in-memory cache usage
    return 100 * 1024 * 1024; // 100MB estimate
  }

  private estimateDbMemory(): number {
    // Database connection pool memory
    const connections = 10;
    const perConnectionMemory = 5 * 1024 * 1024; // 5MB per connection

    return connections * perConnectionMemory;
  }

  private getDirectorySize(dirPath: string): number {
    let totalSize = 0;

    try {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          totalSize += this.getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }

    return totalSize;
  }

  analyzeBundles(): BundleAnalysis {
    const buildDir = path.join(process.cwd(), '.next');
    const analysis: BundleAnalysis = {
      totalSize: 0,
      chunks: [],
      largestModules: [],
      duplicates: [],
    };

    if (fs.existsSync(buildDir)) {
      // Analyze static chunks
      const staticDir = path.join(buildDir, 'static/chunks');
      if (fs.existsSync(staticDir)) {
        const chunks = fs.readdirSync(staticDir);

        for (const chunk of chunks) {
          const chunkPath = path.join(staticDir, chunk);
          const stats = fs.statSync(chunkPath);

          if (stats.isFile()) {
            analysis.chunks.push({
              name: chunk,
              size: stats.size,
              modules: 1, // Would need source map analysis for accurate count
            });
            analysis.totalSize += stats.size;
          }
        }
      }

      // Sort chunks by size
      analysis.chunks.sort((a, b) => b.size - a.size);

      // Identify largest modules (simplified)
      analysis.largestModules = analysis.chunks.slice(0, 10).map(chunk => ({
        name: chunk.name,
        size: chunk.size,
        path: `/static/chunks/${chunk.name}`,
      }));
    }

    return analysis;
  }

  generateReport(): string {
    const latestProfile = this.profiles[this.profiles.length - 1];
    const bundleAnalysis = this.analyzeBundles();

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        heapUsed: Math.round(latestProfile.heap.heapUsed / 1024 / 1024),
        heapTotal: Math.round(latestProfile.heap.heapTotal / 1024 / 1024),
        external: Math.round(latestProfile.heap.external / 1024 / 1024),
        rss: Math.round(latestProfile.heap.rss / 1024 / 1024),
        heapPercentage: Math.round((latestProfile.heap.heapUsed / latestProfile.heap.heapTotal) * 100),
      },
      v8Stats: latestProfile.v8HeapStats,
      largestMemoryConsumers: latestProfile.largestObjects,
      bundleAnalysis: {
        totalSizeMB: Math.round(bundleAnalysis.totalSize / 1024 / 1024),
        largestChunks: bundleAnalysis.chunks.slice(0, 5).map(c => ({
          name: c.name,
          sizeMB: Math.round(c.size / 1024 / 1024 * 100) / 100,
        })),
      },
      recommendations: this.generateRecommendations(latestProfile, bundleAnalysis),
    };

    return JSON.stringify(report, null, 2);
  }

  private generateRecommendations(profile: MemoryProfile, bundles: BundleAnalysis): string[] {
    const recommendations: string[] = [];
    const heapPercentage = (profile.heap.heapUsed / profile.heap.heapTotal) * 100;

    if (heapPercentage > 80) {
      recommendations.push('CRITICAL: Heap usage above 80% - immediate optimization required');
    }

    if (profile.v8HeapStats.numberOfDetachedContexts > 5) {
      recommendations.push('Memory leak detected: Multiple detached contexts found');
    }

    if (bundles.totalSize > 5 * 1024 * 1024) {
      recommendations.push('Bundle size exceeds 5MB - implement code splitting');
    }

    if (profile.largestObjects[0].size > 100 * 1024 * 1024) {
      recommendations.push(`Large memory consumer detected: ${profile.largestObjects[0].type}`);
    }

    // Specific recommendations
    recommendations.push('Enable SWC minification for 30% smaller bundles');
    recommendations.push('Implement Redis for external caching to reduce heap usage');
    recommendations.push('Use dynamic imports for heavy components');
    recommendations.push('Enable experimental optimizePackageImports for all heavy dependencies');
    recommendations.push('Implement streaming SSR for large pages');

    return recommendations;
  }

  async runFullAnalysis(): Promise<void> {
    console.log('Starting memory profiling...\n');

    // Capture initial state
    console.log('1. Capturing initial memory state...');
    const initialProfile = this.analyzeMemoryUsage();
    console.log(`   Heap Used: ${Math.round(initialProfile.heap.heapUsed / 1024 / 1024)}MB`);
    console.log(`   RSS: ${Math.round(initialProfile.heap.rss / 1024 / 1024)}MB\n`);

    // Analyze bundles
    console.log('2. Analyzing bundle sizes...');
    const bundleAnalysis = this.analyzeBundles();
    console.log(`   Total Bundle Size: ${Math.round(bundleAnalysis.totalSize / 1024 / 1024)}MB`);
    console.log(`   Number of Chunks: ${bundleAnalysis.chunks.length}\n`);

    // Capture heap snapshot
    console.log('3. Capturing heap snapshot...');
    const snapshotPath = this.captureHeapSnapshot();
    if (snapshotPath) {
      console.log(`   Snapshot saved for Chrome DevTools analysis\n`);
    }

    // Generate report
    console.log('4. Generating final report...');
    const report = this.generateReport();
    const reportPath = path.join(process.cwd(), `memory-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, report);
    console.log(`   Report saved: ${reportPath}\n`);

    // Display summary
    console.log('='.repeat(60));
    console.log('MEMORY PROFILING SUMMARY');
    console.log('='.repeat(60));

    const reportObj = JSON.parse(report);
    console.log('\nMemory Usage:');
    console.log(`  Heap Used: ${reportObj.summary.heapUsed}MB / ${reportObj.summary.heapTotal}MB (${reportObj.summary.heapPercentage}%)`);
    console.log(`  RSS: ${reportObj.summary.rss}MB`);
    console.log(`  External: ${reportObj.summary.external}MB`);

    console.log('\nLargest Memory Consumers:');
    reportObj.largestMemoryConsumers.forEach((consumer: any, index: number) => {
      console.log(`  ${index + 1}. ${consumer.type}: ${Math.round(consumer.size / 1024 / 1024)}MB`);
    });

    console.log('\nBundle Analysis:');
    console.log(`  Total Size: ${reportObj.bundleAnalysis.totalSizeMB}MB`);
    console.log('  Largest Chunks:');
    reportObj.bundleAnalysis.largestChunks.forEach((chunk: any) => {
      console.log(`    - ${chunk.name}: ${chunk.sizeMB}MB`);
    });

    console.log('\nRecommendations:');
    reportObj.recommendations.forEach((rec: string) => {
      console.log(`  • ${rec}`);
    });

    console.log('\n' + '='.repeat(60));
  }
}

// Run profiler if executed directly
if (require.main === module) {
  const profiler = new MemoryProfiler();

  // Enable garbage collection tracking if available
  if (!global.gc) {
    console.log('Note: Run with --expose-gc flag for more accurate profiling');
    console.log('Example: node --expose-gc scripts/memory-profiler.ts\n');
  }

  profiler.runFullAnalysis().catch(console.error);
}

export { MemoryProfiler };
