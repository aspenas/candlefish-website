/**
 * Infrastructure Management Components
 * Export all infrastructure monitoring and management components
 */

export { default as HealthMonitoringDashboard } from './HealthMonitoringDashboard';
export { default as TemporalWorkflowManager } from './TemporalWorkflowManager';
export { default as SlackIntegrationPanel } from './SlackIntegrationPanel';
export { default as LoadTestingConsole } from './LoadTestingConsole';
export { default as DisasterRecoveryControlCenter } from './DisasterRecoveryControlCenter';

// Re-export types for convenience
export type {
  HealthResponse,
  HealthCheckResult,
  WorkflowExecution,
  WorkflowInput,
  WorkflowOutput,
  SlackWebhookConfig,
  SlackMessageTemplate,
  LoadTestScenario,
  LoadTestResult,
  LoadTestRealTimeMetrics,
  BackupStatus,
  RestorePoint,
  FailoverStatus,
  DRMetrics,
  DRDrill,
  WebSocketMessage,
  AlertMessage,
} from '@/lib/types/infrastructure';

// Re-export stores for convenience
export {
  useHealthStore,
  useWorkflowStore,
  useLoadTestStore,
  useDRStore,
  useAlertStore,
  useInfrastructureStore,
  // Selector hooks
  useHealthStatus,
  useHealthChecks,
  useHealthMetrics,
  useActiveWorkflow,
  useWorkflowMetrics,
  useRecentExecutions,
  useActiveLoadTest,
  useLoadTestMetrics,
  useBackupStatus,
  useFailoverStatus,
  useUnreadAlerts,
  useCriticalAlerts,
} from '@/stores/useInfrastructureStore';

// Re-export WebSocket hooks for convenience
export {
  useInfrastructureWebSocket,
  useHealthWebSocket,
  useWorkflowWebSocket,
  useLoadTestWebSocket,
  useDRWebSocket,
  useAlertWebSocket,
  useWebSocketStatus,
  useRealTimeData,
} from '@/hooks/useInfrastructureWebSocket';