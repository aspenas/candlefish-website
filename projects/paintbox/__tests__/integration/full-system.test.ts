/**
 * Integration Tests for Full System
 * Tests complete workflows across backend services, GraphQL API, and frontend components
 */

import { GraphQLClient } from 'graphql-request';
import axios from 'axios';
import WebSocket from 'ws';
import { SystemAnalysisFactory, ServiceFactory, AlertFactory } from '../factories/systemAnalyzerFactory';

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const GRAPHQL_ENDPOINT = `${API_BASE_URL}/graphql`;
const WS_ENDPOINT = `ws://localhost:4000/graphql`;

describe('Full System Integration Tests', () => {
  let graphqlClient: GraphQLClient;
  let wsClient: WebSocket;

  beforeAll(async () => {
    // Initialize GraphQL client
    graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    // Wait for services to be ready
    await waitForServices();
  });

  afterAll(async () => {
    if (wsClient) {
      wsClient.close();
    }
  });

  beforeEach(() => {
    jest.setTimeout(30000); // 30 seconds for integration tests
  });

  describe('Service Discovery and Health Monitoring', () => {
    it('should register a new service and perform health checks', async () => {
      const serviceInput = {
        name: 'test-integration-service',
        displayName: 'Test Integration Service',
        environment: 'test',
        baseUrl: 'http://localhost:3001',
        healthEndpoint: '/health',
        tags: ['test', 'integration'],
        monitoringEnabled: true,
        alertingEnabled: true,
      };

      // Register service via GraphQL
      const registerMutation = `
        mutation RegisterService($input: RegisterServiceInput!) {
          registerService(input: $input) {
            id
            name
            status
            discoveredAt
            monitoringEnabled
          }
        }
      `;

      const result = await graphqlClient.request(registerMutation, {
        input: serviceInput,
      });

      expect(result.registerService).toBeDefined();
      expect(result.registerService.name).toBe(serviceInput.name);
      expect(result.registerService.monitoringEnabled).toBe(true);

      const serviceId = result.registerService.id;

      // Wait for initial health check
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Query service details
      const serviceQuery = `
        query GetService($id: ID!) {
          service(id: $id) {
            id
            name
            status
            lastHealthCheck
            containers {
              id
              name
              status
            }
            metrics {
              id
              name
              type
              value
              timestamp
            }
            alerts {
              id
              severity
              status
            }
          }
        }
      `;

      const serviceDetails = await graphqlClient.request(serviceQuery, {
        id: serviceId,
      });

      expect(serviceDetails.service).toBeDefined();
      expect(serviceDetails.service.id).toBe(serviceId);
      expect(serviceDetails.service.lastHealthCheck).toBeDefined();

      // Clean up - remove service
      const removeMutation = `
        mutation RemoveService($id: ID!) {
          removeService(id: $id)
        }
      `;

      const removeResult = await graphqlClient.request(removeMutation, {
        id: serviceId,
      });

      expect(removeResult.removeService).toBe(true);
    });

    it('should discover services automatically', async () => {
      // Start a mock service
      const mockService = await startMockService(3002);

      try {
        // Wait for auto-discovery
        await new Promise(resolve => setTimeout(resolve, 65000)); // Discovery runs every 60 seconds

        // Query discovered services
        const servicesQuery = `
          query GetServices {
            services(tags: ["auto-discovered"]) {
              id
              name
              autoDiscovered
              tags
            }
          }
        `;

        const result = await graphqlClient.request(servicesQuery);

        // Should find at least one auto-discovered service
        expect(result.services).toBeDefined();
        expect(Array.isArray(result.services)).toBe(true);

        const autoDiscoveredService = result.services.find((s: any) =>
          s.autoDiscovered && s.tags.includes('auto-discovered')
        );

        expect(autoDiscoveredService).toBeDefined();
      } finally {
        mockService.close();
      }
    });
  });

  describe('Real-time Monitoring and Alerts', () => {
    it('should create alerts and receive real-time notifications', async () => {
      // Create alert rule
      const createRuleMutation = `
        mutation CreateAlertRule($input: CreateAlertRuleInput!) {
          createAlertRule(input: $input) {
            id
            name
            metric
            threshold
            enabled
          }
        }
      `;

      const ruleInput = {
        name: 'High CPU Usage Test',
        description: 'Test alert for high CPU usage',
        metric: 'cpu_usage',
        condition: 'GREATER_THAN',
        threshold: 90,
        duration: '5m',
        severity: 'CRITICAL',
        serviceIds: [], // Will apply to all services
        tags: ['test'],
        notificationChannels: ['test-webhook'],
      };

      const ruleResult = await graphqlClient.request(createRuleMutation, {
        input: ruleInput,
      });

      expect(ruleResult.createAlertRule).toBeDefined();
      const ruleId = ruleResult.createAlertRule.id;

      // Set up WebSocket subscription for alerts
      const alertPromise = new Promise((resolve) => {
        wsClient = new WebSocket(WS_ENDPOINT, 'graphql-ws');

        wsClient.on('open', () => {
          // Send connection init
          wsClient.send(JSON.stringify({
            type: 'connection_init',
            payload: {},
          }));

          // Subscribe to alerts
          wsClient.send(JSON.stringify({
            id: 'alerts-sub',
            type: 'start',
            payload: {
              query: `
                subscription AlertsChanged {
                  alertsChanged {
                    id
                    name
                    severity
                    status
                    service {
                      id
                      name
                    }
                  }
                }
              `,
            },
          }));
        });

        wsClient.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'data' && message.payload?.data?.alertsChanged) {
            resolve(message.payload.data.alertsChanged);
          }
        });
      });

      // Simulate high CPU metric that should trigger alert
      await axios.post(`${API_BASE_URL}/api/metrics`, {
        name: 'cpu_usage',
        value: 95,
        serviceId: 'test-service',
        timestamp: new Date().toISOString(),
      });

      // Wait for alert notification
      const alertNotification = await alertPromise;

      expect(alertNotification).toBeDefined();
      expect((alertNotification as any).severity).toBe('CRITICAL');

      // Clean up - delete rule
      const deleteRuleMutation = `
        mutation DeleteAlertRule($id: ID!) {
          deleteAlertRule(id: $id)
        }
      `;

      await graphqlClient.request(deleteRuleMutation, { id: ruleId });
    });
  });

  describe('System Analysis and Performance', () => {
    it('should run full system analysis and return comprehensive results', async () => {
      // Trigger full analysis
      const analysisQuery = `
        query RunFullAnalysis {
          runFullAnalysis {
            id
            timestamp
            overallHealth
            healthScore
            totalServices
            healthyServices
            degradedServices
            unhealthyServices
            activeAlerts
            performanceInsights {
              type
              severity
              title
              description
              recommendation
            }
            recommendations {
              type
              priority
              title
              description
              actionItems
            }
            trendAnalysis {
              serviceHealthTrend
              alertFrequencyTrend
              performanceTrend
              availabilityTrend
            }
          }
        }
      `;

      const result = await graphqlClient.request(analysisQuery);

      expect(result.runFullAnalysis).toBeDefined();
      expect(result.runFullAnalysis.id).toBeDefined();
      expect(result.runFullAnalysis.timestamp).toBeDefined();
      expect(result.runFullAnalysis.overallHealth).toMatch(/^(HEALTHY|DEGRADED|UNHEALTHY)$/);
      expect(result.runFullAnalysis.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.runFullAnalysis.healthScore).toBeLessThanOrEqual(100);
      expect(result.runFullAnalysis.totalServices).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.runFullAnalysis.performanceInsights)).toBe(true);
      expect(Array.isArray(result.runFullAnalysis.recommendations)).toBe(true);
      expect(result.runFullAnalysis.trendAnalysis).toBeDefined();
    });

    it('should collect and query metrics time series', async () => {
      const serviceId = 'test-metrics-service';

      // Send multiple metrics over time
      const metrics = [];
      for (let i = 0; i < 10; i++) {
        const metric = {
          name: 'response_time',
          value: 100 + Math.random() * 50,
          serviceId,
          timestamp: new Date(Date.now() - (i * 60000)).toISOString(),
          labels: { endpoint: '/api/test' },
        };
        metrics.push(metric);

        await axios.post(`${API_BASE_URL}/api/metrics`, metric);
      }

      // Query metric series
      const seriesQuery = `
        query GetMetricSeries(
          $serviceId: ID!
          $metricName: String!
          $timeRange: TimeRangeInput!
          $aggregation: AggregationType
        ) {
          metricSeries(
            serviceId: $serviceId
            metricName: $metricName
            timeRange: $timeRange
            aggregation: $aggregation
          ) {
            service {
              id
              name
            }
            name
            type
            unit
            dataPoints {
              timestamp
              value
              labels
            }
            aggregation
            timeRange {
              start
              end
              duration
            }
          }
        }
      `;

      const seriesResult = await graphqlClient.request(seriesQuery, {
        serviceId,
        metricName: 'response_time',
        timeRange: { duration: '1h' },
        aggregation: 'AVG',
      });

      expect(seriesResult.metricSeries).toBeDefined();
      expect(seriesResult.metricSeries.dataPoints).toBeDefined();
      expect(Array.isArray(seriesResult.metricSeries.dataPoints)).toBe(true);
      expect(seriesResult.metricSeries.dataPoints.length).toBeGreaterThan(0);
      expect(seriesResult.metricSeries.aggregation).toBe('AVG');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle service failures gracefully', async () => {
      // Register a service that will fail health checks
      const failingServiceInput = {
        name: 'failing-test-service',
        environment: 'test',
        baseUrl: 'http://localhost:9999', // Non-existent port
        healthEndpoint: '/health',
        tags: ['test', 'failing'],
      };

      const registerMutation = `
        mutation RegisterService($input: RegisterServiceInput!) {
          registerService(input: $input) {
            id
            name
            status
          }
        }
      `;

      const registerResult = await graphqlClient.request(registerMutation, {
        input: failingServiceInput,
      });

      const serviceId = registerResult.registerService.id;

      // Wait for health check to fail
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check service status
      const serviceQuery = `
        query GetService($id: ID!) {
          service(id: $id) {
            id
            status
            lastHealthCheck
          }
        }
      `;

      const serviceResult = await graphqlClient.request(serviceQuery, {
        id: serviceId,
      });

      expect(serviceResult.service.status).toBe('UNHEALTHY');

      // Clean up
      const removeMutation = `
        mutation RemoveService($id: ID!) {
          removeService(id: $id)
        }
      `;

      await graphqlClient.request(removeMutation, { id: serviceId });
    });

    it('should handle GraphQL errors appropriately', async () => {
      // Try to access non-existent service
      const invalidQuery = `
        query GetInvalidService {
          service(id: "non-existent-service") {
            id
            name
          }
        }
      `;

      try {
        await graphqlClient.request(invalidQuery);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as any).response?.errors).toBeDefined();
      }
    });

    it('should handle network timeouts and retries', async () => {
      // Create client with short timeout
      const timeoutClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
        timeout: 1000, // 1 second timeout
        headers: {
          authorization: 'Bearer test-token',
        },
      });

      // Query that might take longer than timeout
      const slowQuery = `
        query RunFullAnalysis {
          runFullAnalysis {
            id
            healthScore
          }
        }
      `;

      // This should handle timeout gracefully
      try {
        await timeoutClient.request(slowQuery);
      } catch (error) {
        expect(error).toBeDefined();
        // Should be a timeout error
        expect((error as any).message).toMatch(/timeout|timed out/i);
      }
    });
  });

  describe('Security and Authorization', () => {
    it('should enforce authentication for protected mutations', async () => {
      // Create client without authorization
      const unauthorizedClient = new GraphQLClient(GRAPHQL_ENDPOINT);

      const protectedMutation = `
        mutation RegisterService($input: RegisterServiceInput!) {
          registerService(input: $input) {
            id
          }
        }
      `;

      try {
        await unauthorizedClient.request(protectedMutation, {
          input: {
            name: 'unauthorized-service',
            environment: 'test',
            tags: [],
          },
        });
        fail('Should have thrown authentication error');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as any).message).toMatch(/authentication|unauthorized/i);
      }
    });

    it('should enforce role-based access control', async () => {
      // Create client with viewer role
      const viewerClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
        headers: {
          authorization: 'Bearer viewer-token',
        },
      });

      const adminMutation = `
        mutation RemoveService($id: ID!) {
          removeService(id: $id)
        }
      `;

      try {
        await viewerClient.request(adminMutation, {
          id: 'some-service-id',
        });
        fail('Should have thrown authorization error');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as any).message).toMatch(/permission|forbidden|insufficient/i);
      }
    });
  });

  // Helper functions
  async function waitForServices(retries = 10, delay = 2000): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await axios.get(`${API_BASE_URL}/health`);
        return;
      } catch (error) {
        if (i === retries - 1) {
          throw new Error(`Services not ready after ${retries} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  async function startMockService(port: number): Promise<any> {
    const express = require('express');
    const app = express();

    app.get('/health', (req: any, res: any) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    app.get('/metrics', (req: any, res: any) => {
      res.json({
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 100,
        response_time: 100 + Math.random() * 50,
      });
    });

    const server = app.listen(port);

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    return server;
  }
});
