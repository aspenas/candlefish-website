/**
 * Performance Configuration for Candlefish Operational Maturity Map
 * Central configuration for all performance optimizations
 */

import { initPerformanceMonitoring } from './lib/performance-monitor'
import { getCacheManager } from './lib/cache/redis-cache'
import { preloadManager, injectResourceHints } from './lib/optimization/bundle-optimizer'
import { CDNOptimizer, AutoScalingOptimizer } from './lib/optimization/infrastructure-optimizer'

export const performanceConfig = {
  // Target metrics
  targets: {
    // Core Web Vitals
    webVitals: {
      LCP: 2500, // Largest Contentful Paint < 2.5s
      FID: 100,  // First Input Delay < 100ms
      CLS: 0.1,  // Cumulative Layout Shift < 0.1
      FCP: 1800, // First Contentful Paint < 1.8s
      TTI: 3800, // Time to Interactive < 3.8s
      TBT: 200,  // Total Blocking Time < 200ms
      INP: 200,  // Interaction to Next Paint < 200ms
    },
    
    // API Performance
    api: {
      p50: 50,   // 50th percentile < 50ms
      p95: 100,  // 95th percentile < 100ms
      p99: 200,  // 99th percentile < 200ms
      errorRate: 0.01, // < 1% error rate
    },
    
    // Bundle Sizes
    bundles: {
      initial: 200,  // Initial bundle < 200KB
      route: 100,    // Route chunks < 100KB
      component: 50, // Component chunks < 50KB
      total: 1000,   // Total app < 1MB
    },
    
    // Throughput
    throughput: {
      concurrentUsers: 1000,
      requestsPerSecond: 100,
      documentsPerMinute: 60,
      tokensPerSecond: 500,
    },
    
    // Infrastructure
    infrastructure: {
      cpuUtilization: 70,    // Target 70% CPU
      memoryUtilization: 80, // Target 80% memory
      cacheHitRate: 90,      // > 90% cache hits
      cdnHitRate: 95,        // > 95% CDN hits
    },
  },
  
  // Cache configuration
  cache: {
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      ttl: {
        api: 300,        // 5 minutes
        graphql: 180,    // 3 minutes
        documents: 3600, // 1 hour
        reports: 1800,   // 30 minutes
      },
    },
    cdn: {
      domain: process.env.CDN_DOMAIN || 'cdn.candlefish.ai',
      distributionId: process.env.CF_DISTRIBUTION_ID,
      bucket: process.env.CDN_BUCKET || 'candlefish-cdn',
    },
  },
  
  // Database optimization
  database: {
    pooling: {
      min: 5,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
    queryTimeout: 30000,
    statementTimeout: 30000,
  },
  
  // Document processing
  documents: {
    maxInputTokens: 2_000_000,
    maxOutputTokens: 400_000,
    chunkSize: 100_000,
    overlapSize: 5_000,
    batchSize: 10,
    maxConcurrent: 5,
  },
  
  // Monitoring
  monitoring: {
    enabled: process.env.NODE_ENV === 'production',
    sampleRate: 0.1, // Sample 10% of requests
    errorTracking: true,
    performanceTracking: true,
    customMetrics: true,
  },
  
  // Auto-scaling
  autoScaling: {
    enabled: process.env.NODE_ENV === 'production',
    minInstances: 2,
    maxInstances: 10,
    targetCPU: 70,
    targetMemory: 80,
    scaleUpCooldown: 60,
    scaleDownCooldown: 300,
  },
}

/**
 * Initialize all performance optimizations
 */
export async function initializePerformance() {
  console.log('🚀 Initializing performance optimizations...')
  
  // 1. Initialize performance monitoring
  if (typeof window !== 'undefined') {
    initPerformanceMonitoring()
    console.log('✅ Performance monitoring initialized')
  }
  
  // 2. Initialize Redis cache
  if (process.env.REDIS_URL) {
    try {
      const cache = getCacheManager()
      await cache.connect()
      console.log('✅ Redis cache connected')
    } catch (error) {
      console.warn('⚠️ Redis cache connection failed:', error)
    }
  }
  
  // 3. Inject resource hints
  if (typeof document !== 'undefined') {
    injectResourceHints()
    console.log('✅ Resource hints injected')
  }
  
  // 4. Preload critical components
  if (typeof window !== 'undefined') {
    // Preload on idle
    preloadManager.preloadOnIdle('AssessmentWizard')
    preloadManager.preloadOnIdle('ReportGenerator')
    console.log('✅ Component preloading scheduled')
  }
  
  // 5. Initialize CDN if configured
  if (process.env.CF_DISTRIBUTION_ID) {
    const cdn = new CDNOptimizer(process.env.CF_DISTRIBUTION_ID)
    console.log('✅ CDN optimizer initialized')
  }
  
  // 6. Configure auto-scaling if in production
  if (performanceConfig.autoScaling.enabled && process.env.ECS_SERVICE_NAME) {
    const autoScaling = new AutoScalingOptimizer()
    await autoScaling.configureECSScaling(
      process.env.ECS_SERVICE_NAME,
      process.env.ECS_CLUSTER_NAME!
    )
    console.log('✅ Auto-scaling configured')
  }
  
  console.log('🎉 Performance optimizations initialized successfully!')
}

/**
 * Performance middleware for Next.js
 */
export function performanceMiddleware(req: any, res: any, next: any) {
  const start = Date.now()
  
  // Add performance headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Track response time
  res.on('finish', () => {
    const duration = Date.now() - start
    
    // Log slow requests
    if (duration > performanceConfig.targets.api.p95) {
      console.warn(`Slow request: ${req.method} ${req.url} took ${duration}ms`)
    }
    
    // Add timing header
    res.setHeader('Server-Timing', `total;dur=${duration}`)
  })
  
  next()
}

/**
 * Get current performance metrics
 */
export async function getPerformanceMetrics() {
  const cache = getCacheManager()
  const cacheStats = cache.getStats()
  
  return {
    timestamp: new Date().toISOString(),
    cache: cache.exportMetrics(),
    targets: performanceConfig.targets,
    status: {
      healthy: true, // Calculate based on metrics
      warnings: [],
      errors: [],
    },
  }
}

/**
 * Performance optimization recommendations
 */
export function getOptimizationRecommendations(metrics: any) {
  const recommendations = []
  
  // Check cache hit rates
  if (metrics.cache?.API_RESPONSES?.hitRate < 80) {
    recommendations.push({
      priority: 'high',
      area: 'caching',
      recommendation: 'Increase cache TTL for API responses',
      impact: 'Could reduce API latency by 30-40%',
    })
  }
  
  // Check bundle sizes
  if (metrics.bundles?.initial > performanceConfig.targets.bundles.initial * 1024) {
    recommendations.push({
      priority: 'high',
      area: 'bundles',
      recommendation: 'Implement more aggressive code splitting',
      impact: 'Could improve initial load time by 20-30%',
    })
  }
  
  // Check database performance
  if (metrics.database?.avgQueryTime > 50) {
    recommendations.push({
      priority: 'medium',
      area: 'database',
      recommendation: 'Add database indexes for slow queries',
      impact: 'Could improve query performance by 50-70%',
    })
  }
  
  return recommendations
}

// Export performance utilities
export default {
  config: performanceConfig,
  initialize: initializePerformance,
  middleware: performanceMiddleware,
  getMetrics: getPerformanceMetrics,
  getRecommendations: getOptimizationRecommendations,
}