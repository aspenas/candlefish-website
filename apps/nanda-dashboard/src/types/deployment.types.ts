// Deployment Management Types for Candlefish AI Platform

export interface Deployment {
  id: string
  environment: Environment
  service: string
  version: string
  status: DeploymentStatus
  triggeredBy: string
  triggeredAt: string
  startedAt?: string
  completedAt?: string
  duration?: number
  commitSha: string
  commitMessage: string
  branch: string
  rollbackTargetId?: string
  healthChecks: HealthCheck[]
  artifacts: DeploymentArtifact[]
  logs: DeploymentLog[]
  metrics: DeploymentMetrics
}

export interface Environment {
  name: EnvironmentType
  url: string
  region: string
  tier: 'production' | 'staging' | 'preview' | 'development'
  replicas: number
  resources: {
    cpu: string
    memory: string
    storage: string
  }
}

export type EnvironmentType = 'production' | 'staging' | 'preview'

export type DeploymentStatus =
  | 'pending'
  | 'running'
  | 'deploying'
  | 'testing'
  | 'completed'
  | 'failed'
  | 'rolled_back'
  | 'cancelled'

export interface HealthCheck {
  service: string
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  message: string
  lastChecked: string
  responseTime: number
  endpoint: string
  details?: Record<string, any>
}

export interface DeploymentArtifact {
  id: string
  name: string
  type: 'docker' | 'package' | 'bundle' | 'config'
  size: number
  checksum: string
  url?: string
}

export interface DeploymentLog {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  service?: string
  metadata?: Record<string, any>
}

export interface DeploymentMetrics {
  deploymentTime: number
  testExecutionTime: number
  rollbackTime?: number
  successRate: number
  errorCount: number
  warningCount: number
  performance: {
    buildTime: number
    testTime: number
    deployTime: number
    healthCheckTime: number
  }
}

export interface SecretRotation {
  id: string
  service: string
  secretName: string
  type: 'api_key' | 'database' | 'jwt' | 'oauth' | 'certificate'
  status: 'pending' | 'rotating' | 'completed' | 'failed'
  lastRotated: string
  nextRotation: string
  rotatedBy: string
  environments: EnvironmentType[]
  validationStatus: 'valid' | 'warning' | 'expired' | 'invalid'
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  user: string
  action: string
  resource: string
  resourceId: string
  environment: EnvironmentType
  details: Record<string, any>
  ipAddress: string
  userAgent: string
  outcome: 'success' | 'failure' | 'partial'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface DeploymentProgress {
  deploymentId: string
  stage: DeploymentStage
  progress: number
  message: string
  timestamp: string
  estimatedTimeRemaining?: number
}

export type DeploymentStage =
  | 'initializing'
  | 'building'
  | 'testing'
  | 'deploying'
  | 'health_checking'
  | 'routing_traffic'
  | 'completing'
  | 'cleaning_up'

// GraphQL Input Types
export interface CreateDeploymentInput {
  service: string
  environment: EnvironmentType
  version: string
  branch: string
  commitSha: string
  triggeredBy: string
  config?: Record<string, any>
}

export interface RollbackDeploymentInput {
  deploymentId: string
  targetDeploymentId: string
  reason: string
  triggeredBy: string
}

export interface RotateSecretInput {
  service: string
  secretName: string
  environments: EnvironmentType[]
  triggeredBy: string
  rotationType: 'immediate' | 'scheduled'
  scheduledTime?: string
}

// WebSocket Message Types
export interface DeploymentUpdate {
  type: 'deployment_progress' | 'deployment_complete' | 'health_status' | 'logs'
  deploymentId: string
  data: DeploymentProgress | Deployment | HealthCheck[] | DeploymentLog[]
}

// API Response Types
export interface PaginatedDeployments {
  deployments: Deployment[]
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  pageInfo: {
    startCursor?: string
    endCursor?: string
  }
}

export interface PaginatedAuditLogs {
  logs: AuditLogEntry[]
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  pageInfo: {
    startCursor?: string
    endCursor?: string
  }
}

// Filter and Search Types
export interface DeploymentFilters {
  environment?: EnvironmentType[]
  status?: DeploymentStatus[]
  service?: string[]
  triggeredBy?: string[]
  dateRange?: {
    start: string
    end: string
  }
}

export interface AuditLogFilters {
  environment?: EnvironmentType[]
  action?: string[]
  user?: string[]
  severity?: ('low' | 'medium' | 'high' | 'critical')[]
  outcome?: ('success' | 'failure' | 'partial')[]
  dateRange?: {
    start: string
    end: string
  }
  resource?: string[]
}
