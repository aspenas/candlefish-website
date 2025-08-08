import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { AuthService } from '../../../services/auth/auth.service';
import { UserService } from '../../../services/user/user.service';
import { OrganizationService } from '../../../services/organization/organization.service';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { User, Organization } from '../../../types/entities';

describe('AuthService', () => {
  let authService: AuthService;
  let userService: DeepMocked<UserService>;
  let organizationService: DeepMocked<OrganizationService>;
  let jwtService: DeepMocked<JwtService>;
  let configService: DeepMocked<ConfigService>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    organizationId: 'org-123',
    role: 'USER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrganization: Organization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    plan: 'PREMIUM',
    maxUsers: 100,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: createMock<UserService>(),
        },
        {
          provide: OrganizationService,
          useValue: createMock<OrganizationService>(),
        },
        {
          provide: JwtService,
          useValue: createMock<JwtService>(),
        },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>(),
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    organizationService = module.get(OrganizationService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  describe('validateUser', () => {
    it('should return user data when credentials are valid', async () => {
      // Arrange
      userService.findByEmail.mockResolvedValue(mockUser);
      organizationService.findById.mockResolvedValue(mockOrganization);

      // Mock bcrypt comparison
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);

      // Act
      const result = await authService.validateUser('test@example.com', 'password');

      // Assert
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        organizationId: mockUser.organizationId,
        role: mockUser.role,
        organization: mockOrganization,
      });
      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null when user is not found', async () => {
      // Arrange
      userService.findByEmail.mockResolvedValue(null);

      // Act
      const result = await authService.validateUser('nonexistent@example.com', 'password');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      // Arrange
      userService.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false);

      // Act
      const result = await authService.validateUser('test@example.com', 'wrongpassword');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when user is inactive', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      userService.findByEmail.mockResolvedValue(inactiveUser);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);

      // Act
      const result = await authService.validateUser('test@example.com', 'password');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when organization is inactive', async () => {
      // Arrange
      const inactiveOrg = { ...mockOrganization, isActive: false };
      userService.findByEmail.mockResolvedValue(mockUser);
      organizationService.findById.mockResolvedValue(inactiveOrg);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);

      // Act
      const result = await authService.validateUser('test@example.com', 'password');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const mockValidatedUser = {
      id: mockUser.id,
      email: mockUser.email,
      organizationId: mockUser.organizationId,
      role: mockUser.role,
      organization: mockOrganization,
    };

    it('should return access and refresh tokens for valid user', async () => {
      // Arrange
      const mockTokens = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      };

      jwtService.sign.mockReturnValueOnce(mockTokens.access_token);
      jwtService.sign.mockReturnValueOnce(mockTokens.refresh_token);
      configService.get.mockReturnValue('jwt-secret');

      // Act
      const result = await authService.login(mockValidatedUser);

      // Assert
      expect(result).toEqual({
        ...mockTokens,
        user: mockValidatedUser,
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('should include proper JWT payload', async () => {
      // Arrange
      jwtService.sign.mockReturnValue('mock-token');
      configService.get.mockReturnValue('jwt-secret');

      // Act
      await authService.login(mockValidatedUser);

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          email: mockValidatedUser.email,
          sub: mockValidatedUser.id,
          organizationId: mockValidatedUser.organizationId,
          role: mockValidatedUser.role,
        },
        expect.objectContaining({ expiresIn: '15m' })
      );
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens when refresh token is valid', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const payload = {
        sub: mockUser.id,
        email: mockUser.email,
        organizationId: mockUser.organizationId,
        role: mockUser.role,
      };

      jwtService.verify.mockReturnValue(payload);
      userService.findById.mockResolvedValue(mockUser);
      organizationService.findById.mockResolvedValue(mockOrganization);
      jwtService.sign.mockReturnValueOnce('new-access-token');
      jwtService.sign.mockReturnValueOnce('new-refresh-token');
      configService.get.mockReturnValue('jwt-refresh-secret');

      // Act
      const result = await authService.refreshToken(refreshToken);

      // Assert
      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      });
      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'jwt-refresh-secret',
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      // Arrange
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      const payload = { sub: 'nonexistent-user-id' };
      jwtService.verify.mockReturnValue(payload);
      userService.findById.mockResolvedValue(null);
      configService.get.mockReturnValue('jwt-refresh-secret');

      // Act & Assert
      await expect(authService.refreshToken('valid-token')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('validateMultiTenantAccess', () => {
    it('should allow access when user belongs to organization', async () => {
      // Arrange
      const user = { ...mockUser, organizationId: 'org-123' };
      const requestedOrgId = 'org-123';

      // Act
      const result = await authService.validateMultiTenantAccess(user, requestedOrgId);

      // Assert
      expect(result).toBe(true);
    });

    it('should deny access when user does not belong to organization', async () => {
      // Arrange
      const user = { ...mockUser, organizationId: 'org-123' };
      const requestedOrgId = 'org-456';

      // Act & Assert
      await expect(
        authService.validateMultiTenantAccess(user, requestedOrgId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow super admin access to any organization', async () => {
      // Arrange
      const superAdminUser = { ...mockUser, role: 'SUPER_ADMIN' };
      const requestedOrgId = 'any-org-id';

      // Act
      const result = await authService.validateMultiTenantAccess(superAdminUser, requestedOrgId);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('generateApiKey', () => {
    it('should generate API key for user', async () => {
      // Arrange
      const mockApiKey = 'cf_api_key_1234567890abcdef';
      userService.generateApiKey.mockResolvedValue(mockApiKey);

      // Act
      const result = await authService.generateApiKey(mockUser.id);

      // Assert
      expect(result).toEqual({ apiKey: mockApiKey });
      expect(userService.generateApiKey).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke API key for user', async () => {
      // Arrange
      userService.revokeApiKey.mockResolvedValue(undefined);

      // Act
      await authService.revokeApiKey(mockUser.id);

      // Assert
      expect(userService.revokeApiKey).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('validateApiKey', () => {
    it('should return user when API key is valid', async () => {
      // Arrange
      const apiKey = 'cf_api_key_1234567890abcdef';
      userService.findByApiKey.mockResolvedValue(mockUser);
      organizationService.findById.mockResolvedValue(mockOrganization);

      // Act
      const result = await authService.validateApiKey(apiKey);

      // Assert
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        organizationId: mockUser.organizationId,
        role: mockUser.role,
        organization: mockOrganization,
      });
    });

    it('should return null when API key is invalid', async () => {
      // Arrange
      const apiKey = 'invalid-api-key';
      userService.findByApiKey.mockResolvedValue(null);

      // Act
      const result = await authService.validateApiKey(apiKey);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should blacklist JWT token on logout', async () => {
      // Arrange
      const token = 'jwt-token';
      const mockBlacklist = new Set();

      // Mock token blacklist storage (could be Redis in production)
      authService['tokenBlacklist'] = mockBlacklist;

      // Act
      await authService.logout(token);

      // Assert
      expect(mockBlacklist.has(token)).toBe(true);
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return true for blacklisted token', () => {
      // Arrange
      const token = 'blacklisted-token';
      const mockBlacklist = new Set([token]);
      authService['tokenBlacklist'] = mockBlacklist;

      // Act
      const result = authService.isTokenBlacklisted(token);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for valid token', () => {
      // Arrange
      const token = 'valid-token';
      const mockBlacklist = new Set();
      authService['tokenBlacklist'] = mockBlacklist;

      // Act
      const result = authService.isTokenBlacklisted(token);

      // Assert
      expect(result).toBe(false);
    });
  });
});
