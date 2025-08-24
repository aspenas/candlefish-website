// Netlify Extension Management Types

export interface NetlifySite {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'inactive' | 'building' | 'error';
  deployBranch: string;
  lastDeploy?: Date;
  buildTime?: number;
  repository?: {
    provider: string;
    repo: string;
  };
}

export interface Extension {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'security' | 'seo' | 'analytics' | 'forms' | 'edge';
  version: string;
  provider: string;
  icon?: string;
  isEnabled: boolean;
  config?: Record<string, any>;
  performance: {
    impact: 'low' | 'medium' | 'high';
    loadTime: number; // milliseconds
    bundleSize?: number; // KB
  };
  metrics?: {
    usage: number;
    errors: number;
    lastUsed?: Date;
  };
  documentation: {
    setupUrl?: string;
    apiUrl?: string;
  };
}

export interface ExtensionRecommendation {
  extension: Extension;
  confidence: number; // 0-1
  reasoning: string;
  potentialImpact: {
    performance: number; // -100 to +100
    security: number;
    seo: number;
    userExperience: number;
  };
  estimatedSetupTime: number; // minutes
}

export interface PerformanceMetrics {
  siteId: string;
  timestamp: Date;
  metrics: {
    // Core Web Vitals
    lcp: number; // Largest Contentful Paint (ms)
    fid: number; // First Input Delay (ms)
    cls: number; // Cumulative Layout Shift
    fcp: number; // First Contentful Paint (ms)
    ttfb: number; // Time to First Byte (ms)
    // Build metrics
    buildTime: number; // seconds
    bundleSize: number; // KB
    // Function metrics
    functionInvocations: number;
    functionErrors: number;
    functionDuration: number; // ms avg
    // Traffic
    uniqueVisitors: number;
    pageViews: number;
    bounceRate: number;
  };
  scores: {
    performance: number; // 0-100
    accessibility: number; // 0-100
    bestPractices: number; // 0-100
    seo: number; // 0-100
  };
}

export interface ExtensionConfig {
  extensionId: string;
  siteId: string;
  config: Record<string, any>;
  isEnabled: boolean;
  lastModified: Date;
  modifiedBy: string;
}

export interface DeploymentImpact {
  before: PerformanceMetrics;
  after: PerformanceMetrics;
  extension: Extension;
  impact: {
    performance: number; // percentage change
    buildTime: number; // percentage change
    bundleSize: number; // KB change
  };
  timestamp: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: Date;
}

export interface ExtensionListResponse {
  extensions: Extension[];
  total: number;
  categories: string[];
}

export interface SiteExtensionsResponse {
  siteId: string;
  extensions: Extension[];
  recommendations: ExtensionRecommendation[];
  performance: PerformanceMetrics;
}

export interface RecommendationResponse {
  siteId: string;
  recommendations: ExtensionRecommendation[];
  analysisDate: Date;
  factors: {
    currentStack: string[];
    trafficPattern: string;
    performanceGoals: string[];
  };
}

// Dashboard State Types
export interface DashboardState {
  selectedSite: NetlifySite | null;
  extensions: Extension[];
  recommendations: ExtensionRecommendation[];
  performanceData: PerformanceMetrics[];
  loading: boolean;
  error: string | null;
  filters: {
    category: string | null;
    status: 'all' | 'enabled' | 'disabled';
    search: string;
  };
}

// Component Props Types
export interface ExtensionCardProps {
  extension: Extension;
  isEnabled: boolean;
  onToggle: (extensionId: string, enabled: boolean) => Promise<void>;
  onConfigure: (extensionId: string) => void;
  showImpact?: boolean;
  impact?: DeploymentImpact;
}

export interface PerformanceMetricsProps {
  data: PerformanceMetrics[];
  timeRange: '1h' | '24h' | '7d' | '30d';
  onTimeRangeChange: (range: string) => void;
}

export interface SiteSelectorProps {
  sites: NetlifySite[];
  selectedSite: NetlifySite | null;
  onSiteSelect: (site: NetlifySite) => void;
}

export interface RecommendationEngineProps {
  recommendations: ExtensionRecommendation[];
  onApplyRecommendation: (recommendation: ExtensionRecommendation) => Promise<void>;
  loading?: boolean;
}

export interface ConfigurationPanelProps {
  extension: Extension;
  config: ExtensionConfig | null;
  onSave: (config: Record<string, any>) => Promise<void>;
  onCancel: () => void;
  isOpen: boolean;
}

// Utility Types
export type ExtensionCategory = Extension['category'];
export type SiteStatus = NetlifySite['status'];
export type PerformanceImpact = Extension['performance']['impact'];

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}