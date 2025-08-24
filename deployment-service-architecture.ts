/**
 * Candlefish AI Deployment Service Architecture
 *
 * This file defines the core service boundaries, interfaces, and implementation
 * patterns for the deployment management system. Follows Domain-Driven Design
 * principles with clear separation of concerns.
 */

// ============================================================================
// CORE DOMAIN TYPES
// ============================================================================

export interface Site {
  id: string;
  name: 'docs' | 'partners' | 'api';
  domain: string;
  repositoryUrl: string;
  buildCommand: string;
  buildDirectory: string;
  nodeVersion: string;
  envVars: Record<string, string>;
  netlifyConfig: NetlifyConfig;
  isActive: boolean;
}

export interface Environment {
  id: string;
  name: 'production' | 'staging' | 'preview';
  description: string;
  priority: number;
  autoDeploy: boolean;
  requireApproval: boolean;
  maxConcurrentDeployments: number;
  retentionDays: number;
}

export interface Deployment {
  id: string;
  siteId: string;
  environmentId: string;
  commitSha: string;
  branch: string;
  tag?: string;
  version?: string;
  deploymentType: 'standard' | 'hotfix' | 'rollback' | 'preview';
  deploymentStrategy: 'blue-green' | 'rolling' | 'recreate';
  status: DeploymentStatus;
  triggeredBy: string;
  triggerSource: 'manual' | 'webhook' | 'scheduled' | 'rollback';
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;
  previewUrl?: string;
  liveUrl?: string;
  buildId?: string;
  buildUrl?: string;
  changelog?: string;
  releaseNotes?: string;
  metadata: Record<string, any>;
  steps: DeploymentStep[];
}

export type DeploymentStatus =
  | 'pending'
  | 'building'
  | 'deploying'
  | 'success'
  | 'failed'
  | 'cancelled';

export interface DeploymentStep {
  id: string;
  deploymentId: string;
  stepName: string;
  stepOrder: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  durationSeconds?: number;
  logsUrl?: string;
  errorMessage?: string;
  metadata: Record<string, any>;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface IDeploymentService {
  // Core deployment operations
  createDeployment(request: CreateDeploymentRequest): Promise<Deployment>;
  getDeployment(id: string): Promise<Deployment | null>;
  listDeployments(filters: DeploymentFilters): Promise<PaginatedResult<Deployment>>;
  updateDeploymentStatus(id: string, status: DeploymentStatus): Promise<Deployment>;
  cancelDeployment(id: string): Promise<boolean>;

  // Promotion operations
  promoteDeployment(id: string, targetEnvironment: string): Promise<Deployment>;

  // Logs and monitoring
  getDeploymentLogs(id: string, filters?: LogFilters): Promise<LogEntry[]>;
}

export interface IRollbackService {
  // Rollback operations
  initiateRollback(request: RollbackRequest): Promise<Deployment>;
  listRollbackHistory(filters: RollbackFilters): Promise<PaginatedResult<Rollback>>;
  getRollbackDetails(id: string): Promise<RollbackDetail | null>;

  // Rollback planning
  createRollbackPlan(plan: RollbackPlan): Promise<RollbackPlan>;
  validateRollbackTarget(siteId: string, environmentId: string, targetId: string): Promise<RollbackValidation>;
}

export interface IHealthService {
  // Health monitoring
  checkSiteHealth(siteId: string, environmentId: string): Promise<HealthStatus>;
  getAllSiteHealth(): Promise<SiteHealthSummary[]>;

  // Health check management
  createHealthCheck(config: HealthCheckConfig): Promise<HealthCheck>;
  updateHealthCheck(id: string, config: Partial<HealthCheckConfig>): Promise<HealthCheck>;
  runHealthCheck(id: string): Promise<HealthCheckResult>;

  // Health history
  getHealthHistory(siteId: string, environmentId: string, period: TimePeriod): Promise<HealthMetric[]>;
}

export interface IEnvironmentService {
  // Environment management
  getEnvironments(): Promise<Environment[]>;
  getEnvironment(id: string): Promise<Environment | null>;

  // Environment variables
  getEnvironmentVariables(siteId: string, environmentId: string): Promise<EnvironmentVariable[]>;
  setEnvironmentVariables(siteId: string, environmentId: string, variables: EnvironmentVariableUpdate[]): Promise<void>;
  deleteEnvironmentVariable(siteId: string, environmentId: string, key: string): Promise<boolean>;
}

export interface ISecretService {
  // Secret management
  getSecret(name: string): Promise<string | null>;
  setSecret(name: string, value: string, metadata?: SecretMetadata): Promise<void>;
  deleteSecret(name: string): Promise<boolean>;

  // Secret rotation
  rotateSecret(name: string, rotationType: RotationType): Promise<SecretRotation>;
  getRotationHistory(secretName?: string): Promise<SecretRotation[]>;

  // Key management
  generateKeyPair(): Promise<KeyPair>;
  rotateSigningKey(): Promise<void>;
}

export interface IMonitoringService {
  // Metrics collection
  recordMetric(metric: MetricPoint): Promise<void>;
  getMetrics(query: MetricQuery): Promise<MetricData[]>;

  // Alert management
  createAlertRule(rule: AlertRule): Promise<AlertRule>;
  updateAlertRule(id: string, rule: Partial<AlertRule>): Promise<AlertRule>;
  getActiveAlerts(filters?: AlertFilters): Promise<Alert[]>;
  acknowledgeAlert(id: string, acknowledgedBy: string): Promise<void>;

  // Dashboards
  createDashboard(dashboard: Dashboard): Promise<Dashboard>;
  getDashboard(id: string): Promise<Dashboard | null>;
}

// ============================================================================
// EXTERNAL INTEGRATION INTERFACES
// ============================================================================

export interface IGitHubIntegration {
  // Repository operations
  getCommitDetails(owner: string, repo: string, sha: string): Promise<CommitDetails>;
  getBranchInfo(owner: string, repo: string, branch: string): Promise<BranchInfo>;
  createDeploymentStatus(
    owner: string,
    repo: string,
    deploymentId: string,
    status: GitHubDeploymentStatus
  ): Promise<void>;

  // Webhook handling
  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseWebhookPayload(payload: any): WebhookEvent | null;
}

export interface INetlifyIntegration {
  // Site operations
  getSiteInfo(siteId: string): Promise<NetlifySite>;
  createDeploy(siteId: string, options: NetlifyDeployOptions): Promise<NetlifyDeploy>;
  getDeployStatus(deployId: string): Promise<NetlifyDeployStatus>;

  // Domain and DNS
  configureDomain(siteId: string, domain: string): Promise<void>;
  getDeployPreviewUrl(deployId: string): Promise<string>;

  // Build hooks
  triggerBuildHook(hookId: string): Promise<void>;
  getBuildLogs(deployId: string): Promise<string[]>;
}

export interface IAWSIntegration {
  // Secrets Manager
  getSecret(secretId: string): Promise<string>;
  updateSecret(secretId: string, value: string): Promise<void>;
  createSecret(name: string, value: string, description?: string): Promise<string>;

  // CloudWatch
  putMetricData(namespace: string, metrics: CloudWatchMetric[]): Promise<void>;
  createAlarm(alarmConfig: CloudWatchAlarm): Promise<void>;

  // S3 storage
  uploadFile(bucket: string, key: string, content: Buffer): Promise<string>;
  getSignedUrl(bucket: string, key: string, expires: number): Promise<string>;
}

export interface INotificationService {
  // Slack notifications
  sendSlackMessage(channel: string, message: SlackMessage): Promise<void>;
  sendSlackAlert(alert: Alert): Promise<void>;

  // Email notifications
  sendEmail(to: string[], subject: string, content: EmailContent): Promise<void>;

  // PagerDuty integration
  triggerIncident(incident: PagerDutyIncident): Promise<string>;
  resolveIncident(incidentKey: string): Promise<void>;
}

// ============================================================================
// IMPLEMENTATION SERVICES
// ============================================================================

export class DeploymentOrchestrator {
  constructor(
    private deploymentService: IDeploymentService,
    private healthService: IHealthService,
    private rollbackService: IRollbackService,
    private monitoringService: IMonitoringService,
    private githubIntegration: IGitHubIntegration,
    private netlifyIntegration: INetlifyIntegration,
    private notificationService: INotificationService
  ) {}

  /**
   * Orchestrates a complete blue-green deployment process
   */
  async executeBlueGreenDeployment(request: CreateDeploymentRequest): Promise<Deployment> {
    const deployment = await this.deploymentService.createDeployment(request);

    try {
      // Step 1: Build phase
      await this.updateDeploymentStep(deployment.id, 'build', 'running');
      const buildResult = await this.buildApplication(deployment);
      await this.updateDeploymentStep(deployment.id, 'build', 'success');

      // Step 2: Deploy to staging slot (green environment)
      await this.updateDeploymentStep(deployment.id, 'deploy', 'running');
      const greenDeploy = await this.deployToGreenSlot(deployment, buildResult);
      await this.updateDeploymentStep(deployment.id, 'deploy', 'success');

      // Step 3: Health checks and smoke tests
      await this.updateDeploymentStep(deployment.id, 'verify', 'running');
      await this.runHealthChecks(deployment, greenDeploy.url);
      await this.updateDeploymentStep(deployment.id, 'verify', 'success');

      // Step 4: Traffic switching (blue → green)
      if (deployment.environmentId === 'production') {
        await this.updateDeploymentStep(deployment.id, 'promote', 'running');
        await this.switchTraffic(deployment, greenDeploy);
        await this.updateDeploymentStep(deployment.id, 'promote', 'success');
      }

      // Step 5: Final verification
      await this.verifyDeployment(deployment);

      await this.deploymentService.updateDeploymentStatus(deployment.id, 'success');

      // Notify success
      await this.notificationService.sendSlackMessage('deployments', {
        text: `✅ Deployment successful: ${deployment.siteId} → ${deployment.environmentId}`,
        color: 'good'
      });

      return deployment;

    } catch (error) {
      await this.handleDeploymentFailure(deployment, error);
      throw error;
    }
  }

  /**
   * Handles automatic rollback when deployment fails or health checks fail
   */
  async handleDeploymentFailure(deployment: Deployment, error: Error): Promise<void> {
    await this.deploymentService.updateDeploymentStatus(deployment.id, 'failed');

    // Record failure metrics
    await this.monitoringService.recordMetric({
      name: 'deployment_failures',
      value: 1,
      labels: {
        site: deployment.siteId,
        environment: deployment.environmentId,
        error_type: error.name
      },
      timestamp: new Date()
    });

    // Auto-rollback for production failures
    if (deployment.environmentId === 'production' && deployment.deploymentStrategy === 'blue-green') {
      try {
        await this.rollbackService.initiateRollback({
          siteId: deployment.siteId,
          environmentId: deployment.environmentId,
          rollbackTarget: 'previous',
          reason: `Auto-rollback due to deployment failure: ${error.message}`,
          force: true
        });
      } catch (rollbackError) {
        // Critical: rollback also failed
        await this.notificationService.sendSlackAlert({
          id: 'rollback-failure',
          severity: 'critical',
          title: 'Rollback Failed',
          description: `Both deployment and rollback failed for ${deployment.siteId}`,
          siteId: deployment.siteId,
          environmentId: deployment.environmentId
        });
      }
    }

    // Send failure notification
    await this.notificationService.sendSlackMessage('deployments', {
      text: `❌ Deployment failed: ${deployment.siteId} → ${deployment.environmentId}`,
      color: 'danger',
      attachments: [{
        title: 'Error Details',
        text: error.message,
        color: 'danger'
      }]
    });
  }

  private async buildApplication(deployment: Deployment): Promise<BuildResult> {
    // Integration with Netlify build system
    const netlifyDeploy = await this.netlifyIntegration.createDeploy(
      deployment.siteId,
      {
        commitSha: deployment.commitSha,
        branch: deployment.branch,
        buildCommand: deployment.buildCommand,
        environment: deployment.environmentId
      }
    );

    // Poll for build completion
    let status = await this.netlifyIntegration.getDeployStatus(netlifyDeploy.id);
    while (status.state === 'building') {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      status = await this.netlifyIntegration.getDeployStatus(netlifyDeploy.id);
    }

    if (status.state !== 'ready') {
      const logs = await this.netlifyIntegration.getBuildLogs(netlifyDeploy.id);
      throw new Error(`Build failed: ${logs.join('\n')}`);
    }

    return {
      deployId: netlifyDeploy.id,
      url: status.deploy_url,
      assets: status.assets || []
    };
  }

  private async runHealthChecks(deployment: Deployment, url: string): Promise<void> {
    const healthChecks = await this.healthService.getHealthChecks(
      deployment.siteId,
      deployment.environmentId
    );

    for (const check of healthChecks) {
      const result = await this.healthService.runHealthCheck(check.id);

      if (result.status !== 'success') {
        throw new Error(`Health check failed: ${check.endpoint} - ${result.errorMessage}`);
      }
    }

    // Additional smoke tests
    const smokeTests = [
      () => this.testPageLoad(url),
      () => this.testApiEndpoints(url),
      () => this.testCriticalUserJourneys(url)
    ];

    for (const test of smokeTests) {
      await test();
    }
  }

  private async updateDeploymentStep(
    deploymentId: string,
    stepName: string,
    status: 'running' | 'success' | 'failed'
  ): Promise<void> {
    // This would update the deployment_steps table
    // Implementation would use the database service
  }
}

// ============================================================================
// DATA TRANSFER OBJECTS
// ============================================================================

export interface CreateDeploymentRequest {
  siteName: 'docs' | 'partners' | 'api';
  environment: 'production' | 'staging' | 'preview';
  commitSha: string;
  branch: string;
  deploymentType?: 'standard' | 'hotfix' | 'rollback' | 'preview';
  deploymentStrategy?: 'blue-green' | 'rolling' | 'recreate';
  changelog?: string;
  releaseNotes?: string;
  metadata?: Record<string, any>;
}

export interface RollbackRequest {
  siteId: string;
  environmentId: string;
  rollbackTarget: string; // deployment ID or 'previous'
  reason: string;
  force?: boolean;
}

export interface HealthCheckConfig {
  siteId: string;
  environmentId: string;
  checkType: 'http' | 'tcp' | 'graphql' | 'custom';
  endpointUrl: string;
  method?: string;
  expectedStatus?: number;
  timeoutSeconds?: number;
  intervalSeconds?: number;
}

export interface MetricPoint {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

export interface AlertRule {
  id?: string;
  name: string;
  description: string;
  metricName: string;
  conditionOperator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  thresholdValue: number;
  evaluationWindowMinutes: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  notificationChannels: string[];
  autoRollback?: boolean;
  isActive: boolean;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface DeploymentConfig {
  database: {
    host: string;
    port: number;
    database: string;
    ssl: boolean;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  external: {
    github: {
      token: string;
      webhookSecret: string;
    };
    netlify: {
      token: string;
      teamId: string;
    };
    aws: {
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
    slack: {
      webhookUrl: string;
      channels: {
        deployments: string;
        alerts: string;
        critical: string;
      };
    };
  };
  deployment: {
    maxConcurrentDeployments: number;
    healthCheckTimeout: number;
    rollbackWindow: number;
    retentionDays: number;
  };
}

// Type exports for external modules
export type {
  Site,
  Environment,
  Deployment,
  DeploymentStep,
  DeploymentStatus
};

// Re-export service interfaces for dependency injection
export type {
  IDeploymentService,
  IRollbackService,
  IHealthService,
  IEnvironmentService,
  ISecretService,
  IMonitoringService
};
