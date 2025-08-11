import { AuthService } from '../services/auth.service';
import { prisma } from '../config/database';
import { redisService } from '../config/redis';

describe('AuthService', () => {
  let authService: AuthService;

  beforeAll(() => {
    authService = new AuthService();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'SecureP@ssw0rd123',
        firstName: 'Test',
        lastName: 'User',
        organizationName: 'Test Org',
        organizationSlug: 'test-org-123',
      };

      const result = await authService.register(registerData);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.firstName).toBe('Test');
      expect(result.user.lastName).toBe('User');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw error for duplicate email', async () => {
      const registerData = {
        email: 'duplicate@example.com',
        password: 'SecureP@ssw0rd123',
        firstName: 'Test',
        lastName: 'User',
      };

      // First registration
      await authService.register(registerData);

      // Second registration with same email should fail
      await expect(authService.register(registerData)).rejects.toThrow(
        'User already exists with this email'
      );
    });

    it('should throw error for weak password', async () => {
      const registerData = {
        email: 'weak@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User',
      };

      await expect(authService.register(registerData)).rejects.toThrow(
        'Password validation failed'
      );
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Create a test user
      await authService.register({
        email: 'login@example.com',
        password: 'SecureP@ssw0rd123',
        firstName: 'Login',
        lastName: 'Test',
      });
    });

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'SecureP@ssw0rd123',
      };

      const result = await authService.login(loginData);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('login@example.com');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw error for incorrect password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'WrongPassword',
      };

      await expect(authService.login(loginData)).rejects.toThrow(
        'Invalid email or password'
      );
    });

    it('should throw error for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'SecureP@ssw0rd123',
      };

      await expect(authService.login(loginData)).rejects.toThrow(
        'Invalid email or password'
      );
    });
  });

  describe('refreshToken', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create user and get refresh token
      const result = await authService.register({
        email: 'refresh@example.com',
        password: 'SecureP@ssw0rd123',
        firstName: 'Refresh',
        lastName: 'Test',
      });
      refreshToken = result.tokens.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const newTokens = await authService.refreshToken(refreshToken);

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.accessToken).not.toBe(refreshToken);
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });
  });

  describe('verifyAccessToken', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create user and get access token
      const result = await authService.register({
        email: 'verify@example.com',
        password: 'SecureP@ssw0rd123',
        firstName: 'Verify',
        lastName: 'Test',
      });
      accessToken = result.tokens.accessToken;
    });

    it('should verify valid access token', async () => {
      const user = await authService.verifyAccessToken(accessToken);

      expect(user).toBeDefined();
      expect(user.email).toBe('verify@example.com');
      expect(user.firstName).toBe('Verify');
      expect(user.lastName).toBe('Test');
    });

    it('should throw error for invalid access token', async () => {
      await expect(authService.verifyAccessToken('invalid-token')).rejects.toThrow(
        'Invalid or expired token'
      );
    });
  });
});
