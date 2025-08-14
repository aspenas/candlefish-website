import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/v1/temporal/connections/route';
import { GET as GET_TEST } from '@/app/api/v1/temporal/connections/[id]/test/route';
import { ProductionTestFactory } from '../../factories/productionFactory';
import type { TemporalConnection } from '@/lib/types/production';

// Mock external dependencies
jest.mock('@/lib/services/secrets-manager', () => ({
  getSecret: jest.fn(),
  createSecret: jest.fn(),
  updateSecret: jest.fn(),
  deleteSecret: jest.fn(),
}));

jest.mock('@/lib/db/prisma', () => ({
  temporalConnection: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock temporal client
jest.mock('@temporal/client', () => ({
  Connection: {
    connect: jest.fn(),
  },
  WorkflowService: jest.fn(),
}));

describe('/api/v1/temporal/connections', () => {
  let mockConnections: TemporalConnection[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnections = ProductionTestFactory.createTemporalConnections(3);
  });

  describe('GET /api/v1/temporal/connections', () => {
    it('should return all temporal connections', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.temporalConnection.findMany.mockResolvedValue(mockConnections);

      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(3);
      expect(data.data[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        namespace: expect.any(String),
        endpoint: expect.any(String),
        status: expect.stringMatching(/^(connected|disconnected|testing|error)$/),
      });
    });

    it('should handle pagination parameters', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.temporalConnection.findMany.mockResolvedValue(mockConnections.slice(0, 2));

      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections?page=1&limit=2');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(mockPrisma.temporalConnection.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 2,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.temporalConnection.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to fetch connections');
    });
  });

  describe('POST /api/v1/temporal/connections', () => {
    it('should create a new temporal connection', async () => {
      const newConnection = ProductionTestFactory.createTemporalConnection();
      const mockPrisma = require('@/lib/db/prisma');
      const mockSecretsManager = require('@/lib/services/secrets-manager');

      mockPrisma.temporalConnection.create.mockResolvedValue(newConnection);
      mockSecretsManager.createSecret.mockResolvedValue({ success: true });

      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections', {
        method: 'POST',
        body: JSON.stringify({
          name: newConnection.name,
          namespace: newConnection.namespace,
          endpoint: newConnection.endpoint,
          tls: newConnection.tls,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        name: newConnection.name,
        namespace: newConnection.namespace,
        endpoint: newConnection.endpoint,
      });
      expect(mockSecretsManager.createSecret).toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
          namespace: '',
          endpoint: '',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('validation');
    });

    it('should reject invalid endpoint formats', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Connection',
          namespace: 'test',
          endpoint: 'invalid-endpoint',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('endpoint');
    });

    it('should handle SQL injection attempts', async () => {
      const sqlInjectionPayload = "'; DROP TABLE temporalConnection; --";
      
      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections', {
        method: 'POST',
        body: JSON.stringify({
          name: sqlInjectionPayload,
          namespace: 'test',
          endpoint: 'localhost:7233',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      // Should sanitize or reject the malicious input
    });

    it('should enforce rate limiting', async () => {
      const requests = Array.from({ length: 10 }, () => 
        new NextRequest('http://localhost:3000/api/v1/temporal/connections', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Connection',
            namespace: 'test',
            endpoint: 'localhost:7233',
          }),
          headers: { 'X-Forwarded-For': '192.168.1.1' },
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/v1/temporal/connections/[id]', () => {
    it('should update an existing connection', async () => {
      const existingConnection = mockConnections[0];
      const updatedData = {
        name: 'Updated Connection Name',
        namespace: 'updated-namespace',
      };

      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.temporalConnection.findUnique.mockResolvedValue(existingConnection);
      mockPrisma.temporalConnection.update.mockResolvedValue({
        ...existingConnection,
        ...updatedData,
      });

      const request = new NextRequest(`http://localhost:3000/api/v1/temporal/connections/${existingConnection.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData),
      });

      const response = await PUT(request, { params: { id: existingConnection.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(updatedData.name);
      expect(data.data.namespace).toBe(updatedData.namespace);
    });

    it('should return 404 for non-existent connection', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.temporalConnection.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections/non-existent-id', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await PUT(request, { params: { id: 'non-existent-id' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });
  });

  describe('DELETE /api/v1/temporal/connections/[id]', () => {
    it('should delete an existing connection', async () => {
      const existingConnection = mockConnections[0];
      const mockPrisma = require('@/lib/db/prisma');
      const mockSecretsManager = require('@/lib/services/secrets-manager');

      mockPrisma.temporalConnection.findUnique.mockResolvedValue(existingConnection);
      mockPrisma.temporalConnection.delete.mockResolvedValue(existingConnection);
      mockSecretsManager.deleteSecret.mockResolvedValue({ success: true });

      const request = new NextRequest(`http://localhost:3000/api/v1/temporal/connections/${existingConnection.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: existingConnection.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSecretsManager.deleteSecret).toHaveBeenCalled();
    });

    it('should prevent deletion of connections with active workflows', async () => {
      const existingConnection = mockConnections[0];
      const mockPrisma = require('@/lib/db/prisma');

      mockPrisma.temporalConnection.findUnique.mockResolvedValue(existingConnection);
      mockPrisma.temporalConnection.delete.mockRejectedValue(
        new Error('Cannot delete connection with active workflows')
      );

      const request = new NextRequest(`http://localhost:3000/api/v1/temporal/connections/${existingConnection.id}`, {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: existingConnection.id } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('active workflows');
    });
  });

  describe('GET /api/v1/temporal/connections/[id]/test', () => {
    it('should test connection successfully', async () => {
      const connection = mockConnections[0];
      const mockTemporal = require('@temporal/client');
      const mockConnection = {
        close: jest.fn(),
        workflowService: {
          getSystemInfo: jest.fn().mockResolvedValue({ 
            serverVersion: '1.20.0',
            capabilities: {} 
          }),
        },
      };

      mockTemporal.Connection.connect.mockResolvedValue(mockConnection);

      const request = new NextRequest(`http://localhost:3000/api/v1/temporal/connections/${connection.id}/test`);
      const response = await GET_TEST(request, { params: { id: connection.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('connected');
      expect(data.data.serverVersion).toBe('1.20.0');
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle connection timeouts', async () => {
      const connection = mockConnections[0];
      const mockTemporal = require('@temporal/client');

      mockTemporal.Connection.connect.mockRejectedValue(new Error('Connection timeout'));

      const request = new NextRequest(`http://localhost:3000/api/v1/temporal/connections/${connection.id}/test`);
      const response = await GET_TEST(request, { params: { id: connection.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('error');
      expect(data.data.error).toContain('timeout');
    });

    it('should handle TLS certificate validation errors', async () => {
      const connection = ProductionTestFactory.createTemporalConnection({
        tls: { enabled: true, cert: 'invalid-cert', key: 'invalid-key' }
      });
      const mockTemporal = require('@temporal/client');

      mockTemporal.Connection.connect.mockRejectedValue(new Error('TLS certificate validation failed'));

      const request = new NextRequest(`http://localhost:3000/api/v1/temporal/connections/${connection.id}/test`);
      const response = await GET_TEST(request, { params: { id: connection.id } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.status).toBe('error');
      expect(data.data.error).toContain('TLS');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections', {
        headers: {}, // No auth header
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should require appropriate permissions for write operations', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({ 
            permissions: ['read:temporal'] // Missing write permission
          }),
        },
        body: JSON.stringify({
          name: 'Test Connection',
          namespace: 'test',
          endpoint: 'localhost:7233',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('should accept valid JWT tokens with correct permissions', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.temporalConnection.create.mockResolvedValue(
        ProductionTestFactory.createTemporalConnection()
      );

      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({ 
            permissions: ['write:temporal', 'admin:all']
          }),
        },
        body: JSON.stringify({
          name: 'Test Connection',
          namespace: 'test',
          endpoint: 'localhost:7233',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
    });

    it('should reject expired JWT tokens', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({}, true), // Expired token
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation and Security', () => {
    it('should sanitize XSS attempts in input fields', async () => {
      const xssPayload = "<script>alert('XSS')</script>";
      
      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({ 
            permissions: ['write:temporal']
          }),
        },
        body: JSON.stringify({
          name: xssPayload,
          namespace: 'test',
          endpoint: 'localhost:7233',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      // Should reject or sanitize XSS payload
    });

    it('should validate input length limits', async () => {
      const longString = 'a'.repeat(1000);
      
      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({ 
            permissions: ['write:temporal']
          }),
        },
        body: JSON.stringify({
          name: longString,
          namespace: longString,
          endpoint: 'localhost:7233',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('length');
    });

    it('should validate endpoint format and prevent SSRF attacks', async () => {
      const ssrfPayloads = [
        'http://169.254.169.254/latest/meta-data', // AWS metadata
        'http://localhost:22/ssh', // SSH port
        'file:///etc/passwd', // File protocol
        'ftp://internal-server/secrets', // FTP protocol
      ];

      for (const endpoint of ssrfPayloads) {
        const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({ 
              permissions: ['write:temporal']
            }),
          },
          body: JSON.stringify({
            name: 'Test Connection',
            namespace: 'test',
            endpoint,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.temporalConnection.findMany.mockResolvedValue(mockConnections);

      const concurrentRequests = Array.from({ length: 50 }, () => 
        new NextRequest('http://localhost:3000/api/v1/temporal/connections', {
          headers: {
            'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({ 
              permissions: ['read:temporal']
            }),
          },
        })
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests.map(req => GET(req)));
      const endTime = Date.now();

      const successfulResponses = responses.filter(res => res.status === 200);
      expect(successfulResponses.length).toBe(50);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large response datasets efficiently', async () => {
      const largeDataset = ProductionTestFactory.createTemporalConnections(1000);
      const mockPrisma = require('@/lib/db/prisma');
      mockPrisma.temporalConnection.findMany.mockResolvedValue(largeDataset);

      const request = new NextRequest('http://localhost:3000/api/v1/temporal/connections?limit=1000', {
        headers: {
          'Authorization': 'Bearer ' + global.securityTestHelpers.createMockJWT({ 
            permissions: ['read:temporal']
          }),
        },
      });

      const startTime = Date.now();
      const response = await GET(request);
      const endTime = Date.now();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});