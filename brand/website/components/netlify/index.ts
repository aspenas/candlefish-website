// Netlify Extension Management Dashboard Components

export { default as NetlifyDashboard } from './NetlifyDashboard';
export { default as SiteSelector } from './SiteSelector';
export { default as ExtensionCard } from './ExtensionCard';
export { default as ExtensionList } from './ExtensionList';
export { default as PerformanceMetrics } from './PerformanceMetrics';
export { default as RecommendationEngine } from './RecommendationEngine';
export { default as ConfigurationPanel } from './ConfigurationPanel';

// Re-export types for convenience
export type {
  NetlifySite,
  Extension,
  ExtensionRecommendation,
  PerformanceMetrics,
  ExtensionConfig,
  DeploymentImpact,
  DashboardState,
  ExtensionCardProps,
  PerformanceMetricsProps,
  SiteSelectorProps,
  RecommendationEngineProps,
  ConfigurationPanelProps,
  ApiResponse,
  ApiError
} from '../../types/netlify';

// Re-export API client
export { 
  netlifyApi, 
  NetlifyApiClient, 
  NetlifyApiError,
  createNetlifyApiClient,
  isNetlifyApiError,
  handleApiError
} from '../../lib/netlify-api';