/**
 * Unit tests for Deployment API endpoints
 * Tests all deployment management endpoints with mocking
 */

import request from 'supertest';
import { app } from '../../../src/deployment-api/app';
import * as deploymentService from '../../../src/deployment-api/services/deployment.service';
import * as authService from '../../../src/deployment-api/services/auth.service';
import { DeploymentStatus, DeploymentStrategy, DeploymentType, Environment } from '../../../src/deployment-api/types';

// Mock services
jest.mock('../../../src/deployment-api/services/deployment.service');
jest.mock('../../../src/deployment-api/services/auth.service');

const mockDeploymentService = deploymentService as jest.Mocked<typeof deploymentService>;
const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('Deployment API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default auth mock - authorized user
    mockAuthService.verifyAuth.mockResolvedValue({
      userId: 'user-123',
      role: 'admin',
      permissions: ['deployments:create', 'deployments:read', 'deployments:rollback']
    });
  });

  describe('POST /api/deployments', () => {
    const validDeploymentRequest = {
      site_name: 'docs',
      environment: 'production',
      commit_sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
      branch: 'main',
      deployment_strategy: 'blue-green',
      changelog: 'Add new API documentation'
    };

    it('should create a new deployment successfully', async () => {
      const mockDeployment = {
        id: 'deployment-123',
        ...validDeploymentRequest,
        status: 'pending' as DeploymentStatus,
        triggered_by: 'user-123',
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockDeploymentService.createDeployment.mockResolvedValue(mockDeployment);

      const response = await request(app)
        .post('/api/deployments')
        .set('Authorization', 'Bearer valid-token')
        .send(validDeploymentRequest)
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'deployment-123',
        site_name: 'docs',
        environment: 'production',
        status: 'pending'
      });

      expect(mockDeploymentService.createDeployment).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validDeploymentRequest,
          triggered_by: 'user-123'
        })
      );
    });

    it('should reject deployment with invalid commit SHA', async () => {
      const invalidRequest = {
        ...validDeploymentRequest,
        commit_sha: 'invalid-sha'
      };

      await request(app)
        .post('/api/deployments')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidRequest)
        .expect(400)
        .expect(res => {
          expect(res.body.message).toContain('commit_sha');
        });
    });

    it('should reject deployment with unsupported site', async () => {
      const invalidRequest = {
        ...validDeploymentRequest,
        site_name: 'unsupported-site'
      };

      await request(app)
        .post('/api/deployments')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidRequest)
        .expect(400);
    });

    it('should handle concurrent deployment conflicts', async () => {
      mockDeploymentService.createDeployment.mockRejectedValue(
        new Error('DEPLOYMENT_CONFLICT: Another deployment is in progress')
      );

      await request(app)
        .post('/api/deployments')
        .set('Authorization', 'Bearer valid-token')
        .send(validDeploymentRequest)
        .expect(409)
        .expect(res => {
          expect(res.body.error).toContain('Conflicting deployment');
        });
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/deployments')
        .send(validDeploymentRequest)
        .expect(401);
    });

    it('should require create permissions', async () => {
      mockAuthService.verifyAuth.mockResolvedValue({
        userId: 'user-123',
        role: 'viewer',
        permissions: ['deployments:read']
      });

      await request(app)
        .post('/api/deployments')
        .set('Authorization', 'Bearer readonly-token')
        .send(validDeploymentRequest)
        .expect(403);
    });
  });

  describe('GET /api/deployments', () => {
    it('should list deployments with default pagination', async () => {
      const mockDeployments = [
        {
          id: 'deployment-1',
          site_name: 'docs',
          environment: 'production',
          status: 'success' as DeploymentStatus,
          created_at: new Date().toISOString()
        },
        {
          id: 'deployment-2',
          site_name: 'partners',
          environment: 'staging',
          status: 'building' as DeploymentStatus,
          created_at: new Date().toISOString()
        }
      ];

      mockDeploymentService.listDeployments.mockResolvedValue({
        deployments: mockDeployments,
        pagination: {
          limit: 20,
          offset: 0,
          total: 2,
          has_more: false
        }
      });

      const response = await request(app)
        .get('/api/deployments')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.deployments).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter deployments by site_name', async () => {
      mockDeploymentService.listDeployments.mockResolvedValue({
        deployments: [],
        pagination: { limit: 20, offset: 0, total: 0, has_more: false }
      });

      await request(app)
        .get('/api/deployments?site_name=docs')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(mockDeploymentService.listDeployments).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ site_name: 'docs' })
        })
      );
    });

    it('should filter deployments by environment', async () => {
      mockDeploymentService.listDeployments.mockResolvedValue({
        deployments: [],
        pagination: { limit: 20, offset: 0, total: 0, has_more: false }
      });

      await request(app)
        .get('/api/deployments?environment=production')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(mockDeploymentService.listDeployments).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ environment: 'production' })
        })
      );
    });

    it('should handle pagination parameters', async () => {
      mockDeploymentService.listDeployments.mockResolvedValue({
        deployments: [],
        pagination: { limit: 10, offset: 20, total: 100, has_more: true }
      });

      await request(app)
        .get('/api/deployments?limit=10&offset=20')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(mockDeploymentService.listDeployments).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: { limit: 10, offset: 20 }
        })
      );
    });
  });

  describe('GET /api/deployments/:id', () => {
    it('should get deployment details', async () => {
      const mockDeployment = {
        id: 'deployment-123',
        site_name: 'docs',
        environment: 'production',
        commit_sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
        branch: 'main',
        status: 'success' as DeploymentStatus,
        deployment_strategy: 'blue-green' as DeploymentStrategy,
        steps: [
          {
            step_name: 'build',
            status: 'success' as const,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            duration_seconds: 120
          },
          {
            step_name: 'deploy',
            status: 'success' as const,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            duration_seconds: 45
          }
        ],
        changelog: 'Add new API documentation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockDeploymentService.getDeployment.mockResolvedValue(mockDeployment);

      const response = await request(app)
        .get('/api/deployments/deployment-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.id).toBe('deployment-123');
      expect(response.body.steps).toHaveLength(2);
      expect(response.body.changelog).toBe('Add new API documentation');
    });

    it('should return 404 for non-existent deployment', async () => {
      mockDeploymentService.getDeployment.mockResolvedValue(null);

      await request(app)
        .get('/api/deployments/non-existent')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);
    });
  });

  describe('POST /api/deployments/:id/rollback', () => {
    it('should initiate rollback successfully', async () => {
      const mockRollback = {
        id: 'rollback-123',
        deployment_id: 'deployment-123',
        site_name: 'docs',
        environment: 'production',
        rollback_target: 'deployment-456',
        reason: 'Critical bug found',
        status: 'pending' as const,
        initiated_by: 'user-123',
        initiated_at: new Date().toISOString()
      };

      mockDeploymentService.initiateRollback.mockResolvedValue(mockRollback);

      const response = await request(app)
        .post('/api/deployments/deployment-123/rollback')
        .set('Authorization', 'Bearer valid-token')
        .send({
          rollback_target: 'deployment-456',
          reason: 'Critical bug found'
        })
        .expect(201);

      expect(response.body.id).toBe('rollback-123');
      expect(response.body.reason).toBe('Critical bug found');
    });

    it('should require rollback permissions', async () => {
      mockAuthService.verifyAuth.mockResolvedValue({
        userId: 'user-123',
        role: 'developer',
        permissions: ['deployments:read']
      });

      await request(app)
        .post('/api/deployments/deployment-123/rollback')
        .set('Authorization', 'Bearer readonly-token')
        .send({
          rollback_target: 'deployment-456',
          reason: 'Critical bug found'
        })
        .expect(403);
    });
  });

  describe('GET /api/health/:service', () => {
    it('should return system health status', async () => {
      mockDeploymentService.getSystemHealth.mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        checks: {
          database: 'healthy',
          redis: 'healthy',
          external_apis: {
            github: 'healthy',
            netlify: 'healthy'
          }
        }
      });

      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.checks.database).toBe('healthy');
    });

    it('should return unhealthy status when dependencies fail', async () => {
      mockDeploymentService.getSystemHealth.mockResolvedValue({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        checks: {
          database: 'healthy',
          redis: 'unhealthy',
          external_apis: {
            github: 'healthy',
            netlify: 'unhealthy'
          }
        }
      });

      const response = await request(app)
        .get('/api/health')
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.checks.redis).toBe('unhealthy');
    });
  });

  describe('GET /api/environments', () => {
    it('should list all environments', async () => {
      const mockEnvironments = [
        {
          id: 'env-1',
          name: 'production',
          description: 'Production environment',
          priority: 1,
          auto_deploy: false,
          require_approval: true,
          max_concurrent_deployments: 1
        },
        {
          id: 'env-2',
          name: 'staging',
          description: 'Staging environment',
          priority: 2,
          auto_deploy: true,
          require_approval: false,
          max_concurrent_deployments: 2
        }
      ];

      mockDeploymentService.listEnvironments.mockResolvedValue({
        environments: mockEnvironments
      });

      const response = await request(app)
        .get('/api/environments')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.environments).toHaveLength(2);
      expect(response.body.environments[0].name).toBe('production');
    });
  });

  describe('POST /api/secrets/rotate', () => {
    it('should initiate secret rotation', async () => {
      const mockRotation = {
        id: 'rotation-123',
        secret_name: 'github-token',
        rotation_type: 'manual',
        status: 'pending',
        started_at: new Date().toISOString(),
        affected_services: ['deployment-api', 'webhook-handler']
      };

      mockDeploymentService.rotateSecret.mockResolvedValue(mockRotation);

      const response = await request(app)
        .post('/api/secrets/rotate')
        .set('Authorization', 'Bearer valid-token')
        .send({
          secret_name: 'github-token',
          rotation_type: 'manual',
          affected_services: ['deployment-api', 'webhook-handler']
        })
        .expect(202);

      expect(response.body.id).toBe('rotation-123');
      expect(response.body.status).toBe('pending');
    });

    it('should require admin permissions for secret rotation', async () => {
      mockAuthService.verifyAuth.mockResolvedValue({
        userId: 'user-123',
        role: 'developer',
        permissions: ['deployments:read', 'deployments:create']
      });

      await request(app)
        .post('/api/secrets/rotate')
        .set('Authorization', 'Bearer developer-token')
        .send({
          secret_name: 'github-token'
        })
        .expect(403);
    });
  });

  describe('GET /api/audit-logs', () => {
    it('should return audit logs with pagination', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'deployment.created',
          user_id: 'user-123',
          timestamp: new Date().toISOString(),
          details: { site_name: 'docs', environment: 'production' }
        },
        {
          id: 'log-2',
          action: 'rollback.initiated',
          user_id: 'user-456',
          timestamp: new Date().toISOString(),
          details: { site_name: 'partners', reason: 'Critical bug' }
        }
      ];

      mockDeploymentService.getAuditLogs.mockResolvedValue({
        logs: mockLogs,
        pagination: {
          limit: 20,
          offset: 0,
          total: 2,
          has_more: false
        }
      });

      const response = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.logs).toHaveLength(2);
      expect(response.body.logs[0].action).toBe('deployment.created');
    });

    it('should require admin permissions to view audit logs', async () => {
      mockAuthService.verifyAuth.mockResolvedValue({
        userId: 'user-123',
        role: 'developer',
        permissions: ['deployments:read', 'deployments:create']
      });

      await request(app)
        .get('/api/audit-logs')
        .set('Authorization', 'Bearer developer-token')
        .expect(403);
    });
  });
});
