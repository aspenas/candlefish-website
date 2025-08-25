// Security Dashboard DataLoaders
// High-performance batching and caching for N+1 query prevention

import DataLoader from 'dataloader';
import { Redis } from 'ioredis';
import LRU from 'lru-cache';
import { performance } from 'perf_hooks';

import {
  Asset,
  SecurityEvent,
  Alert,
  Vulnerability,
  User,
  ComplianceAssessment,
  KongService,
  KongRoute,
  AssetType,
  ComplianceControl,
  AlertRule,
} from '../types';

import {
  AssetService,
  SecurityEventService,
  AlertService,
  VulnerabilityService,
  UserService,
  ComplianceService,
  KongMonitoringService,
} from '../services';

// Configuration for DataLoader optimizations
const DATALOADER_CONFIG = {
  // Batch window to collect requests (ms)
  batchScheduleFn: (callback: () => void) => setTimeout(callback, 10),
  
  // Enable caching for repeated requests within the same GraphQL request
  cache: true,
  
  // Maximum batch size to prevent memory issues
  maxBatchSize: 100,
  
  // Cache key function for debugging
  cacheKeyFn: (key: string) => key,
};

// Local LRU cache configuration for hot data
const LRU_CONFIG = {
  max: 1000, // Maximum items
  ttl: 1000 * 60 * 5, // 5 minutes TTL
  allowStale: true,
  updateAgeOnGet: true,
};

// Multi-layer caching DataLoader with Redis backing
class CachedDataLoader<K, V> extends DataLoader<K, V> {
  private localCache: LRU<string, V>;
  private redis: Redis;
  private cachePrefix: string;
  private cacheTTL: number;
  private serviceName: string;

  constructor(
    batchLoadFn: (keys: readonly K[]) => Promise<(V | Error)[]>,
    redis: Redis,
    cachePrefix: string,
    cacheTTL: number = 300, // 5 minutes default
    serviceName: string = 'unknown'
  ) {
    super(batchLoadFn, DATALOADER_CONFIG);
    
    this.localCache = new LRU(LRU_CONFIG);
    this.redis = redis;
    this.cachePrefix = cachePrefix;
    this.cacheTTL = cacheTTL;
    this.serviceName = serviceName;
  }

  async load(key: K): Promise<V> {
    const stringKey = String(key);
    const cacheKey = `${this.cachePrefix}:${stringKey}`;
    
    // L1: Check local LRU cache first (fastest)
    if (this.localCache.has(cacheKey)) {
      return this.localCache.get(cacheKey)!;
    }
    
    // L2: Check Redis cache (fast, distributed)
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const value = JSON.parse(cached);
        this.localCache.set(cacheKey, value);
        return value;
      }
    } catch (error) {
      // Log Redis error but continue to database
      console.error(`Redis cache error for ${cacheKey}:`, error);
    }
    
    // L3: Load from DataLoader (database/service)
    const startTime = performance.now();
    const value = await super.load(key);
    const endTime = performance.now();
    
    // Cache the result in both layers
    this.localCache.set(cacheKey, value);
    
    try {
      await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(value));
    } catch (error) {
      console.error(`Redis cache set error for ${cacheKey}:`, error);
    }
    
    // Record performance metrics
    await this.recordLoadTime(this.serviceName, endTime - startTime);
    
    return value;
  }

  async loadMany(keys: readonly K[]): Promise<(V | Error)[]> {
    const startTime = performance.now();
    const results = await super.loadMany(keys);
    const endTime = performance.now();
    
    // Cache successful results
    results.forEach((result, index) => {
      if (!(result instanceof Error)) {
        const stringKey = String(keys[index]);
        const cacheKey = `${this.cachePrefix}:${stringKey}`;
        
        this.localCache.set(cacheKey, result);
        
        // Cache in Redis asynchronously
        this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(result))
          .catch(error => console.error(`Redis cache set error for ${cacheKey}:`, error));
      }
    });
    
    // Record batch performance metrics
    await this.recordBatchLoadTime(this.serviceName, keys.length, endTime - startTime);
    
    return results;
  }

  // Invalidate cache entries
  async invalidate(key: K): Promise<void> {
    const stringKey = String(key);
    const cacheKey = `${this.cachePrefix}:${stringKey}`;
    
    // Clear from local cache
    this.localCache.delete(cacheKey);
    
    // Clear from DataLoader cache
    this.clear(key);
    
    // Clear from Redis
    try {
      await this.redis.del(cacheKey);
    } catch (error) {
      console.error(`Redis cache delete error for ${cacheKey}:`, error);
    }
  }

  // Invalidate all cache entries with pattern
  async invalidatePattern(pattern: string): Promise<void> {
    // Clear local cache entries matching pattern
    for (const key of this.localCache.keys()) {
      if (key.includes(pattern)) {
        this.localCache.delete(key);
      }
    }
    
    // Clear all DataLoader cache
    this.clearAll();
    
    // Clear Redis entries matching pattern
    try {
      const keys = await this.redis.keys(`${this.cachePrefix}:*${pattern}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error(`Redis pattern delete error for ${pattern}:`, error);
    }
  }

  private async recordLoadTime(serviceName: string, duration: number): Promise<void> {
    // Record metrics asynchronously to avoid blocking
    setImmediate(async () => {
      try {
        await this.redis.lpush(
          'dataloader:performance',
          JSON.stringify({
            service: serviceName,
            type: 'single_load',
            duration,
            timestamp: new Date().toISOString(),
          })
        );
      } catch (error) {
        // Silently fail metrics recording
      }
    });
  }

  private async recordBatchLoadTime(serviceName: string, batchSize: number, duration: number): Promise<void> {
    setImmediate(async () => {
      try {
        await this.redis.lpush(
          'dataloader:performance',
          JSON.stringify({
            service: serviceName,
            type: 'batch_load',
            batchSize,
            duration,
            avgPerItem: duration / batchSize,
            timestamp: new Date().toISOString(),
          })
        );
      } catch (error) {
        // Silently fail metrics recording
      }
    });
  }
}

// Asset DataLoader with relationship loading
export function createAssetDataLoader(
  assetService: AssetService,
  redis: Redis
): CachedDataLoader<string, Asset | null> {
  return new CachedDataLoader(
    async (assetIds: readonly string[]) => {
      const assets = await assetService.getAssetsByIds(Array.from(assetIds));
      
      // Create a map for O(1) lookup
      const assetMap = new Map(assets.map(asset => [asset.id, asset]));
      
      // Return results in the same order as requested keys
      return assetIds.map(id => assetMap.get(id) || null);
    },
    redis,
    'asset',
    300, // 5 minutes TTL
    'AssetService'
  );
}

// Security Event DataLoader
export function createSecurityEventDataLoader(
  securityEventService: SecurityEventService,
  redis: Redis
): CachedDataLoader<string, SecurityEvent | null> {
  return new CachedDataLoader(
    async (eventIds: readonly string[]) => {
      const events = await securityEventService.getSecurityEventsByIds(Array.from(eventIds));
      const eventMap = new Map(events.map(event => [event.id, event]));
      return eventIds.map(id => eventMap.get(id) || null);
    },
    redis,
    'security_event',
    60, // 1 minute TTL for real-time data
    'SecurityEventService'
  );
}

// Alert DataLoader
export function createAlertDataLoader(
  alertService: AlertService,
  redis: Redis
): CachedDataLoader<string, Alert | null> {
  return new CachedDataLoader(
    async (alertIds: readonly string[]) => {
      const alerts = await alertService.getAlertsByIds(Array.from(alertIds));
      const alertMap = new Map(alerts.map(alert => [alert.id, alert]));
      return alertIds.map(id => alertMap.get(id) || null);
    },
    redis,
    'alert',
    30, // 30 seconds TTL for real-time alerts
    'AlertService'
  );
}

// Vulnerability DataLoader
export function createVulnerabilityDataLoader(
  vulnerabilityService: VulnerabilityService,
  redis: Redis
): CachedDataLoader<string, Vulnerability | null> {
  return new CachedDataLoader(
    async (vulnerabilityIds: readonly string[]) => {
      const vulnerabilities = await vulnerabilityService.getVulnerabilitiesByIds(Array.from(vulnerabilityIds));
      const vulnerabilityMap = new Map(vulnerabilities.map(vuln => [vuln.id, vuln]));
      return vulnerabilityIds.map(id => vulnerabilityMap.get(id) || null);
    },
    redis,
    'vulnerability',
    600, // 10 minutes TTL
    'VulnerabilityService'
  );
}

// User DataLoader with multiple key support (id, email)
export function createUserDataLoader(
  userService: UserService,
  redis: Redis
): CachedDataLoader<string, User | null> {
  return new CachedDataLoader(
    async (userKeys: readonly string[]) => {
      // Separate IDs and emails
      const userIds: string[] = [];
      const emails: string[] = [];
      
      userKeys.forEach(key => {
        if (key.includes('@')) {
          emails.push(key);
        } else {
          userIds.push(key);
        }
      });
      
      // Fetch users by both IDs and emails
      const [usersById, usersByEmail] = await Promise.all([
        userIds.length > 0 ? userService.getUsersByIds(userIds) : [],
        emails.length > 0 ? userService.getUsersByEmails(emails) : [],
      ]);
      
      // Create maps for O(1) lookup
      const userIdMap = new Map(usersById.map(user => [user.id, user]));
      const userEmailMap = new Map(usersByEmail.map(user => [user.email, user]));
      
      // Return results in the same order as requested keys
      return userKeys.map(key => {
        if (key.includes('@')) {
          return userEmailMap.get(key) || null;
        } else {
          return userIdMap.get(key) || null;
        }
      });
    },
    redis,
    'user',
    900, // 15 minutes TTL
    'UserService'
  );
}

// Compliance Assessment DataLoader
export function createComplianceAssessmentDataLoader(
  complianceService: ComplianceService,
  redis: Redis
): CachedDataLoader<string, ComplianceAssessment | null> {
  return new CachedDataLoader(
    async (assessmentIds: readonly string[]) => {
      const assessments = await complianceService.getAssessmentsByIds(Array.from(assessmentIds));
      const assessmentMap = new Map(assessments.map(assessment => [assessment.id, assessment]));
      return assessmentIds.map(id => assessmentMap.get(id) || null);
    },
    redis,
    'compliance_assessment',
    1800, // 30 minutes TTL
    'ComplianceService'
  );
}

// Kong Service DataLoader
export function createKongServiceDataLoader(
  kongMonitoringService: KongMonitoringService,
  redis: Redis
): CachedDataLoader<string, KongService | null> {
  return new CachedDataLoader(
    async (serviceIds: readonly string[]) => {
      const services = await kongMonitoringService.getKongServicesByIds(Array.from(serviceIds));
      const serviceMap = new Map(services.map(service => [service.id, service]));
      return serviceIds.map(id => serviceMap.get(id) || null);
    },
    redis,
    'kong_service',
    120, // 2 minutes TTL
    'KongMonitoringService'
  );
}

// Kong Route DataLoader
export function createKongRouteDataLoader(
  kongMonitoringService: KongMonitoringService,
  redis: Redis
): CachedDataLoader<string, KongRoute | null> {
  return new CachedDataLoader(
    async (routeIds: readonly string[]) => {
      const routes = await kongMonitoringService.getKongRoutesByIds(Array.from(routeIds));
      const routeMap = new Map(routes.map(route => [route.id, route]));
      return routeIds.map(id => routeMap.get(id) || null);
    },
    redis,
    'kong_route',
    120, // 2 minutes TTL
    'KongMonitoringService'
  );
}

// Asset Type DataLoader
export function createAssetTypeDataLoader(
  assetService: AssetService,
  redis: Redis
): CachedDataLoader<string, AssetType | null> {
  return new CachedDataLoader(
    async (typeIds: readonly string[]) => {
      const types = await assetService.getAssetTypesByIds(Array.from(typeIds));
      const typeMap = new Map(types.map(type => [type.id, type]));
      return typeIds.map(id => typeMap.get(id) || null);
    },
    redis,
    'asset_type',
    3600, // 1 hour TTL (rarely changes)
    'AssetService'
  );
}

// Compliance Control DataLoader
export function createComplianceControlDataLoader(
  complianceService: ComplianceService,
  redis: Redis
): CachedDataLoader<string, ComplianceControl | null> {
  return new CachedDataLoader(
    async (controlIds: readonly string[]) => {
      const controls = await complianceService.getControlsByIds(Array.from(controlIds));
      const controlMap = new Map(controls.map(control => [control.id, control]));
      return controlIds.map(id => controlMap.get(id) || null);
    },
    redis,
    'compliance_control',
    3600, // 1 hour TTL (rarely changes)
    'ComplianceService'
  );
}

// Alert Rule DataLoader
export function createAlertRuleDataLoader(
  alertService: AlertService,
  redis: Redis
): CachedDataLoader<string, AlertRule | null> {
  return new CachedDataLoader(
    async (ruleIds: readonly string[]) => {
      const rules = await alertService.getAlertRulesByIds(Array.from(ruleIds));
      const ruleMap = new Map(rules.map(rule => [rule.id, rule]));
      return ruleIds.map(id => ruleMap.get(id) || null);
    },
    redis,
    'alert_rule',
    600, // 10 minutes TTL
    'AlertService'
  );
}

// Relationship DataLoaders for efficient foreign key resolution

// Asset-related relationships
export function createAssetVulnerabilitiesDataLoader(
  vulnerabilityService: VulnerabilityService,
  redis: Redis
): CachedDataLoader<string, Vulnerability[]> {
  return new CachedDataLoader(
    async (assetIds: readonly string[]) => {
      const vulnerabilities = await vulnerabilityService.getVulnerabilitiesByAssetIds(Array.from(assetIds));
      
      // Group by asset ID
      const vulnerabilityMap = new Map<string, Vulnerability[]>();
      vulnerabilities.forEach(vuln => {
        if (!vulnerabilityMap.has(vuln.assetId)) {
          vulnerabilityMap.set(vuln.assetId, []);
        }
        vulnerabilityMap.get(vuln.assetId)!.push(vuln);
      });
      
      return assetIds.map(id => vulnerabilityMap.get(id) || []);
    },
    redis,
    'asset_vulnerabilities',
    300,
    'VulnerabilityService'
  );
}

export function createAssetSecurityEventsDataLoader(
  securityEventService: SecurityEventService,
  redis: Redis
): CachedDataLoader<string, SecurityEvent[]> {
  return new CachedDataLoader(
    async (assetIds: readonly string[]) => {
      const events = await securityEventService.getEventsByAssetIds(Array.from(assetIds));
      
      // Group by asset ID
      const eventMap = new Map<string, SecurityEvent[]>();
      events.forEach(event => {
        if (!eventMap.has(event.assetId)) {
          eventMap.set(event.assetId, []);
        }
        eventMap.get(event.assetId)!.push(event);
      });
      
      return assetIds.map(id => eventMap.get(id) || []);
    },
    redis,
    'asset_security_events',
    60, // 1 minute TTL for real-time data
    'SecurityEventService'
  );
}

export function createAssetAlertsDataLoader(
  alertService: AlertService,
  redis: Redis
): CachedDataLoader<string, Alert[]> {
  return new CachedDataLoader(
    async (assetIds: readonly string[]) => {
      const alerts = await alertService.getAlertsByAssetIds(Array.from(assetIds));
      
      // Group by asset ID
      const alertMap = new Map<string, Alert[]>();
      alerts.forEach(alert => {
        if (!alertMap.has(alert.assetId)) {
          alertMap.set(alert.assetId, []);
        }
        alertMap.get(alert.assetId)!.push(alert);
      });
      
      return assetIds.map(id => alertMap.get(id) || []);
    },
    redis,
    'asset_alerts',
    30, // 30 seconds TTL for real-time alerts
    'AlertService'
  );
}

// DataLoader factory function
export interface SecurityDataLoaders {
  assets: CachedDataLoader<string, Asset | null>;
  securityEvents: CachedDataLoader<string, SecurityEvent | null>;
  alerts: CachedDataLoader<string, Alert | null>;
  vulnerabilities: CachedDataLoader<string, Vulnerability | null>;
  users: CachedDataLoader<string, User | null>;
  complianceAssessments: CachedDataLoader<string, ComplianceAssessment | null>;
  kongServices: CachedDataLoader<string, KongService | null>;
  kongRoutes: CachedDataLoader<string, KongRoute | null>;
  assetTypes: CachedDataLoader<string, AssetType | null>;
  complianceControls: CachedDataLoader<string, ComplianceControl | null>;
  alertRules: CachedDataLoader<string, AlertRule | null>;
  
  // Relationship DataLoaders
  assetVulnerabilities: CachedDataLoader<string, Vulnerability[]>;
  assetSecurityEvents: CachedDataLoader<string, SecurityEvent[]>;
  assetAlerts: CachedDataLoader<string, Alert[]>;
}

export function createSecurityDataLoaders(
  services: {
    assetService: AssetService;
    securityEventService: SecurityEventService;
    alertService: AlertService;
    vulnerabilityService: VulnerabilityService;
    userService: UserService;
    complianceService: ComplianceService;
    kongMonitoringService: KongMonitoringService;
  },
  redis: Redis
): SecurityDataLoaders {
  return {
    assets: createAssetDataLoader(services.assetService, redis),
    securityEvents: createSecurityEventDataLoader(services.securityEventService, redis),
    alerts: createAlertDataLoader(services.alertService, redis),
    vulnerabilities: createVulnerabilityDataLoader(services.vulnerabilityService, redis),
    users: createUserDataLoader(services.userService, redis),
    complianceAssessments: createComplianceAssessmentDataLoader(services.complianceService, redis),
    kongServices: createKongServiceDataLoader(services.kongMonitoringService, redis),
    kongRoutes: createKongRouteDataLoader(services.kongMonitoringService, redis),
    assetTypes: createAssetTypeDataLoader(services.assetService, redis),
    complianceControls: createComplianceControlDataLoader(services.complianceService, redis),
    alertRules: createAlertRuleDataLoader(services.alertService, redis),
    
    // Relationship DataLoaders
    assetVulnerabilities: createAssetVulnerabilitiesDataLoader(services.vulnerabilityService, redis),
    assetSecurityEvents: createAssetSecurityEventsDataLoader(services.securityEventService, redis),
    assetAlerts: createAssetAlertsDataLoader(services.alertService, redis),
  };
}