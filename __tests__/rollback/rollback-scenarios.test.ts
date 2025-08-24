/**
 * Comprehensive rollback scenario testing suite
 * Tests all rollback scenarios including edge cases and failure modes
 */

import request from 'supertest';
import { app } from '../../src/deployment-api/app';
import { DatabaseManager } from '../../src/deployment-api/database/manager';
import { RedisClient } from '../../src/deployment-api/cache/redis';
import { DeploymentStatus, RollbackStatus } from '../../src/deployment-api/types';

// Test utilities
import { createTestUser, getTestAuthToken } from '../utils/auth-helpers';
import { createTestDeployment, waitForDeploymentStatus } from '../utils/deployment-helpers';
import { startTestServices, stopTestServices } from '../utils/service-helpers';
import { setupMockNetlify, mockHealthyService, mockUnhealthyService } from '../utils/external-service-mocks';

describe('Rollback Scenarios Test Suite', () => {
  let testDb: DatabaseManager;
  let testRedis: RedisClient;
  let adminToken: string;
  let developerToken: string;

  beforeAll(async () => {
    const services = await startTestServices();
    testDb = services.database;
    testRedis = services.redis;

    // Create test users
    const adminUser = await createTestUser({
      email: 'admin@candlefish.ai',
      role: 'admin',
      permissions: ['deployments:create', 'deployments:read', 'deployments:rollback']
    });

    const developerUser = await createTestUser({
      email: 'developer@candlefish.ai',
      role: 'developer',
      permissions: ['deployments:create', 'deployments:read', 'deployments:rollback:staging']
    });

    adminToken = await getTestAuthToken(adminUser.id);
    developerToken = await getTestAuthToken(developerUser.id);

    // Setup external service mocks
    setupMockNetlify();
  }, 30000);

  afterAll(async () => {
    await stopTestServices();
  }, 30000);

  beforeEach(async () => {
    await testRedis.flushAll();
    await testDb.cleanupTestData();
  });

  describe('Standard Rollback Scenarios', () => {
    it('should successfully rollback to previous deployment', async () => {
      // 1. Create successful deployment (v1)
      const v1Deployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'production',
        commit_sha: 'v1commit12345678901234567890123456789012345',
        branch: 'main',
        changelog: 'Version 1 - working deployment'
      });
      await waitForDeploymentStatus(v1Deployment.id, 'success');

      // 2. Create problematic deployment (v2)
      const v2Deployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'production',
        commit_sha: 'v2commit12345678901234567890123456789012345',
        branch: 'main',
        changelog: 'Version 2 - problematic deployment'
      });
      await waitForDeploymentStatus(v2Deployment.id, 'success');

      // 3. Initiate rollback from v2 to v1
      const rollbackResponse = await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'docs',
          environment: 'production',
          rollback_target: v1Deployment.id,
          reason: 'Critical bug found in v2'
        })
        .expect(201);

      const rollbackId = rollbackResponse.body.id;
      expect(rollbackResponse.body.rollback_target).toBe(v1Deployment.id);
      expect(rollbackResponse.body.status).toBe('pending');

      // 4. Monitor rollback progress
      await waitForRollbackStatus(rollbackId, 'completed', 120000);

      // 5. Verify rollback completed successfully
      const completedRollback = await getRollbackDetails(rollbackId);
      expect(completedRollback.status).toBe('completed');
      expect(completedRollback.completed_at).toBeTruthy();

      // 6. Verify current deployment is now v1
      const currentDeployment = await testDb.getCurrentDeployment('docs', 'production');
      expect(currentDeployment.id).toBe(v1Deployment.id);
      expect(currentDeployment.commit_sha).toBe('v1commit12345678901234567890123456789012345');

      // 7. Verify audit log entry
      const auditLogs = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ action: 'rollback.completed' })
        .expect(200);

      expect(auditLogs.body.logs).toContainEqual(
        expect.objectContaining({
          action: 'rollback.completed',
          details: expect.objectContaining({
            rollback_id: rollbackId,
            site_name: 'docs',
            environment: 'production'
          })
        })
      );
    }, 180000);

    it('should rollback to specific deployment by SHA', async () => {
      // Create multiple deployments
      const deployments = [];
      for (let i = 1; i <= 3; i++) {
        const deployment = await createTestDeployment({
          site_name: 'partners',
          environment: 'staging',
          commit_sha: `commit${i}234567890123456789012345678901234567`,
          branch: 'main',
          changelog: `Version ${i}`
        });
        await waitForDeploymentStatus(deployment.id, 'success');
        deployments.push(deployment);
      }

      // Rollback to version 1 (skip version 2)
      const rollbackResponse = await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'partners',
          environment: 'staging',
          rollback_target: deployments[0].id,
          reason: 'Rollback to stable version 1'
        })
        .expect(201);

      await waitForRollbackStatus(rollbackResponse.body.id, 'completed', 120000);

      // Verify we rolled back to version 1, not version 2
      const currentDeployment = await testDb.getCurrentDeployment('partners', 'staging');
      expect(currentDeployment.id).toBe(deployments[0].id);
      expect(currentDeployment.commit_sha).toBe('commit1234567890123456789012345678901234567');
    }, 180000);

    it('should handle rollback with "previous" target', async () => {
      // Create two deployments
      const v1 = await createTestDeployment({
        site_name: 'api',
        environment: 'staging',
        commit_sha: 'previous12345678901234567890123456789012345',
        branch: 'main'
      });
      await waitForDeploymentStatus(v1.id, 'success');

      const v2 = await createTestDeployment({
        site_name: 'api',
        environment: 'staging',
        commit_sha: 'current123456789012345678901234567890123456',
        branch: 'main'
      });
      await waitForDeploymentStatus(v2.id, 'success');

      // Rollback to "previous" (should target v1)
      const rollbackResponse = await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'api',
          environment: 'staging',
          rollback_target: 'previous',
          reason: 'Quick rollback to previous version'
        })
        .expect(201);

      await waitForRollbackStatus(rollbackResponse.body.id, 'completed', 120000);

      const currentDeployment = await testDb.getCurrentDeployment('api', 'staging');
      expect(currentDeployment.id).toBe(v1.id);
    }, 180000);
  });

  describe('Rollback Validation and Constraints', () => {
    it('should reject rollback to non-existent deployment', async () => {
      await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'docs',
          environment: 'production',
          rollback_target: 'non-existent-deployment-id',
          reason: 'Testing invalid target'
        })
        .expect(400)
        .expect(res => {
          expect(res.body.message).toContain('Invalid rollback target');
        });
    });

    it('should reject rollback to deployment from different site', async () => {
      const docsDeployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'production',
        commit_sha: 'docs1234567890123456789012345678901234567',
        branch: 'main'
      });

      await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'partners', // Different site
          environment: 'production',
          rollback_target: docsDeployment.id,
          reason: 'Testing cross-site rollback'
        })
        .expect(400)
        .expect(res => {
          expect(res.body.message).toContain('Rollback target must be from the same site');
        });
    });

    it('should reject rollback to deployment from different environment', async () => {
      const stagingDeployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'staging',
        commit_sha: 'staging12345678901234567890123456789012345',
        branch: 'main'
      });

      await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'docs',
          environment: 'production', // Different environment
          rollback_target: stagingDeployment.id,
          reason: 'Testing cross-environment rollback'
        })
        .expect(400)
        .expect(res => {
          expect(res.body.message).toContain('Rollback target must be from the same environment');
        });
    });

    it('should reject rollback to failed deployment without force flag', async () => {
      const failedDeployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'staging',
        commit_sha: 'failed123456789012345678901234567890123456',
        branch: 'broken-branch'
      });
      // Let it fail naturally or force failure
      await testDb.updateDeploymentStatus(failedDeployment.id, 'failed');

      await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          rollback_target: failedDeployment.id,
          reason: 'Testing rollback to failed deployment'
        })
        .expect(400)
        .expect(res => {
          expect(res.body.message).toContain('Cannot rollback to failed deployment');
          expect(res.body.message).toContain('force: true');
        });
    });

    it('should allow rollback to failed deployment with force flag', async () => {
      const healthyDeployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'staging',
        commit_sha: 'healthy12345678901234567890123456789012345',
        branch: 'main'
      });
      await waitForDeploymentStatus(healthyDeployment.id, 'success');

      const failedDeployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'staging',
        commit_sha: 'failed123456789012345678901234567890123456',
        branch: 'broken-branch'
      });
      await testDb.updateDeploymentStatus(failedDeployment.id, 'failed');

      // Current deployment (simulate a worse situation)
      const currentDeployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'staging',
        commit_sha: 'worse1234567890123456789012345678901234567',
        branch: 'main'
      });

      const rollbackResponse = await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          rollback_target: failedDeployment.id,
          reason: 'Emergency rollback to failed deployment',
          force: true
        })
        .expect(201);

      await waitForRollbackStatus(rollbackResponse.body.id, 'completed', 120000);
    }, 180000);
  });

  describe('Permission-based Rollback Control', () => {
    it('should allow developer to rollback staging but not production', async () => {
      // Create deployments for both environments
      const stagingDeployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'staging',
        commit_sha: 'staging12345678901234567890123456789012345',
        branch: 'main'
      });

      const productionDeployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'production',
        commit_sha: 'prod123456789012345678901234567890123456789',
        branch: 'main'
      });

      // Developer can rollback staging
      await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          rollback_target: 'previous',
          reason: 'Developer staging rollback'
        })
        .expect(201);

      // But cannot rollback production
      await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          site_name: 'docs',
          environment: 'production',
          rollback_target: 'previous',
          reason: 'Unauthorized production rollback'
        })
        .expect(403)
        .expect(res => {
          expect(res.body.message).toContain('insufficient permissions');
        });
    });
  });

  describe('Concurrent Rollback Scenarios', () => {
    it('should prevent concurrent rollbacks on same site/environment', async () => {
      const deployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'staging',
        commit_sha: 'concurrent123456789012345678901234567890123',
        branch: 'main'
      });

      // Start first rollback
      const firstRollback = await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          rollback_target: 'previous',
          reason: 'First rollback'
        })
        .expect(201);

      // Try to start second rollback while first is in progress
      await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          rollback_target: 'previous',
          reason: 'Concurrent rollback attempt'
        })
        .expect(409)
        .expect(res => {
          expect(res.body.message).toContain('Rollback already in progress');
        });

      // Wait for first rollback to complete
      await waitForRollbackStatus(firstRollback.body.id, 'completed', 120000);

      // Now second rollback should be allowed
      await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          rollback_target: 'previous',
          reason: 'Second rollback after first completed'
        })
        .expect(201);
    }, 180000);

    it('should allow concurrent rollbacks on different sites', async () => {
      const docsDeployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'staging',
        commit_sha: 'docs123456789012345678901234567890123456789',
        branch: 'main'
      });

      const partnersDeployment = await createTestDeployment({
        site_name: 'partners',
        environment: 'staging',
        commit_sha: 'partners12345678901234567890123456789012345',
        branch: 'main'
      });

      // Both rollbacks should be allowed simultaneously
      const [docsRollback, partnersRollback] = await Promise.all([
        request(app)
          .post(`/api/rollbacks`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            site_name: 'docs',
            environment: 'staging',
            rollback_target: 'previous',
            reason: 'Docs rollback'
          }),
        request(app)
          .post(`/api/rollbacks`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            site_name: 'partners',
            environment: 'staging',
            rollback_target: 'previous',
            reason: 'Partners rollback'
          })
      ]);

      expect(docsRollback.status).toBe(201);
      expect(partnersRollback.status).toBe(201);
    });
  });

  describe('Health Check Integration', () => {
    it('should perform health checks during rollback', async () => {
      mockHealthyService('docs', 'production');

      const v1 = await createTestDeployment({
        site_name: 'docs',
        environment: 'production',
        commit_sha: 'healthyv1234567890123456789012345678901234',
        branch: 'main'
      });
      await waitForDeploymentStatus(v1.id, 'success');

      const v2 = await createTestDeployment({
        site_name: 'docs',
        environment: 'production',
        commit_sha: 'unhealthyv234567890123456789012345678901234',
        branch: 'main'
      });
      await waitForDeploymentStatus(v2.id, 'success');

      const rollbackResponse = await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'docs',
          environment: 'production',
          rollback_target: v1.id,
          reason: 'Health check rollback'
        })
        .expect(201);

      await waitForRollbackStatus(rollbackResponse.body.id, 'completed', 120000);

      // Verify health checks were performed
      const rollbackDetails = await getRollbackDetails(rollbackResponse.body.id);
      expect(rollbackDetails.steps).toContainEqual(
        expect.objectContaining({
          step_name: 'health_check',
          status: 'success'
        })
      );
    }, 180000);

    it('should fail rollback if health checks fail', async () => {
      mockUnhealthyService('docs', 'production');

      const v1 = await createTestDeployment({
        site_name: 'docs',
        environment: 'production',
        commit_sha: 'v1health12345678901234567890123456789012345',
        branch: 'main'
      });
      await waitForDeploymentStatus(v1.id, 'success');

      const v2 = await createTestDeployment({
        site_name: 'docs',
        environment: 'production',
        commit_sha: 'v2health12345678901234567890123456789012345',
        branch: 'main'
      });
      await waitForDeploymentStatus(v2.id, 'success');

      const rollbackResponse = await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'docs',
          environment: 'production',
          rollback_target: v1.id,
          reason: 'Health check failure test'
        })
        .expect(201);

      await waitForRollbackStatus(rollbackResponse.body.id, 'failed', 120000);

      const rollbackDetails = await getRollbackDetails(rollbackResponse.body.id);
      expect(rollbackDetails.status).toBe('failed');
      expect(rollbackDetails.steps).toContainEqual(
        expect.objectContaining({
          step_name: 'health_check',
          status: 'failed'
        })
      );

      // Current deployment should remain v2 (rollback didn't complete)
      const currentDeployment = await testDb.getCurrentDeployment('docs', 'production');
      expect(currentDeployment.id).toBe(v2.id);
    }, 180000);
  });

  describe('Rollback Cancellation', () => {
    it('should allow cancellation of pending rollback', async () => {
      const deployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'staging',
        commit_sha: 'cancel123456789012345678901234567890123456',
        branch: 'main'
      });

      const rollbackResponse = await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          rollback_target: 'previous',
          reason: 'Rollback to be cancelled'
        })
        .expect(201);

      const rollbackId = rollbackResponse.body.id;

      // Cancel the rollback
      await request(app)
        .delete(`/api/rollbacks/${rollbackId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verify rollback was cancelled
      const cancelledRollback = await getRollbackDetails(rollbackId);
      expect(cancelledRollback.status).toBe('cancelled');
    });

    it('should not allow cancellation of completed rollback', async () => {
      const deployment = await createTestDeployment({
        site_name: 'docs',
        environment: 'staging',
        commit_sha: 'completed123456789012345678901234567890123',
        branch: 'main'
      });

      const rollbackResponse = await request(app)
        .post(`/api/rollbacks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          rollback_target: 'previous',
          reason: 'Quick rollback'
        })
        .expect(201);

      const rollbackId = rollbackResponse.body.id;
      await waitForRollbackStatus(rollbackId, 'completed', 120000);

      // Try to cancel completed rollback
      await request(app)
        .delete(`/api/rollbacks/${rollbackId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400)
        .expect(res => {
          expect(res.body.message).toContain('Cannot cancel completed rollback');
        });
    }, 180000);
  });

  // Helper functions
  async function getRollbackDetails(rollbackId: string) {
    const response = await request(app)
      .get(`/api/rollbacks/${rollbackId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    return response.body;
  }

  async function waitForRollbackStatus(rollbackId: string, expectedStatus: RollbackStatus, timeout: number) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const rollback = await getRollbackDetails(rollbackId);

      if (rollback.status === expectedStatus) {
        return rollback;
      }

      if (rollback.status === 'failed' && expectedStatus !== 'failed') {
        throw new Error(`Rollback failed unexpectedly: ${JSON.stringify(rollback)}`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error(`Timeout waiting for rollback ${rollbackId} to reach status ${expectedStatus}`);
  }
});
