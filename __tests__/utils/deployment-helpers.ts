/**
 * Deployment testing utility functions
 * Provides helpers for creating deployments, waiting for status changes, and mock data
 */

import { v4 as uuidv4 } from 'uuid';
import { DeploymentStatus, DeploymentStrategy, DeploymentType, Environment } from '../../src/deployment-api/types';

export interface TestDeploymentData {
  id?: string;
  site_name: string;
  environment: string;
  commit_sha: string;
  branch: string;
  deployment_strategy?: DeploymentStrategy;
  deployment_type?: DeploymentType;
  changelog?: string;
  release_notes?: string;
  triggered_by?: string;
  metadata?: Record<string, any>;
}

export interface TestDeployment {
  id: string;
  site_name: string;
  environment: string;
  commit_sha: string;
  branch: string;
  status: DeploymentStatus;
  deployment_strategy: DeploymentStrategy;
  deployment_type: DeploymentType;
  triggered_by: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  preview_url?: string;
  live_url?: string;
  build_url?: string;
  changelog?: string;
  release_notes?: string;
  metadata?: Record<string, any>;
  steps: TestDeploymentStep[];
  created_at: string;
  updated_at: string;
}

export interface TestDeploymentStep {
  step_name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  logs_url?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a test deployment with mock data
 */
export async function createTestDeployment(data: TestDeploymentData): Promise<TestDeployment> {
  const now = new Date();
  const deployment: TestDeployment = {
    id: data.id || uuidv4(),
    site_name: data.site_name,
    environment: data.environment,
    commit_sha: data.commit_sha,
    branch: data.branch,
    status: 'pending',
    deployment_strategy: data.deployment_strategy || 'blue-green',
    deployment_type: data.deployment_type || 'standard',
    triggered_by: data.triggered_by || 'test-user',
    started_at: now.toISOString(),
    changelog: data.changelog || 'Test deployment',
    release_notes: data.release_notes,
    metadata: data.metadata || {},
    steps: generateDeploymentSteps(data.deployment_strategy || 'blue-green'),
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  };

  // Set URLs based on environment
  if (data.environment === 'preview') {
    deployment.preview_url = `https://${data.branch.replace(/[^a-zA-Z0-9-]/g, '-')}--${data.site_name}.candlefish.ai`;
  } else {
    deployment.live_url = `https://${data.site_name}${data.environment === 'staging' ? '-staging' : ''}.candlefish.ai`;
  }

  deployment.build_url = `https://build.candlefish.ai/deployments/${deployment.id}`;

  // Store in test registry
  TestDeploymentRegistry.addDeployment(deployment);

  // Start mock deployment process
  MockDeploymentProcess.start(deployment.id);

  return deployment;
}

/**
 * Wait for a deployment to reach a specific status
 */
export async function waitForDeploymentStatus(
  deploymentId: string,
  expectedStatus: DeploymentStatus,
  timeout: number = 60000
): Promise<TestDeployment> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const deployment = TestDeploymentRegistry.getDeployment(deploymentId);

    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    if (deployment.status === expectedStatus) {
      return deployment;
    }

    if (deployment.status === 'failed' && expectedStatus !== 'failed') {
      throw new Error(`Deployment ${deploymentId} failed: ${JSON.stringify(deployment.steps)}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Timeout waiting for deployment ${deploymentId} to reach status ${expectedStatus}`);
}

/**
 * Wait for a deployment step to complete
 */
export async function waitForDeploymentStep(
  deploymentId: string,
  stepName: string,
  expectedStatus: 'success' | 'failed' = 'success',
  timeout: number = 60000
): Promise<TestDeploymentStep> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const deployment = TestDeploymentRegistry.getDeployment(deploymentId);

    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    const step = deployment.steps.find(s => s.step_name === stepName);

    if (step && step.status === expectedStatus) {
      return step;
    }

    if (step && step.status === 'failed' && expectedStatus !== 'failed') {
      throw new Error(`Step ${stepName} failed: ${step.error_message}`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  throw new Error(`Timeout waiting for deployment step ${stepName} to reach status ${expectedStatus}`);
}

/**
 * Generate deployment steps based on strategy
 */
function generateDeploymentSteps(strategy: DeploymentStrategy): TestDeploymentStep[] {
  const commonSteps: TestDeploymentStep[] = [
    { step_name: 'build', status: 'pending' }
  ];

  switch (strategy) {
    case 'blue-green':
      return [
        ...commonSteps,
        { step_name: 'deploy_blue', status: 'pending' },
        { step_name: 'health_check', status: 'pending' },
        { step_name: 'switch_traffic', status: 'pending' },
        { step_name: 'cleanup_green', status: 'pending' }
      ];

    case 'rolling':
      return [
        ...commonSteps,
        { step_name: 'deploy_batch_1', status: 'pending' },
        { step_name: 'deploy_batch_2', status: 'pending' },
        { step_name: 'deploy_batch_3', status: 'pending' },
        { step_name: 'final_health_check', status: 'pending' }
      ];

    case 'recreate':
      return [
        ...commonSteps,
        { step_name: 'stop_old', status: 'pending' },
        { step_name: 'deploy_new', status: 'pending' },
        { step_name: 'start_new', status: 'pending' }
      ];

    default:
      return [
        ...commonSteps,
        { step_name: 'deploy', status: 'pending' },
        { step_name: 'health_check', status: 'pending' }
      ];
  }
}

/**
 * Mock deployment process that simulates real deployment progression
 */
class MockDeploymentProcess {
  private static activeProcesses = new Map<string, NodeJS.Timeout>();

  static start(deploymentId: string): void {
    if (this.activeProcesses.has(deploymentId)) {
      return; // Already running
    }

    const process = this.createProcess(deploymentId);
    this.activeProcesses.set(deploymentId, process);
  }

  static stop(deploymentId: string): void {
    const process = this.activeProcesses.get(deploymentId);
    if (process) {
      clearTimeout(process);
      this.activeProcesses.delete(deploymentId);
    }
  }

  private static createProcess(deploymentId: string): NodeJS.Timeout {
    const deployment = TestDeploymentRegistry.getDeployment(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    // Start with building status
    setTimeout(() => {
      this.updateDeploymentStatus(deploymentId, 'building');
      this.updateStepStatus(deploymentId, 'build', 'running');
    }, 500);

    // Simulate build completion
    setTimeout(() => {
      this.updateStepStatus(deploymentId, 'build', 'success', 30);
      this.updateDeploymentStatus(deploymentId, 'deploying');

      // Start next steps based on strategy
      this.progressDeploymentSteps(deploymentId);
    }, 2000);

    return setTimeout(() => {
      // Ensure deployment completes eventually
      this.updateDeploymentStatus(deploymentId, 'success');
      this.activeProcesses.delete(deploymentId);
    }, 15000);
  }

  private static progressDeploymentSteps(deploymentId: string): void {
    const deployment = TestDeploymentRegistry.getDeployment(deploymentId);
    if (!deployment) return;

    const remainingSteps = deployment.steps.filter(s => s.status === 'pending');

    if (remainingSteps.length === 0) {
      this.updateDeploymentStatus(deploymentId, 'success');
      return;
    }

    const nextStep = remainingSteps[0];

    // Start next step
    setTimeout(() => {
      this.updateStepStatus(deploymentId, nextStep.step_name, 'running');
    }, 1000);

    // Complete next step
    setTimeout(() => {
      this.updateStepStatus(deploymentId, nextStep.step_name, 'success', 20);
      this.progressDeploymentSteps(deploymentId); // Continue with remaining steps
    }, 3000);
  }

  private static updateDeploymentStatus(deploymentId: string, status: DeploymentStatus): void {
    const deployment = TestDeploymentRegistry.getDeployment(deploymentId);
    if (!deployment) return;

    deployment.status = status;
    deployment.updated_at = new Date().toISOString();

    if (status === 'success' || status === 'failed') {
      deployment.completed_at = new Date().toISOString();
      deployment.duration_seconds = Math.floor(
        (new Date(deployment.completed_at).getTime() - new Date(deployment.started_at).getTime()) / 1000
      );
    }

    TestDeploymentRegistry.updateDeployment(deployment);
  }

  private static updateStepStatus(
    deploymentId: string,
    stepName: string,
    status: TestDeploymentStep['status'],
    duration?: number
  ): void {
    const deployment = TestDeploymentRegistry.getDeployment(deploymentId);
    if (!deployment) return;

    const step = deployment.steps.find(s => s.step_name === stepName);
    if (!step) return;

    const now = new Date().toISOString();

    if (status === 'running' && !step.started_at) {
      step.started_at = now;
    }

    step.status = status;

    if (status === 'success' || status === 'failed') {
      step.completed_at = now;
      if (step.started_at) {
        step.duration_seconds = duration || Math.floor(
          (new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()) / 1000
        );
      }
    }

    TestDeploymentRegistry.updateDeployment(deployment);
  }
}

/**
 * In-memory registry for test deployments
 */
class TestDeploymentRegistry {
  private static deployments = new Map<string, TestDeployment>();

  static addDeployment(deployment: TestDeployment): void {
    this.deployments.set(deployment.id, deployment);
  }

  static getDeployment(id: string): TestDeployment | undefined {
    return this.deployments.get(id);
  }

  static updateDeployment(deployment: TestDeployment): void {
    this.deployments.set(deployment.id, { ...deployment });
  }

  static getAllDeployments(): TestDeployment[] {
    return Array.from(this.deployments.values());
  }

  static getDeploymentsBySite(siteName: string): TestDeployment[] {
    return Array.from(this.deployments.values()).filter(d => d.site_name === siteName);
  }

  static getDeploymentsByEnvironment(environment: string): TestDeployment[] {
    return Array.from(this.deployments.values()).filter(d => d.environment === environment);
  }

  static clearAll(): void {
    // Stop all active processes
    for (const deploymentId of this.deployments.keys()) {
      MockDeploymentProcess.stop(deploymentId);
    }
    this.deployments.clear();
  }
}

/**
 * Pre-built deployment configurations for common test scenarios
 */
export const TestDeploymentConfigs = {
  successfulProduction: (): TestDeploymentData => ({
    site_name: 'docs',
    environment: 'production',
    commit_sha: 'success12345678901234567890123456789012345',
    branch: 'main',
    deployment_strategy: 'blue-green',
    changelog: 'Successful production deployment'
  }),

  failedStaging: (): TestDeploymentData => ({
    site_name: 'partners',
    environment: 'staging',
    commit_sha: 'failed123456789012345678901234567890123456',
    branch: 'feature/broken',
    deployment_strategy: 'rolling',
    changelog: 'Deployment that will fail during build'
  }),

  previewBranch: (): TestDeploymentData => ({
    site_name: 'api',
    environment: 'preview',
    commit_sha: 'preview12345678901234567890123456789012345',
    branch: 'feature/new-api',
    deployment_strategy: 'standard',
    deployment_type: 'preview',
    changelog: 'Preview deployment for new API features'
  }),

  hotfix: (): TestDeploymentData => ({
    site_name: 'docs',
    environment: 'production',
    commit_sha: 'hotfix123456789012345678901234567890123456',
    branch: 'hotfix/critical-security-patch',
    deployment_strategy: 'blue-green',
    deployment_type: 'hotfix',
    changelog: 'Critical security patch deployment'
  })
};

/**
 * Test cleanup helper
 */
export function cleanupDeploymentTests(): void {
  TestDeploymentRegistry.clearAll();
}

/**
 * Generate mock deployment history for testing pagination
 */
export async function generateMockDeploymentHistory(
  count: number,
  baseConfig: Partial<TestDeploymentData> = {}
): Promise<TestDeployment[]> {
  const deployments: TestDeployment[] = [];

  for (let i = 0; i < count; i++) {
    const deployment = await createTestDeployment({
      site_name: baseConfig.site_name || 'docs',
      environment: baseConfig.environment || 'staging',
      commit_sha: `mock${i.toString().padStart(35, '0')}`,
      branch: baseConfig.branch || 'main',
      changelog: `Mock deployment ${i + 1}`,
      ...baseConfig
    });

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    deployments.push(deployment);
  }

  return deployments;
}
