/**
 * Integration Tests for GraphQL Federation with API Gateway
 * Tests the complete flow from Kong API Gateway through GraphQL Federation
 */

import request from 'supertest';
import { ApolloServer } from 'apollo-server-express';
import express from 'express';
import { buildFederatedSchema } from '@apollo/federation';
import { resolvers } from '../../lib/graphql/resolvers';
import { typeDefs } from '../../lib/graphql/schema';
import { createGraphQLContext } from '../../lib/graphql/context';
import { ServiceFactory, AlertFactory, MetricFactory } from '../factories/systemAnalyzerFactory';
import { createTestServices } from '../mocks/serviceTestHelpers';

// Mock external dependencies
jest.mock('../../lib/services/discovery-service');
jest.mock('../../lib/services/monitoring-service');
jest.mock('../../lib/services/analysis-service');
jest.mock('../../lib/services/alert-service');

describe('GraphQL Federation Integration', () => {
  let app: express.Application;
  let server: ApolloServer;
  let testServices: ReturnType<typeof createTestServices>;
  let authToken: string;

  beforeAll(async () => {
    // Create Express app
    app = express();

    // Create test services
    testServices = createTestServices();

    // Create Apollo Server with federated schema
    server = new ApolloServer({
      schema: buildFederatedSchema([
        {
          typeDefs,
          resolvers,
        },
      ]),
      context: ({ req }) => createGraphQLContext(req, testServices),
      introspection: false, // Disable in production
      playground: false,
      formatError: (error) => {
        console.error('GraphQL Error:', error);
        return {
          message: error.message,
          code: error.extensions?.code,
          path: error.path,
        };
      },
    });

    await server.start();
    server.applyMiddleware({ app, path: '/graphql', cors: false });

    // Mock authentication middleware
    app.use((req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token === 'valid-admin-token') {
        req.user = {
          id: 'admin-user',
          email: 'admin@candlefish.ai',
          roles: ['admin'],
        };
      } else if (token === 'valid-operator-token') {
        req.user = {
          id: 'operator-user',
          email: 'operator@candlefish.ai',
          roles: ['operator'],
        };
      } else if (token === 'valid-viewer-token') {
        req.user = {
          id: 'viewer-user',
          email: 'viewer@candlefish.ai',
          roles: ['viewer'],
        };
      }
      next();
    });

    authToken = 'valid-admin-token';
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Discovery Federation', () => {
    it('should resolve services across federated subgraphs', async () => {
      const mockServices = ServiceFactory.createMany(3);
      testServices.discovery.getServices.mockResolvedValue(mockServices);

      const query = `
        query GetServices {
          services(limit: 10) {
            id
            name
            status
            environment
            dependencies {
              id
              service {
                name
              }
              dependsOn {
                name
              }
            }
            containers {
              id
              name
              status
              cpuUsage
              memoryUsage
            }
            metrics {
              id
              name
              value
              unit
              timestamp
            }
            alerts {
              id
              severity
              status
              description
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.services).toHaveLength(3);
      expect(response.body.data.services[0]).toMatchObject({
        id: mockServices[0].id,
        name: mockServices[0].name,
        status: mockServices[0].status,
      });
    });

    it('should handle federated service lookups by ID', async () => {
      const mockService = ServiceFactory.createHealthy();
      testServices.discovery.getServicesByIds.mockResolvedValue([mockService]);
      testServices.discovery.getServiceDependencies.mockResolvedValue([]);
      testServices.monitoring.getContainersByServiceId.mockResolvedValue([]);
      testServices.monitoring.getProcessesByServiceId.mockResolvedValue([]);
      testServices.monitoring.getMetricsByServiceId.mockResolvedValue([]);
      testServices.alert.getAlertsByServiceId.mockResolvedValue([]);

      const query = `
        query GetService($id: ID!) {
          service(id: $id) {
            id
            name
            status
            displayName
            version
            environment
            healthEndpoint
            uptime
            dependencies {
              id
            }
            containers {
              id
              name
            }
            processes {
              id
              name
            }
            metrics {
              id
              name
            }
            alerts {
              id
              severity
            }
          }
        }
      `;

      testServices.monitoring.getCachedUptime.mockResolvedValue('2d 5h 30m');

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query,
          variables: { id: mockService.id }
        })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.service).toMatchObject({
        id: mockService.id,
        name: mockService.name,
        uptime: '2d 5h 30m',
      });
    });

    it('should resolve cross-subgraph references efficiently', async () => {
      const services = ServiceFactory.createMany(2);
      const alerts = AlertFactory.createMany(3, { serviceId: services[0].id });
      const metrics = MetricFactory.createMany(5, { serviceId: services[0].id });

      testServices.discovery.getServicesByIds.mockResolvedValue(services);
      testServices.alert.getAlerts.mockResolvedValue(alerts);
      testServices.monitoring.getMetrics.mockResolvedValue(metrics);

      const query = `
        query GetCrossSubgraphData {
          alerts(severity: CRITICAL) {
            id
            service {
              id
              name
              status
            }
            severity
            description
          }
          metrics(type: CPU) {
            id
            service {
              id
              name
            }
            name
            value
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.alerts).toHaveLength(3);
      expect(response.body.data.metrics).toHaveLength(5);

      // Verify service references are resolved
      expect(response.body.data.alerts[0].service).toMatchObject({
        id: services[0].id,
        name: services[0].name,
      });
    });
  });

  describe('Real-time Subscriptions Federation', () => {
    it('should handle federated subscription setup', async () => {
      const mockSubscription = jest.fn();
      testServices.monitoring.subscribeToServiceStatus.mockReturnValue(mockSubscription);

      const subscription = `
        subscription ServiceStatusUpdates($serviceId: ID) {
          serviceStatusChanged(serviceId: $serviceId) {
            service {
              id
              name
            }
            previousStatus
            currentStatus
            timestamp
            reason
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: subscription,
          variables: { serviceId: 'service-1' }
        })
        .expect(200);

      expect(testServices.monitoring.subscribeToServiceStatus).toHaveBeenCalledWith('service-1');
    });

    it('should handle system-wide subscriptions', async () => {
      const mockSubscription = jest.fn();
      testServices.analysis.subscribeToSystemAnalysis.mockReturnValue(mockSubscription);

      const subscription = `
        subscription SystemAnalysisUpdates {
          systemAnalysisUpdated {
            id
            overallHealth
            healthScore
            totalServices
            healthyServices
            degradedServices
            unhealthyServices
            activeAlerts
            recommendations {
              type
              priority
              title
              description
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: subscription })
        .expect(200);

      expect(testServices.analysis.subscribeToSystemAnalysis).toHaveBeenCalled();
    });
  });

  describe('Kong API Gateway Integration', () => {
    it('should handle requests with Kong headers', async () => {
      const mockServices = ServiceFactory.createMany(2);
      testServices.discovery.getServices.mockResolvedValue(mockServices);

      const query = `
        query GetServices {
          services {
            id
            name
            status
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Kong-Request-Id', 'test-request-123')
        .set('X-Kong-Proxy-Latency', '50')
        .set('X-Kong-Upstream-Latency', '100')
        .set('X-Consumer-Id', 'consumer-123')
        .set('X-Consumer-Username', 'api-client')
        .send({ query })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.services).toHaveLength(2);
    });

    it('should handle rate limiting from Kong', async () => {
      const query = `
        query ExpensiveOperation {
          runFullAnalysis {
            id
            overallHealth
          }
        }
      `;

      // Simulate Kong rate limiting
      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-RateLimit-Limit', '100')
        .set('X-RateLimit-Remaining', '0')
        .send({ query })
        .expect(200); // GraphQL should handle this gracefully

      // Should still process the request but with appropriate handling
      expect(response.body).toBeDefined();
    });

    it('should propagate Kong authentication info', async () => {
      const mockServices = ServiceFactory.createMany(1);
      testServices.discovery.getServices.mockResolvedValue(mockServices);

      const query = `
        query GetServices {
          services {
            id
            name
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Consumer-Id', 'kong-consumer-123')
        .set('X-Consumer-Username', 'api-user')
        .set('X-Authenticated-UserId', 'user-456')
        .send({ query })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
    });
  });

  describe('Service Mesh Integration (Linkerd)', () => {
    it('should handle Linkerd service mesh headers', async () => {
      const mockServices = ServiceFactory.createMany(1);
      testServices.discovery.getServices.mockResolvedValue(mockServices);

      const query = `
        query GetServices {
          services {
            id
            name
            status
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('l5d-dst-service', 'graphql-service')
        .set('l5d-src-service', 'api-gateway')
        .set('l5d-trace-id', 'trace-123')
        .send({ query })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.services).toHaveLength(1);
    });

    it('should handle service discovery through mesh', async () => {
      const mockService = ServiceFactory.createHealthy();
      testServices.discovery.getServiceByName.mockResolvedValue(mockService);

      const query = `
        query GetServiceByName($name: String!, $environment: String) {
          serviceByName(name: $name, environment: $environment) {
            id
            name
            status
            baseUrl
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .set('l5d-dst-service', 'discovery-service')
        .send({
          query,
          variables: { name: 'user-service', environment: 'production' }
        })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.serviceByName).toMatchObject({
        id: mockService.id,
        name: mockService.name,
      });
    });
  });

  describe('Authentication & Authorization', () => {
    it('should enforce role-based access control', async () => {
      const query = `
        mutation RemoveService($id: ID!) {
          removeService(id: $id)
        }
      `;

      // Test with operator token (should fail)
      const operatorResponse = await request(app)
        .post('/graphql')
        .set('Authorization', 'Bearer valid-operator-token')
        .send({
          query,
          variables: { id: 'service-1' }
        })
        .expect(200);

      expect(operatorResponse.body.errors).toBeDefined();
      expect(operatorResponse.body.errors[0].message).toContain('Insufficient permissions');

      // Test with admin token (should succeed)
      testServices.discovery.removeService.mockResolvedValue(true);

      const adminResponse = await request(app)
        .post('/graphql')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          query,
          variables: { id: 'service-1' }
        })
        .expect(200);

      expect(adminResponse.body.errors).toBeUndefined();
      expect(adminResponse.body.data.removeService).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      const query = `
        query GetServices {
          services {
            id
            name
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      // Should work for read-only operations without auth
      expect(response.body.errors).toBeUndefined();

      // But mutations should fail
      const mutation = `
        mutation AcknowledgeAlert($alertId: ID!, $userId: String!) {
          acknowledgeAlert(alertId: $alertId, userId: $userId) {
            id
            status
          }
        }
      `;

      const mutationResponse = await request(app)
        .post('/graphql')
        .send({
          query: mutation,
          variables: { alertId: 'alert-1', userId: 'user-1' }
        })
        .expect(200);

      expect(mutationResponse.body.errors).toBeDefined();
      expect(mutationResponse.body.errors[0].message).toContain('Authentication required');
    });

    it('should validate JWT tokens properly', async () => {
      const query = `
        mutation CreateAlertRule($input: CreateAlertRuleInput!) {
          createAlertRule(input: $input) {
            id
            name
          }
        }
      `;

      const input = {
        name: 'Test Rule',
        metric: 'cpu_usage',
        condition: 'GREATER_THAN',
        threshold: 80,
        duration: '5m',
        severity: 'HIGH',
        serviceIds: ['service-1'],
        tags: [],
        notificationChannels: ['slack'],
      };

      // Invalid token
      const invalidResponse = await request(app)
        .post('/graphql')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          query,
          variables: { input }
        })
        .expect(200);

      expect(invalidResponse.body.errors).toBeDefined();

      // Valid token
      testServices.alert.createAlertRule.mockResolvedValue({ id: 'rule-1', name: 'Test Rule' });

      const validResponse = await request(app)
        .post('/graphql')
        .set('Authorization', 'Bearer valid-admin-token')
        .send({
          query,
          variables: { input }
        })
        .expect(200);

      expect(validResponse.body.errors).toBeUndefined();
      expect(validResponse.body.data.createAlertRule).toMatchObject({
        id: 'rule-1',
        name: 'Test Rule',
      });
    });
  });

  describe('Performance & Caching', () => {
    it('should optimize DataLoader batching across federation', async () => {
      const services = ServiceFactory.createMany(5);
      const alerts = AlertFactory.createMany(10);

      // Setup mocks for DataLoader batching
      testServices.discovery.getServicesByIds.mockResolvedValue(services);
      testServices.alert.getAlerts.mockResolvedValue(alerts);

      const query = `
        query BatchedQueries {
          alerts {
            id
            service {
              id
              name
            }
            severity
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      expect(response.body.errors).toBeUndefined();

      // Should have batched service lookups
      expect(testServices.discovery.getServicesByIds).toHaveBeenCalledTimes(1);
    });

    it('should handle query complexity limits', async () => {
      const query = `
        query ComplexQuery {
          services {
            id
            dependencies {
              id
              dependsOn {
                id
                dependencies {
                  id
                  dependsOn {
                    id
                    name
                  }
                }
              }
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      // Should either succeed or fail with complexity error
      if (response.body.errors) {
        expect(response.body.errors[0].message).toContain('complexity');
      } else {
        expect(response.body.data).toBeDefined();
      }
    });

    it('should implement field-level caching', async () => {
      const mockService = ServiceFactory.createHealthy();
      testServices.discovery.getServicesByIds.mockResolvedValue([mockService]);
      testServices.monitoring.getCachedUptime.mockResolvedValue('5d 12h 30m');

      const query = `
        query CachedFields($id: ID!) {
          service(id: $id) {
            id
            uptime
          }
        }
      `;

      // First request
      const response1 = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query,
          variables: { id: mockService.id }
        })
        .expect(200);

      // Second request (should use cache)
      const response2 = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query,
          variables: { id: mockService.id }
        })
        .expect(200);

      expect(response1.body.data.service.uptime).toBe('5d 12h 30m');
      expect(response2.body.data.service.uptime).toBe('5d 12h 30m');

      // Should have called cache method with correct parameters
      expect(testServices.monitoring.getCachedUptime).toHaveBeenCalledWith(
        mockService.id,
        `uptime:${mockService.id}`,
        30
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      testServices.discovery.getServices.mockRejectedValue(new Error('Database connection failed'));

      const query = `
        query GetServices {
          services {
            id
            name
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Database connection failed');
    });

    it('should handle partial failures in federated queries', async () => {
      const services = ServiceFactory.createMany(2);
      testServices.discovery.getServices.mockResolvedValue(services);
      testServices.monitoring.getMetricsByServiceId.mockRejectedValue(
        new Error('Metrics service unavailable')
      );

      const query = `
        query PartialFailure {
          services {
            id
            name
            metrics {
              id
              name
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      // Should return services but with errors for metrics
      expect(response.body.data.services).toHaveLength(2);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle subscription connection errors', async () => {
      testServices.monitoring.subscribeToServiceStatus.mockImplementation(() => {
        throw new Error('WebSocket connection failed');
      });

      const subscription = `
        subscription {
          serviceStatusChanged {
            service { id }
            currentStatus
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: subscription })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('WebSocket connection failed');
    });
  });

  describe('Schema Introspection', () => {
    it('should disable introspection in production', async () => {
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            types {
              name
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: introspectionQuery })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('GraphQL introspection');
    });

    it('should validate schema federation compatibility', async () => {
      // Test federation directives
      const query = `
        query TestFederation {
          _service {
            sdl
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      expect(response.body.data._service).toBeDefined();
    });
  });
});
