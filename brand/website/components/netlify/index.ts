// Netlify Extension Management Dashboard Components

export { default as NetlifyDashboard } from './NetlifyDashboard';
export { default as SiteSelector } from './SiteSelector';
export { default as ExtensionCard } from './ExtensionCard';
export { default as ExtensionList } from './ExtensionList';
export { default as PerformanceMetrics } from './PerformanceMetrics';
export { default as RecommendationEngine } from './RecommendationEngine';
export { default as ConfigurationPanel } from './ConfigurationPanel';

// New Advanced Components
export { default as ExtensionCatalog } from './ExtensionCatalog';
export { default as BulkDeploymentInterface } from './BulkDeploymentInterface';
export { default as HealthMonitoringDashboard } from './HealthMonitoringDashboard';
export { default as ExtensionMetricsVisualization } from './ExtensionMetricsVisualization';
export { default as DynamicConfigurationForm } from './DynamicConfigurationForm';

// Real-time Components
export {
  WebSocketProvider,
  useWebSocket,
  useSiteUpdates,
  useDeploymentProgress,
  useHealthMonitoring,
  WebSocketStatus
} from './WebSocketProvider';
export {
  NotificationToast,
  NotificationContainer,
  NotificationSummary,
  useNotificationPanel
} from './NotificationToast';

// Theme and Dark Mode
export { ThemeProvider, useTheme, ThemeControls } from './ThemeProvider';

// Accessibility Components
export {
  AccessibilityProvider,
  useAccessibilityContext,
  AccessibleCard,
  FocusVisibleOutline,
  AccessibleLoading,
  AccessibleErrorBoundary,
  AccessibleModal,
  AccessibleFormField
} from './AccessibilityProvider';

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

// WebSocket types
export type {
  WebSocketMessage,
  WebSocketContextType
} from './WebSocketProvider';

// Re-export API client
export {
  netlifyApi,
  NetlifyApiClient,
  NetlifyApiError,
  createNetlifyApiClient,
  isNetlifyApiError,
  handleApiError
} from '../../lib/netlify-api';

// Re-export hooks
export { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
