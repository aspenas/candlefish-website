/**
 * @file Salesforce OAuth Service Tests
 * @description Unit tests for Salesforce OAuth integration
 */

import { SalesforceOAuthService } from '@/lib/services/salesforce-oauth';
import { 
  createSalesforceOAuthResponse, 
  createOAuthTestData,
  createSalesforceErrorResponse 
} from '@/__tests__/factories';
import nock from 'nock';

// Mock dependencies
jest.mock('@/lib/services/secrets-manager');
jest.mock('@/lib/cache/redis-client');

describe('SalesforceOAuthService', () => {
  let oauthService: SalesforceOAuthService;
  let mockOAuthData: ReturnType<typeof createOAuthTestData>;

  beforeEach(() => {
    mockOAuthData = createOAuthTestData();
    
    oauthService = new SalesforceOAuthService({
      clientId: mockOAuthData.clientId,
      clientSecret: mockOAuthData.clientSecret,
      redirectUri: mockOAuthData.redirectUri,
      sandbox: true, // Use sandbox for testing
    });

    // Clear any existing nock interceptors
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Authorization URL Generation', () => {
    it('should generate correct authorization URL', () => {
      const state = mockOAuthData.state;
      const scope = 'full refresh_token';

      const authUrl = oauthService.getAuthorizationUrl({ state, scope });

      expect(authUrl).toContain('https://test.salesforce.com/services/oauth2/authorize'); // Sandbox URL
      expect(authUrl).toContain(`client_id=${mockOAuthData.clientId}`);
      expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(mockOAuthData.redirectUri)}`);
      expect(authUrl).toContain(`state=${state}`);
      expect(authUrl).toContain(`scope=${encodeURIComponent(scope)}`);
      expect(authUrl).toContain('response_type=code');
    });

    it('should use production URL when sandbox is false', () => {
      const prodOAuthService = new SalesforceOAuthService({
        clientId: mockOAuthData.clientId,
        clientSecret: mockOAuthData.clientSecret,
        redirectUri: mockOAuthData.redirectUri,
        sandbox: false,
      });

      const authUrl = prodOAuthService.getAuthorizationUrl({ state: mockOAuthData.state });

      expect(authUrl).toContain('https://login.salesforce.com/services/oauth2/authorize');
    });

    it('should handle custom scopes', () => {
      const customScope = 'api id profile email address phone';
      const authUrl = oauthService.getAuthorizationUrl({ 
        state: mockOAuthData.state,
        scope: customScope 
      });

      expect(authUrl).toContain(`scope=${encodeURIComponent(customScope)}`);
    });
  });

  describe('Token Exchange', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockTokenResponse = createSalesforceOAuthResponse();
      
      // Mock the token endpoint
      nock('https://test.salesforce.com')
        .post('/services/oauth2/token')
        .reply(200, mockTokenResponse);

      const result = await oauthService.exchangeCodeForTokens(mockOAuthData.code);

      expect(result.access_token).toBe(mockTokenResponse.access_token);
      expect(result.refresh_token).toBe(mockTokenResponse.refresh_token);
      expect(result.instance_url).toBe(mockTokenResponse.instance_url);
      expect(result.token_type).toBe('Bearer');
    });

    it('should handle token exchange errors', async () => {
      const errorResponse = createSalesforceErrorResponse('invalid_grant');

      nock('https://test.salesforce.com')
        .post('/services/oauth2/token')
        .reply(400, errorResponse);

      await expect(oauthService.exchangeCodeForTokens('invalid_code'))
        .rejects.toThrow('OAuth token exchange failed');
    });

    it('should include correct parameters in token request', async () => {
      let requestBody: string = '';

      nock('https://test.salesforce.com')
        .post('/services/oauth2/token')
        .reply(function(uri, body) {
          requestBody = body as string;
          return [200, createSalesforceOAuthResponse()];
        });

      await oauthService.exchangeCodeForTokens(mockOAuthData.code);

      expect(requestBody).toContain(`grant_type=authorization_code`);
      expect(requestBody).toContain(`code=${mockOAuthData.code}`);
      expect(requestBody).toContain(`client_id=${mockOAuthData.clientId}`);
      expect(requestBody).toContain(`client_secret=${mockOAuthData.clientSecret}`);
      expect(requestBody).toContain(`redirect_uri=${encodeURIComponent(mockOAuthData.redirectUri)}`);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token using refresh token', async () => {
      const refreshToken = 'mock_refresh_token';
      const mockTokenResponse = createSalesforceOAuthResponse({
        refresh_token: refreshToken, // Same refresh token
      });

      nock('https://test.salesforce.com')
        .post('/services/oauth2/token')
        .reply(200, mockTokenResponse);

      const result = await oauthService.refreshAccessToken(refreshToken);

      expect(result.access_token).toBe(mockTokenResponse.access_token);
      expect(result.refresh_token).toBe(refreshToken);
    });

    it('should handle refresh token errors', async () => {
      const errorResponse = createSalesforceErrorResponse('invalid_grant');

      nock('https://test.salesforce.com')
        .post('/services/oauth2/token')
        .reply(400, errorResponse);

      await expect(oauthService.refreshAccessToken('invalid_refresh_token'))
        .rejects.toThrow('Token refresh failed');
    });

    it('should automatically retry on network errors', async () => {
      const refreshToken = 'mock_refresh_token';
      const mockTokenResponse = createSalesforceOAuthResponse();

      // First request fails, second succeeds
      nock('https://test.salesforce.com')
        .post('/services/oauth2/token')
        .replyWithError('Network error');

      nock('https://test.salesforce.com')
        .post('/services/oauth2/token')
        .reply(200, mockTokenResponse);

      const result = await oauthService.refreshAccessToken(refreshToken);

      expect(result.access_token).toBe(mockTokenResponse.access_token);
    });
  });

  describe('Token Validation', () => {
    it('should validate access token', async () => {
      const accessToken = 'mock_access_token';
      const mockUserInfo = {
        id: 'https://login.salesforce.com/id/00D000000000000EAA/005000000000000AAA',
        asserted_user: true,
        user_id: '005000000000000AAA',
        organization_id: '00D000000000000EAA',
        username: 'test@example.com',
        nick_name: 'test',
        display_name: 'Test User',
        email: 'test@example.com',
        email_verified: true,
        first_name: 'Test',
        last_name: 'User',
        timezone: 'America/Los_Angeles',
        photos: {
          picture: 'https://example.com/photo.jpg',
          thumbnail: 'https://example.com/thumbnail.jpg'
        },
        addr_street: '123 Test St',
        addr_city: 'Test City',
        addr_state: 'CA',
        addr_country: 'US',
        addr_zip: '12345',
        mobile_phone: '+1234567890',
        mobile_phone_verified: true,
        is_lightning_login_user: false
      };

      nock('https://test.salesforce.com')
        .get('/services/oauth2/userinfo')
        .matchHeader('authorization', `Bearer ${accessToken}`)
        .reply(200, mockUserInfo);

      const result = await oauthService.validateToken(accessToken, 'https://test.salesforce.com');

      expect(result.valid).toBe(true);
      expect(result.userInfo.user_id).toBe(mockUserInfo.user_id);
      expect(result.userInfo.email).toBe(mockUserInfo.email);
    });

    it('should handle invalid tokens', async () => {
      const invalidToken = 'invalid_token';

      nock('https://test.salesforce.com')
        .get('/services/oauth2/userinfo')
        .matchHeader('authorization', `Bearer ${invalidToken}`)
        .reply(401, { error: 'invalid_token', error_description: 'Session expired or invalid' });

      const result = await oauthService.validateToken(invalidToken, 'https://test.salesforce.com');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid_token');
    });
  });

  describe('Token Revocation', () => {
    it('should revoke access token', async () => {
      const accessToken = 'mock_access_token';

      nock('https://test.salesforce.com')
        .post('/services/oauth2/revoke')
        .reply(200, { success: true });

      const result = await oauthService.revokeToken(accessToken);

      expect(result.success).toBe(true);
    });

    it('should handle revocation errors gracefully', async () => {
      const accessToken = 'mock_access_token';

      nock('https://test.salesforce.com')
        .post('/services/oauth2/revoke')
        .reply(400, { error: 'unsupported_token_type' });

      const result = await oauthService.revokeToken(accessToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('unsupported_token_type');
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      nock('https://test.salesforce.com')
        .post('/services/oauth2/token')
        .delay(10000) // 10 second delay
        .reply(200, createSalesforceOAuthResponse());

      await expect(oauthService.exchangeCodeForTokens(mockOAuthData.code, { timeout: 1000 }))
        .rejects.toThrow('Request timeout');
    });

    it('should handle rate limiting', async () => {
      nock('https://test.salesforce.com')
        .post('/services/oauth2/token')
        .reply(429, { error: 'rate_limit_exceeded' }, {
          'Retry-After': '60'
        });

      await expect(oauthService.exchangeCodeForTokens(mockOAuthData.code))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle server errors with retry', async () => {
      const mockTokenResponse = createSalesforceOAuthResponse();

      // First request returns 500, second succeeds
      nock('https://test.salesforce.com')
        .post('/services/oauth2/token')
        .reply(500, { error: 'internal_server_error' });

      nock('https://test.salesforce.com')
        .post('/services/oauth2/token')
        .reply(200, mockTokenResponse);

      const result = await oauthService.exchangeCodeForTokens(mockOAuthData.code);

      expect(result.access_token).toBe(mockTokenResponse.access_token);
    });
  });

  describe('Security Features', () => {
    it('should validate state parameter to prevent CSRF', () => {
      const originalState = 'secure_random_state';
      const receivedState = 'different_state';

      expect(() => {
        oauthService.validateState(originalState, receivedState);
      }).toThrow('Invalid state parameter');
    });

    it('should validate redirect URI to prevent attacks', () => {
      const validUri = mockOAuthData.redirectUri;
      const invalidUri = 'https://evil.com/callback';

      expect(() => {
        oauthService.validateRedirectUri(invalidUri);
      }).toThrow('Invalid redirect URI');

      expect(() => {
        oauthService.validateRedirectUri(validUri);
      }).not.toThrow();
    });

    it('should use PKCE for enhanced security', () => {
      const pkceData = oauthService.generatePKCE();

      expect(pkceData.codeVerifier).toBeDefined();
      expect(pkceData.codeChallenge).toBeDefined();
      expect(pkceData.codeChallengeMethod).toBe('S256');
      expect(pkceData.codeChallenge).not.toBe(pkceData.codeVerifier);
    });
  });

  describe('Token Storage', () => {
    it('should store tokens securely', async () => {
      const mockTokenResponse = createSalesforceOAuthResponse();
      const userId = 'test_user_123';

      nock('https://test.salesforce.com')
        .post('/services/oauth2/token')
        .reply(200, mockTokenResponse);

      const result = await oauthService.exchangeCodeForTokens(mockOAuthData.code, {
        storeTokens: true,
        userId
      });

      expect(result.stored).toBe(true);
      
      // Verify tokens are encrypted before storage
      const storedToken = await oauthService.getStoredTokens(userId);
      expect(storedToken.access_token).toBe(mockTokenResponse.access_token);
    });

    it('should handle token expiration', async () => {
      const expiredTokenResponse = createSalesforceOAuthResponse({
        issued_at: (Date.now() - 7200000).toString(), // 2 hours ago
      });

      const userId = 'test_user_123';
      await oauthService.storeTokens(userId, expiredTokenResponse);

      const isExpired = await oauthService.isTokenExpired(userId);
      expect(isExpired).toBe(true);
    });
  });

  describe('Multi-org Support', () => {
    it('should handle multiple Salesforce orgs', async () => {
      const orgId1 = 'org1';
      const orgId2 = 'org2';
      
      const tokens1 = createSalesforceOAuthResponse({
        instance_url: 'https://org1.my.salesforce.com'
      });
      
      const tokens2 = createSalesforceOAuthResponse({
        instance_url: 'https://org2.my.salesforce.com'
      });

      await oauthService.storeTokens('user1', tokens1, orgId1);
      await oauthService.storeTokens('user1', tokens2, orgId2);

      const retrievedTokens1 = await oauthService.getStoredTokens('user1', orgId1);
      const retrievedTokens2 = await oauthService.getStoredTokens('user1', orgId2);

      expect(retrievedTokens1.instance_url).toBe(tokens1.instance_url);
      expect(retrievedTokens2.instance_url).toBe(tokens2.instance_url);
    });
  });

  describe('Performance', () => {
    it('should handle concurrent token operations', async () => {
      const tokenResponses = Array.from({ length: 10 }, () => createSalesforceOAuthResponse());
      
      // Mock multiple token requests
      tokenResponses.forEach((response, index) => {
        nock('https://test.salesforce.com')
          .post('/services/oauth2/token')
          .reply(200, response);
      });

      const promises = tokenResponses.map((_, index) => 
        oauthService.exchangeCodeForTokens(`code_${index}`)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result, index) => {
        expect(result.access_token).toBe(tokenResponses[index].access_token);
      });
    });

    it('should cache user info for performance', async () => {
      const accessToken = 'mock_access_token';
      const mockUserInfo = {
        id: 'user_id_123',
        email: 'test@example.com',
        name: 'Test User'
      };

      // First request should hit the API
      nock('https://test.salesforce.com')
        .get('/services/oauth2/userinfo')
        .reply(200, mockUserInfo);

      const result1 = await oauthService.validateToken(accessToken, 'https://test.salesforce.com');
      
      // Second request should use cache (no nock intercept)
      const result2 = await oauthService.validateToken(accessToken, 'https://test.salesforce.com');

      expect(result1.userInfo.email).toBe(mockUserInfo.email);
      expect(result2.userInfo.email).toBe(mockUserInfo.email);
      expect(result2.cached).toBe(true);
    });
  });
});