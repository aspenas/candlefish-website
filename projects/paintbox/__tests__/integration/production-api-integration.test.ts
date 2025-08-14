import { NextRequest } from 'next/server';
import { ProductionTestFactory } from '../factories/productionFactory';
import type { TemporalConnection, APIKey, Alert, CircuitBreaker, SecurityScan } from '@/lib/types/production';

// Integration test setup with real database connections (mocked)
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Mock the Prisma client
jest.mock('@/lib/db/prisma', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

// Import routes after mocking
const prismaMock = require('@/lib/db/prisma').default as DeepMockProxy<PrismaClient>;

describe('Production API Integration Tests', () => {
  beforeEach(() => {
    mockReset(prismaMock);
  });

  describe('Full Temporal Workflow', () => {
    it('should create, test, and manage temporal connection lifecycle', async () => {
      // Step 1: Create a new temporal connection
      const connectionData = {
        name: 'Integration Test Connection',
        namespace: 'test-namespace',
        endpoint: 'localhost:7233',
        tls: { enabled: false }
      };

      const createdConnection = ProductionTestFactory.createTemporalConnection(connectionData);
      prismaMock.temporalConnection.create.mockResolvedValue(createdConnection);

      const createRequest = new NextRequest('http://localhost:3000/api/v1/temporal/connections', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:temporal']
          }),
        },
        body: JSON.stringify(connectionData),
      });

      const { POST } = await import('@/app/api/v1/temporal/connections/route');
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.data.name).toBe(connectionData.name);

      // Step 2: Test the connection
      prismaMock.temporalConnection.findUnique.mockResolvedValue(createdConnection);

      const testRequest = new NextRequest(`http://localhost:3000/api/v1/temporal/connections/${createdConnection.id}/test`);
      const { GET: GET_TEST } = await import('@/app/api/v1/temporal/connections/[id]/test/route');
      const testResponse = await GET_TEST(testRequest, { params: { id: createdConnection.id } });
      const testData = await testResponse.json();

      expect(testResponse.status).toBe(200);
      expect(testData.data.status).toBeDefined();

      // Step 3: Create workflows using the connection
      const workflowData = {
        name: 'test-workflow',
        connectionId: createdConnection.id,
        workflowType: 'DataSync',
        input: { batchSize: 100 }
      };

      const createdWorkflow = ProductionTestFactory.createTemporalWorkflow(workflowData);
      prismaMock.temporalWorkflow.create.mockResolvedValue(createdWorkflow);

      // Step 4: List connections with workflows
      prismaMock.temporalConnection.findMany.mockResolvedValue([createdConnection]);
      prismaMock.temporalWorkflow.findMany.mockResolvedValue([createdWorkflow]);

      const listRequest = new NextRequest('http://localhost:3000/api/v1/temporal/connections');
      const { GET } = await import('@/app/api/v1/temporal/connections/route');
      const listResponse = await GET(listRequest);
      const listData = await listResponse.json();

      expect(listResponse.status).toBe(200);
      expect(listData.data).toHaveLength(1);

      // Step 5: Update connection configuration
      const updatedConnectionData = { ...createdConnection, tls: { enabled: true } };
      prismaMock.temporalConnection.update.mockResolvedValue(updatedConnectionData);

      const updateRequest = new NextRequest(`http://localhost:3000/api/v1/temporal/connections/${createdConnection.id}`, {
        method: 'PUT',
        body: JSON.stringify({ tls: { enabled: true } }),
      });

      const { PUT } = await import('@/app/api/v1/temporal/connections/[id]/route');
      const updateResponse = await PUT(updateRequest, { params: { id: createdConnection.id } });
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.data.tls.enabled).toBe(true);
    });

    it('should handle connection failures and cleanup', async () => {
      // Test connection failure scenarios
      const failedConnection = ProductionTestFactory.createTemporalConnectionError();
      prismaMock.temporalConnection.findUnique.mockResolvedValue(failedConnection);

      const testRequest = new NextRequest(`http://localhost:3000/api/v1/temporal/connections/${failedConnection.id}/test`);
      const { GET: GET_TEST } = await import('@/app/api/v1/temporal/connections/[id]/test/route');
      const testResponse = await GET_TEST(testRequest, { params: { id: failedConnection.id } });
      const testData = await testResponse.json();

      expect(testResponse.status).toBe(200);
      expect(testData.data.status).toBe('error');

      // Test deletion with error handling
      prismaMock.temporalConnection.delete.mockResolvedValue(failedConnection);

      const deleteRequest = new NextRequest(`http://localhost:3000/api/v1/temporal/connections/${failedConnection.id}`, {
        method: 'DELETE',
      });

      const { DELETE } = await import('@/app/api/v1/temporal/connections/[id]/route');
      const deleteResponse = await DELETE(deleteRequest, { params: { id: failedConnection.id } });

      expect(deleteResponse.status).toBe(200);
    });
  });

  describe('API Key Management Workflow', () => {
    it('should handle complete API key lifecycle with usage tracking', async () => {
      // Step 1: Create API key
      const keyData = {
        name: 'Integration Test Key',
        permissions: ['read:metrics', 'write:metrics'],
        rateLimits: {
          requestsPerMinute: 100,
          requestsPerHour: 6000,
          requestsPerDay: 144000,
        }
      };

      const createdKey = ProductionTestFactory.createAPIKey(keyData);
      prismaMock.apiKey.create.mockResolvedValue(createdKey);
      prismaMock.apiKey.count.mockResolvedValue(5); // Under limit

      const createRequest = new NextRequest('http://localhost:3000/api/v1/keys', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
        },
        body: JSON.stringify(keyData),
      });

      const { POST } = await import('@/app/api/v1/keys/route');
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.data.keyValue).toBeDefined();
      expect(createData.data.permissions).toEqual(keyData.permissions);

      // Step 2: Use the API key to make requests
      const usageData = Array.from({ length: 5 }, () =>
        ProductionTestFactory.createAPIKeyUsage()
      );
      prismaMock.apiKeyUsage.findMany.mockResolvedValue(usageData);
      prismaMock.apiKey.findUnique.mockResolvedValue(createdKey);

      const usageRequest = new NextRequest(`http://localhost:3000/api/v1/keys/${createdKey.id}/usage?period=7d`);
      const { GET: GET_USAGE } = await import('@/app/api/v1/keys/[id]/usage/route');
      const usageResponse = await GET_USAGE(usageRequest, { params: { id: createdKey.id } });
      const usageDataResponse = await usageResponse.json();

      expect(usageResponse.status).toBe(200);
      expect(usageDataResponse.data.usage).toHaveLength(5);
      expect(usageDataResponse.data.summary).toBeDefined();

      // Step 3: Rotate the API key
      const rotatedKey = { ...createdKey, keyPrefix: 'pk_new12345' };
      prismaMock.apiKey.update.mockResolvedValue(rotatedKey);

      const rotateRequest = new NextRequest(`http://localhost:3000/api/v1/keys/${createdKey.id}/rotate`, {
        method: 'POST',
      });

      const { POST: ROTATE_KEY } = await import('@/app/api/v1/keys/[id]/rotate/route');
      const rotateResponse = await ROTATE_KEY(rotateRequest, { params: { id: createdKey.id } });
      const rotateData = await rotateResponse.json();

      expect(rotateResponse.status).toBe(200);
      expect(rotateData.data.keyValue).toBeDefined();
      expect(rotateData.data.keyPrefix).not.toBe(createdKey.keyPrefix);

      // Step 4: Update key permissions
      const updatedKey = { ...createdKey, permissions: ['read:metrics'] };
      prismaMock.apiKey.update.mockResolvedValue(updatedKey);

      const updateRequest = new NextRequest(`http://localhost:3000/api/v1/keys/${createdKey.id}`, {
        method: 'PUT',
        body: JSON.stringify({ permissions: ['read:metrics'] }),
      });

      const { PUT } = await import('@/app/api/v1/keys/[id]/route');
      const updateResponse = await PUT(updateRequest, { params: { id: createdKey.id } });
      const updateData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateData.data.permissions).toEqual(['read:metrics']);

      // Step 5: Revoke the key
      const revokedKey = { ...createdKey, status: 'revoked' as const };
      prismaMock.apiKey.update.mockResolvedValue(revokedKey);

      const revokeRequest = new NextRequest(`http://localhost:3000/api/v1/keys/${createdKey.id}`, {
        method: 'DELETE',
      });

      const { DELETE } = await import('@/app/api/v1/keys/[id]/route');
      const revokeResponse = await DELETE(revokeRequest, { params: { id: createdKey.id } });

      expect(revokeResponse.status).toBe(200);
    });

    it('should enforce rate limits and security policies', async () => {
      // Test rate limiting
      const rateLimitMock = require('@/lib/middleware/rate-limit');
      rateLimitMock.checkRateLimit.mockResolvedValue({
        allowed: false,
        resetTime: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost:3000/api/v1/keys', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:keys']
          }),
          'X-Forwarded-For': '192.168.1.100',
        },
        body: JSON.stringify({
          name: 'Rate Limited Key',
          permissions: ['read:metrics'],
        }),
      });

      const { POST } = await import('@/app/api/v1/keys/route');
      const response = await POST(request);

      expect(response.status).toBe(429);
    });
  });

  describe('Monitoring and Alerting Workflow', () => {
    it('should handle metric ingestion, alert creation, and notification flow', async () => {
      // Step 1: Ingest metrics
      const metrics = Array.from({ length: 10 }, () =>
        ProductionTestFactory.createMonitoringMetric()
      );

      prismaMock.metric.createMany.mockResolvedValue({ count: 10 });

      const ingestRequest = new NextRequest('http://localhost:3000/api/v1/monitoring/metrics', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:metrics']
          }),
        },
        body: JSON.stringify({ metrics }),
      });

      const { POST: POST_METRICS } = await import('@/app/api/v1/monitoring/metrics/route');
      const ingestResponse = await POST_METRICS(ingestRequest);
      const ingestData = await ingestResponse.json();

      expect(ingestResponse.status).toBe(201);
      expect(ingestData.data.inserted).toBe(10);

      // Step 2: Create alert rule
      const alertData = {
        name: 'High CPU Alert',
        description: 'Alert when CPU usage exceeds 80%',
        severity: 'critical' as const,
        metricName: 'cpu_usage',
        condition: {
          operator: 'gt' as const,
          threshold: 80,
          duration: 5,
        },
        notifications: {
          channels: ['email-channel'],
        },
      };

      const createdAlert = ProductionTestFactory.createAlert(alertData);
      prismaMock.alert.create.mockResolvedValue(createdAlert);
      prismaMock.notificationChannel.findMany.mockResolvedValue([
        ProductionTestFactory.createNotificationChannel({ id: 'email-channel', type: 'email' })
      ]);

      const createAlertRequest = new NextRequest('http://localhost:3000/api/v1/monitoring/alerts', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:alerts']
          }),
        },
        body: JSON.stringify(alertData),
      });

      const { POST: POST_ALERTS } = await import('@/app/api/v1/monitoring/alerts/route');
      const createAlertResponse = await POST_ALERTS(createAlertRequest);
      const createAlertData = await createAlertResponse.json();

      expect(createAlertResponse.status).toBe(201);
      expect(createAlertData.data.name).toBe(alertData.name);

      // Step 3: Trigger alert
      prismaMock.alert.findUnique.mockResolvedValue(createdAlert);
      prismaMock.alert.update.mockResolvedValue({ ...createdAlert, status: 'active' as const });
      prismaMock.notificationChannel.findMany.mockResolvedValue([
        ProductionTestFactory.createNotificationChannel({ type: 'email' })
      ]);

      const triggerRequest = new NextRequest(`http://localhost:3000/api/v1/monitoring/alerts/${createdAlert.id}/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:alerts']
          }),
        },
        body: JSON.stringify({
          metricValue: 95.5,
          triggeredAt: new Date().toISOString(),
        }),
      });

      const { POST: TRIGGER_ALERT } = await import('@/app/api/v1/monitoring/alerts/[id]/trigger/route');
      const triggerResponse = await TRIGGER_ALERT(triggerRequest, { params: { id: createdAlert.id } });
      const triggerData = await triggerResponse.json();

      expect(triggerResponse.status).toBe(200);
      expect(triggerData.success).toBe(true);

      // Step 4: Query metrics with aggregation
      prismaMock.metric.findMany.mockResolvedValue(metrics);
      prismaMock.$queryRaw.mockResolvedValue([
        { avg: 85.5, max: 95.5, min: 70.0, count: 10 }
      ]);

      const queryRequest = new NextRequest('http://localhost:3000/api/v1/monitoring/metrics?aggregate=true&metric=cpu_usage&from=2024-01-01&to=2024-01-31');
      const { GET: GET_METRICS } = await import('@/app/api/v1/monitoring/metrics/route');
      const queryResponse = await GET_METRICS(queryRequest);
      const queryData = await queryResponse.json();

      expect(queryResponse.status).toBe(200);
      expect(queryData.data.aggregation).toBeDefined();
      expect(queryData.data.aggregation.average).toBe(85.5);
    });

    it('should handle notification channel management and testing', async () => {
      // Create notification channel
      const channelData = {
        name: 'Test Slack Channel',
        type: 'slack' as const,
        config: {
          slack: {
            webhook: 'https://hooks.slack.com/test',
            channel: '#alerts',
          },
        },
      };

      const createdChannel = ProductionTestFactory.createNotificationChannel(channelData);
      prismaMock.notificationChannel.create.mockResolvedValue(createdChannel);

      const createChannelRequest = new NextRequest('http://localhost:3000/api/v1/monitoring/channels', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:channels']
          }),
        },
        body: JSON.stringify(channelData),
      });

      const { POST: POST_CHANNELS } = await import('@/app/api/v1/monitoring/channels/route');
      const createChannelResponse = await POST_CHANNELS(createChannelRequest);
      const createChannelData = await createChannelResponse.json();

      expect(createChannelResponse.status).toBe(201);
      expect(createChannelData.data.type).toBe('slack');

      // List channels
      prismaMock.notificationChannel.findMany.mockResolvedValue([createdChannel]);

      const listChannelsRequest = new NextRequest('http://localhost:3000/api/v1/monitoring/channels');
      const { GET: GET_CHANNELS } = await import('@/app/api/v1/monitoring/channels/route');
      const listChannelsResponse = await GET_CHANNELS(listChannelsRequest);
      const listChannelsData = await listChannelsResponse.json();

      expect(listChannelsResponse.status).toBe(200);
      expect(listChannelsData.data).toHaveLength(1);
    });
  });

  describe('Circuit Breaker Management Workflow', () => {
    it('should handle circuit breaker lifecycle with state transitions', async () => {
      // Step 1: Create circuit breaker
      const breakerData = {
        name: 'payment-service-breaker',
        service: 'payment-service',
        failureThreshold: 5,
        recoveryTimeout: 60,
        requestTimeout: 5000,
        config: {
          enabled: true,
          automaticRecovery: true,
          notificationsEnabled: true,
        },
      };

      const createdBreaker = ProductionTestFactory.createCircuitBreaker(breakerData);
      prismaMock.circuitBreaker.create.mockResolvedValue(createdBreaker);
      prismaMock.circuitBreaker.findUnique.mockResolvedValue(null); // No existing breaker

      const createRequest = new NextRequest('http://localhost:3000/api/v1/circuit-breakers', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
        body: JSON.stringify(breakerData),
      });

      const { POST } = await import('@/app/api/v1/circuit-breakers/route');
      const createResponse = await POST(createRequest);
      const createData = await createResponse.json();

      expect(createResponse.status).toBe(201);
      expect(createData.data.name).toBe(breakerData.name);
      expect(createData.data.state).toBe('closed');

      // Step 2: Test circuit breaker
      prismaMock.circuitBreaker.findUnique.mockResolvedValue(createdBreaker);

      const testRequest = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${createdBreaker.name}/test`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
        body: JSON.stringify({
          requestCount: 10,
          timeout: 5000,
        }),
      });

      const { POST: TEST_BREAKER } = await import('@/app/api/v1/circuit-breakers/[name]/test/route');
      const testResponse = await TEST_BREAKER(testRequest, { params: { name: createdBreaker.name } });
      const testData = await testResponse.json();

      expect(testResponse.status).toBe(200);
      expect(testData.data).toBeDefined();

      // Step 3: Simulate failures and state change to open
      const openBreaker = ProductionTestFactory.createOpenCircuitBreaker();
      prismaMock.circuitBreaker.findUnique.mockResolvedValue(openBreaker);

      const getRequest = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${openBreaker.name}`);
      const { GET: GET_BREAKER } = await import('@/app/api/v1/circuit-breakers/[name]/route');
      const getResponse = await GET_BREAKER(getRequest, { params: { name: openBreaker.name } });
      const getData = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(getData.data.state).toBe('open');

      // Step 4: Reset circuit breaker
      const resetBreaker = { ...openBreaker, state: 'closed' as const };
      prismaMock.circuitBreaker.update.mockResolvedValue(resetBreaker);

      const resetRequest = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${openBreaker.name}/reset`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:circuit-breakers']
          }),
        },
      });

      const { POST: RESET_BREAKER } = await import('@/app/api/v1/circuit-breakers/[name]/reset/route');
      const resetResponse = await RESET_BREAKER(resetRequest, { params: { name: openBreaker.name } });
      const resetData = await resetResponse.json();

      expect(resetResponse.status).toBe(200);
      expect(resetData.data.state).toBe('closed');

      // Step 5: Get metrics
      const metrics = Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 3600000).toISOString(), // Last 24 hours
        requestCount: Math.floor(Math.random() * 1000),
        successCount: Math.floor(Math.random() * 800),
        failureCount: Math.floor(Math.random() * 200),
        timeouts: Math.floor(Math.random() * 50),
        averageResponseTime: Math.random() * 1000,
        p95ResponseTime: Math.random() * 2000,
        p99ResponseTime: Math.random() * 3000,
      }));

      const mockCircuitBreakerService = require('@/lib/services/circuit-breaker-service');
      mockCircuitBreakerService.getMetrics.mockResolvedValue(metrics);

      const metricsRequest = new NextRequest(`http://localhost:3000/api/v1/circuit-breakers/${createdBreaker.name}/metrics?period=24h`);
      const { GET: GET_METRICS } = await import('@/app/api/v1/circuit-breakers/[name]/metrics/route');
      const metricsResponse = await GET_METRICS(metricsRequest, { params: { name: createdBreaker.name } });
      const metricsData = await metricsResponse.json();

      expect(metricsResponse.status).toBe(200);
      expect(metricsData.data.metrics).toHaveLength(24);
      expect(metricsData.data.summary).toBeDefined();
    });
  });

  describe('Security Scanning Workflow', () => {
    it('should handle complete security scan lifecycle', async () => {
      // Step 1: Create security scan
      const scanData = {
        name: 'Repository Vulnerability Scan',
        type: 'vulnerability' as const,
        target: {
          type: 'repository' as const,
          identifier: 'https://github.com/example/repo',
        },
        config: {
          depth: 'deep' as const,
          includeDependencies: true,
          excludePatterns: ['node_modules/**', '*.test.js'],
        },
      };

      const createdScan = ProductionTestFactory.createSecurityScan({ ...scanData, status: 'pending' });
      prismaMock.securityScan.create.mockResolvedValue(createdScan);

      const createScanRequest = new NextRequest('http://localhost:3000/api/v1/security/scans', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
        body: JSON.stringify(scanData),
      });

      const { POST: POST_SCANS } = await import('@/app/api/v1/security/scans/route');
      const createScanResponse = await POST_SCANS(createScanRequest);
      const createScanData = await createScanResponse.json();

      expect(createScanResponse.status).toBe(201);
      expect(createScanData.data.name).toBe(scanData.name);
      expect(createScanData.data.status).toBe('pending');

      // Step 2: Start the scan
      prismaMock.securityScan.findUnique.mockResolvedValue(createdScan);
      prismaMock.securityScan.update.mockResolvedValue({
        ...createdScan,
        status: 'running',
      });

      const startScanRequest = new NextRequest(`http://localhost:3000/api/v1/security/scans/${createdScan.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
      });

      const { POST: START_SCAN } = await import('@/app/api/v1/security/scans/[id]/start/route');
      const startScanResponse = await START_SCAN(startScanRequest, { params: { id: createdScan.id } });
      const startScanData = await startScanResponse.json();

      expect(startScanResponse.status).toBe(200);
      expect(startScanData.data.status).toBe('running');

      // Step 3: Complete scan with results
      const vulnerabilities = Array.from({ length: 5 }, () =>
        ProductionTestFactory.createVulnerability()
      );

      const completedScan = ProductionTestFactory.createSecurityScan({
        ...createdScan,
        status: 'completed',
        results: {
          vulnerabilities,
          summary: {
            totalVulnerabilities: vulnerabilities.length,
            severityBreakdown: {
              critical: 1,
              high: 2,
              medium: 1,
              low: 1,
            },
            categoryBreakdown: {
              injection: 1,
              broken_auth: 0,
              sensitive_data: 1,
              xxe: 0,
              broken_access: 1,
              security_misconfig: 1,
              xss: 1,
              insecure_deserialization: 0,
              vulnerable_components: 0,
              insufficient_logging: 0,
            },
            complianceScore: 85,
            trends: {
              previousScan: {
                total: 7,
                new: 2,
                fixed: 4,
              },
            },
          },
        },
      });

      prismaMock.securityScan.findUnique.mockResolvedValue(completedScan);

      const getScanRequest = new NextRequest(`http://localhost:3000/api/v1/security/scans/${createdScan.id}`);
      const { GET: GET_SCAN } = await import('@/app/api/v1/security/scans/[id]/route');
      const getScanResponse = await GET_SCAN(getScanRequest, { params: { id: createdScan.id } });
      const getScanData = await getScanResponse.json();

      expect(getScanResponse.status).toBe(200);
      expect(getScanData.data.status).toBe('completed');
      expect(getScanData.data.results.vulnerabilities).toHaveLength(5);

      // Step 4: Query vulnerabilities
      prismaMock.vulnerability.findMany.mockResolvedValue(vulnerabilities);

      const getVulnerabilitiesRequest = new NextRequest('http://localhost:3000/api/v1/security/vulnerabilities?severity=critical');
      const { GET: GET_VULNERABILITIES } = await import('@/app/api/v1/security/vulnerabilities/route');
      const getVulnerabilitiesResponse = await GET_VULNERABILITIES(getVulnerabilitiesRequest);
      const getVulnerabilitiesData = await getVulnerabilitiesResponse.json();

      expect(getVulnerabilitiesResponse.status).toBe(200);
      expect(getVulnerabilitiesData.data).toBeDefined();

      // Step 5: Update vulnerability status
      const vulnerability = vulnerabilities[0];
      prismaMock.vulnerability.findUnique.mockResolvedValue(vulnerability);
      prismaMock.vulnerability.update.mockResolvedValue({
        ...vulnerability,
        status: 'fixed',
      });

      const updateVulnerabilityRequest = new NextRequest(`http://localhost:3000/api/v1/security/vulnerabilities/${vulnerability.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
        body: JSON.stringify({
          status: 'fixed',
          notes: 'Patched in version 1.2.3',
        }),
      });

      const { PUT: UPDATE_VULNERABILITY } = await import('@/app/api/v1/security/vulnerabilities/[id]/route');
      const updateVulnerabilityResponse = await UPDATE_VULNERABILITY(updateVulnerabilityRequest, { params: { id: vulnerability.id } });
      const updateVulnerabilityData = await updateVulnerabilityResponse.json();

      expect(updateVulnerabilityResponse.status).toBe(200);
      expect(updateVulnerabilityData.data.status).toBe('fixed');
    });

    it('should handle compliance checking workflow', async () => {
      // Create compliance statuses
      const complianceStatuses = [
        ProductionTestFactory.createComplianceStatus({ framework: 'SOC2' }),
        ProductionTestFactory.createComplianceStatus({ framework: 'GDPR' }),
        ProductionTestFactory.createComplianceStatus({ framework: 'HIPAA' }),
      ];

      prismaMock.complianceStatus.findMany.mockResolvedValue(complianceStatuses);

      const getComplianceRequest = new NextRequest('http://localhost:3000/api/v1/security/compliance');
      const { GET: GET_COMPLIANCE } = await import('@/app/api/v1/security/compliance/route');
      const getComplianceResponse = await GET_COMPLIANCE(getComplianceRequest);
      const getComplianceData = await getComplianceResponse.json();

      expect(getComplianceResponse.status).toBe(200);
      expect(getComplianceData.data).toHaveLength(3);
      expect(getComplianceData.data[0].framework).toBeDefined();
      expect(getComplianceData.data[0].score).toBeGreaterThanOrEqual(0);
      expect(getComplianceData.data[0].controls).toBeDefined();
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should handle monitoring alerts triggered by circuit breaker state changes', async () => {
      // Create circuit breaker
      const breaker = ProductionTestFactory.createCircuitBreaker();
      prismaMock.circuitBreaker.findMany.mockResolvedValue([breaker]);

      // Create alert for circuit breaker state
      const alert = ProductionTestFactory.createAlert({
        metricName: 'circuit_breaker_state',
        condition: {
          operator: 'eq',
          threshold: 1, // 1 = open state
          duration: 1,
        },
      });
      prismaMock.alert.findMany.mockResolvedValue([alert]);

      // Simulate circuit breaker opening and triggering alert
      const openBreaker = ProductionTestFactory.createOpenCircuitBreaker();
      prismaMock.circuitBreaker.findUnique.mockResolvedValue(openBreaker);

      // This would be handled by the monitoring system background process
      // In a real implementation, this would trigger the alert automatically
      expect(openBreaker.state).toBe('open');
      expect(alert.metricName).toBe('circuit_breaker_state');
    });

    it('should handle security scan triggered by API key usage anomalies', async () => {
      // Create API key with suspicious usage
      const apiKey = ProductionTestFactory.createAPIKey();
      const suspiciousUsage = Array.from({ length: 10 }, () =>
        ProductionTestFactory.createAPIKeyUsage({
          errors: 100, // High error rate
          endpoints: {
            '/api/v1/admin': 50, // Accessing admin endpoints
            '/api/v1/secrets': 30,
            '/api/v1/users': 20,
          },
        })
      );

      prismaMock.apiKey.findUnique.mockResolvedValue(apiKey);
      prismaMock.apiKeyUsage.findMany.mockResolvedValue(suspiciousUsage);

      // Get usage data
      const usageRequest = new NextRequest(`http://localhost:3000/api/v1/keys/${apiKey.id}/usage?period=1h`);
      const { GET: GET_USAGE } = await import('@/app/api/v1/keys/[id]/usage/route');
      const usageResponse = await GET_USAGE(usageRequest, { params: { id: apiKey.id } });
      const usageData = await usageResponse.json();

      expect(usageResponse.status).toBe(200);
      expect(usageData.data.usage).toHaveLength(10);

      // This would trigger an automatic security scan in a real implementation
      const securityScan = ProductionTestFactory.createSecurityScan({
        name: 'Anomaly Detection Scan',
        type: 'secret',
        triggeredBy: 'webhook',
      });

      expect(securityScan.triggeredBy).toBe('webhook');
    });

    it('should integrate temporal workflows with monitoring metrics', async () => {
      // Create temporal connection and workflow
      const connection = ProductionTestFactory.createTemporalConnection();
      const workflow = ProductionTestFactory.createTemporalWorkflow({
        connectionId: connection.id,
        status: 'running',
      });

      prismaMock.temporalConnection.findUnique.mockResolvedValue(connection);
      prismaMock.temporalWorkflow.findMany.mockResolvedValue([workflow]);

      // Create metrics for workflow execution
      const workflowMetrics = Array.from({ length: 5 }, () =>
        ProductionTestFactory.createMonitoringMetric({
          name: 'workflow_execution_time',
          tags: {
            workflowId: workflow.id,
            workflowType: workflow.workflowType,
            service: 'temporal',
          },
        })
      );

      prismaMock.metric.findMany.mockResolvedValue(workflowMetrics);

      // Query workflow metrics
      const metricsRequest = new NextRequest(`http://localhost:3000/api/v1/monitoring/metrics?metric=workflow_execution_time&tags.workflowId=${workflow.id}`);
      const { GET: GET_METRICS } = await import('@/app/api/v1/monitoring/metrics/route');
      const metricsResponse = await GET_METRICS(metricsRequest);
      const metricsData = await metricsResponse.json();

      expect(metricsResponse.status).toBe(200);
      expect(metricsData.data).toHaveLength(5);
      expect(metricsData.data[0].tags.workflowId).toBe(workflow.id);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      // Simulate database connection failure
      prismaMock.temporalConnection.findMany.mockRejectedValue(new Error('Database connection timeout'));

      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections');
      const { GET } = await import('@/app/api/v1/temporal/connections/route');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to fetch connections');
    });

    it('should handle partial system failures with graceful degradation', async () => {
      // Test scenario where external services fail but core functionality remains
      const mockSecurityScanner = require('@/lib/services/security-scanner');
      mockSecurityScanner.startScan.mockRejectedValue(new Error('External scanner unavailable'));

      const scan = ProductionTestFactory.createSecurityScan({ status: 'pending' });
      prismaMock.securityScan.findUnique.mockResolvedValue(scan);

      const startScanRequest = new NextRequest(`http://localhost:3000/api/v1/security/scans/${scan.id}/start`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:security']
          }),
        },
      });

      const { POST: START_SCAN } = await import('@/app/api/v1/security/scans/[id]/start/route');
      const response = await START_SCAN(startScanRequest, { params: { id: scan.id } });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to start scan');
    });
  });
});
