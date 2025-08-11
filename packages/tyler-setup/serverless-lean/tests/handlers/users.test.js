import { handler } from '../../src/handlers/users.js';
import { mockDynamoDBDocumentClient, mockSESClient } from '../mocks/aws-sdk.js';
import { verifyJwtToken, hashPassword } from '../../src/utils/security.js';
import { logAudit } from '../../src/utils/helpers.js';

// Mock dependencies
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-ses');
jest.mock('../../src/utils/security.js');
jest.mock('../../src/utils/helpers.js');

describe('Users Handler', () => {
  let mockEvent, mockUser, mockAdminUser;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAdminUser = {
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin'
    };

    mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      name: 'Test User',
      role: 'employee',
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastLogin: null,
      permissions: ['read:dashboard', 'read:contractors']
    };

    mockEvent = {
      httpMethod: 'GET',
      path: '/users',
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
    verifyJwtToken.mockResolvedValue(mockAdminUser);
    logAudit.mockResolvedValue();
    hashPassword.mockResolvedValue('hashed-password');

    // Mock environment variables
    process.env.SECRETS_PREFIX = 'test';
    process.env.AWS_REGION = 'us-east-1';
  });

  describe('GET /users', () => {
    it('should return list of users for admin', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [mockUser],
        Count: 1,
        ScannedCount: 1
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.users).toEqual([mockUser]);
      expect(body.data.total).toBe(1);
    });

    it('should filter users by role', async () => {
      mockEvent.queryStringParameters = { role: 'employee' };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [mockUser],
        Count: 1
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.users).toEqual([mockUser]);
    });

    it('should filter users by active status', async () => {
      mockEvent.queryStringParameters = { active: 'true' };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [mockUser],
        Count: 1
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.users[0].isActive).toBe(true);
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

  describe('GET /users/:id', () => {
    beforeEach(() => {
      mockEvent.pathParameters = { id: 'user-123' };
      mockEvent.path = '/users/user-123';
    });

    it('should return user details for admin', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Item: mockUser
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockUser);
    });

    it('should allow users to view their own profile', async () => {
      verifyJwtToken.mockResolvedValue(mockUser);

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Item: mockUser
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });

    it('should deny users access to other user profiles', async () => {
      verifyJwtToken.mockResolvedValue(mockUser);
      mockEvent.pathParameters = { id: 'other-user-123' };

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Insufficient permissions');
    });

    it('should return 404 for non-existent user', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Item: null
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('User not found');
    });
  });

  describe('POST /users', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        email: 'newuser@example.com',
        name: 'New User',
        role: 'employee',
        password: 'SecurePassword123!',
        permissions: ['read:dashboard']
      });
    });

    it('should create new user with invitation email', async () => {
      // Mock checking for existing user (should return empty)
      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Items: [] }) // QueryCommand for existing user check
        .mockResolvedValueOnce({}); // PutCommand for new user

      // Mock SES send email
      mockSESClient.send.mockResolvedValueOnce({
        MessageId: 'message-123'
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('newuser@example.com');
      expect(body.data.name).toBe('New User');
      expect(hashPassword).toHaveBeenCalledWith('SecurePassword123!');
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'USER_CREATED'
      }));
    });

    it('should validate required fields', async () => {
      mockEvent.body = JSON.stringify({
        email: 'incomplete@example.com'
        // Missing required fields
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('validation');
    });

    it('should prevent duplicate users by email', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [mockUser] // Existing user found
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(409);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('User with this email already exists');
    });

    it('should validate email format', async () => {
      mockEvent.body = JSON.stringify({
        email: 'invalid-email',
        name: 'Test User',
        role: 'employee',
        password: 'Password123!'
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('valid email');
    });

    it('should validate password strength', async () => {
      mockEvent.body = JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        role: 'employee',
        password: 'weak'
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('password must be at least');
    });
  });

  describe('PUT /users/:id', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'PUT';
      mockEvent.pathParameters = { id: 'user-123' };
      mockEvent.path = '/users/user-123';
      mockEvent.body = JSON.stringify({
        name: 'Updated User',
        role: 'admin',
        permissions: ['read:dashboard', 'write:users']
      });
    });

    it('should update user details', async () => {
      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Item: mockUser }) // GetCommand
        .mockResolvedValueOnce({}); // UpdateCommand

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'USER_UPDATED'
      }));
    });

    it('should allow users to update their own profile (limited fields)', async () => {
      verifyJwtToken.mockResolvedValue(mockUser);
      mockEvent.body = JSON.stringify({
        name: 'Self Updated Name'
        // Users can't change their own role/permissions
      });

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Item: mockUser })
        .mockResolvedValueOnce({});

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });

    it('should prevent users from elevating their own permissions', async () => {
      verifyJwtToken.mockResolvedValue(mockUser);
      mockEvent.body = JSON.stringify({
        name: 'Hack Attempt',
        role: 'admin',
        permissions: ['write:users']
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('cannot modify role');
    });

    it('should update user password when provided', async () => {
      mockEvent.body = JSON.stringify({
        name: 'Updated User',
        password: 'NewPassword123!'
      });

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Item: mockUser })
        .mockResolvedValueOnce({});

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(hashPassword).toHaveBeenCalledWith('NewPassword123!');
    });
  });

  describe('DELETE /users/:id', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'DELETE';
      mockEvent.pathParameters = { id: 'user-123' };
      mockEvent.path = '/users/user-123';
    });

    it('should soft delete user (deactivate)', async () => {
      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Item: mockUser }) // GetCommand
        .mockResolvedValueOnce({}); // UpdateCommand for soft delete

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'USER_DEACTIVATED'
      }));
    });

    it('should prevent users from deleting themselves', async () => {
      verifyJwtToken.mockResolvedValue(mockUser);

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('cannot delete your own account');
    });

    it('should support hard delete with force parameter', async () => {
      mockEvent.queryStringParameters = { force: 'true' };

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Item: mockUser })
        .mockResolvedValueOnce({}); // DeleteCommand

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'USER_DELETED'
      }));
    });
  });

  describe('POST /users/:id/activate', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'POST';
      mockEvent.path = '/users/user-123/activate';
      mockEvent.pathParameters = { id: 'user-123' };
    });

    it('should activate deactivated user', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Item: deactivatedUser })
        .mockResolvedValueOnce({});

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'USER_ACTIVATED'
      }));
    });
  });

  describe('Authorization & Security', () => {
    it('should require valid JWT token', async () => {
      mockEvent.headers.Authorization = undefined;

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('No authorization token provided');
    });

    it('should reject expired or invalid tokens', async () => {
      verifyJwtToken.mockRejectedValue(new Error('Token expired'));

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Invalid or expired token');
    });

    it('should sanitize password hashes from responses', async () => {
      const userWithPassword = {
        ...mockUser,
        passwordHash: 'sensitive-hash'
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [userWithPassword]
      });

      const result = await handler(mockEvent);
      const body = JSON.parse(result.body);

      // Ensure password hash is not exposed
      expect(body.data.users[0]).not.toHaveProperty('passwordHash');
    });

    it('should log all user management actions', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [mockUser]
      });

      await handler(mockEvent);

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'USERS_LIST_ACCESSED',
        userId: mockAdminUser.id
      }));
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

    it('should handle SES email sending failures', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        email: 'newuser@example.com',
        name: 'New User',
        role: 'employee',
        password: 'Password123!'
      });

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Items: [] })
        .mockResolvedValueOnce({});

      mockSESClient.send.mockRejectedValue(new Error('SES quota exceeded'));

      const result = await handler(mockEvent);

      // Should still create user even if email fails
      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.emailSent).toBe(false);
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

  describe('Input Validation', () => {
    it('should validate user roles', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        role: 'invalid-role',
        password: 'Password123!'
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('role must be one of');
    });

    it('should validate permission format', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        role: 'employee',
        password: 'Password123!',
        permissions: ['invalid-permission']
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('invalid permission format');
    });
  });
});
