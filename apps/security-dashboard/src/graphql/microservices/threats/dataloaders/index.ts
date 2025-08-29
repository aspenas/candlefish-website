import DataLoader from 'dataloader';
import { ThreatDataSources } from '../datasources/types';
import {
  ThreatIntelligence,
  IOC,
  ThreatActor,
  ThreatCampaign,
  MalwareFamily,
  ThreatFeed,
  ThreatCorrelation,
  ThreatTool,
  ThreatMitigation,
  ThreatReport,
  Indicator,
} from '../../../generated/graphql';

// DataLoader interface for threat intelligence service
export interface ThreatDataLoaders {
  // Primary entity loaders
  threats: DataLoader<string, ThreatIntelligence | null>;
  iocs: DataLoader<string, IOC | null>;
  actors: DataLoader<string, ThreatActor | null>;
  campaigns: DataLoader<string, ThreatCampaign | null>;
  malwareFamilies: DataLoader<string, MalwareFamily | null>;
  feeds: DataLoader<string, ThreatFeed | null>;
  correlations: DataLoader<string, ThreatCorrelation | null>;
  tools: DataLoader<string, ThreatTool | null>;
  mitigations: DataLoader<string, ThreatMitigation | null>;
  reports: DataLoader<string, ThreatReport | null>;
  indicators: DataLoader<string, Indicator | null>;
  
  // Batch loaders for collections
  threatsByIds: DataLoader<string[], ThreatIntelligence[]>;
  iocsByIds: DataLoader<string[], IOC[]>;
  actorsByIds: DataLoader<string[], ThreatActor[]>;
  campaignsByIds: DataLoader<string[], ThreatCampaign[]>;
  
  // Relationship loaders
  threatsByActor: DataLoader<string, ThreatIntelligence[]>;
  threatsByCampaign: DataLoader<string, ThreatIntelligence[]>;
  threatsByIndicator: DataLoader<string, ThreatIntelligence[]>;
  
  iocsByActor: DataLoader<string, IOC[]>;
  iocsByCampaign: DataLoader<string, IOC[]>;
  iocsByThreat: DataLoader<string, IOC[]>;
  iocsByFeed: DataLoader<string, IOC[]>;
  
  actorsByThreat: DataLoader<string, ThreatActor[]>;
  actorsByCampaign: DataLoader<string, ThreatActor[]>;
  actorsByIndicator: DataLoader<string, ThreatActor[]>;
  
  campaignsByActor: DataLoader<string, ThreatCampaign[]>;
  campaignsByThreat: DataLoader<string, ThreatCampaign[]>;
  campaignsByIndicator: DataLoader<string, ThreatCampaign[]>;
  
  indicatorsByThreat: DataLoader<string, Indicator[]>;
  indicatorsByActor: DataLoader<string, Indicator[]>;
  indicatorsByCampaign: DataLoader<string, Indicator[]>;
  
  malwareFamiliesByActor: DataLoader<string, MalwareFamily[]>;
  malwareFamiliesByCampaign: DataLoader<string, MalwareFamily[]>;
  
  toolsByActor: DataLoader<string, ThreatTool[]>;
  toolsByCampaign: DataLoader<string, ThreatTool[]>;
  
  mitigationsByThreat: DataLoader<string, ThreatMitigation[]>;
  mitigationsByTechnique: DataLoader<string, ThreatMitigation[]>;
  
  reportsByThreat: DataLoader<string, ThreatReport[]>;
  reportsByActor: DataLoader<string, ThreatReport[]>;
  reportsByCampaign: DataLoader<string, ThreatReport[]>;
  
  // Enrichment and analysis loaders
  iocEnrichment: DataLoader<string, any>;
  threatAttribution: DataLoader<string, any>;
  correlationMatches: DataLoader<string, any[]>;
  
  // Aggregation loaders for performance
  threatCountsByActor: DataLoader<string, number>;
  iocCountsByFeed: DataLoader<string, number>;
  campaignCountsByActor: DataLoader<string, number>;
  indicatorCountsByThreat: DataLoader<string, number>;
}

// Create all DataLoaders with proper batching and caching
export const createDataLoaders = (dataSources: ThreatDataSources): ThreatDataLoaders => {
  // Helper function to create a basic entity loader
  const createEntityLoader = <T>(
    fetchFn: (ids: readonly string[]) => Promise<(T | null)[]>
  ) => new DataLoader<string, T | null>(
    async (ids: readonly string[]) => {
      const results = await fetchFn(ids);
      return results;
    },
    {
      cache: true,
      maxBatchSize: 100,
      cacheKeyFn: (key) => key,
    }
  );
  
  // Helper function to create relationship loaders
  const createRelationshipLoader = <T>(
    fetchFn: (parentIds: readonly string[]) => Promise<T[][]>
  ) => new DataLoader<string, T[]>(
    async (parentIds: readonly string[]) => {
      const results = await fetchFn(parentIds);
      return results;
    },
    {
      cache: true,
      maxBatchSize: 50,
      cacheKeyFn: (key) => key,
    }
  );
  
  return {
    // Primary entity loaders
    threats: createEntityLoader<ThreatIntelligence>(
      async (ids) => dataSources.threatIntelligence.findByIds([...ids])
    ),
    
    iocs: createEntityLoader<IOC>(
      async (ids) => dataSources.ioc.findByIds([...ids])
    ),
    
    actors: createEntityLoader<ThreatActor>(
      async (ids) => dataSources.threatActor.findByIds([...ids])
    ),
    
    campaigns: createEntityLoader<ThreatCampaign>(
      async (ids) => dataSources.threatCampaign.findByIds([...ids])
    ),
    
    malwareFamilies: createEntityLoader<MalwareFamily>(
      async (ids) => dataSources.malwareFamily.findByIds([...ids])
    ),
    
    feeds: createEntityLoader<ThreatFeed>(
      async (ids) => dataSources.threatFeed.findByIds([...ids])
    ),
    
    correlations: createEntityLoader<ThreatCorrelation>(
      async (ids) => dataSources.correlation.findByIds([...ids])
    ),
    
    tools: createEntityLoader<ThreatTool>(
      async (ids) => dataSources.threatTool.findByIds([...ids])
    ),
    
    mitigations: createEntityLoader<ThreatMitigation>(
      async (ids) => dataSources.mitigation.findByIds([...ids])
    ),
    
    reports: createEntityLoader<ThreatReport>(
      async (ids) => dataSources.report.findByIds([...ids])
    ),
    
    indicators: createEntityLoader<Indicator>(
      async (ids) => dataSources.indicator.findByIds([...ids])
    ),
    
    // Batch collection loaders
    threatsByIds: new DataLoader<string[], ThreatIntelligence[]>(
      async (idsArrays: readonly string[][]) => {
        const results = await Promise.all(
          idsArrays.map(ids => dataSources.threatIntelligence.findByIds(ids))
        );
        return results.map(result => result.filter(Boolean) as ThreatIntelligence[]);
      }
    ),
    
    iocsByIds: new DataLoader<string[], IOC[]>(
      async (idsArrays: readonly string[][]) => {
        const results = await Promise.all(
          idsArrays.map(ids => dataSources.ioc.findByIds(ids))
        );
        return results.map(result => result.filter(Boolean) as IOC[]);
      }
    ),
    
    actorsByIds: new DataLoader<string[], ThreatActor[]>(
      async (idsArrays: readonly string[][]) => {
        const results = await Promise.all(
          idsArrays.map(ids => dataSources.threatActor.findByIds(ids))
        );
        return results.map(result => result.filter(Boolean) as ThreatActor[]);
      }
    ),
    
    campaignsByIds: new DataLoader<string[], ThreatCampaign[]>(
      async (idsArrays: readonly string[][]) => {
        const results = await Promise.all(
          idsArrays.map(ids => dataSources.threatCampaign.findByIds(ids))
        );
        return results.map(result => result.filter(Boolean) as ThreatCampaign[]);
      }
    ),
    
    // Relationship loaders - Threats
    threatsByActor: createRelationshipLoader<ThreatIntelligence>(
      async (actorIds) => dataSources.threatIntelligence.findByActorIds([...actorIds])
    ),
    
    threatsByCampaign: createRelationshipLoader<ThreatIntelligence>(
      async (campaignIds) => dataSources.threatIntelligence.findByCampaignIds([...campaignIds])
    ),
    
    threatsByIndicator: createRelationshipLoader<ThreatIntelligence>(
      async (indicatorIds) => dataSources.threatIntelligence.findByIndicatorIds([...indicatorIds])
    ),
    
    // Relationship loaders - IOCs
    iocsByActor: createRelationshipLoader<IOC>(
      async (actorIds) => dataSources.ioc.findByActorIds([...actorIds])
    ),
    
    iocsByCampaign: createRelationshipLoader<IOC>(
      async (campaignIds) => dataSources.ioc.findByCampaignIds([...campaignIds])
    ),
    
    iocsByThreat: createRelationshipLoader<IOC>(
      async (threatIds) => dataSources.ioc.findByThreatIds([...threatIds])
    ),
    
    iocsByFeed: createRelationshipLoader<IOC>(
      async (feedIds) => dataSources.ioc.findByFeedIds([...feedIds])
    ),
    
    // Relationship loaders - Actors
    actorsByThreat: createRelationshipLoader<ThreatActor>(
      async (threatIds) => dataSources.threatActor.findByThreatIds([...threatIds])
    ),
    
    actorsByCampaign: createRelationshipLoader<ThreatActor>(
      async (campaignIds) => dataSources.threatActor.findByCampaignIds([...campaignIds])
    ),
    
    actorsByIndicator: createRelationshipLoader<ThreatActor>(
      async (indicatorIds) => dataSources.threatActor.findByIndicatorIds([...indicatorIds])
    ),
    
    // Relationship loaders - Campaigns
    campaignsByActor: createRelationshipLoader<ThreatCampaign>(
      async (actorIds) => dataSources.threatCampaign.findByActorIds([...actorIds])
    ),
    
    campaignsByThreat: createRelationshipLoader<ThreatCampaign>(
      async (threatIds) => dataSources.threatCampaign.findByThreatIds([...threatIds])
    ),
    
    campaignsByIndicator: createRelationshipLoader<ThreatCampaign>(
      async (indicatorIds) => dataSources.threatCampaign.findByIndicatorIds([...indicatorIds])
    ),
    
    // Relationship loaders - Indicators
    indicatorsByThreat: createRelationshipLoader<Indicator>(
      async (threatIds) => dataSources.indicator.findByThreatIds([...threatIds])
    ),
    
    indicatorsByActor: createRelationshipLoader<Indicator>(
      async (actorIds) => dataSources.indicator.findByActorIds([...actorIds])
    ),
    
    indicatorsByCampaign: createRelationshipLoader<Indicator>(
      async (campaignIds) => dataSources.indicator.findByCampaignIds([...campaignIds])
    ),
    
    // Relationship loaders - Malware Families
    malwareFamiliesByActor: createRelationshipLoader<MalwareFamily>(
      async (actorIds) => dataSources.malwareFamily.findByActorIds([...actorIds])
    ),
    
    malwareFamiliesByCampaign: createRelationshipLoader<MalwareFamily>(
      async (campaignIds) => dataSources.malwareFamily.findByCampaignIds([...campaignIds])
    ),
    
    // Relationship loaders - Tools
    toolsByActor: createRelationshipLoader<ThreatTool>(
      async (actorIds) => dataSources.threatTool.findByActorIds([...actorIds])
    ),
    
    toolsByCampaign: createRelationshipLoader<ThreatTool>(
      async (campaignIds) => dataSources.threatTool.findByCampaignIds([...campaignIds])
    ),
    
    // Relationship loaders - Mitigations
    mitigationsByThreat: createRelationshipLoader<ThreatMitigation>(
      async (threatIds) => dataSources.mitigation.findByThreatIds([...threatIds])
    ),
    
    mitigationsByTechnique: createRelationshipLoader<ThreatMitigation>(
      async (techniqueIds) => dataSources.mitigation.findByTechniqueIds([...techniqueIds])
    ),
    
    // Relationship loaders - Reports
    reportsByThreat: createRelationshipLoader<ThreatReport>(
      async (threatIds) => dataSources.report.findByThreatIds([...threatIds])
    ),
    
    reportsByActor: createRelationshipLoader<ThreatReport>(
      async (actorIds) => dataSources.report.findByActorIds([...actorIds])
    ),
    
    reportsByCampaign: createRelationshipLoader<ThreatReport>(
      async (campaignIds) => dataSources.report.findByCampaignIds([...campaignIds])
    ),
    
    // Enrichment loaders
    iocEnrichment: new DataLoader(
      async (iocIds: readonly string[]) => {
        const results = await Promise.all(
          iocIds.map(id => dataSources.enrichment.enrichIOC(id))
        );
        return results;
      },
      {
        cache: true,
        maxBatchSize: 20, // Lower batch size for external enrichment APIs
        cacheMap: new Map(), // Custom cache for enrichment data
      }
    ),
    
    threatAttribution: new DataLoader(
      async (threatIds: readonly string[]) => {
        const results = await Promise.all(
          threatIds.map(id => dataSources.attribution.analyzeAttribution(id))
        );
        return results;
      },
      {
        cache: true,
        maxBatchSize: 10, // Lower batch size for complex analysis
      }
    ),
    
    correlationMatches: new DataLoader(
      async (correlationIds: readonly string[]) => {
        const results = await Promise.all(
          correlationIds.map(id => dataSources.correlation.getMatches(id))
        );
        return results;
      }
    ),
    
    // Count loaders for performance optimization
    threatCountsByActor: new DataLoader(
      async (actorIds: readonly string[]) => {
        const results = await dataSources.threatIntelligence.getThreatCountsByActorIds([...actorIds]);
        return results;
      }
    ),
    
    iocCountsByFeed: new DataLoader(
      async (feedIds: readonly string[]) => {
        const results = await dataSources.ioc.getIOCCountsByFeedIds([...feedIds]);
        return results;
      }
    ),
    
    campaignCountsByActor: new DataLoader(
      async (actorIds: readonly string[]) => {
        const results = await dataSources.threatCampaign.getCampaignCountsByActorIds([...actorIds]);
        return results;
      }
    ),
    
    indicatorCountsByThreat: new DataLoader(
      async (threatIds: readonly string[]) => {
        const results = await dataSources.indicator.getIndicatorCountsByThreatIds([...threatIds]);
        return results;
      }
    ),
  };
};

// Cache management utilities
export class DataLoaderCache {
  private loaders: ThreatDataLoaders;
  
  constructor(loaders: ThreatDataLoaders) {
    this.loaders = loaders;
  }
  
  // Clear specific entity caches
  clearThreatCache(id: string) {
    this.loaders.threats.clear(id);
    // Clear related caches that might be affected
    this.loaders.indicatorsByThreat.clear(id);
    this.loaders.actorsByThreat.clear(id);
    this.loaders.campaignsByThreat.clear(id);
  }
  
  clearIOCCache(id: string) {
    this.loaders.iocs.clear(id);
    this.loaders.iocEnrichment.clear(id);
  }
  
  clearActorCache(id: string) {
    this.loaders.actors.clear(id);
    this.loaders.threatsByActor.clear(id);
    this.loaders.campaignsByActor.clear(id);
    this.loaders.iocsByActor.clear(id);
  }
  
  clearCampaignCache(id: string) {
    this.loaders.campaigns.clear(id);
    this.loaders.threatsByCampaign.clear(id);
    this.loaders.actorsByCampaign.clear(id);
    this.loaders.iocsByCampaign.clear(id);
  }
  
  // Clear all caches
  clearAll() {
    Object.values(this.loaders).forEach(loader => {
      if (loader.clearAll) {
        loader.clearAll();
      }
    });
  }
  
  // Prime caches with data
  prime<T>(loader: DataLoader<string, T>, id: string, data: T) {
    loader.prime(id, data);
  }
  
  // Get cache statistics
  getCacheStats() {
    const stats: Record<string, any> = {};
    
    Object.entries(this.loaders).forEach(([name, loader]) => {
      if (loader.stats) {
        stats[name] = loader.stats;
      }
    });
    
    return stats;
  }
}

// Error handling for DataLoaders
export const handleDataLoaderError = (error: any, loaderName: string, key: any) => {
  console.error(`DataLoader error in ${loaderName} for key ${key}:`, error);
  
  // Return appropriate fallback based on loader type
  if (loaderName.includes('Count')) {
    return 0;
  }
  
  if (loaderName.endsWith('s') || loaderName.includes('By')) {
    return [];
  }
  
  return null;
};

// DataLoader metrics and monitoring
export class DataLoaderMetrics {
  private metrics: Map<string, { hits: number; misses: number; errors: number }> = new Map();
  
  recordHit(loaderName: string) {
    const metric = this.metrics.get(loaderName) || { hits: 0, misses: 0, errors: 0 };
    metric.hits++;
    this.metrics.set(loaderName, metric);
  }
  
  recordMiss(loaderName: string) {
    const metric = this.metrics.get(loaderName) || { hits: 0, misses: 0, errors: 0 };
    metric.misses++;
    this.metrics.set(loaderName, metric);
  }
  
  recordError(loaderName: string) {
    const metric = this.metrics.get(loaderName) || { hits: 0, misses: 0, errors: 0 };
    metric.errors++;
    this.metrics.set(loaderName, metric);
  }
  
  getMetrics() {
    const result: Record<string, any> = {};
    
    this.metrics.forEach((metric, name) => {
      const total = metric.hits + metric.misses;
      result[name] = {
        ...metric,
        total,
        hitRate: total > 0 ? metric.hits / total : 0,
        errorRate: total > 0 ? metric.errors / total : 0,
      };
    });
    
    return result;
  }
  
  reset() {
    this.metrics.clear();
  }
}
