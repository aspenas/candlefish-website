import { GraphQLResolveInfo } from 'graphql';
import { ThreatIntelligenceCache, getThreatCache } from '../cache/redis-cache';
import { ThreatDataLoaders } from '../dataloaders';
import { Context } from '../../../types/context';

// Query optimization utilities for threat intelligence
export class ThreatQueryOptimizer {
  private cache: ThreatIntelligenceCache;
  
  constructor() {
    this.cache = getThreatCache();
  }
  
  // Analyze GraphQL query to determine optimal fetching strategy
  analyzeQuery(info: GraphQLResolveInfo): QueryAnalysis {
    const analysis: QueryAnalysis = {
      requestedFields: new Set(),
      nestedRelationships: new Map(),
      complexityScore: 0,
      optimizationStrategy: 'STANDARD',
      batchingOpportunities: [],
      cachingStrategy: 'NORMAL',
    };
    
    // Parse the GraphQL selection set
    const selections = info.fieldNodes[0]?.selectionSet?.selections || [];
    
    this.analyzeSelections(selections, analysis, '');
    
    // Determine optimization strategy based on analysis
    analysis.optimizationStrategy = this.determineOptimizationStrategy(analysis);
    analysis.cachingStrategy = this.determineCachingStrategy(analysis);
    
    return analysis;
  }
  
  private analyzeSelections(
    selections: any[],
    analysis: QueryAnalysis,
    path: string
  ): void {
    selections.forEach((selection) => {
      if (selection.kind === 'Field') {
        const fieldName = selection.name.value;
        const fullPath = path ? `${path}.${fieldName}` : fieldName;
        
        analysis.requestedFields.add(fullPath);
        
        // Check for relationship fields
        if (this.isRelationshipField(fieldName)) {
          const currentCount = analysis.nestedRelationships.get(fieldName) || 0;
          analysis.nestedRelationships.set(fieldName, currentCount + 1);
          
          // Check for batching opportunities
          if (this.canBatchField(fieldName)) {
            analysis.batchingOpportunities.push({
              field: fieldName,
              path: fullPath,
              estimatedBenefit: this.estimateBatchingBenefit(fieldName),
            });
          }
        }
        
        // Increase complexity score
        analysis.complexityScore += this.getFieldComplexity(fieldName);
        
        // Recursively analyze nested selections
        if (selection.selectionSet) {
          this.analyzeSelections(
            selection.selectionSet.selections,
            analysis,
            fullPath
          );
        }
      }
    });
  }
  
  private isRelationshipField(fieldName: string): boolean {
    const relationshipFields = [
      'threatActors', 'campaigns', 'indicators', 'iocs', 'relatedThreats',
      'mitigations', 'reports', 'malwareFamilies', 'tools', 'sources',
      'feeds', 'matches', 'sightings', 'relatedIOCs', 'correlationMatches',
    ];
    
    return relationshipFields.includes(fieldName);
  }
  
  private canBatchField(fieldName: string): boolean {
    const batchableFields = [
      'threatActors', 'campaigns', 'indicators', 'iocs',
      'malwareFamilies', 'tools', 'sources', 'feeds',
    ];
    
    return batchableFields.includes(fieldName);
  }
  
  private getFieldComplexity(fieldName: string): number {
    const complexityMap: Record<string, number> = {
      // Simple fields
      'id': 1, 'name': 1, 'title': 1, 'type': 1, 'status': 1,
      'confidence': 1, 'severity': 1, 'description': 2,
      
      // Medium complexity fields
      'indicators': 5, 'iocs': 5, 'sources': 3, 'tags': 2,
      'metadata': 3, 'context': 3, 'attribution': 4,
      
      // High complexity fields
      'threatActors': 8, 'campaigns': 8, 'relatedThreats': 10,
      'mitigations': 6, 'reports': 7, 'malwareFamilies': 6,
      'correlationMatches': 12, 'enrichment': 15,
      
      // Very high complexity fields
      'analytics': 25, 'dashboard': 30, 'attribution': 20,
      'sightings': 15, 'matches': 10,
    };
    
    return complexityMap[fieldName] || 2;
  }
  
  private estimateBatchingBenefit(fieldName: string): number {
    // Higher values indicate more benefit from batching
    const benefitMap: Record<string, number> = {
      'threatActors': 0.8,
      'campaigns': 0.7,
      'indicators': 0.9,
      'iocs': 0.9,
      'malwareFamilies': 0.6,
      'tools': 0.5,
      'sources': 0.4,
      'feeds': 0.3,
    };
    
    return benefitMap[fieldName] || 0.2;
  }
  
  private determineOptimizationStrategy(analysis: QueryAnalysis): OptimizationStrategy {
    if (analysis.complexityScore > 100) {
      return 'AGGRESSIVE_CACHING';
    }
    
    if (analysis.batchingOpportunities.length > 3) {
      return 'BATCHING_FOCUSED';
    }
    
    if (analysis.nestedRelationships.size > 5) {
      return 'DATALOADER_INTENSIVE';
    }
    
    return 'STANDARD';
  }
  
  private determineCachingStrategy(analysis: QueryAnalysis): CachingStrategy {
    // Check for expensive operations
    const hasExpensiveFields = Array.from(analysis.requestedFields).some(
      field => field.includes('analytics') || field.includes('dashboard') || field.includes('enrichment')
    );
    
    if (hasExpensiveFields) {
      return 'AGGRESSIVE';
    }
    
    if (analysis.complexityScore > 50) {
      return 'EXTENDED';
    }
    
    return 'NORMAL';
  }
  
  // Apply optimizations based on analysis
  async applyOptimizations(
    analysis: QueryAnalysis,
    context: Context
  ): Promise<OptimizationContext> {
    const optimizationContext: OptimizationContext = {
      prefetchKeys: [],
      cacheStrategy: analysis.cachingStrategy,
      batchingEnabled: analysis.batchingOpportunities.length > 0,
      parallelExecution: analysis.complexityScore > 30,
    };
    
    // Apply strategy-specific optimizations
    switch (analysis.optimizationStrategy) {
      case 'AGGRESSIVE_CACHING':
        await this.applyAggressiveCaching(analysis, context, optimizationContext);
        break;
        
      case 'BATCHING_FOCUSED':
        await this.applyBatchingOptimizations(analysis, context, optimizationContext);
        break;
        
      case 'DATALOADER_INTENSIVE':
        await this.applyDataLoaderOptimizations(analysis, context, optimizationContext);
        break;
        
      default:
        await this.applyStandardOptimizations(analysis, context, optimizationContext);
    }
    
    return optimizationContext;
  }
  
  private async applyAggressiveCaching(
    analysis: QueryAnalysis,
    context: Context,
    optimizationContext: OptimizationContext
  ): Promise<void> {
    // Implement aggressive caching for high-complexity queries
    optimizationContext.cacheStrategy = 'AGGRESSIVE';
    
    // Pre-warm cache for related entities
    const entityIds = this.extractEntityIds(context);
    if (entityIds.threats.length > 0) {
      optimizationContext.prefetchKeys.push(
        ...entityIds.threats.map(id => ({ type: 'threat', id }))
      );
    }
    
    if (entityIds.iocs.length > 0) {
      optimizationContext.prefetchKeys.push(
        ...entityIds.iocs.map(id => ({ type: 'ioc', id }))
      );
    }
  }
  
  private async applyBatchingOptimizations(
    analysis: QueryAnalysis,
    context: Context,
    optimizationContext: OptimizationContext
  ): Promise<void> {
    // Optimize DataLoader batch sizes for detected opportunities
    optimizationContext.batchingEnabled = true;
    
    // Configure optimal batch sizes based on field types
    analysis.batchingOpportunities.forEach(opportunity => {
      if (opportunity.estimatedBenefit > 0.7) {
        // High-benefit batching - increase batch size
        this.configureBatchSize(context.dataLoaders, opportunity.field, 50);
      } else {
        // Standard batching
        this.configureBatchSize(context.dataLoaders, opportunity.field, 25);
      }
    });
  }
  
  private async applyDataLoaderOptimizations(
    analysis: QueryAnalysis,
    context: Context,
    optimizationContext: OptimizationContext
  ): Promise<void> {
    // Prime DataLoaders with anticipated data
    const relationships = Array.from(analysis.nestedRelationships.keys());
    
    // Enable parallel execution for multiple relationship resolvers
    optimizationContext.parallelExecution = true;
    
    // Pre-load commonly accessed relationships
    await this.primeDataLoaders(context.dataLoaders, relationships);
  }
  
  private async applyStandardOptimizations(
    analysis: QueryAnalysis,
    context: Context,
    optimizationContext: OptimizationContext
  ): Promise<void> {
    // Apply standard optimization patterns
    if (analysis.complexityScore > 20) {
      optimizationContext.parallelExecution = true;
    }
    
    if (analysis.batchingOpportunities.length > 0) {
      optimizationContext.batchingEnabled = true;
    }
  }
  
  private extractEntityIds(context: Context): {
    threats: string[];
    iocs: string[];
    actors: string[];
    campaigns: string[];
  } {
    // This would extract relevant entity IDs from the context
    // Implementation depends on how the context is structured
    return {
      threats: [],
      iocs: [],
      actors: [],
      campaigns: [],
    };
  }
  
  private configureBatchSize(
    dataLoaders: ThreatDataLoaders,
    fieldName: string,
    batchSize: number
  ): void {
    // This would configure DataLoader batch sizes
    // Implementation depends on DataLoader configuration options
    console.log(`Configuring batch size for ${fieldName}: ${batchSize}`);
  }
  
  private async primeDataLoaders(
    dataLoaders: ThreatDataLoaders,
    relationships: string[]
  ): Promise<void> {
    // Pre-load commonly accessed data into DataLoaders
    console.log('Priming DataLoaders for relationships:', relationships);
  }
}

// Query analysis result types
interface QueryAnalysis {
  requestedFields: Set<string>;
  nestedRelationships: Map<string, number>;
  complexityScore: number;
  optimizationStrategy: OptimizationStrategy;
  batchingOpportunities: BatchingOpportunity[];
  cachingStrategy: CachingStrategy;
}

interface BatchingOpportunity {
  field: string;
  path: string;
  estimatedBenefit: number;
}

type OptimizationStrategy = 
  | 'STANDARD'
  | 'AGGRESSIVE_CACHING'
  | 'BATCHING_FOCUSED'
  | 'DATALOADER_INTENSIVE';

type CachingStrategy = 
  | 'NORMAL'
  | 'EXTENDED'
  | 'AGGRESSIVE';

interface OptimizationContext {
  prefetchKeys: Array<{ type: string; id: string }>;
  cacheStrategy: CachingStrategy;
  batchingEnabled: boolean;
  parallelExecution: boolean;
}

// Performance monitoring
export class ThreatQueryPerformanceMonitor {
  private static metrics: Map<string, QueryMetrics> = new Map();
  
  static startQuery(queryName: string, organizationId: string): string {
    const queryId = `${queryName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.metrics.set(queryId, {
      queryName,
      organizationId,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      cacheHits: 0,
      cacheMisses: 0,
      dataLoaderBatches: 0,
      errors: [],
    });
    
    return queryId;
  }
  
  static endQuery(queryId: string): void {
    const metrics = this.metrics.get(queryId);
    if (metrics) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
      
      // Log performance metrics
      this.logQueryMetrics(metrics);
      
      // Clean up old metrics (keep only last 1000 queries)
      if (this.metrics.size > 1000) {
        const oldestKey = this.metrics.keys().next().value;
        this.metrics.delete(oldestKey);
      }
    }
  }
  
  static recordCacheHit(queryId: string): void {
    const metrics = this.metrics.get(queryId);
    if (metrics) {
      metrics.cacheHits++;
    }
  }
  
  static recordCacheMiss(queryId: string): void {
    const metrics = this.metrics.get(queryId);
    if (metrics) {
      metrics.cacheMisses++;
    }
  }
  
  static recordDataLoaderBatch(queryId: string): void {
    const metrics = this.metrics.get(queryId);
    if (metrics) {
      metrics.dataLoaderBatches++;
    }
  }
  
  static recordError(queryId: string, error: Error): void {
    const metrics = this.metrics.get(queryId);
    if (metrics) {
      metrics.errors.push(error.message);
    }
  }
  
  private static logQueryMetrics(metrics: QueryMetrics): void {
    const logLevel = metrics.duration > 5000 ? 'warn' : metrics.duration > 1000 ? 'info' : 'debug';
    
    console[logLevel]('Query Performance Metrics', {
      queryName: metrics.queryName,
      organizationId: metrics.organizationId,
      duration: metrics.duration,
      cacheHitRatio: metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) || 0,
      dataLoaderBatches: metrics.dataLoaderBatches,
      errorCount: metrics.errors.length,
    });
    
    // Log slow queries
    if (metrics.duration > 10000) {
      console.warn('Slow query detected', {
        queryName: metrics.queryName,
        duration: metrics.duration,
        organizationId: metrics.organizationId,
      });
    }
  }
  
  static getAverageQueryTime(queryName: string): number {
    const queryMetrics = Array.from(this.metrics.values())
      .filter(m => m.queryName === queryName && m.endTime > 0);
    
    if (queryMetrics.length === 0) return 0;
    
    const totalTime = queryMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalTime / queryMetrics.length;
  }
  
  static getQueryStats(): {
    totalQueries: number;
    averageQueryTime: number;
    slowQueries: number;
    cacheHitRatio: number;
  } {
    const completedQueries = Array.from(this.metrics.values())
      .filter(m => m.endTime > 0);
    
    if (completedQueries.length === 0) {
      return {
        totalQueries: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        cacheHitRatio: 0,
      };
    }
    
    const totalTime = completedQueries.reduce((sum, m) => sum + m.duration, 0);
    const slowQueries = completedQueries.filter(m => m.duration > 5000).length;
    const totalCacheHits = completedQueries.reduce((sum, m) => sum + m.cacheHits, 0);
    const totalCacheMisses = completedQueries.reduce((sum, m) => sum + m.cacheMisses, 0);
    
    return {
      totalQueries: completedQueries.length,
      averageQueryTime: totalTime / completedQueries.length,
      slowQueries,
      cacheHitRatio: totalCacheHits / (totalCacheHits + totalCacheMisses) || 0,
    };
  }
}

interface QueryMetrics {
  queryName: string;
  organizationId: string;
  startTime: number;
  endTime: number;
  duration: number;
  cacheHits: number;
  cacheMisses: number;
  dataLoaderBatches: number;
  errors: string[];
}

// Resolver wrapper for performance monitoring
export const withPerformanceMonitoring = <T>(
  queryName: string
) => {
  return (resolver: (parent: any, args: any, context: any, info: any) => Promise<T>) => {
    return async (parent: any, args: any, context: any, info: any): Promise<T> => {
      const queryId = ThreatQueryPerformanceMonitor.startQuery(
        queryName,
        context.organizationId
      );
      
      try {
        const result = await resolver(parent, args, context, info);
        ThreatQueryPerformanceMonitor.endQuery(queryId);
        return result;
      } catch (error) {
        ThreatQueryPerformanceMonitor.recordError(queryId, error);
        ThreatQueryPerformanceMonitor.endQuery(queryId);
        throw error;
      }
    };
  };
};

// Export singleton optimizer instance
let optimizerInstance: ThreatQueryOptimizer | null = null;

export const getThreatQueryOptimizer = (): ThreatQueryOptimizer => {
  if (!optimizerInstance) {
    optimizerInstance = new ThreatQueryOptimizer();
  }
  return optimizerInstance;
};
