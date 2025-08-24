// Test Data Factory for Netlify Extension Management System

import { 
  Extension, 
  NetlifySite, 
  PerformanceMetrics, 
  ExtensionRecommendation, 
  ExtensionConfig,
  DeploymentImpact,
  DashboardState
} from '../../types/netlify';

// Factory function for creating mock extensions
export const createMockExtension = (overrides: Partial<Extension> = {}): Extension => ({
  id: 'cache-control-extension',
  name: 'Cache Control',
  description: 'Advanced cache management for improved performance',
  category: 'performance',
  version: '2.1.0',
  provider: 'Netlify Labs',
  icon: '⚡',
  isEnabled: false,
  config: {},
  performance: {
    impact: 'medium',
    loadTime: 120,
    bundleSize: 15
  },
  metrics: {
    usage: 1250,
    errors: 3,
    lastUsed: new Date('2024-01-15T14:30:00Z')
  },
  documentation: {
    setupUrl: 'https://docs.netlify.com/extensions/cache-control',
    apiUrl: 'https://api.netlify.com/extensions/cache-control'
  },
  ...overrides
});

// Factory function for creating mock sites
export const createMockSite = (overrides: Partial<NetlifySite> = {}): NetlifySite => ({
  id: 'candlefish-ai-site',
  name: 'Candlefish AI',
  url: 'https://candlefish.ai',
  status: 'active',
  deployBranch: 'main',
  lastDeploy: new Date('2024-01-20T09:15:00Z'),
  buildTime: 42,
  repository: {
    provider: 'github',
    repo: 'candlefish-ai/brand'
  },
  ...overrides
});

// Factory function for creating mock performance metrics
export const createMockPerformanceMetrics = (overrides: Partial<PerformanceMetrics> = {}): PerformanceMetrics => ({
  siteId: 'candlefish-ai-site',
  timestamp: new Date('2024-01-20T10:00:00Z'),
  metrics: {
    lcp: 1800,
    fid: 85,
    cls: 0.08,
    fcp: 1200,
    ttfb: 150,
    buildTime: 42,
    bundleSize: 185,
    functionInvocations: 2500,
    functionErrors: 8,
    functionDuration: 180,
    uniqueVisitors: 1200,
    pageViews: 3400,
    bounceRate: 0.28
  },
  scores: {
    performance: 92,
    accessibility: 98,
    bestPractices: 85,
    seo: 94
  },
  ...overrides
});

// Factory function for creating mock recommendations
export const createMockRecommendation = (overrides: Partial<ExtensionRecommendation> = {}): ExtensionRecommendation => ({
  extension: createMockExtension({
    id: 'compression-extension',
    name: 'Smart Compression',
    category: 'performance'
  }),
  confidence: 0.87,
  reasoning: 'Your site has large CSS and JavaScript bundles that could benefit from advanced compression algorithms',
  potentialImpact: {
    performance: 22,
    security: 3,
    seo: 8,
    userExperience: 18
  },
  estimatedSetupTime: 12,
  ...overrides
});

// Factory function for creating mock extension configs
export const createMockExtensionConfig = (overrides: Partial<ExtensionConfig> = {}): ExtensionConfig => ({
  extensionId: 'cache-control-extension',
  siteId: 'candlefish-ai-site',
  config: {
    maxAge: 3600,
    staleWhileRevalidate: 86400,
    cacheStrategy: 'aggressive',
    enableEtag: true,
    compressionLevel: 9
  },
  isEnabled: true,
  lastModified: new Date('2024-01-19T16:45:00Z'),
  modifiedBy: 'admin@candlefish.ai',
  ...overrides
});

// Factory function for creating mock deployment impact data
export const createMockDeploymentImpact = (overrides: Partial<DeploymentImpact> = {}): DeploymentImpact => ({
  before: createMockPerformanceMetrics({
    metrics: {
      lcp: 2200,
      fid: 120,
      cls: 0.12,
      fcp: 1500,
      ttfb: 200,
      buildTime: 55,
      bundleSize: 220,
      functionInvocations: 2000,
      functionErrors: 12,
      functionDuration: 250,
      uniqueVisitors: 1000,
      pageViews: 2800,
      bounceRate: 0.35
    },
    scores: {
      performance: 78,
      accessibility: 95,
      bestPractices: 80,
      seo: 90
    }
  }),
  after: createMockPerformanceMetrics(),
  extension: createMockExtension({ isEnabled: true }),
  impact: {
    performance: 18, // 18% improvement
    buildTime: -24,  // 24% faster builds
    bundleSize: -35  // 35KB reduction
  },
  timestamp: new Date('2024-01-20T10:30:00Z'),
  ...overrides
});

// Factory function for creating mock dashboard state
export const createMockDashboardState = (overrides: Partial<DashboardState> = {}): DashboardState => ({
  selectedSite: createMockSite(),
  extensions: [
    createMockExtension({ id: 'ext-1', name: 'Cache Control', isEnabled: true }),
    createMockExtension({ id: 'ext-2', name: 'Image Optimization', category: 'performance', isEnabled: false }),
    createMockExtension({ id: 'ext-3', name: 'Security Headers', category: 'security', isEnabled: true }),
    createMockExtension({ id: 'ext-4', name: 'SEO Meta Tags', category: 'seo', isEnabled: false })
  ],
  recommendations: [
    createMockRecommendation(),
    createMockRecommendation({ 
      extension: createMockExtension({ id: 'seo-ext', name: 'Advanced SEO', category: 'seo' }),
      confidence: 0.74 
    })
  ],
  performanceData: [
    createMockPerformanceMetrics({ timestamp: new Date('2024-01-20T09:00:00Z') }),
    createMockPerformanceMetrics({ timestamp: new Date('2024-01-20T10:00:00Z') }),
    createMockPerformanceMetrics({ timestamp: new Date('2024-01-20T11:00:00Z') })
  ],
  loading: false,
  error: null,
  filters: {
    category: null,
    status: 'all',
    search: ''
  },
  ...overrides
});

// Collection of all Candlefish sites for testing
export const mockCandlefishSites: NetlifySite[] = [
  createMockSite({
    id: 'candlefish-ai',
    name: 'Candlefish AI',
    url: 'https://candlefish.ai'
  }),
  createMockSite({
    id: 'staging-candlefish-ai',
    name: 'Staging - Candlefish AI',
    url: 'https://staging.candlefish.ai',
    status: 'building'
  }),
  createMockSite({
    id: 'paintbox-candlefish-ai',
    name: 'Paintbox Portfolio',
    url: 'https://paintbox.candlefish.ai',
    buildTime: 68
  }),
  createMockSite({
    id: 'inventory-candlefish-ai',
    name: 'Inventory Management',
    url: 'https://inventory.candlefish.ai',
    buildTime: 51
  }),
  createMockSite({
    id: 'promoteros-candlefish-ai',
    name: 'Promoteros Social',
    url: 'https://promoteros.candlefish.ai',
    deployBranch: 'production'
  }),
  createMockSite({
    id: 'claude-candlefish-ai',
    name: 'Claude Documentation',
    url: 'https://claude.candlefish.ai',
    buildTime: 28
  }),
  createMockSite({
    id: 'dashboard-candlefish-ai',
    name: 'Operations Dashboard',
    url: 'https://dashboard.candlefish.ai',
    buildTime: 39
  }),
  createMockSite({
    id: 'ibm-candlefish-ai',
    name: 'IBM Portfolio',
    url: 'https://ibm.candlefish.ai',
    status: 'inactive',
    lastDeploy: new Date('2023-12-15T10:00:00Z')
  })
];

// Collection of extensions by category for testing
export const mockExtensionsByCategory = {
  performance: [
    createMockExtension({
      id: 'cache-control',
      name: 'Advanced Cache Control',
      category: 'performance'
    }),
    createMockExtension({
      id: 'image-optimization',
      name: 'Smart Image Optimization',
      category: 'performance',
      performance: { impact: 'high', loadTime: 200, bundleSize: 25 }
    }),
    createMockExtension({
      id: 'compression',
      name: 'Multi-Level Compression',
      category: 'performance',
      performance: { impact: 'medium', loadTime: 80, bundleSize: 12 }
    })
  ],
  security: [
    createMockExtension({
      id: 'security-headers',
      name: 'Security Headers Suite',
      category: 'security'
    }),
    createMockExtension({
      id: 'csp-manager',
      name: 'Content Security Policy',
      category: 'security'
    }),
    createMockExtension({
      id: 'rate-limiting',
      name: 'API Rate Limiting',
      category: 'security'
    })
  ],
  seo: [
    createMockExtension({
      id: 'sitemap-generator',
      name: 'Dynamic Sitemap Generation',
      category: 'seo'
    }),
    createMockExtension({
      id: 'structured-data',
      name: 'JSON-LD Structured Data',
      category: 'seo'
    }),
    createMockExtension({
      id: 'meta-optimizer',
      name: 'Meta Tag Optimization',
      category: 'seo'
    })
  ],
  analytics: [
    createMockExtension({
      id: 'privacy-analytics',
      name: 'Privacy-First Analytics',
      category: 'analytics'
    }),
    createMockExtension({
      id: 'core-web-vitals',
      name: 'Core Web Vitals Tracking',
      category: 'analytics'
    }),
    createMockExtension({
      id: 'ab-testing',
      name: 'Performance A/B Testing',
      category: 'analytics'
    })
  ],
  forms: [
    createMockExtension({
      id: 'spam-protection',
      name: 'Advanced Spam Protection',
      category: 'forms'
    }),
    createMockExtension({
      id: 'form-validation',
      name: 'Real-time Form Validation',
      category: 'forms'
    })
  ],
  edge: [
    createMockExtension({
      id: 'edge-compute',
      name: 'Edge Computing Functions',
      category: 'edge'
    }),
    createMockExtension({
      id: 'geo-routing',
      name: 'Geographic Traffic Routing',
      category: 'edge'
    })
  ]
};

// Generate realistic time-series performance data
export const generatePerformanceTimeSeries = (
  siteId: string,
  hours: number = 24,
  interval: number = 60 // minutes
): PerformanceMetrics[] => {
  const data: PerformanceMetrics[] = [];
  const now = new Date();
  const startTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));

  for (let i = 0; i < hours * (60 / interval); i++) {
    const timestamp = new Date(startTime.getTime() + (i * interval * 60 * 1000));
    
    // Add some realistic variation to metrics
    const baseMetrics = createMockPerformanceMetrics({ siteId, timestamp });
    const variation = 0.1; // 10% variation
    
    data.push({
      ...baseMetrics,
      metrics: {
        ...baseMetrics.metrics,
        lcp: Math.round(baseMetrics.metrics.lcp * (1 + (Math.random() - 0.5) * variation)),
        fid: Math.round(baseMetrics.metrics.fid * (1 + (Math.random() - 0.5) * variation)),
        cls: Number((baseMetrics.metrics.cls * (1 + (Math.random() - 0.5) * variation)).toFixed(3)),
        fcp: Math.round(baseMetrics.metrics.fcp * (1 + (Math.random() - 0.5) * variation)),
        ttfb: Math.round(baseMetrics.metrics.ttfb * (1 + (Math.random() - 0.5) * variation)),
        uniqueVisitors: Math.round(baseMetrics.metrics.uniqueVisitors * (1 + (Math.random() - 0.5) * variation * 2)),
        pageViews: Math.round(baseMetrics.metrics.pageViews * (1 + (Math.random() - 0.5) * variation * 2))
      },
      scores: {
        ...baseMetrics.scores,
        performance: Math.max(0, Math.min(100, Math.round(baseMetrics.scores.performance + (Math.random() - 0.5) * 10))),
        accessibility: Math.max(0, Math.min(100, Math.round(baseMetrics.scores.accessibility + (Math.random() - 0.5) * 5))),
        bestPractices: Math.max(0, Math.min(100, Math.round(baseMetrics.scores.bestPractices + (Math.random() - 0.5) * 8))),
        seo: Math.max(0, Math.min(100, Math.round(baseMetrics.scores.seo + (Math.random() - 0.5) * 6)))
      }
    });
  }

  return data;
};

// Generate realistic recommendations based on site performance
export const generateSmartRecommendations = (
  site: NetlifySite,
  currentMetrics: PerformanceMetrics,
  enabledExtensions: string[] = []
): ExtensionRecommendation[] => {
  const recommendations: ExtensionRecommendation[] = [];

  // Performance recommendations based on Core Web Vitals
  if (currentMetrics.metrics.lcp > 2500) {
    recommendations.push(
      createMockRecommendation({
        extension: createMockExtension({
          id: 'image-optimization',
          name: 'Smart Image Optimization',
          category: 'performance'
        }),
        confidence: 0.92,
        reasoning: 'Your LCP is 2.5s+. Image optimization can reduce load time by 30-40%.',
        potentialImpact: {
          performance: 35,
          security: 0,
          seo: 12,
          userExperience: 28
        }
      })
    );
  }

  if (currentMetrics.metrics.cls > 0.1) {
    recommendations.push(
      createMockRecommendation({
        extension: createMockExtension({
          id: 'layout-optimization',
          name: 'Layout Shift Prevention',
          category: 'performance'
        }),
        confidence: 0.85,
        reasoning: 'CLS score of 0.1+ indicates layout instability. This extension prevents common layout shifts.',
        potentialImpact: {
          performance: 15,
          security: 0,
          seo: 8,
          userExperience: 25
        }
      })
    );
  }

  // Security recommendations
  if (!enabledExtensions.includes('security-headers')) {
    recommendations.push(
      createMockRecommendation({
        extension: createMockExtension({
          id: 'security-headers',
          name: 'Security Headers Suite',
          category: 'security'
        }),
        confidence: 0.95,
        reasoning: 'Essential security headers are missing. This significantly improves your security posture.',
        potentialImpact: {
          performance: 2,
          security: 45,
          seo: 5,
          userExperience: 8
        }
      })
    );
  }

  // SEO recommendations based on scores
  if (currentMetrics.scores.seo < 90) {
    recommendations.push(
      createMockRecommendation({
        extension: createMockExtension({
          id: 'structured-data',
          name: 'JSON-LD Structured Data',
          category: 'seo'
        }),
        confidence: 0.78,
        reasoning: 'SEO score below 90. Structured data helps search engines understand your content better.',
        potentialImpact: {
          performance: 0,
          security: 0,
          seo: 25,
          userExperience: 5
        }
      })
    );
  }

  return recommendations.sort((a, b) => b.confidence - a.confidence);
};

// Error simulation helpers for testing error handling
export const createApiError = (code: string, message: string, details?: Record<string, any>) => ({
  code,
  message,
  details
});

export const mockApiErrors = {
  networkError: createApiError('NETWORK_ERROR', 'Network connection failed'),
  notFound: createApiError('NOT_FOUND', 'Resource not found'),
  unauthorized: createApiError('UNAUTHORIZED', 'Authentication required'),
  rateLimited: createApiError('RATE_LIMITED', 'Too many requests'),
  validationError: createApiError('VALIDATION_ERROR', 'Invalid input data', {
    fields: ['extensionId', 'config.threshold']
  }),
  serverError: createApiError('INTERNAL_ERROR', 'Internal server error')
};