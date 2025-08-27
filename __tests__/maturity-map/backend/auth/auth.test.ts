import { AuthService } from '../../../../services/auth.service';
import { JWTService } from '../../../../services/jwt.service';
import { DatabaseService } from '../../../../services/database.service';
import { BiometricService } from '../../../../services/biometric.service';
import { 
  createUserFactory, 
  createOrganizationFactory,
  createSessionFactory
} from '../../../utils/test-data-factories';

// Mock dependencies
jest.mock('../../../../services/jwt.service');
jest.mock('../../../../services/database.service');
jest.mock('../../../../services/biometric.service');

describe('Authentication and Authorization', () => {
  let authService: AuthService;
  let mockJWTService: jest.Mocked<JWTService>;
  let mockDatabase: jest.Mocked<DatabaseService>;
  let mockBiometricService: jest.Mocked<BiometricService>;

  beforeEach(() => {
    mockJWTService = new JWTService() as jest.Mocked<JWTService>;
    mockDatabase = new DatabaseService() as jest.Mocked<DatabaseService>;
    mockBiometricService = new BiometricService() as jest.Mocked<BiometricService>;
    
    authService = new AuthService(mockJWTService, mockDatabase, mockBiometricService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('JWT Authentication', () => {
    describe('login', () => {
      it('should authenticate user with email and password', async () => {
        // Arrange
        const loginInput = {
          email: 'user@example.com',
          password: 'securePassword123'
        };

        const mockUser = createUserFactory({
          email: 'user@example.com',
          passwordHash: '$2b$10$hashedPassword',
          isActive: true,
          organizationId: 'org-123'
        });

        const mockOrganization = createOrganizationFactory({
          id: 'org-123',
          isActive: true,
          subscriptionStatus: 'ACTIVE'
        });

        mockDatabase.findOne.mockResolvedValueOnce(mockUser);
        mockDatabase.findById.mockResolvedValueOnce(mockOrganization);
        mockJWTService.sign.mockResolvedValue('jwt.token.here');
        
        // Mock password verification
        jest.spyOn(authService, 'verifyPassword').mockResolvedValue(true);

        // Act
        const result = await authService.login(loginInput);

        // Assert
        expect(result).toEqual({
          user: expect.objectContaining({
            id: mockUser.id,
            email: mockUser.email,
            organizationId: mockUser.organizationId
          }),
          token: 'jwt.token.here',
          refreshToken: expect.any(String),
          expiresAt: expect.any(String)
        });

        expect(mockJWTService.sign).toHaveBeenCalledWith({
          userId: mockUser.id,
          organizationId: mockUser.organizationId,
          role: mockUser.role,
          permissions: mockUser.permissions
        });
      });

      it('should reject invalid credentials', async () => {
        // Arrange
        const loginInput = {
          email: 'user@example.com',
          password: 'wrongPassword'
        };

        mockDatabase.findOne.mockResolvedValueOnce(null); // User not found

        // Act & Assert
        await expect(authService.login(loginInput))
          .rejects
          .toThrow('Invalid credentials');

        expect(mockJWTService.sign).not.toHaveBeenCalled();
      });

      it('should reject inactive users', async () => {
        // Arrange
        const loginInput = {
          email: 'user@example.com',
          password: 'password123'
        };

        const mockUser = createUserFactory({
          email: 'user@example.com',
          isActive: false // Inactive user
        });

        mockDatabase.findOne.mockResolvedValueOnce(mockUser);

        // Act & Assert
        await expect(authService.login(loginInput))
          .rejects
          .toThrow('Account is deactivated');
      });

      it('should reject users from inactive organizations', async () => {
        // Arrange
        const loginInput = {
          email: 'user@example.com',
          password: 'password123'
        };

        const mockUser = createUserFactory({
          email: 'user@example.com',
          isActive: true,
          organizationId: 'org-123'
        });

        const mockOrganization = createOrganizationFactory({
          id: 'org-123',
          isActive: false // Inactive organization
        });

        mockDatabase.findOne.mockResolvedValueOnce(mockUser);
        mockDatabase.findById.mockResolvedValueOnce(mockOrganization);
        jest.spyOn(authService, 'verifyPassword').mockResolvedValue(true);

        // Act & Assert
        await expect(authService.login(loginInput))
          .rejects
          .toThrow('Organization is inactive');
      });
    });

    describe('verifyToken', () => {
      it('should verify valid JWT token', async () => {
        // Arrange
        const token = 'valid.jwt.token';
        const mockPayload = {
          userId: 'user-1',
          organizationId: 'org-123',
          role: 'ADMIN',
          permissions: ['READ_ASSESSMENTS', 'WRITE_ASSESSMENTS']
        };

        mockJWTService.verify.mockResolvedValue(mockPayload);

        const mockUser = createUserFactory({
          id: 'user-1',
          organizationId: 'org-123',
          role: 'ADMIN',
          isActive: true
        });

        mockDatabase.findById.mockResolvedValueOnce(mockUser);

        // Act
        const result = await authService.verifyToken(token);

        // Assert
        expect(result).toEqual(mockUser);
        expect(mockJWTService.verify).toHaveBeenCalledWith(token);
      });

      it('should reject expired tokens', async () => {
        // Arrange
        const expiredToken = 'expired.jwt.token';
        
        mockJWTService.verify.mockRejectedValue(new Error('Token expired'));

        // Act & Assert
        await expect(authService.verifyToken(expiredToken))
          .rejects
          .toThrow('Token expired');
      });

      it('should reject tokens for deactivated users', async () => {
        // Arrange
        const token = 'valid.jwt.token';
        const mockPayload = { userId: 'user-1' };

        mockJWTService.verify.mockResolvedValue(mockPayload);

        const mockUser = createUserFactory({
          id: 'user-1',
          isActive: false // Deactivated
        });

        mockDatabase.findById.mockResolvedValueOnce(mockUser);

        // Act & Assert
        await expect(authService.verifyToken(token))
          .rejects
          .toThrow('User account is deactivated');
      });
    });

    describe('refreshToken', () => {
      it('should generate new tokens with valid refresh token', async () => {
        // Arrange
        const refreshToken = 'valid.refresh.token';
        const mockSession = createSessionFactory({
          refreshToken,
          userId: 'user-1',
          isActive: true,
          expiresAt: new Date(Date.now() + 86400000) // 24 hours from now
        });

        const mockUser = createUserFactory({
          id: 'user-1',
          isActive: true
        });

        mockDatabase.findOne.mockResolvedValueOnce(mockSession);
        mockDatabase.findById.mockResolvedValueOnce(mockUser);
        mockJWTService.sign.mockResolvedValue('new.jwt.token');

        // Act
        const result = await authService.refreshToken(refreshToken);

        // Assert
        expect(result).toEqual({
          token: 'new.jwt.token',
          refreshToken: expect.any(String),
          expiresAt: expect.any(String)
        });

        expect(mockDatabase.update).toHaveBeenCalledWith('session', mockSession.id, {
          refreshToken: expect.any(String),
          expiresAt: expect.any(Date)
        });
      });

      it('should reject expired refresh tokens', async () => {
        // Arrange
        const expiredRefreshToken = 'expired.refresh.token';
        const mockSession = createSessionFactory({
          refreshToken: expiredRefreshToken,
          isActive: true,
          expiresAt: new Date(Date.now() - 86400000) // 24 hours ago
        });

        mockDatabase.findOne.mockResolvedValueOnce(mockSession);

        // Act & Assert
        await expect(authService.refreshToken(expiredRefreshToken))
          .rejects
          .toThrow('Refresh token expired');
      });
    });
  });

  describe('Biometric Authentication', () => {
    describe('enableBiometric', () => {
      it('should enable biometric authentication for user', async () => {
        // Arrange
        const input = {
          userId: 'user-1',
          biometricData: 'encrypted-biometric-template',
          deviceId: 'device-123'
        };

        const mockUser = createUserFactory({
          id: 'user-1',
          biometricEnabled: false
        });

        mockDatabase.findById.mockResolvedValueOnce(mockUser);
        mockBiometricService.storeBiometricTemplate.mockResolvedValue({
          templateId: 'template-123',
          isValid: true
        });

        // Act
        const result = await authService.enableBiometric(input);

        // Assert
        expect(result.success).toBe(true);
        expect(mockDatabase.update).toHaveBeenCalledWith('user', 'user-1', {
          biometricEnabled: true,
          biometricTemplateId: 'template-123'
        });

        expect(mockDatabase.create).toHaveBeenCalledWith('biometric_device', {
          userId: 'user-1',
          deviceId: 'device-123',
          isActive: true,
          registeredAt: expect.any(String)
        });
      });

      it('should validate biometric template quality', async () => {
        // Arrange
        const input = {
          userId: 'user-1',
          biometricData: 'poor-quality-template',
          deviceId: 'device-123'
        };

        mockBiometricService.storeBiometricTemplate.mockResolvedValue({
          templateId: null,
          isValid: false,
          error: 'Template quality too low'
        });

        // Act & Assert
        await expect(authService.enableBiometric(input))
          .rejects
          .toThrow('Template quality too low');
      });
    });

    describe('authenticateWithBiometric', () => {
      it('should authenticate user with valid biometric data', async () => {
        // Arrange
        const input = {
          biometricData: 'user-biometric-sample',
          deviceId: 'device-123'
        };

        const mockUser = createUserFactory({
          id: 'user-1',
          biometricEnabled: true,
          biometricTemplateId: 'template-123'
        });

        mockBiometricService.verifyBiometric.mockResolvedValue({
          isMatch: true,
          confidence: 0.95,
          userId: 'user-1'
        });

        mockDatabase.findById.mockResolvedValueOnce(mockUser);
        mockJWTService.sign.mockResolvedValue('biometric.jwt.token');

        // Act
        const result = await authService.authenticateWithBiometric(input);

        // Assert
        expect(result).toEqual({
          user: expect.objectContaining({ id: 'user-1' }),
          token: 'biometric.jwt.token',
          authMethod: 'BIOMETRIC'
        });

        expect(mockBiometricService.verifyBiometric).toHaveBeenCalledWith({
          template: input.biometricData,
          storedTemplateId: 'template-123'
        });
      });

      it('should reject low confidence biometric matches', async () => {
        // Arrange
        const input = {
          biometricData: 'unclear-biometric-sample',
          deviceId: 'device-123'
        };

        mockBiometricService.verifyBiometric.mockResolvedValue({
          isMatch: true,
          confidence: 0.65, // Below threshold (0.8)
          userId: 'user-1'
        });

        // Act & Assert
        await expect(authService.authenticateWithBiometric(input))
          .rejects
          .toThrow('Biometric confidence too low');
      });
    });
  });

  describe('Authorization', () => {
    describe('hasPermission', () => {
      it('should allow access with correct permissions', () => {
        // Arrange
        const user = createUserFactory({
          role: 'ASSESSOR',
          permissions: ['READ_ASSESSMENTS', 'WRITE_ASSESSMENTS']
        });

        // Act & Assert
        expect(authService.hasPermission(user, 'READ_ASSESSMENTS')).toBe(true);
        expect(authService.hasPermission(user, 'WRITE_ASSESSMENTS')).toBe(true);
        expect(authService.hasPermission(user, 'DELETE_ASSESSMENTS')).toBe(false);
      });

      it('should grant all permissions to admin users', () => {
        // Arrange
        const adminUser = createUserFactory({
          role: 'ADMIN',
          permissions: ['READ_ASSESSMENTS'] // Limited explicit permissions
        });

        // Act & Assert
        expect(authService.hasPermission(adminUser, 'DELETE_ASSESSMENTS')).toBe(true);
        expect(authService.hasPermission(adminUser, 'MANAGE_ORGANIZATION')).toBe(true);
      });
    });

    describe('canAccessOrganization', () => {
      it('should allow access to users own organization', () => {
        // Arrange
        const user = createUserFactory({
          organizationId: 'org-123'
        });

        // Act & Assert
        expect(authService.canAccessOrganization(user, 'org-123')).toBe(true);
        expect(authService.canAccessOrganization(user, 'org-456')).toBe(false);
      });

      it('should allow super admins to access any organization', () => {
        // Arrange
        const superAdmin = createUserFactory({
          role: 'SUPER_ADMIN',
          organizationId: 'org-123'
        });

        // Act & Assert
        expect(authService.canAccessOrganization(superAdmin, 'org-456')).toBe(true);
        expect(authService.canAccessOrganization(superAdmin, 'org-789')).toBe(true);
      });
    });

    describe('canAccessAssessment', () => {
      it('should allow access to organization members', async () => {
        // Arrange
        const user = createUserFactory({
          organizationId: 'org-123',
          role: 'ASSESSOR'
        });

        const mockAssessment = createAssessmentFactory({
          id: 'assessment-1',
          organizationId: 'org-123'
        });

        mockDatabase.findById.mockResolvedValueOnce(mockAssessment);

        // Act
        const result = await authService.canAccessAssessment(user, 'assessment-1');

        // Assert
        expect(result).toBe(true);
      });

      it('should deny access to users from different organizations', async () => {
        // Arrange
        const user = createUserFactory({
          organizationId: 'org-123',
          role: 'ASSESSOR'
        });

        const mockAssessment = createAssessmentFactory({
          id: 'assessment-1',
          organizationId: 'org-456' // Different organization
        });

        mockDatabase.findById.mockResolvedValueOnce(mockAssessment);

        // Act
        const result = await authService.canAccessAssessment(user, 'assessment-1');

        // Assert
        expect(result).toBe(false);
      });

      it('should allow read-only access for viewers', async () => {
        // Arrange
        const viewer = createUserFactory({
          organizationId: 'org-123',
          role: 'VIEWER',
          permissions: ['READ_ASSESSMENTS']
        });

        const mockAssessment = createAssessmentFactory({
          id: 'assessment-1',
          organizationId: 'org-123'
        });

        mockDatabase.findById.mockResolvedValueOnce(mockAssessment);

        // Act
        const canRead = await authService.canAccessAssessment(viewer, 'assessment-1', 'READ');
        const canWrite = await authService.canAccessAssessment(viewer, 'assessment-1', 'WRITE');

        // Assert
        expect(canRead).toBe(true);
        expect(canWrite).toBe(false);
      });
    });
  });

  describe('Session Management', () => {
    describe('createSession', () => {
      it('should create new user session', async () => {
        // Arrange
        const userId = 'user-1';
        const deviceInfo = {
          userAgent: 'Mozilla/5.0...',
          ipAddress: '192.168.1.1',
          deviceId: 'device-123'
        };

        const mockSession = createSessionFactory({
          userId,
          deviceInfo,
          isActive: true
        });

        mockDatabase.create.mockResolvedValueOnce(mockSession);

        // Act
        const result = await authService.createSession(userId, deviceInfo);

        // Assert
        expect(result).toEqual(mockSession);
        expect(mockDatabase.create).toHaveBeenCalledWith('session', {
          userId,
          refreshToken: expect.any(String),
          deviceInfo,
          isActive: true,
          createdAt: expect.any(String),
          expiresAt: expect.any(Date)
        });
      });
    });

    describe('invalidateSession', () => {
      it('should deactivate user session', async () => {
        // Arrange
        const sessionId = 'session-1';

        // Act
        await authService.invalidateSession(sessionId);

        // Assert
        expect(mockDatabase.update).toHaveBeenCalledWith('session', sessionId, {
          isActive: false,
          terminatedAt: expect.any(String)
        });
      });
    });

    describe('invalidateAllSessions', () => {
      it('should deactivate all user sessions', async () => {
        // Arrange
        const userId = 'user-1';

        // Act
        await authService.invalidateAllSessions(userId);

        // Assert
        expect(mockDatabase.updateMany).toHaveBeenCalledWith('session', 
          { userId, isActive: true },
          { 
            isActive: false,
            terminatedAt: expect.any(String)
          }
        );
      });
    });
  });

  describe('Security Features', () => {
    describe('Rate Limiting', () => {
      it('should enforce login rate limits', async () => {
        // Arrange
        const email = 'user@example.com';
        const rateLimitKey = `login_attempts:${email}`;

        // Simulate multiple failed attempts
        mockDatabase.get.mockResolvedValue({ attempts: 5, lastAttempt: Date.now() });

        // Act & Assert
        await expect(authService.login({ email, password: 'wrong' }))
          .rejects
          .toThrow('Too many login attempts. Please try again later.');
      });

      it('should reset rate limit after successful login', async () => {
        // Arrange
        const loginInput = {
          email: 'user@example.com',
          password: 'correctPassword'
        };

        const mockUser = createUserFactory({
          email: loginInput.email,
          isActive: true
        });

        mockDatabase.findOne.mockResolvedValueOnce(mockUser);
        mockDatabase.findById.mockResolvedValueOnce(createOrganizationFactory());
        mockJWTService.sign.mockResolvedValue('jwt.token');
        jest.spyOn(authService, 'verifyPassword').mockResolvedValue(true);

        // Act
        await authService.login(loginInput);

        // Assert - Rate limit should be cleared
        expect(mockDatabase.delete).toHaveBeenCalledWith(`login_attempts:${loginInput.email}`);
      });
    });

    describe('Password Security', () => {
      it('should enforce password complexity requirements', () => {
        // Act & Assert
        expect(authService.validatePassword('weak')).toBe(false);
        expect(authService.validatePassword('Strong123!')).toBe(true);
        expect(authService.validatePassword('NoNumbers!')).toBe(false);
        expect(authService.validatePassword('nonumbers123')).toBe(false);
      });

      it('should securely hash passwords', async () => {
        // Arrange
        const password = 'securePassword123!';

        // Act
        const hashedPassword = await authService.hashPassword(password);

        // Assert
        expect(hashedPassword).toMatch(/^\$2b\$10\$/); // bcrypt format
        expect(hashedPassword).not.toBe(password);
        expect(await authService.verifyPassword(password, hashedPassword)).toBe(true);
      });
    });

    describe('Token Security', () => {
      it('should use secure JWT configuration', () => {
        // Arrange
        const payload = { userId: 'user-1' };

        // Act
        authService.generateToken(payload);

        // Assert
        expect(mockJWTService.sign).toHaveBeenCalledWith(
          payload,
          expect.objectContaining({
            expiresIn: '15m', // Short-lived access tokens
            algorithm: 'RS256', // Asymmetric algorithm
            issuer: expect.any(String),
            audience: expect.any(String)
          })
        );
      });

      it('should implement token blacklisting', async () => {
        // Arrange
        const token = 'valid.jwt.token';

        // Act
        await authService.blacklistToken(token);

        // Assert
        expect(mockDatabase.create).toHaveBeenCalledWith('blacklisted_token', {
          token,
          blacklistedAt: expect.any(String),
          expiresAt: expect.any(Date)
        });
      });
    });
  });

  describe('Audit Logging', () => {
    it('should log authentication events', async () => {
      // Arrange
      const loginInput = {
        email: 'user@example.com',
        password: 'password123',
        deviceInfo: { userAgent: 'Mozilla...', ipAddress: '192.168.1.1' }
      };

      const mockUser = createUserFactory({
        email: loginInput.email,
        isActive: true
      });

      mockDatabase.findOne.mockResolvedValueOnce(mockUser);
      mockDatabase.findById.mockResolvedValueOnce(createOrganizationFactory());
      mockJWTService.sign.mockResolvedValue('jwt.token');
      jest.spyOn(authService, 'verifyPassword').mockResolvedValue(true);

      // Act
      await authService.login(loginInput);

      // Assert
      expect(mockDatabase.create).toHaveBeenCalledWith('audit_log', {
        userId: mockUser.id,
        action: 'LOGIN_SUCCESS',
        details: {
          email: loginInput.email,
          ipAddress: loginInput.deviceInfo?.ipAddress,
          userAgent: loginInput.deviceInfo?.userAgent
        },
        timestamp: expect.any(String)
      });
    });

    it('should log failed authentication attempts', async () => {
      // Arrange
      const loginInput = {
        email: 'user@example.com',
        password: 'wrongPassword',
        deviceInfo: { ipAddress: '192.168.1.1' }
      };

      mockDatabase.findOne.mockResolvedValueOnce(null); // User not found

      // Act
      try {
        await authService.login(loginInput);
      } catch (error) {
        // Expected to throw
      }

      // Assert
      expect(mockDatabase.create).toHaveBeenCalledWith('audit_log', {
        action: 'LOGIN_FAILED',
        details: {
          email: loginInput.email,
          reason: 'Invalid credentials',
          ipAddress: loginInput.deviceInfo?.ipAddress
        },
        timestamp: expect.any(String)
      });
    });
  });
});