import { handler } from '../../src/handlers/contractors.js';
import { mockDynamoDBDocumentClient } from '../mocks/aws-sdk.js';
import { verifyJwtToken } from '../../src/utils/security.js';
import { logAudit } from '../../src/utils/helpers.js';

// Mock dependencies
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('../../src/utils/security.js');
jest.mock('../../src/utils/helpers.js');

describe('Contractors Handler', () => {
  let mockEvent, mockContractor, mockUser;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin'
    };

    mockContractor = {
      id: 'contractor-123',
      name: 'John Contractor',
      email: 'john@contractor.com',
      phone: '+1234567890',
      company: 'Contractor LLC',
      skills: ['plumbing', 'electrical'],
      status: 'active',
      rating: 4.5,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    mockEvent = {
      httpMethod: 'GET',
      path: '/contractors',
      headers: {
        Authorization: 'Bearer valid-token',
        'User-Agent': 'test-agent',
        'X-Forwarded-For': '192.168.1.1'
      },
      queryStringParameters: null,
      pathParameters: null,
      body: null
    };

    // Setup default mocks
    verifyJwtToken.mockResolvedValue(mockUser);
    logAudit.mockResolvedValue();

    // Mock environment variables
    process.env.SECRETS_PREFIX = 'test';
    process.env.AWS_REGION = 'us-east-1';
  });

  describe('GET /contractors', () => {
    it('should return list of contractors for admin', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [mockContractor],
        Count: 1,
        ScannedCount: 1
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.contractors).toEqual([mockContractor]);
      expect(body.data.total).toBe(1);
    });

    it('should filter contractors by status', async () => {
      mockEvent.queryStringParameters = { status: 'active' };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [mockContractor],
        Count: 1
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.contractors).toEqual([mockContractor]);
    });

    it('should support pagination', async () => {
      mockEvent.queryStringParameters = { page: '2', limit: '10' };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [mockContractor],
        Count: 1,
        LastEvaluatedKey: { id: 'contractor-123' }
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.hasMore).toBe(true);
    });

    it('should deny access for non-admin users', async () => {
      verifyJwtToken.mockResolvedValue({ ...mockUser, role: 'employee' });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Insufficient permissions');
    });
  });

  describe('GET /contractors/:id', () => {
    beforeEach(() => {
      mockEvent.pathParameters = { id: 'contractor-123' };
      mockEvent.path = '/contractors/contractor-123';
    });

    it('should return contractor details', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Item: mockContractor
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockContractor);
    });

    it('should return 404 for non-existent contractor', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Item: null
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Contractor not found');
    });
  });

  describe('POST /contractors', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        name: 'Jane Contractor',
        email: 'jane@contractor.com',
        phone: '+1987654321',
        company: 'Jane Contractors Inc',
        skills: ['painting', 'drywall']
      });
    });

    it('should create new contractor', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({}); // PutCommand

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('Jane Contractor');
      expect(body.data.status).toBe('pending');
    });

    it('should validate required fields', async () => {
      mockEvent.body = JSON.stringify({
        name: 'Incomplete Contractor'
        // Missing required fields
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('validation');
    });

    it('should prevent duplicate contractors by email', async () => {
      // First, mock the check for existing contractor
      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({
          Items: [mockContractor] // Existing contractor found
        });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(409);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Contractor with this email already exists');
    });
  });

  describe('PUT /contractors/:id', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'PUT';
      mockEvent.pathParameters = { id: 'contractor-123' };
      mockEvent.path = '/contractors/contractor-123';
      mockEvent.body = JSON.stringify({
        name: 'Updated Contractor',
        phone: '+1999999999',
        status: 'active'
      });
    });

    it('should update existing contractor', async () => {
      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Item: mockContractor }) // GetCommand
        .mockResolvedValueOnce({}); // UpdateCommand

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CONTRACTOR_UPDATED'
      }));
    });

    it('should return 404 for non-existent contractor', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Item: null
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Contractor not found');
    });
  });

  describe('DELETE /contractors/:id', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'DELETE';
      mockEvent.pathParameters = { id: 'contractor-123' };
      mockEvent.path = '/contractors/contractor-123';
    });

    it('should soft delete contractor', async () => {
      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Item: mockContractor }) // GetCommand
        .mockResolvedValueOnce({}); // UpdateCommand for soft delete

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'CONTRACTOR_DELETED'
      }));
    });
  });

  describe('Authorization', () => {
    it('should reject requests without token', async () => {
      mockEvent.headers.Authorization = undefined;

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('No authorization token provided');
    });

    it('should reject invalid tokens', async () => {
      verifyJwtToken.mockRejectedValue(new Error('Invalid token'));

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Invalid or expired token');
    });
  });

  describe('Error Handling', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      mockDynamoDBDocumentClient.send.mockRejectedValue(
        new Error('DynamoDB service unavailable')
      );

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });

    it('should handle malformed request body', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = 'invalid-json';

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits for contractor operations', async () => {
      // Simulate rapid requests
      const promises = Array(20).fill().map(() => handler(mockEvent));
      const results = await Promise.all(promises);

      const rateLimitedResponses = results.filter(r => r.statusCode === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
