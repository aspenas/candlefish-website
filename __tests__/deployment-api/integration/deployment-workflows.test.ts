/**
 * Integration tests for deployment workflows
 * Tests end-to-end deployment scenarios with real database/Redis
 */

import request from 'supertest';
import { app } from '../../../src/deployment-api/app';
import { DatabaseManager } from '../../../src/deployment-api/database/manager';
import { RedisClient } from '../../../src/deployment-api/cache/redis';
import { WebhookManager } from '../../../src/deployment-api/webhooks/manager';
import { NotificationService } from '../../../src/deployment-api/services/notification.service';
import { GitHubService } from '../../../src/deployment-api/services/github.service';
import { NetlifyService } from '../../../src/deployment-api/services/netlify.service';
import { DeploymentStatus, DeploymentStrategy } from '../../../src/deployment-api/types';

// Test utilities
import { createTestUser, getTestAuthToken } from '../../utils/auth-helpers';
import { seedTestData, cleanupTestData } from '../../utils/database-helpers';
import { startTestServices, stopTestServices } from '../../utils/service-helpers';

describe('Deployment Workflows Integration', () => {
  let testDb: DatabaseManager;
  let testRedis: RedisClient;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    // Start test services (database, Redis, etc.)
    const services = await startTestServices();
    testDb = services.database;
    testRedis = services.redis;

    // Create test user and get auth token
    testUser = await createTestUser({
      email: 'test@candlefish.ai',
      role: 'admin',
      permissions: ['deployments:create', 'deployments:read', 'deployments:rollback', 'secrets:rotate']
    });
    authToken = await getTestAuthToken(testUser.id);

    // Seed test data
    await seedTestData(testDb);
  }, 30000);

  afterAll(async () => {
    await cleanupTestData(testDb);
    await stopTestServices();
  }, 30000);

  beforeEach(async () => {
    // Clear Redis cache between tests
    await testRedis.flushAll();
  });

  describe('Blue-Green Deployment Workflow', () => {
    it('should complete a full blue-green deployment cycle', async () => {
      const deploymentRequest = {
        site_name: 'docs',
        environment: 'production',
        commit_sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
        branch: 'main',
        deployment_strategy: 'blue-green',
        changelog: 'Update API documentation with new endpoints'
      };

      // 1. Create deployment
      const createResponse = await request(app)
        .post('/api/deployments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deploymentRequest)
        .expect(201);

      const deploymentId = createResponse.body.id;
      expect(createResponse.body.status).toBe('pending');
      expect(createResponse.body.deployment_strategy).toBe('blue-green');

      // 2. Wait for deployment to start building
      await waitForStatus(deploymentId, 'building', 10000);

      let deployment = await getDeploymentStatus(deploymentId);
      expect(deployment.status).toBe('building');
      expect(deployment.steps).toContainEqual(
        expect.objectContaining({
          step_name: 'build',
          status: 'running'
        })
      );

      // 3. Wait for build to complete and deployment to start
      await waitForStatus(deploymentId, 'deploying', 30000);

      deployment = await getDeploymentStatus(deploymentId);
      expect(deployment.status).toBe('deploying');
      expect(deployment.steps).toContainEqual(
        expect.objectContaining({
          step_name: 'build',
          status: 'success'
        })
      );
      expect(deployment.steps).toContainEqual(
        expect.objectContaining({
          step_name: 'deploy_blue',
          status: 'running'
        })
      );

      // 4. Wait for deployment to complete
      await waitForStatus(deploymentId, 'success', 60000);

      deployment = await getDeploymentStatus(deploymentId);
      expect(deployment.status).toBe('success');
      expect(deployment.completed_at).toBeTruthy();
      expect(deployment.live_url).toBeTruthy();

      // Verify all steps completed successfully
      const expectedSteps = ['build', 'deploy_blue', 'health_check', 'switch_traffic', 'cleanup_green'];
      for (const stepName of expectedSteps) {
        expect(deployment.steps).toContainEqual(
          expect.objectContaining({
            step_name: stepName,
            status: 'success'
          })
        );
      }

      // 5. Verify deployment is marked as current in database
      const currentDeployment = await testDb.getCurrentDeployment('docs', 'production');
      expect(currentDeployment.id).toBe(deploymentId);
    }, 120000);

    it('should handle build failures gracefully', async () => {
      // Mock a commit that will cause build failure
      const deploymentRequest = {
        site_name: 'docs',
        environment: 'staging',
        commit_sha: 'badbadbadbad1234567890123456789012345678', // This will trigger build failure
        branch: 'feature/broken-build',
        deployment_strategy: 'blue-green',
        changelog: 'Intentionally broken commit for testing'
      };

      const createResponse = await request(app)
        .post('/api/deployments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deploymentRequest)
        .expect(201);

      const deploymentId = createResponse.body.id;

      // Wait for build failure
      await waitForStatus(deploymentId, 'failed', 30000);

      const deployment = await getDeploymentStatus(deploymentId);
      expect(deployment.status).toBe('failed');
      expect(deployment.steps).toContainEqual(
        expect.objectContaining({
          step_name: 'build',
          status: 'failed',
          error_message: expect.stringContaining('Build failed')
        })
      );

      // Verify no traffic switch occurred
      expect(deployment.steps.find(s => s.step_name === 'switch_traffic')).toBeUndefined();
    }, 60000);
  });

  describe('Rollback Workflow', () => {
    let currentDeploymentId: string;
    let previousDeploymentId: string;

    beforeEach(async () => {
      // Create two successful deployments
      const firstDeployment = await createSuccessfulDeployment({
        site_name: 'partners',
        environment: 'production',
        commit_sha: 'good1234567890123456789012345678901234567',
        branch: 'main',
        changelog: 'Working version'
      });
      previousDeploymentId = firstDeployment.id;

      const secondDeployment = await createSuccessfulDeployment({
        site_name: 'partners',
        environment: 'production',
        commit_sha: 'bad1234567890123456789012345678901234567',
        branch: 'main',
        changelog: 'Problematic version'
      });
      currentDeploymentId = secondDeployment.id;
    });

    it('should successfully rollback to previous deployment', async () => {
      // Initiate rollback
      const rollbackResponse = await request(app)
        .post(`/api/deployments/${currentDeploymentId}/rollback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rollback_target: previousDeploymentId,
          reason: 'Critical bug in current deployment'
        })
        .expect(201);

      const rollbackId = rollbackResponse.body.id;
      expect(rollbackResponse.body.rollback_target).toBe(previousDeploymentId);

      // Wait for rollback to complete
      await waitForRollbackStatus(rollbackId, 'completed', 60000);

      const rollback = await getRollbackStatus(rollbackId);
      expect(rollback.status).toBe('completed');
      expect(rollback.completed_at).toBeTruthy();

      // Verify current deployment is now the previous one
      const currentDeployment = await testDb.getCurrentDeployment('partners', 'production');
      expect(currentDeployment.id).toBe(previousDeploymentId);

      // Verify rollback audit log
      const auditLogs = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ action: 'rollback.completed' })
        .expect(200);

      expect(auditLogs.body.logs).toContainEqual(
        expect.objectContaining({
          action: 'rollback.completed',
          user_id: testUser.id,
          details: expect.objectContaining({
            rollback_id: rollbackId,
            site_name: 'partners',
            environment: 'production'
          })
        })
      );
    }, 90000);

    it('should handle rollback to invalid target gracefully', async () => {
      await request(app)
        .post(`/api/deployments/${currentDeploymentId}/rollback`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rollback_target: 'non-existent-deployment',
          reason: 'Testing invalid rollback target'
        })
        .expect(400)
        .expect(res => {
          expect(res.body.message).toContain('Invalid rollback target');
        });
    });
  });

  describe('Zero-Downtime Deployment', () => {
    it('should maintain service availability during deployment', async () => {
      const deploymentRequest = {
        site_name: 'api',
        environment: 'production',
        commit_sha: 'zero123456789012345678901234567890abcdef',
        branch: 'main',
        deployment_strategy: 'blue-green',
        changelog: 'Zero-downtime update'
      };

      // Start deployment
      const createResponse = await request(app)
        .post('/api/deployments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deploymentRequest)
        .expect(201);

      const deploymentId = createResponse.body.id;

      // Monitor health during deployment
      const healthChecks: Array<{ timestamp: Date; status: string; responseTime: number }> = [];

      const healthMonitor = setInterval(async () => {
        try {
          const start = Date.now();
          const healthResponse = await request(app)
            .get('/api/health/sites/api')
            .query({ environment: 'production' })
            .expect(200);

          const responseTime = Date.now() - start;

          healthChecks.push({
            timestamp: new Date(),
            status: healthResponse.body.environments[0].status,
            responseTime
          });
        } catch (error) {
          healthChecks.push({
            timestamp: new Date(),
            status: 'error',
            responseTime: -1
          });
        }
      }, 2000); // Check every 2 seconds

      // Wait for deployment to complete
      await waitForStatus(deploymentId, 'success', 120000);
      clearInterval(healthMonitor);

      // Analyze health checks
      const errorCount = healthChecks.filter(check => check.status === 'error').length;
      const unhealthyCount = healthChecks.filter(check => check.status === 'unhealthy').length;

      expect(errorCount).toBe(0); // No errors during deployment
      expect(unhealthyCount).toBe(0); // No unhealthy states

      // Verify response times remained reasonable
      const avgResponseTime = healthChecks.reduce((sum, check) => sum + check.responseTime, 0) / healthChecks.length;
      expect(avgResponseTime).toBeLessThan(5000); // Under 5 seconds average
    }, 150000);
  });

  describe('Environment Variable Updates', () => {
    it('should update environment variables and trigger redeployment', async () => {
      // Update environment variables
      await request(app)
        .put('/api/environments/staging/variables')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          site_name: 'docs',
          variables: [
            { key: 'API_BASE_URL', value: 'https://new-api.candlefish.ai', is_secret: false },
            { key: 'SECRET_KEY', value: 'new-secret-value', is_secret: true }
          ]
        })
        .expect(200);

      // Verify variables were updated
      const variablesResponse = await request(app)
        .get('/api/environments/staging/variables')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ site_name: 'docs' })
        .expect(200);

      expect(variablesResponse.body.variables).toContainEqual(
        expect.objectContaining({
          key: 'API_BASE_URL',
          value: 'https://new-api.candlefish.ai',
          is_secret: false
        })
      );

      expect(variablesResponse.body.variables).toContainEqual(
        expect.objectContaining({
          key: 'SECRET_KEY',
          value: '***masked***', // Secrets should be masked
          is_secret: true
        })
      );
    });
  });

  describe('Secret Rotation Integration', () => {
    it('should rotate secrets and update affected services', async () => {
      // Initiate secret rotation
      const rotationResponse = await request(app)
        .post('/api/secrets/rotate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          secret_name: 'github-webhook-secret',
          rotation_type: 'manual',
          affected_services: ['deployment-api', 'webhook-handler']
        })
        .expect(202);

      const rotationId = rotationResponse.body.rotation_id;

      // Wait for rotation to complete
      await waitForRotationStatus(rotationId, 'completed', 30000);

      // Verify rotation completed
      const rotationStatus = await getRotationStatus(rotationId);
      expect(rotationStatus.status).toBe('completed');
      expect(rotationStatus.affected_services).toContain('deployment-api');
    }, 45000);
  });

  // Helper functions
  async function getDeploymentStatus(deploymentId: string) {
    const response = await request(app)
      .get(`/api/deployments/${deploymentId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    return response.body;
  }

  async function getRollbackStatus(rollbackId: string) {
    const response = await request(app)
      .get(`/api/rollbacks/${rollbackId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    return response.body;
  }

  async function getRotationStatus(rotationId: string) {
    const response = await request(app)
      .get(`/api/secrets/rotations/${rotationId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    return response.body;
  }

  async function waitForStatus(deploymentId: string, expectedStatus: DeploymentStatus, timeout: number) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const deployment = await getDeploymentStatus(deploymentId);

      if (deployment.status === expectedStatus) {
        return deployment;
      }

      if (deployment.status === 'failed' && expectedStatus !== 'failed') {
        throw new Error(`Deployment failed unexpectedly: ${JSON.stringify(deployment.steps)}`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error(`Timeout waiting for deployment ${deploymentId} to reach status ${expectedStatus}`);
  }

  async function waitForRollbackStatus(rollbackId: string, expectedStatus: string, timeout: number) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const rollback = await getRollbackStatus(rollbackId);

      if (rollback.status === expectedStatus) {
        return rollback;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error(`Timeout waiting for rollback ${rollbackId} to reach status ${expectedStatus}`);
  }

  async function waitForRotationStatus(rotationId: string, expectedStatus: string, timeout: number) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const rotation = await getRotationStatus(rotationId);

      if (rotation.status === expectedStatus) {
        return rotation;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Timeout waiting for rotation ${rotationId} to reach status ${expectedStatus}`);
  }

  async function createSuccessfulDeployment(deploymentData: any) {
    const response = await request(app)
      .post('/api/deployments')
      .set('Authorization', `Bearer ${authToken}`)
      .send(deploymentData)
      .expect(201);

    await waitForStatus(response.body.id, 'success', 90000);
    return response.body;
  }
});
