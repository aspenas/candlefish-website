import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createTestServer } from '@/test/utils/test-server';
import { ApiClient } from '@/lib/api-client';
import { createMockThreats, createMockIncidents, createMockAlerts } from '@/test/factories/ThreatFactory';

describe('Security API Integration Tests', () => {
  let server: any;
  let apiClient: ApiClient;
  let authToken: string;

  beforeAll(async () => {
    server = await createTestServer();
    authToken = await server.generateTestToken();
    apiClient = new ApiClient({
      baseURL: server.url,
      authToken,
    });
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    await server.resetDatabase();
  });

  describe('Authentication', () => {
    it('requires authentication for protected endpoints', async () => {
      const unauthenticatedClient = new ApiClient({
        baseURL: server.url,
      });

      await expect(unauthenticatedClient.get('/api/threats')).rejects.toThrow('401');
    });

    it('accepts valid JWT token', async () => {
      const response = await apiClient.get('/api/auth/verify');
      expect(response.valid).toBe(true);
      expect(response.user).toBeDefined();
    });

    it('refreshes expired token', async () => {
      const expiredToken = server.generateExpiredToken();
      const clientWithExpiredToken = new ApiClient({
        baseURL: server.url,
        authToken: expiredToken,
      });

      // Should automatically refresh token
      const response = await clientWithExpiredToken.get('/api/threats');
      expect(response).toBeDefined();
    });
  });

  describe('Threat Intelligence API', () => {
    describe('GET /api/threats', () => {
      it('returns paginated list of threats', async () => {
        const mockThreats = createMockThreats(15);
        await server.seedThreats(mockThreats);

        const response = await apiClient.get('/api/threats?page=1&limit=10');

        expect(response.data).toHaveLength(10);
        expect(response.pagination).toEqual({
          page: 1,
          limit: 10,
          total: 15,
          pages: 2,
          hasNext: true,
          hasPrev: false,
        });
      });

      it('filters threats by severity', async () => {
        const mockThreats = [
          ...createMockThreats(5).map(t => ({ ...t, severity: 'CRITICAL' })),
          ...createMockThreats(3).map(t => ({ ...t, severity: 'HIGH' })),
        ];
        await server.seedThreats(mockThreats);

        const response = await apiClient.get('/api/threats?severity=CRITICAL');

        expect(response.data).toHaveLength(5);
        expect(response.data.every(t => t.severity === 'CRITICAL')).toBe(true);
      });

      it('searches threats by name and description', async () => {
        const mockThreats = [
          { name: 'APT Advanced Threat', description: 'Sophisticated attack' },
          { name: 'Simple Malware', description: 'Basic malware detection' },
          { name: 'Zero Day Exploit', description: 'Advanced persistent threat' },
        ].map((threat, i) => ({ ...createMockThreats(1)[0], ...threat, id: `threat-${i}` }));
        
        await server.seedThreats(mockThreats);

        const response = await apiClient.get('/api/threats?search=advanced');

        expect(response.data).toHaveLength(2);
        expect(response.data.some(t => t.name.includes('Advanced'))).toBe(true);
        expect(response.data.some(t => t.description.includes('advanced'))).toBe(true);
      });

      it('sorts threats by creation date', async () => {
        const mockThreats = createMockThreats(3).map((threat, i) => ({
          ...threat,
          created_at: new Date(Date.now() - (i * 86400000)).toISOString(),
        }));
        await server.seedThreats(mockThreats);

        const response = await apiClient.get('/api/threats?sort=created_at&order=desc');

        const dates = response.data.map(t => new Date(t.created_at).getTime());
        expect(dates).toEqual([...dates].sort((a, b) => b - a));
      });
    });

    describe('POST /api/threats', () => {
      it('creates new threat with valid data', async () => {
        const threatData = {
          name: 'New Threat Actor',
          description: 'Description of the threat',
          severity: 'HIGH',
          tags: ['apt', 'malware'],
          mitre_tactics: ['Initial Access', 'Execution'],
        };

        const response = await apiClient.post('/api/threats', threatData);

        expect(response.id).toBeDefined();
        expect(response.name).toBe(threatData.name);
        expect(response.severity).toBe(threatData.severity);
        expect(response.created_at).toBeDefined();
      });

      it('validates required fields', async () => {
        const invalidThreatData = {
          description: 'Missing name field',
        };

        await expect(
          apiClient.post('/api/threats', invalidThreatData)
        ).rejects.toThrow('400');
      });

      it('validates severity enum values', async () => {
        const invalidThreatData = {
          name: 'Test Threat',
          severity: 'INVALID_SEVERITY',
        };

        await expect(
          apiClient.post('/api/threats', invalidThreatData)
        ).rejects.toThrow('400');
      });
    });

    describe('PUT /api/threats/:id', () => {
      it('updates existing threat', async () => {
        const mockThreat = createMockThreats(1)[0];
        await server.seedThreats([mockThreat]);

        const updateData = {
          name: 'Updated Threat Name',
          severity: 'CRITICAL',
        };

        const response = await apiClient.put(`/api/threats/${mockThreat.id}`, updateData);

        expect(response.id).toBe(mockThreat.id);
        expect(response.name).toBe(updateData.name);
        expect(response.severity).toBe(updateData.severity);
        expect(response.updated_at).not.toBe(mockThreat.updated_at);
      });

      it('returns 404 for non-existent threat', async () => {
        const updateData = { name: 'Updated Name' };

        await expect(
          apiClient.put('/api/threats/non-existent-id', updateData)
        ).rejects.toThrow('404');
      });
    });

    describe('DELETE /api/threats/:id', () => {
      it('deletes existing threat', async () => {
        const mockThreat = createMockThreats(1)[0];
        await server.seedThreats([mockThreat]);

        const response = await apiClient.delete(`/api/threats/${mockThreat.id}`);

        expect(response.success).toBe(true);

        await expect(
          apiClient.get(`/api/threats/${mockThreat.id}`)
        ).rejects.toThrow('404');
      });

      it('returns 404 for non-existent threat', async () => {
        await expect(
          apiClient.delete('/api/threats/non-existent-id')
        ).rejects.toThrow('404');
      });
    });
  });

  describe('Incident Management API', () => {
    describe('GET /api/incidents', () => {
      it('returns list of incidents', async () => {
        const mockIncidents = createMockIncidents(5);
        await server.seedIncidents(mockIncidents);

        const response = await apiClient.get('/api/incidents');

        expect(response.data).toHaveLength(5);
        expect(response.data[0]).toHaveProperty('id');
        expect(response.data[0]).toHaveProperty('title');
        expect(response.data[0]).toHaveProperty('status');
      });

      it('filters incidents by status', async () => {
        const mockIncidents = [
          ...createMockIncidents(3).map(i => ({ ...i, status: 'NEW' })),
          ...createMockIncidents(2).map(i => ({ ...i, status: 'INVESTIGATING' })),
        ];
        await server.seedIncidents(mockIncidents);

        const response = await apiClient.get('/api/incidents?status=NEW');

        expect(response.data).toHaveLength(3);
        expect(response.data.every(i => i.status === 'NEW')).toBe(true);
      });

      it('filters incidents by assignee', async () => {
        const assigneeId = 'user-123';
        const mockIncidents = [
          ...createMockIncidents(2).map(i => ({ ...i, assignee_id: assigneeId })),
          ...createMockIncidents(3).map(i => ({ ...i, assignee_id: 'other-user' })),
        ];
        await server.seedIncidents(mockIncidents);

        const response = await apiClient.get(`/api/incidents?assignee=${assigneeId}`);

        expect(response.data).toHaveLength(2);
        expect(response.data.every(i => i.assignee_id === assigneeId)).toBe(true);
      });
    });

    describe('POST /api/incidents', () => {
      it('creates new incident', async () => {
        const incidentData = {
          title: 'Security Breach Detected',
          description: 'Unauthorized access attempt detected',
          severity: 'HIGH',
          assignee_id: 'analyst-123',
          priority: 'HIGH',
        };

        const response = await apiClient.post('/api/incidents', incidentData);

        expect(response.id).toBeDefined();
        expect(response.title).toBe(incidentData.title);
        expect(response.status).toBe('NEW');
        expect(response.created_at).toBeDefined();
      });

      it('auto-assigns incident when no assignee specified', async () => {
        const incidentData = {
          title: 'Auto-assigned Incident',
          severity: 'MEDIUM',
        };

        const response = await apiClient.post('/api/incidents', incidentData);

        expect(response.assignee_id).toBeDefined();
        expect(response.assignee.name).toBeDefined();
      });
    });

    describe('PATCH /api/incidents/:id/status', () => {
      it('updates incident status', async () => {
        const mockIncident = createMockIncidents(1)[0];
        await server.seedIncidents([mockIncident]);

        const statusUpdate = {
          status: 'INVESTIGATING',
          notes: 'Starting investigation',
        };

        const response = await apiClient.patch(
          `/api/incidents/${mockIncident.id}/status`,
          statusUpdate
        );

        expect(response.status).toBe('INVESTIGATING');
        expect(response.investigation_notes).toContainEqual(
          expect.objectContaining({
            note: 'Starting investigation',
          })
        );
      });

      it('validates status transitions', async () => {
        const mockIncident = { ...createMockIncidents(1)[0], status: 'CLOSED' };
        await server.seedIncidents([mockIncident]);

        const invalidStatusUpdate = { status: 'NEW' };

        await expect(
          apiClient.patch(`/api/incidents/${mockIncident.id}/status`, invalidStatusUpdate)
        ).rejects.toThrow('400');
      });
    });
  });

  describe('Alert Management API', () => {
    describe('GET /api/alerts', () => {
      it('returns recent alerts', async () => {
        const mockAlerts = createMockAlerts(10);
        await server.seedAlerts(mockAlerts);

        const response = await apiClient.get('/api/alerts');

        expect(response.data).toHaveLength(10);
        expect(response.data[0]).toHaveProperty('id');
        expect(response.data[0]).toHaveProperty('title');
        expect(response.data[0]).toHaveProperty('severity');
      });

      it('filters alerts by severity and status', async () => {
        const mockAlerts = [
          ...createMockAlerts(3).map(a => ({ ...a, severity: 'CRITICAL', status: 'OPEN' })),
          ...createMockAlerts(2).map(a => ({ ...a, severity: 'HIGH', status: 'OPEN' })),
          ...createMockAlerts(2).map(a => ({ ...a, severity: 'CRITICAL', status: 'RESOLVED' })),
        ];
        await server.seedAlerts(mockAlerts);

        const response = await apiClient.get('/api/alerts?severity=CRITICAL&status=OPEN');

        expect(response.data).toHaveLength(3);
        expect(response.data.every(a => a.severity === 'CRITICAL' && a.status === 'OPEN')).toBe(true);
      });
    });

    describe('POST /api/alerts/:id/acknowledge', () => {
      it('acknowledges alert', async () => {
        const mockAlert = { ...createMockAlerts(1)[0], status: 'OPEN' };
        await server.seedAlerts([mockAlert]);

        const response = await apiClient.post(`/api/alerts/${mockAlert.id}/acknowledge`, {
          notes: 'Alert acknowledged by analyst',
        });

        expect(response.status).toBe('ACKNOWLEDGED');
        expect(response.acknowledged_at).toBeDefined();
        expect(response.investigation_notes).toContainEqual(
          expect.objectContaining({
            note: 'Alert acknowledged by analyst',
          })
        );
      });

      it('prevents acknowledging already acknowledged alert', async () => {
        const mockAlert = { ...createMockAlerts(1)[0], status: 'ACKNOWLEDGED' };
        await server.seedAlerts([mockAlert]);

        await expect(
          apiClient.post(`/api/alerts/${mockAlert.id}/acknowledge`)
        ).rejects.toThrow('400');
      });
    });
  });

  describe('Real-time Features', () => {
    describe('WebSocket subscriptions', () => {
      it('receives real-time threat updates', async () => {
        const wsClient = await server.createWebSocketClient(authToken);
        const messages: any[] = [];

        wsClient.on('threat_updated', (data) => {
          messages.push(data);
        });

        // Create a threat to trigger the subscription
        const threatData = {
          name: 'Real-time Threat',
          severity: 'HIGH',
        };
        
        const createdThreat = await apiClient.post('/api/threats', threatData);

        // Wait for WebSocket message
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(messages).toHaveLength(1);
        expect(messages[0].id).toBe(createdThreat.id);
        expect(messages[0].name).toBe(threatData.name);

        await wsClient.close();
      });

      it('receives alert notifications', async () => {
        const wsClient = await server.createWebSocketClient(authToken);
        const notifications: any[] = [];

        wsClient.on('alert_created', (data) => {
          notifications.push(data);
        });

        // Simulate alert creation
        const alertData = {
          title: 'Critical Security Alert',
          severity: 'CRITICAL',
          type: 'MALWARE',
        };

        await server.triggerAlert(alertData);

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(notifications).toHaveLength(1);
        expect(notifications[0].title).toBe(alertData.title);
        expect(notifications[0].severity).toBe(alertData.severity);

        await wsClient.close();
      });
    });

    describe('Server-Sent Events', () => {
      it('streams security events', async (ctx) => {
        const eventStream = await apiClient.getEventStream('/api/events/stream');
        const events: any[] = [];

        eventStream.onmessage = (event) => {
          events.push(JSON.parse(event.data));
        };

        // Trigger some security events
        await server.simulateSecurityEvent({
          type: 'MALWARE_DETECTED',
          severity: 'HIGH',
          source_ip: '192.168.1.100',
        });

        await new Promise(resolve => setTimeout(resolve, 200));

        expect(events).toHaveLength(1);
        expect(events[0].type).toBe('MALWARE_DETECTED');
        expect(events[0].severity).toBe('HIGH');

        eventStream.close();
      });
    });
  });

  describe('Data Export', () => {
    it('exports threats as CSV', async () => {
      const mockThreats = createMockThreats(5);
      await server.seedThreats(mockThreats);

      const response = await apiClient.get('/api/threats/export?format=csv', {
        responseType: 'text',
      });

      expect(typeof response).toBe('string');
      expect(response).toContain('name,description,severity');
      expect(response.split('\n')).toHaveLength(6); // Header + 5 rows
    });

    it('exports incidents as JSON', async () => {
      const mockIncidents = createMockIncidents(3);
      await server.seedIncidents(mockIncidents);

      const response = await apiClient.get('/api/incidents/export?format=json');

      expect(Array.isArray(response)).toBe(true);
      expect(response).toHaveLength(3);
      expect(response[0]).toHaveProperty('id');
      expect(response[0]).toHaveProperty('title');
    });
  });

  describe('Rate Limiting', () => {
    it('applies rate limits to API endpoints', async () => {
      const requests = Array(11).fill(0).map(() => 
        apiClient.get('/api/threats?limit=1')
      );

      const results = await Promise.allSettled(requests);
      const rejectedRequests = results.filter(r => r.status === 'rejected');

      expect(rejectedRequests.length).toBeGreaterThan(0);
      expect(rejectedRequests[0].reason.message).toContain('429');
    });

    it('includes rate limit headers', async () => {
      const response = await apiClient.request('/api/threats', {
        method: 'GET',
        returnHeaders: true,
      });

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('returns consistent error format', async () => {
      try {
        await apiClient.get('/api/threats/non-existent-id');
      } catch (error) {
        expect(error.response.status).toBe(404);
        expect(error.response.data).toEqual({
          error: 'Not Found',
          message: 'Threat not found',
          code: 'THREAT_NOT_FOUND',
          timestamp: expect.any(String),
        });
      }
    });

    it('handles validation errors', async () => {
      try {
        await apiClient.post('/api/threats', {
          name: '', // Invalid empty name
          severity: 'INVALID', // Invalid severity
        });
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toEqual({
          error: 'Validation Error',
          message: expect.any(String),
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: expect.any(String),
            }),
            expect.objectContaining({
              field: 'severity',
              message: expect.any(String),
            }),
          ]),
        });
      }
    });

    it('handles database connection errors gracefully', async () => {
      await server.simulateDatabaseError();

      try {
        await apiClient.get('/api/threats');
      } catch (error) {
        expect(error.response.status).toBe(503);
        expect(error.response.data.error).toBe('Service Unavailable');
      }

      await server.restoreDatabase();
    });
  });

  describe('Caching', () => {
    it('caches GET responses with appropriate headers', async () => {
      const response1 = await apiClient.request('/api/threats', {
        method: 'GET',
        returnHeaders: true,
      });

      expect(response1.headers['cache-control']).toBeDefined();
      expect(response1.headers['etag']).toBeDefined();

      // Second request should return 304 if nothing changed
      const response2 = await apiClient.request('/api/threats', {
        method: 'GET',
        headers: {
          'If-None-Match': response1.headers['etag'],
        },
        returnHeaders: true,
      });

      expect(response2.status).toBe(304);
    });

    it('invalidates cache on data modification', async () => {
      // Get initial data
      const response1 = await apiClient.get('/api/threats');
      const initialCount = response1.data.length;

      // Create new threat
      await apiClient.post('/api/threats', {
        name: 'Cache Invalidation Test',
        severity: 'LOW',
      });

      // Get updated data
      const response2 = await apiClient.get('/api/threats');

      expect(response2.data.length).toBe(initialCount + 1);
    });
  });
});