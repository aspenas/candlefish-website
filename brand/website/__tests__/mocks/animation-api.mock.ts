import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { 
  AnimationConfigFactory, 
  AnalyticsEventFactory, 
  FeatureFlagFactory,
  PerformanceMetricsFactory,
  type AnimationConfig,
  type AnalyticsEvent,
  type FeatureFlag,
  type PerformanceMetrics
} from '../factories/animation.factory';

// In-memory stores for testing
const animationConfigs = new Map<string, AnimationConfig>();
const analyticsEvents: AnalyticsEvent[] = [];
const featureFlags = new Map<string, FeatureFlag>();
const performanceMetrics: PerformanceMetrics[] = [];

// Initialize with some default data
const defaultConfig = AnimationConfigFactory.create({ id: 'default' });
animationConfigs.set('default', defaultConfig);

const defaultFlags = [
  FeatureFlagFactory.createEnabled('enhanced-bioluminescence'),
  FeatureFlagFactory.createDisabled('experimental-shaders'),
  FeatureFlagFactory.createABTest('performance-mode', ['control', 'optimized']),
];
defaultFlags.forEach(flag => featureFlags.set(flag.name, flag));

export const animationApiHandlers = [
  // Animation Configuration Endpoints
  rest.get('/api/animation/config/:animationId', (req, res, ctx) => {
    const { animationId } = req.params;
    const config = animationConfigs.get(animationId as string);
    
    if (!config) {
      return res(ctx.status(404), ctx.json({ error: 'Animation configuration not found' }));
    }
    
    return res(ctx.json(config));
  }),

  rest.put('/api/animation/config/:animationId', async (req, res, ctx) => {
    const { animationId } = req.params;
    const updates = await req.json();
    
    const existingConfig = animationConfigs.get(animationId as string);
    if (!existingConfig) {
      return res(ctx.status(404), ctx.json({ error: 'Animation configuration not found' }));
    }
    
    const updatedConfig = {
      ...existingConfig,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    animationConfigs.set(animationId as string, updatedConfig);
    
    return res(ctx.json(updatedConfig));
  }),

  // Analytics Endpoints
  rest.post('/api/animation/analytics/events', async (req, res, ctx) => {
    const eventData = await req.json();
    const event = AnalyticsEventFactory.create(eventData);
    analyticsEvents.push(event);
    
    return res(ctx.status(201), ctx.json({ id: event.id, timestamp: event.timestamp }));
  }),

  rest.get('/api/animation/analytics/metrics', (req, res, ctx) => {
    const url = new URL(req.url);
    const startTime = url.searchParams.get('startTime');
    const endTime = url.searchParams.get('endTime');
    const eventType = url.searchParams.get('type');
    
    let filteredEvents = analyticsEvents;
    
    if (startTime) {
      filteredEvents = filteredEvents.filter(event => 
        new Date(event.timestamp) >= new Date(startTime)
      );
    }
    
    if (endTime) {
      filteredEvents = filteredEvents.filter(event => 
        new Date(event.timestamp) <= new Date(endTime)
      );
    }
    
    if (eventType) {
      filteredEvents = filteredEvents.filter(event => event.type === eventType);
    }
    
    // Generate aggregated metrics
    const metrics = {
      totalEvents: filteredEvents.length,
      eventsByType: filteredEvents.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      performanceMetrics: filteredEvents
        .filter(event => event.type === 'performance')
        .map(event => event.data)
        .slice(-100), // Last 100 performance samples
      averageFPS: filteredEvents
        .filter(event => event.type === 'performance')
        .reduce((sum, event) => sum + (event.data.fps || 0), 0) /
        Math.max(1, filteredEvents.filter(event => event.type === 'performance').length),
    };
    
    return res(ctx.json(metrics));
  }),

  // Feature Flag Endpoints
  rest.get('/api/features/flags/:userId', (req, res, ctx) => {
    const { userId } = req.params;
    const url = new URL(req.url);
    const flagName = url.searchParams.get('flag');
    
    if (flagName) {
      const flag = featureFlags.get(flagName);
      if (!flag) {
        return res(ctx.status(404), ctx.json({ error: 'Feature flag not found' }));
      }
      
      // Simulate A/B testing logic
      const userHash = hashUserId(userId as string);
      const variant = selectVariant(flag, userHash);
      
      return res(ctx.json({
        enabled: flag.enabled && (userHash % 100) < flag.rolloutPercentage,
        variant,
        config: variant?.config || {},
      }));
    }
    
    // Return all flags for user
    const userFlags = Array.from(featureFlags.values()).map(flag => {
      const userHash = hashUserId(userId as string);
      const variant = selectVariant(flag, userHash);
      
      return {
        name: flag.name,
        enabled: flag.enabled && (userHash % 100) < flag.rolloutPercentage,
        variant,
        config: variant?.config || {},
      };
    });
    
    return res(ctx.json(userFlags));
  }),

  rest.post('/api/features/flags/:flagId/override', async (req, res, ctx) => {
    const { flagId } = req.params;
    const { enabled, variant } = await req.json();
    
    const flag = featureFlags.get(flagId as string);
    if (!flag) {
      return res(ctx.status(404), ctx.json({ error: 'Feature flag not found' }));
    }
    
    // In a real implementation, this would create a user-specific override
    // For testing, we'll just modify the flag temporarily
    const updatedFlag = {
      ...flag,
      enabled,
      updatedAt: new Date().toISOString(),
    };
    
    featureFlags.set(flagId as string, updatedFlag);
    
    return res(ctx.json({ success: true, flag: updatedFlag }));
  }),

  // Performance Monitoring Endpoints
  rest.get('/api/animation/performance/metrics', (req, res, ctx) => {
    const url = new URL(req.url);
    const duration = parseInt(url.searchParams.get('duration') || '3600'); // Default 1 hour
    const interval = parseInt(url.searchParams.get('interval') || '60'); // Default 1 minute
    
    const metrics = PerformanceMetricsFactory.createTimeSeriesData(duration * 1000, interval * 1000);
    
    return res(ctx.json({
      metrics,
      summary: {
        avgFPS: metrics.reduce((sum, m) => sum + m.fps, 0) / metrics.length,
        maxMemory: Math.max(...metrics.map(m => m.memoryUsage)),
        minFPS: Math.min(...metrics.map(m => m.fps)),
      },
    }));
  }),

  rest.post('/api/animation/performance/metrics', async (req, res, ctx) => {
    const metricsData = await req.json();
    const metrics = PerformanceMetricsFactory.create(metricsData);
    performanceMetrics.push(metrics);
    
    return res(ctx.status(201), ctx.json({ timestamp: metrics.timestamp }));
  }),

  // Health Check
  rest.get('/api/health', (req, res, ctx) => {
    return res(ctx.json({ status: 'healthy', timestamp: new Date().toISOString() }));
  }),
];

// Error simulation handlers
export const errorHandlers = [
  rest.get('/api/animation/config/error-test', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
  }),

  rest.get('/api/animation/config/timeout-test', (req, res, ctx) => {
    return res(ctx.delay(10000), ctx.json({})); // 10 second delay
  }),

  rest.get('/api/animation/config/network-error', (req, res, ctx) => {
    return res.networkError('Network connection failed');
  }),
];

// Utility functions
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function selectVariant(flag: FeatureFlag, userHash: number): { name: string; config: Record<string, any> } | null {
  if (!flag.variants || flag.variants.length === 0) {
    return null;
  }
  
  const totalWeight = flag.variants.reduce((sum, variant) => sum + variant.weight, 0);
  const target = (userHash % totalWeight);
  
  let cumulativeWeight = 0;
  for (const variant of flag.variants) {
    cumulativeWeight += variant.weight;
    if (target < cumulativeWeight) {
      return {
        name: variant.name,
        config: variant.config,
      };
    }
  }
  
  return flag.variants[0] || null;
}

// Test utilities for manipulating mock data
export const mockDataUtils = {
  clearAll: () => {
    animationConfigs.clear();
    analyticsEvents.length = 0;
    featureFlags.clear();
    performanceMetrics.length = 0;
  },
  
  addAnimationConfig: (config: AnimationConfig) => {
    animationConfigs.set(config.id, config);
  },
  
  addFeatureFlag: (flag: FeatureFlag) => {
    featureFlags.set(flag.name, flag);
  },
  
  getAnalyticsEvents: () => [...analyticsEvents],
  
  getPerformanceMetrics: () => [...performanceMetrics],
  
  simulateHighLoad: () => {
    // Add many performance events to simulate high load
    for (let i = 0; i < 100; i++) {
      performanceMetrics.push(PerformanceMetricsFactory.createLowPerformance());
    }
  },
  
  reset: () => {
    mockDataUtils.clearAll();
    // Re-add default data
    animationConfigs.set('default', AnimationConfigFactory.create({ id: 'default' }));
    defaultFlags.forEach(flag => featureFlags.set(flag.name, flag));
  },
};

// Create the mock server
export const server = setupServer(...animationApiHandlers);

// Export configured server for different test environments
export const createMockServer = (handlers = animationApiHandlers) => {
  return setupServer(...handlers);
};