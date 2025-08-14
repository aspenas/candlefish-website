import { NextRequest } from 'next/server';
import { GET as GET_METRICS, POST as POST_METRICS } from '@/app/api/v1/monitoring/metrics/route';
import { GET as GET_ALERTS, POST as POST_ALERTS } from '@/app/api/v1/monitoring/alerts/route';
import { PUT as PUT_ALERT, DELETE as DELETE_ALERT } from '@/app/api/v1/monitoring/alerts/[id]/route';
import { POST as TRIGGER_ALERT } from '@/app/api/v1/monitoring/alerts/[id]/trigger/route';
import { GET as GET_CHANNELS, POST as POST_CHANNELS } from '@/app/api/v1/monitoring/channels/route';
import { ProductionTestFactory } from '../../factories/productionFactory';
import type { MonitoringMetric, Alert, NotificationChannel } from '@/lib/types/production';

// Mock external dependencies
jest.mock('@/lib/db/prisma');
jest.mock('@/lib/services/websocket-service');
jest.mock('@/lib/services/email-service');
jest.mock('@/lib/middleware/rate-limit');

// Mock notification services
const mockSlackWebhook = jest.fn();
const mockEmailService = jest.fn();
const mockSMSService = jest.fn();

jest.mock('axios', () => ({
  post: mockSlackWebhook,
  get: jest.fn(),
}));

describe('/api/v1/monitoring', () => {
  let mockMetrics: MonitoringMetric[];
  let mockAlerts: Alert[];
  let mockChannels: NotificationChannel[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockMetrics = Array.from({ length: 10 }, () => ProductionTestFactory.createMonitoringMetric());
    mockAlerts = Array.from({ length: 5 }, () => ProductionTestFactory.createAlert());
    mockChannels = Array.from({ length: 3 }, () => ProductionTestFactory.createNotificationChannel());
  });

  describe('GET /api/v1/monitoring/metrics', () => {
    it('should return metrics with time range filtering', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.metric.findMany.mockResolvedValue(mockMetrics);

      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/metrics?from=2024-01-01&to=2024-01-31&metric=cpu_usage', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:metrics']
          }),
        },
      });

      const response = await GET_METRICS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(10);
      expect(data.data[0]).toMatchObject({
        name: expect.any(String),
        value: expect.any(Number),
        unit: expect.any(String),
        timestamp: expect.any(String),
      });

      expect(mockPrisma.metric.findMany).toHaveBeenCalledWith({
        where: {
          name: 'cpu_usage',
          timestamp: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31'),
          },
        },
        orderBy: { timestamp: 'desc' },
      });
    });

    it('should support aggregation queries', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      const aggregatedData = [
        { avg: 45.5, max: 98.2, min: 12.1, count: 100 }
      ];
      mockPrisma.$queryRaw.mockResolvedValue(aggregatedData);

      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/metrics?aggregate=true&interval=1h&metric=cpu_usage', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:metrics']
          }),
        },
      });

      const response = await GET_METRICS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.aggregation).toMatchObject({
        average: 45.5,
        maximum: 98.2,
        minimum: 12.1,
        count: 100,
      });
    });

    it('should handle real-time metrics streaming', async () => {
      const mockWebSocket = require('@/lib/services/websocket-service');
      mockWebSocket.broadcastMetric = jest.fn();

      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/metrics?realtime=true', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:metrics']
          }),
        },
      });

      const response = await GET_METRICS(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/event-stream');
    });

    it('should validate time range parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/metrics?from=invalid-date&to=2024-01-31', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:metrics']
          }),
        },
      });

      const response = await GET_METRICS(request);
      expect(response.status).toBe(400);
    });

    it('should enforce metric access permissions', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/metrics?metric=admin_metrics', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:metrics'], // No admin permission
          }),
        },
      });

      const response = await GET_METRICS(request);
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/monitoring/metrics', () => {
    it('should ingest new metrics', async () => {
      const newMetric = ProductionTestFactory.createMonitoringMetric();
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.metric.create.mockResolvedValue(newMetric);

      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/metrics', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:metrics']
          }),
        },
        body: JSON.stringify({
          name: newMetric.name,
          value: newMetric.value,
          unit: newMetric.unit,
          tags: newMetric.tags,
        }),
      });

      const response = await POST_METRICS(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        name: newMetric.name,
        value: newMetric.value,
        unit: newMetric.unit,
      });
    });

    it('should validate metric data format', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/metrics', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:metrics']
          }),
        },
        body: JSON.stringify({
          name: '', // Invalid empty name
          value: 'not-a-number', // Invalid value type
          unit: 'x'.repeat(100), // Too long unit
        }),
      });

      const response = await POST_METRICS(request);
      expect(response.status).toBe(400);
    });

    it('should handle batch metric ingestion', async () => {
      const batchMetrics = Array.from({ length: 100 }, () =>
        ProductionTestFactory.createMonitoringMetric()
      );
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.metric.createMany.mockResolvedValue({ count: 100 });

      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/metrics', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:metrics']
          }),
        },
        body: JSON.stringify({ metrics: batchMetrics }),
      });

      const response = await POST_METRICS(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.inserted).toBe(100);
    });

    it('should enforce rate limiting for metric ingestion', async () => {
      const rateLimitMock = require('@/lib/middleware/rate-limit');
      rateLimitMock.checkRateLimit.mockResolvedValue({
        allowed: false,
        resetTime: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/metrics', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:metrics']
          }),
          'X-Forwarded-For': '192.168.1.1',
        },
        body: JSON.stringify({
          name: 'test_metric',
          value: 100,
          unit: 'count',
        }),
      });

      const response = await POST_METRICS(request);
      expect(response.status).toBe(429);
    });
  });

  describe('GET /api/v1/monitoring/alerts', () => {
    it('should return all alerts with filtering', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.alert.findMany.mockResolvedValue(mockAlerts);

      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/alerts?status=active&severity=critical', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:alerts']
          }),
        },
      });

      const response = await GET_ALERTS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(5);
      expect(mockPrisma.alert.findMany).toHaveBeenCalledWith({
        where: {
          status: 'active',
          severity: 'critical',
        },
        orderBy: { createdAt: 'desc' },
        include: { notifications: true },
      });
    });

    it('should support pagination for large alert lists', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.alert.findMany.mockResolvedValue(mockAlerts.slice(0, 2));
      mockPrisma.alert.count.mockResolvedValue(100);

      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/alerts?page=1&limit=2', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['read:alerts']
          }),
        },
      });

      const response = await GET_ALERTS(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.pagination.total).toBe(100);
    });
  });

  describe('POST /api/v1/monitoring/alerts', () => {
    it('should create a new alert rule', async () => {
      const newAlert = ProductionTestFactory.createAlert();
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.alert.create.mockResolvedValue(newAlert);

      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/alerts', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:alerts']
          }),
        },
        body: JSON.stringify({
          name: newAlert.name,
          description: newAlert.description,
          severity: newAlert.severity,
          metricName: newAlert.metricName,
          condition: newAlert.condition,
          notifications: newAlert.notifications,
        }),
      });

      const response = await POST_ALERTS(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        name: newAlert.name,
        severity: newAlert.severity,
        metricName: newAlert.metricName,
      });
    });

    it('should validate alert condition parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/alerts', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:alerts']
          }),
        },
        body: JSON.stringify({
          name: 'Test Alert',
          metricName: 'cpu_usage',
          condition: {
            operator: 'invalid_operator',
            threshold: -1,
            duration: 0,
          },
        }),
      });

      const response = await POST_ALERTS(request);
      expect(response.status).toBe(400);
    });

    it('should validate notification channel existence', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.notificationChannel.findMany.mockResolvedValue([]); // No channels found

      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/alerts', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:alerts']
          }),
        },
        body: JSON.stringify({
          name: 'Test Alert',
          metricName: 'cpu_usage',
          condition: { operator: 'gt', threshold: 80, duration: 5 },
          notifications: {
            channels: ['non-existent-channel'],
          },
        }),
      });

      const response = await POST_ALERTS(request);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain('notification channel');
    });
  });

  describe('POST /api/v1/monitoring/alerts/[id]/trigger', () => {
    it('should trigger alert and send notifications', async () => {
      const alert = mockAlerts[0];
      const slackChannel = ProductionTestFactory.createNotificationChannel({ type: 'slack' });
      const emailChannel = ProductionTestFactory.createNotificationChannel({ type: 'email' });

      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.alert.findUnique.mockResolvedValue(alert);
      mockPrisma.notificationChannel.findMany.mockResolvedValue([slackChannel, emailChannel]);
      mockPrisma.alert.update.mockResolvedValue({ ...alert, status: 'active' });

      mockSlackWebhook.mockResolvedValue({ status: 200 });
      mockEmailService.mockResolvedValue({ success: true });

      const request = new NextRequest(`http://localhost:3000/api/v1/monitoring/alerts/${alert.id}/trigger`, {
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

      const response = await TRIGGER_ALERT(request, { params: { id: alert.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSlackWebhook).toHaveBeenCalled();
      expect(mockEmailService).toHaveBeenCalled();
    });

    it('should handle notification delivery failures gracefully', async () => {
      const alert = mockAlerts[0];
      const slackChannel = ProductionTestFactory.createNotificationChannel({ type: 'slack' });

      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.alert.findUnique.mockResolvedValue(alert);
      mockPrisma.notificationChannel.findMany.mockResolvedValue([slackChannel]);

      mockSlackWebhook.mockRejectedValue(new Error('Slack webhook failed'));

      const request = new NextRequest(`http://localhost:3000/api/v1/monitoring/alerts/${alert.id}/trigger`, {
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

      const response = await TRIGGER_ALERT(request, { params: { id: alert.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.notificationFailures).toHaveLength(1);
    });

    it('should prevent alert spam with cooldown periods', async () => {
      const alert = ProductionTestFactory.createAlert({
        lastNotificationAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      });

      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.alert.findUnique.mockResolvedValue(alert);

      const request = new NextRequest(`http://localhost:3000/api/v1/monitoring/alerts/${alert.id}/trigger`, {
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

      const response = await TRIGGER_ALERT(request, { params: { id: alert.id } });
      expect(response.status).toBe(429);
      expect((await response.json()).error).toContain('cooldown');
    });
  });

  describe('Notification Channels Management', () => {
    it('should create notification channels with validation', async () => {
      const newChannel = ProductionTestFactory.createNotificationChannel();
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.notificationChannel.create.mockResolvedValue(newChannel);

      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/channels', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:channels']
          }),
        },
        body: JSON.stringify({
          name: newChannel.name,
          type: newChannel.type,
          config: newChannel.config,
        }),
      });

      const response = await POST_CHANNELS(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe(newChannel.type);
    });

    it('should validate webhook URLs for security', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/channels', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:channels']
          }),
        },
        body: JSON.stringify({
          name: 'Malicious Webhook',
          type: 'webhook',
          config: {
            webhook: {
              url: 'http://localhost:22/ssh', // Internal service
            },
          },
        }),
      });

      const response = await POST_CHANNELS(request);
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain('URL not allowed');
    });

    it('should test notification channels before creation', async () => {
      mockSlackWebhook.mockResolvedValue({ status: 200 });

      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/channels', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:channels']
          }),
        },
        body: JSON.stringify({
          name: 'Test Slack Channel',
          type: 'slack',
          config: {
            slack: {
              webhook: 'https://hooks.slack.com/test',
              channel: '#alerts',
            },
          },
          testBeforeCreate: true,
        }),
      });

      const response = await POST_CHANNELS(request);
      expect(response.status).toBe(201);
      expect(mockSlackWebhook).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          text: expect.stringContaining('test notification'),
        })
      );
    });
  });

  describe('Security and Performance', () => {
    it('should sanitize alert names to prevent XSS', async () => {
      const xssPayloads = global.securityTestHelpers.xssPayloads;

      for (const payload of xssPayloads) {
        const request = new NextRequest('http://localhost:3000/api/v1/monitoring/alerts', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
              permissions: ['write:alerts']
            }),
          },
          body: JSON.stringify({
            name: payload,
            metricName: 'cpu_usage',
            condition: { operator: 'gt', threshold: 80, duration: 5 },
          }),
        });

        const response = await POST_ALERTS(request);
        expect(response.status).toBe(400);
      }
    });

    it('should handle high-frequency metric ingestion', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.metric.createMany.mockResolvedValue({ count: 1000 });

      const metricsPayload = Array.from({ length: 1000 }, () => ({
        name: 'high_freq_metric',
        value: Math.random() * 100,
        unit: 'percent',
        timestamp: new Date().toISOString(),
      }));

      const request = new NextRequest('http://localhost:3000/api/v1/monitoring/metrics', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:metrics']
          }),
        },
        body: JSON.stringify({ metrics: metricsPayload }),
      });

      const startTime = Date.now();
      const response = await POST_METRICS(request);
      const endTime = Date.now();

      expect(response.status).toBe(201);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should prevent metric bombing attacks', async () => {
      const rateLimitMock = require('@/lib/middleware/rate-limit');

      // Simulate rapid requests from same IP
      const requests = Array.from({ length: 100 }, () =>
        new NextRequest('http://localhost:3000/api/v1/monitoring/metrics', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
              permissions: ['write:metrics']
            }),
            'X-Forwarded-For': '192.168.1.100',
          },
          body: JSON.stringify({
            name: 'spam_metric',
            value: 1,
            unit: 'count',
          }),
        })
      );

      // Mock rate limiting after 50 requests
      rateLimitMock.checkRateLimit.mockImplementation((req, limit) => {
        const isRateLimited = req.headers.get('X-Request-Count') > 50;
        return Promise.resolve({
          allowed: !isRateLimited,
          resetTime: Date.now() + 60000,
        });
      });

      const responses = await Promise.all(
        requests.map((req, index) => {
          req.headers.set('X-Request-Count', index.toString());
          return POST_METRICS(req);
        })
      );

      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(40);
    });

    it('should handle concurrent alert evaluations efficiently', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.alert.findMany.mockResolvedValue(mockAlerts);

      const concurrentRequests = Array.from({ length: 50 }, () =>
        new NextRequest('http://localhost:3000/api/v1/monitoring/alerts', {
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
              permissions: ['read:alerts']
            }),
          },
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests.map(req => GET_ALERTS(req)));
      const endTime = Date.now();

      const successfulResponses = responses.filter(res => res.status === 200);
      expect(successfulResponses.length).toBe(50);
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });

  describe('Compliance and Audit Logging', () => {
    it('should log all alert modifications for audit', async () => {
      const alert = mockAlerts[0];
      const mockPrisma = require('@/lib/db/prisma');

      mockPrisma.alert.findUnique.mockResolvedValue(alert);
      mockPrisma.alert.update.mockResolvedValue(alert);
      mockPrisma.auditLog.create = jest.fn();

      const request = new NextRequest(`http://localhost:3000/api/v1/monitoring/alerts/${alert.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({
            permissions: ['write:alerts']
          }),
        },
        body: JSON.stringify({
          severity: 'critical',
        }),
      });

      await PUT_ALERT(request, { params: { id: alert.id } });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'alert_updated',
          resource: 'alert',
          resourceId: alert.id,
          userId: expect.any(String),
          changes: expect.any(Object),
          timestamp: expect.any(Date),
        },
      });
    });

    it('should maintain notification delivery logs', async () => {
      const alert = mockAlerts[0];
      const channel = mockChannels[0];
      const mockPrisma = require('@/lib/db/prisma');

      mockPrisma.alert.findUnique.mockResolvedValue(alert);
      mockPrisma.notificationChannel.findMany.mockResolvedValue([channel]);
      mockPrisma.notificationLog.create = jest.fn();

      mockSlackWebhook.mockResolvedValue({ status: 200 });

      const request = new NextRequest(`http://localhost:3000/api/v1/monitoring/alerts/${alert.id}/trigger`, {
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

      await TRIGGER_ALERT(request, { params: { id: alert.id } });

      expect(mockPrisma.notificationLog.create).toHaveBeenCalledWith({
        data: {
          alertId: alert.id,
          channelId: channel.id,
          status: 'delivered',
          sentAt: expect.any(Date),
        },
      });
    });
  });
});
