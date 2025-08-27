import DataLoader from 'dataloader';
import { User, Asset, Alert, Vulnerability, SecurityEvent, Incident } from '../types/generated';

// DataLoader cache management
export interface DataLoaderContext {
  userLoader: DataLoader<string, User | null>;
  assetLoader: DataLoader<string, Asset | null>;
  alertLoader: DataLoader<string, Alert | null>;
  vulnerabilityLoader: DataLoader<string, Vulnerability | null>;
  securityEventLoader: DataLoader<string, SecurityEvent | null>;
  incidentLoader: DataLoader<string, Incident | null>;
  
  // Batch loaders for relationships
  assetVulnerabilitiesLoader: DataLoader<string, Vulnerability[]>;
  assetAlertsLoader: DataLoader<string, Alert[]>;
  assetEventsLoader: DataLoader<string, SecurityEvent[]>;
  userAssignedAlertsLoader: DataLoader<string, Alert[]>;
  alertRelatedEventsLoader: DataLoader<string, SecurityEvent[]>;
  
  // Aggregation loaders
  organizationAssetCountLoader: DataLoader<string, number>;
  assetRiskScoreLoader: DataLoader<string, number>;
  userWorkloadLoader: DataLoader<string, number>;
}

// User DataLoader
export const createUserLoader = (fetchUsers: (ids: readonly string[]) => Promise<(User | null)[]>) => {
  return new DataLoader<string, User | null>(
    async (userIds) => {
      console.log(`🔍 Batch loading ${userIds.length} users:`, userIds);
      const users = await fetchUsers(userIds);
      
      // Create a map for O(1) lookup
      const userMap = new Map(users.filter(Boolean).map(user => [user!.id, user!]));
      
      // Return users in the same order as requested IDs
      return userIds.map(id => userMap.get(id) || null);
    },
    {
      // Cache for 5 minutes
      cacheKeyFn: (key) => key,
      // Batch multiple requests within 10ms
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      // Maximum batch size
      maxBatchSize: 100,
      // Cache results
      cache: true,
    }
  );
};

// Asset DataLoader
export const createAssetLoader = (fetchAssets: (ids: readonly string[]) => Promise<(Asset | null)[]>) => {
  return new DataLoader<string, Asset | null>(
    async (assetIds) => {
      console.log(`🔍 Batch loading ${assetIds.length} assets:`, assetIds);
      const assets = await fetchAssets(assetIds);
      
      const assetMap = new Map(assets.filter(Boolean).map(asset => [asset!.id, asset!]));
      return assetIds.map(id => assetMap.get(id) || null);
    },
    {
      cacheKeyFn: (key) => key,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      maxBatchSize: 100,
      cache: true,
    }
  );
};

// Alert DataLoader
export const createAlertLoader = (fetchAlerts: (ids: readonly string[]) => Promise<(Alert | null)[]>) => {
  return new DataLoader<string, Alert | null>(
    async (alertIds) => {
      console.log(`🔍 Batch loading ${alertIds.length} alerts:`, alertIds);
      const alerts = await fetchAlerts(alertIds);
      
      const alertMap = new Map(alerts.filter(Boolean).map(alert => [alert!.id, alert!]));
      return alertIds.map(id => alertMap.get(id) || null);
    },
    {
      cacheKeyFn: (key) => key,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      maxBatchSize: 100,
      cache: true,
    }
  );
};

// Vulnerability DataLoader
export const createVulnerabilityLoader = (fetchVulnerabilities: (ids: readonly string[]) => Promise<(Vulnerability | null)[]>) => {
  return new DataLoader<string, Vulnerability | null>(
    async (vulnIds) => {
      console.log(`🔍 Batch loading ${vulnIds.length} vulnerabilities:`, vulnIds);
      const vulnerabilities = await fetchVulnerabilities(vulnIds);
      
      const vulnMap = new Map(vulnerabilities.filter(Boolean).map(vuln => [vuln!.id, vuln!]));
      return vulnIds.map(id => vulnMap.get(id) || null);
    },
    {
      cacheKeyFn: (key) => key,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      maxBatchSize: 100,
      cache: true,
    }
  );
};

// Security Event DataLoader
export const createSecurityEventLoader = (fetchEvents: (ids: readonly string[]) => Promise<(SecurityEvent | null)[]>) => {
  return new DataLoader<string, SecurityEvent | null>(
    async (eventIds) => {
      console.log(`🔍 Batch loading ${eventIds.length} security events:`, eventIds);
      const events = await fetchEvents(eventIds);
      
      const eventMap = new Map(events.filter(Boolean).map(event => [event!.id, event!]));
      return eventIds.map(id => eventMap.get(id) || null);
    },
    {
      cacheKeyFn: (key) => key,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      maxBatchSize: 100,
      cache: true,
    }
  );
};

// Incident DataLoader
export const createIncidentLoader = (fetchIncidents: (ids: readonly string[]) => Promise<(Incident | null)[]>) => {
  return new DataLoader<string, Incident | null>(
    async (incidentIds) => {
      console.log(`🔍 Batch loading ${incidentIds.length} incidents:`, incidentIds);
      const incidents = await fetchIncidents(incidentIds);
      
      const incidentMap = new Map(incidents.filter(Boolean).map(incident => [incident!.id, incident!]));
      return incidentIds.map(id => incidentMap.get(id) || null);
    },
    {
      cacheKeyFn: (key) => key,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      maxBatchSize: 100,
      cache: true,
    }
  );
};

// Asset Vulnerabilities Loader (One-to-Many relationship)
export const createAssetVulnerabilitiesLoader = (fetchAssetVulnerabilities: (assetIds: readonly string[]) => Promise<Map<string, Vulnerability[]>>) => {
  return new DataLoader<string, Vulnerability[]>(
    async (assetIds) => {
      console.log(`🔍 Batch loading vulnerabilities for ${assetIds.length} assets:`, assetIds);
      const vulnsByAsset = await fetchAssetVulnerabilities(assetIds);
      
      return assetIds.map(assetId => vulnsByAsset.get(assetId) || []);
    },
    {
      cacheKeyFn: (key) => `asset_vulns_${key}`,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      maxBatchSize: 50,
      cache: true,
    }
  );
};

// Asset Alerts Loader (One-to-Many relationship)
export const createAssetAlertsLoader = (fetchAssetAlerts: (assetIds: readonly string[]) => Promise<Map<string, Alert[]>>) => {
  return new DataLoader<string, Alert[]>(
    async (assetIds) => {
      console.log(`🔍 Batch loading alerts for ${assetIds.length} assets:`, assetIds);
      const alertsByAsset = await fetchAssetAlerts(assetIds);
      
      return assetIds.map(assetId => alertsByAsset.get(assetId) || []);
    },
    {
      cacheKeyFn: (key) => `asset_alerts_${key}`,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      maxBatchSize: 50,
      cache: true,
    }
  );
};

// Asset Events Loader (One-to-Many relationship)
export const createAssetEventsLoader = (fetchAssetEvents: (assetIds: readonly string[]) => Promise<Map<string, SecurityEvent[]>>) => {
  return new DataLoader<string, SecurityEvent[]>(
    async (assetIds) => {
      console.log(`🔍 Batch loading events for ${assetIds.length} assets:`, assetIds);
      const eventsByAsset = await fetchAssetEvents(assetIds);
      
      return assetIds.map(assetId => eventsByAsset.get(assetId) || []);
    },
    {
      cacheKeyFn: (key) => `asset_events_${key}`,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      maxBatchSize: 50,
      cache: true,
    }
  );
};

// User Assigned Alerts Loader
export const createUserAssignedAlertsLoader = (fetchUserAlerts: (userIds: readonly string[]) => Promise<Map<string, Alert[]>>) => {
  return new DataLoader<string, Alert[]>(
    async (userIds) => {
      console.log(`🔍 Batch loading assigned alerts for ${userIds.length} users:`, userIds);
      const alertsByUser = await fetchUserAlerts(userIds);
      
      return userIds.map(userId => alertsByUser.get(userId) || []);
    },
    {
      cacheKeyFn: (key) => `user_alerts_${key}`,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      maxBatchSize: 50,
      cache: true,
    }
  );
};

// Alert Related Events Loader
export const createAlertRelatedEventsLoader = (fetchAlertEvents: (alertIds: readonly string[]) => Promise<Map<string, SecurityEvent[]>>) => {
  return new DataLoader<string, SecurityEvent[]>(
    async (alertIds) => {
      console.log(`🔍 Batch loading related events for ${alertIds.length} alerts:`, alertIds);
      const eventsByAlert = await fetchAlertEvents(alertIds);
      
      return alertIds.map(alertId => eventsByAlert.get(alertId) || []);
    },
    {
      cacheKeyFn: (key) => `alert_events_${key}`,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      maxBatchSize: 50,
      cache: true,
    }
  );
};

// Organization Asset Count Loader (Aggregation)
export const createOrganizationAssetCountLoader = (fetchAssetCounts: (orgIds: readonly string[]) => Promise<Map<string, number>>) => {
  return new DataLoader<string, number>(
    async (orgIds) => {
      console.log(`🔍 Batch loading asset counts for ${orgIds.length} organizations:`, orgIds);
      const countsByOrg = await fetchAssetCounts(orgIds);
      
      return orgIds.map(orgId => countsByOrg.get(orgId) || 0);
    },
    {
      cacheKeyFn: (key) => `org_asset_count_${key}`,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      maxBatchSize: 100,
      // Cache for longer since counts don't change frequently
      cache: true,
    }
  );
};

// Asset Risk Score Loader (Computed values)
export const createAssetRiskScoreLoader = (calculateRiskScores: (assetIds: readonly string[]) => Promise<Map<string, number>>) => {
  return new DataLoader<string, number>(
    async (assetIds) => {
      console.log(`🔍 Batch calculating risk scores for ${assetIds.length} assets:`, assetIds);
      const scoresByAsset = await calculateRiskScores(assetIds);
      
      return assetIds.map(assetId => scoresByAsset.get(assetId) || 0);
    },
    {
      cacheKeyFn: (key) => `asset_risk_score_${key}`,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      maxBatchSize: 50,
      // Cache for shorter time since risk scores change frequently
      cache: true,
    }
  );
};

// User Workload Loader (for assignment optimization)
export const createUserWorkloadLoader = (calculateUserWorkloads: (userIds: readonly string[]) => Promise<Map<string, number>>) => {
  return new DataLoader<string, number>(
    async (userIds) => {
      console.log(`🔍 Batch calculating workloads for ${userIds.length} users:`, userIds);
      const workloadsByUser = await calculateUserWorkloads(userIds);
      
      return userIds.map(userId => workloadsByUser.get(userId) || 0);
    },
    {
      cacheKeyFn: (key) => `user_workload_${key}`,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      maxBatchSize: 100,
      cache: true,
    }
  );
};

// DataLoader Context Creation
export const createDataLoaderContext = (dataServices: {
  userService: any;
  assetService: any;
  alertService: any;
  vulnerabilityService: any;
  eventService: any;
  incidentService: any;
}): DataLoaderContext => {
  const {
    userService,
    assetService,
    alertService,
    vulnerabilityService,
    eventService,
    incidentService,
  } = dataServices;

  return {
    // Primary entity loaders
    userLoader: createUserLoader(userService.batchFetchUsers),
    assetLoader: createAssetLoader(assetService.batchFetchAssets),
    alertLoader: createAlertLoader(alertService.batchFetchAlerts),
    vulnerabilityLoader: createVulnerabilityLoader(vulnerabilityService.batchFetchVulnerabilities),
    securityEventLoader: createSecurityEventLoader(eventService.batchFetchEvents),
    incidentLoader: createIncidentLoader(incidentService.batchFetchIncidents),
    
    // Relationship loaders
    assetVulnerabilitiesLoader: createAssetVulnerabilitiesLoader(assetService.batchFetchAssetVulnerabilities),
    assetAlertsLoader: createAssetAlertsLoader(assetService.batchFetchAssetAlerts),
    assetEventsLoader: createAssetEventsLoader(assetService.batchFetchAssetEvents),
    userAssignedAlertsLoader: createUserAssignedAlertsLoader(userService.batchFetchUserAlerts),
    alertRelatedEventsLoader: createAlertRelatedEventsLoader(alertService.batchFetchAlertEvents),
    
    // Aggregation loaders
    organizationAssetCountLoader: createOrganizationAssetCountLoader(assetService.batchCalculateAssetCounts),
    assetRiskScoreLoader: createAssetRiskScoreLoader(assetService.batchCalculateRiskScores),
    userWorkloadLoader: createUserWorkloadLoader(userService.batchCalculateUserWorkloads),
  };
};

// DataLoader Cache Management
export class DataLoaderCacheManager {
  private loaders: DataLoaderContext;

  constructor(loaders: DataLoaderContext) {
    this.loaders = loaders;
  }

  // Clear all caches
  clearAll(): void {
    Object.values(this.loaders).forEach(loader => {
      if (loader && typeof loader.clearAll === 'function') {
        loader.clearAll();
      }
    });
  }

  // Clear specific entity caches
  clearUser(userId: string): void {
    this.loaders.userLoader.clear(userId);
    this.loaders.userAssignedAlertsLoader.clear(userId);
    this.loaders.userWorkloadLoader.clear(userId);
  }

  clearAsset(assetId: string): void {
    this.loaders.assetLoader.clear(assetId);
    this.loaders.assetVulnerabilitiesLoader.clear(assetId);
    this.loaders.assetAlertsLoader.clear(assetId);
    this.loaders.assetEventsLoader.clear(assetId);
    this.loaders.assetRiskScoreLoader.clear(assetId);
  }

  clearAlert(alertId: string): void {
    this.loaders.alertLoader.clear(alertId);
    this.loaders.alertRelatedEventsLoader.clear(alertId);
  }

  clearVulnerability(vulnId: string): void {
    this.loaders.vulnerabilityLoader.clear(vulnId);
  }

  clearEvent(eventId: string): void {
    this.loaders.securityEventLoader.clear(eventId);
  }

  clearIncident(incidentId: string): void {
    this.loaders.incidentLoader.clear(incidentId);
  }

  // Clear organization-specific caches
  clearOrganization(orgId: string): void {
    this.loaders.organizationAssetCountLoader.clear(orgId);
  }

  // Prime caches with known data
  primeUser(user: User): void {
    this.loaders.userLoader.prime(user.id, user);
  }

  primeAsset(asset: Asset): void {
    this.loaders.assetLoader.prime(asset.id, asset);
  }

  primeAlert(alert: Alert): void {
    this.loaders.alertLoader.prime(alert.id, alert);
  }

  primeVulnerability(vulnerability: Vulnerability): void {
    this.loaders.vulnerabilityLoader.prime(vulnerability.id, vulnerability);
  }

  primeEvent(event: SecurityEvent): void {
    this.loaders.securityEventLoader.prime(event.id, event);
  }

  primeIncident(incident: Incident): void {
    this.loaders.incidentLoader.prime(incident.id, incident);
  }
}

// DataLoader Statistics for monitoring
export interface DataLoaderStats {
  loaderName: string;
  cacheHitRate: number;
  totalRequests: number;
  batchedRequests: number;
  averageBatchSize: number;
  cacheSize: number;
}

export const getDataLoaderStats = (loaders: DataLoaderContext): DataLoaderStats[] => {
  const stats: DataLoaderStats[] = [];
  
  Object.entries(loaders).forEach(([name, loader]) => {
    if (loader && typeof loader.stats === 'function') {
      const loaderStats = loader.stats();
      stats.push({
        loaderName: name,
        cacheHitRate: loaderStats.cacheHits / (loaderStats.cacheHits + loaderStats.cacheMisses) || 0,
        totalRequests: loaderStats.totalRequests || 0,
        batchedRequests: loaderStats.batchedRequests || 0,
        averageBatchSize: loaderStats.averageBatchSize || 0,
        cacheSize: loaderStats.cacheSize || 0,
      });
    }
  });
  
  return stats;
};

// Request-scoped cache invalidation
export const createRequestScopedCache = () => {
  const requestCache = new Map();
  
  return {
    get: (key: string) => requestCache.get(key),
    set: (key: string, value: any) => requestCache.set(key, value),
    delete: (key: string) => requestCache.delete(key),
    clear: () => requestCache.clear(),
    size: () => requestCache.size,
  };
};

// Smart cache warming for predictable queries
export const warmCache = async (
  loaders: DataLoaderContext,
  warmingStrategy: {
    users?: string[];
    assets?: string[];
    alerts?: string[];
    vulnerabilities?: string[];
    events?: string[];
    incidents?: string[];
  }
) => {
  console.log('🔥 Warming DataLoader caches...');
  
  const promises: Promise<any>[] = [];
  
  if (warmingStrategy.users?.length) {
    promises.push(
      Promise.all(warmingStrategy.users.map(id => loaders.userLoader.load(id)))
    );
  }
  
  if (warmingStrategy.assets?.length) {
    promises.push(
      Promise.all(warmingStrategy.assets.map(id => loaders.assetLoader.load(id)))
    );
  }
  
  if (warmingStrategy.alerts?.length) {
    promises.push(
      Promise.all(warmingStrategy.alerts.map(id => loaders.alertLoader.load(id)))
    );
  }
  
  if (warmingStrategy.vulnerabilities?.length) {
    promises.push(
      Promise.all(warmingStrategy.vulnerabilities.map(id => loaders.vulnerabilityLoader.load(id)))
    );
  }
  
  if (warmingStrategy.events?.length) {
    promises.push(
      Promise.all(warmingStrategy.events.map(id => loaders.securityEventLoader.load(id)))
    );
  }
  
  if (warmingStrategy.incidents?.length) {
    promises.push(
      Promise.all(warmingStrategy.incidents.map(id => loaders.incidentLoader.load(id)))
    );
  }
  
  await Promise.all(promises);
  console.log('✅ Cache warming completed');
};

// Export the main context creator and types
export { DataLoader };
export type { DataLoaderContext };