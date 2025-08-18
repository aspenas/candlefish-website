# Apollo GraphOS Federation - Caching Architecture

## Overview
This document defines the comprehensive caching strategy for our Apollo GraphOS federation, optimized for 100 concurrent users with real-time updates. The architecture uses Redis as the primary cache store with DataLoader for efficient batching and deduplication.

## Cache Layers

### 1. Application-Level Caching (DataLoader)
**Purpose**: Batch and deduplicate requests within a single GraphQL operation
**Implementation**: Per-request DataLoader instances

```typescript
// DataLoader Implementations per Subgraph

// Customers Subgraph
interface CustomerDataLoaders {
  customerById: DataLoader<string, Customer>
  customersBySalesforceId: DataLoader<string, Customer>
  customersByAccountType: DataLoader<AccountType, Customer[]>
  estimatesByCustomerId: DataLoader<string, Estimate[]>
  projectsByCustomerId: DataLoader<string, Project[]>
}

// Projects Subgraph  
interface ProjectDataLoaders {
  projectById: DataLoader<string, Project>
  projectsByCustomerId: DataLoader<string, Project[]>
  projectsByStatus: DataLoader<ProjectStatus, Project[]>
  photosByProjectId: DataLoader<string, ProjectPhoto[]>
  crewMembersByProjectId: DataLoader<string, CrewMember[]>
}

// Estimates Subgraph
interface EstimateDataLoaders {
  estimateById: DataLoader<string, Estimate>
  estimatesByCustomerId: DataLoader<string, Estimate[]>
  estimatesByProjectId: DataLoader<string, Estimate[]>
  pricingCalculationsByEstimateId: DataLoader<string, PricingCalculation>
}

// Integrations Subgraph
interface IntegrationDataLoaders {
  salesforceAccountById: DataLoader<string, SalesforceAccount>
  companyCamProjectById: DataLoader<string, CompanyCamProject>
  weatherByCoordinates: DataLoader<string, WeatherForecast>
  geocodeByAddress: DataLoader<string, GeocodeResult>
}
```

### 2. Redis Cache Strategy

#### Cache Key Structure
```
paintbox:{service}:{entity}:{identifier}:{version?}
paintbox:{service}:{entity}:list:{filter_hash}
paintbox:{service}:index:{index_name}:{value}
```

#### Cache Configurations by Entity Type

```typescript
interface CacheConfig {
  ttl: number;           // Time to live in seconds
  maxBatch: number;      // Max items to batch together
  refreshThreshold: number; // When to proactively refresh (percentage of TTL)
  version: string;       // For cache invalidation
}

const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // High-frequency, relatively stable data
  customers: {
    ttl: 3600,           // 1 hour
    maxBatch: 100,
    refreshThreshold: 0.8,
    version: "v1"
  },
  
  // Medium-frequency, project data
  projects: {
    ttl: 1800,           // 30 minutes  
    maxBatch: 50,
    refreshThreshold: 0.7,
    version: "v1"
  },
  
  // High-frequency, business-critical
  estimates: {
    ttl: 900,            // 15 minutes
    maxBatch: 100,
    refreshThreshold: 0.6,
    version: "v1"
  },
  
  // External API data - longer cache for rate limiting
  salesforce: {
    ttl: 7200,           // 2 hours
    maxBatch: 25,
    refreshThreshold: 0.9,
    version: "v1"
  },
  
  companyCam: {
    ttl: 3600,           // 1 hour
    maxBatch: 50,
    refreshThreshold: 0.8,
    version: "v1"
  },
  
  // Fast-changing data
  photos: {
    ttl: 600,            // 10 minutes
    maxBatch: 200,
    refreshThreshold: 0.5,
    version: "v1"
  },
  
  // Computation-heavy results
  pricingCalculations: {
    ttl: 1800,           // 30 minutes
    maxBatch: 50,
    refreshThreshold: 0.7,
    version: "v1"
  },
  
  // Weather data - external API with rate limits
  weather: {
    ttl: 1800,           // 30 minutes
    maxBatch: 10,
    refreshThreshold: 0.9,
    version: "v1"
  },
  
  // Geocoding - very stable data
  geocoding: {
    ttl: 86400,          // 24 hours
    maxBatch: 25,
    refreshThreshold: 0.95,
    version: "v1"
  }
};
```

#### Specific Cache Keys

```typescript
// Primary Entity Caches
const CACHE_KEYS = {
  // Customers
  CUSTOMER_BY_ID: "paintbox:customers:customer:{id}:v1",
  CUSTOMER_BY_SALESFORCE_ID: "paintbox:customers:customer:sf:{salesforceId}:v1",
  CUSTOMERS_BY_ACCOUNT_TYPE: "paintbox:customers:list:account_type:{type}:v1",
  CUSTOMER_ESTIMATES: "paintbox:customers:estimates:{customerId}:v1",
  CUSTOMER_PROJECTS: "paintbox:customers:projects:{customerId}:v1",
  
  // Projects
  PROJECT_BY_ID: "paintbox:projects:project:{id}:v1",
  PROJECT_BY_COMPANY_CAM_ID: "paintbox:projects:project:cc:{companyCamId}:v1",
  PROJECTS_BY_CUSTOMER: "paintbox:projects:list:customer:{customerId}:v1",
  PROJECTS_BY_STATUS: "paintbox:projects:list:status:{status}:v1",
  PROJECT_PHOTOS: "paintbox:projects:photos:{projectId}:v1",
  PROJECT_TIMELINE: "paintbox:projects:timeline:{projectId}:v1",
  
  // Estimates
  ESTIMATE_BY_ID: "paintbox:estimates:estimate:{id}:v1",
  ESTIMATES_BY_CUSTOMER: "paintbox:estimates:list:customer:{customerId}:v1",
  ESTIMATES_BY_PROJECT: "paintbox:estimates:list:project:{projectId}:v1",
  PRICING_CALCULATION: "paintbox:estimates:pricing:{estimateId}:v1",
  
  // External Integrations
  SALESFORCE_ACCOUNT: "paintbox:integrations:sf:account:{id}:v1",
  SALESFORCE_OPPORTUNITY: "paintbox:integrations:sf:opportunity:{id}:v1",
  COMPANY_CAM_PROJECT: "paintbox:integrations:cc:project:{id}:v1",
  COMPANY_CAM_PHOTOS: "paintbox:integrations:cc:photos:{projectId}:v1",
  
  // Computed Data
  WEATHER_FORECAST: "paintbox:integrations:weather:{lat}:{lng}:v1",
  GEOCODE_RESULT: "paintbox:integrations:geocode:{address_hash}:v1",
  
  // Indexes and Lookups
  CUSTOMER_EMAIL_INDEX: "paintbox:customers:index:email:{email}:v1",
  PROJECT_STATUS_INDEX: "paintbox:projects:index:status:{status}:v1",
  ESTIMATE_STATUS_INDEX: "paintbox:estimates:index:status:{status}:v1"
};
```

### 3. Cache Invalidation Strategy

#### Event-Based Invalidation
```typescript
interface CacheInvalidationEvent {
  entityType: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  affectedKeys: string[];
  cascadeRules: CascadeRule[];
}

interface CascadeRule {
  pattern: string;
  reason: string;
}

const INVALIDATION_RULES = {
  customer: {
    patterns: [
      "paintbox:customers:customer:{id}:*",
      "paintbox:customers:list:*",
      "paintbox:customers:estimates:{id}:*",
      "paintbox:customers:projects:{id}:*"
    ],
    cascades: [
      {
        pattern: "paintbox:estimates:list:customer:{id}:*",
        reason: "Customer estimates affected"
      },
      {
        pattern: "paintbox:projects:list:customer:{id}:*", 
        reason: "Customer projects affected"
      }
    ]
  },
  
  project: {
    patterns: [
      "paintbox:projects:project:{id}:*",
      "paintbox:projects:list:*",
      "paintbox:projects:photos:{id}:*",
      "paintbox:projects:timeline:{id}:*"
    ],
    cascades: [
      {
        pattern: "paintbox:estimates:list:project:{id}:*",
        reason: "Project estimates affected"
      },
      {
        pattern: "paintbox:customers:projects:{customerId}:*",
        reason: "Customer project list affected"
      }
    ]
  },
  
  estimate: {
    patterns: [
      "paintbox:estimates:estimate:{id}:*",
      "paintbox:estimates:list:*",
      "paintbox:estimates:pricing:{id}:*"
    ],
    cascades: [
      {
        pattern: "paintbox:customers:estimates:{customerId}:*",
        reason: "Customer estimate list affected"  
      }
    ]
  }
};
```

### 4. Real-Time Cache Updates

#### Subscription-Based Cache Updates
```typescript
// Cache update patterns for subscriptions
const SUBSCRIPTION_CACHE_UPDATES = {
  estimateUpdated: {
    invalidate: [
      "paintbox:estimates:estimate:{id}:*",
      "paintbox:estimates:list:*"
    ],
    update: {
      key: "paintbox:estimates:estimate:{id}:v1",
      merge: true // Merge new data with existing cache
    }
  },
  
  projectPhotoAdded: {
    invalidate: [
      "paintbox:projects:photos:{projectId}:*"
    ],
    append: {
      key: "paintbox:projects:photos:{projectId}:v1",
      item: "new photo data"
    }
  },
  
  customerSyncStatus: {
    invalidate: [
      "paintbox:customers:customer:{id}:*"
    ],
    notify: {
      channels: ["customer:{id}:sync", "admin:sync:status"]
    }
  }
};
```

### 5. Performance Optimizations

#### Batch Loading Patterns
```typescript
class BatchedCacheLoader<K, V> {
  private cache: Redis;
  private dataLoader: DataLoader<K, V>;
  
  constructor(
    cache: Redis,
    batchLoadFn: (keys: K[]) => Promise<V[]>,
    options: {
      cacheKeyFn: (key: K) => string;
      ttl: number;
      maxBatchSize?: number;
    }
  ) {
    this.cache = cache;
    this.dataLoader = new DataLoader(
      async (keys: K[]) => {
        // Try cache first
        const cacheKeys = keys.map(options.cacheKeyFn);
        const cached = await cache.mget(...cacheKeys);
        
        const uncachedIndices: number[] = [];
        const uncachedKeys: K[] = [];
        
        cached.forEach((value, index) => {
          if (value === null) {
            uncachedIndices.push(index);
            uncachedKeys.push(keys[index]);
          }
        });
        
        // Load uncached data
        let uncachedResults: V[] = [];
        if (uncachedKeys.length > 0) {
          uncachedResults = await batchLoadFn(uncachedKeys);
          
          // Cache the results
          const pipeline = cache.pipeline();
          uncachedResults.forEach((result, index) => {
            const cacheKey = options.cacheKeyFn(uncachedKeys[index]);
            pipeline.setex(cacheKey, options.ttl, JSON.stringify(result));
          });
          await pipeline.exec();
        }
        
        // Merge cached and uncached results
        const results: V[] = new Array(keys.length);
        let uncachedIndex = 0;
        
        cached.forEach((cachedValue, index) => {
          if (cachedValue !== null) {
            results[index] = JSON.parse(cachedValue);
          } else {
            results[index] = uncachedResults[uncachedIndex++];
          }
        });
        
        return results;
      },
      {
        maxBatchSize: options.maxBatchSize || 100,
        cache: false // We handle caching manually
      }
    );
  }
  
  load(key: K): Promise<V> {
    return this.dataLoader.load(key);
  }
  
  loadMany(keys: K[]): Promise<V[]> {
    return this.dataLoader.loadMany(keys);
  }
}
```

#### Write-Through Cache Pattern
```typescript
class WriteThroughCache<T> {
  constructor(
    private cache: Redis,
    private database: Database,
    private keyPrefix: string,
    private ttl: number
  ) {}
  
  async get(id: string): Promise<T | null> {
    const cacheKey = `${this.keyPrefix}:${id}`;
    
    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Load from database
    const result = await this.database.findById(id);
    if (result) {
      // Write to cache
      await this.cache.setex(cacheKey, this.ttl, JSON.stringify(result));
    }
    
    return result;
  }
  
  async set(id: string, data: T): Promise<void> {
    const cacheKey = `${this.keyPrefix}:${id}`;
    
    // Write to database first
    await this.database.save(id, data);
    
    // Then update cache
    await this.cache.setex(cacheKey, this.ttl, JSON.stringify(data));
    
    // Invalidate related caches
    await this.invalidateRelated(id, data);
  }
  
  private async invalidateRelated(id: string, data: T): Promise<void> {
    // Implement entity-specific invalidation logic
  }
}
```

### 6. Monitoring and Metrics

#### Cache Performance Metrics
```typescript
interface CacheMetrics {
  hitRate: number;
  missRate: number;
  avgResponseTime: number;
  totalRequests: number;
  keyCount: number;
  memoryUsage: number;
  evictions: number;
  errors: number;
}

const CACHE_MONITORING = {
  // Key metrics to track
  metrics: [
    'cache_hit_rate',
    'cache_miss_rate', 
    'cache_latency_p95',
    'cache_latency_p99',
    'cache_memory_usage',
    'cache_connection_errors',
    'cache_key_count_by_pattern'
  ],
  
  // Alerting thresholds
  alerts: {
    hitRateBelow: 0.8,    // Alert if hit rate drops below 80%
    latencyAbove: 50,     // Alert if P95 latency > 50ms
    memoryUsageAbove: 0.9, // Alert if memory usage > 90%
    errorRateAbove: 0.01   // Alert if error rate > 1%
  },
  
  // Health check intervals
  intervals: {
    metrics: 30,      // Collect metrics every 30 seconds
    cleanup: 300,     // Run cleanup every 5 minutes
    healthCheck: 60   // Health check every minute
  }
};
```

### 7. Configuration Management

#### Environment-Specific Settings
```typescript
interface CacheEnvironmentConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
    enableAutoPipelining: boolean;
    maxRetriesPerRequest: number;
  };
  
  cache: {
    defaultTTL: number;
    maxMemoryPolicy: string;
    keyPrefix: string;
    compressionThreshold: number;
  };
  
  dataLoader: {
    defaultBatchSize: number;
    defaultCacheTimeout: number;
    enableCache: boolean;
  };
}

const CACHE_CONFIGS = {
  development: {
    redis: {
      host: 'localhost',
      port: 6379,
      db: 0,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableAutoPipelining: true
    },
    cache: {
      defaultTTL: 300, // 5 minutes for development
      maxMemoryPolicy: 'allkeys-lru',
      keyPrefix: 'paintbox:dev',
      compressionThreshold: 1024
    },
    dataLoader: {
      defaultBatchSize: 50,
      defaultCacheTimeout: 0, // Disable DataLoader cache in dev
      enableCache: true
    }
  },
  
  production: {
    redis: {
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT!),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      maxRetriesPerRequest: 5,
      retryDelayOnFailover: 500,
      enableAutoPipelining: true
    },
    cache: {
      defaultTTL: 1800, // 30 minutes for production
      maxMemoryPolicy: 'allkeys-lru',
      keyPrefix: 'paintbox:prod',
      compressionThreshold: 2048
    },
    dataLoader: {
      defaultBatchSize: 100,
      defaultCacheTimeout: 300000, // 5 minutes
      enableCache: true
    }
  }
};
```

## Implementation Guidelines

### 1. Cache-First vs Database-First
- **Cache-First**: Use for read-heavy operations (customers, projects)
- **Database-First**: Use for write-heavy operations (estimates, real-time updates)

### 2. Consistency Patterns  
- **Strong Consistency**: Critical business data (pricing, customer info)
- **Eventual Consistency**: Aggregated data, counters, non-critical metrics

### 3. Error Handling
- Graceful degradation when cache is unavailable
- Circuit breaker pattern for external API caching
- Retry logic with exponential backoff

### 4. Security Considerations
- Encrypt sensitive data in cache
- Use Redis AUTH and SSL/TLS
- Implement cache key namespacing
- Regular security audits of cached data

This caching architecture provides optimal performance for 100 concurrent users while maintaining data consistency and real-time capabilities through strategic cache invalidation and subscription-based updates.
