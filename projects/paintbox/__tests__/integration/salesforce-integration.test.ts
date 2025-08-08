import { salesforceService, SalesforceContact, SalesforceAccount, SalesforceOpportunity, PaintboxEstimate } from '@/lib/services/salesforce';
import { getSecretsManager } from '@/lib/services/secrets-manager';
import getCacheInstance from '@/lib/cache/cache-service';

// Mock dependencies
jest.mock('@/lib/services/secrets-manager');
jest.mock('@/lib/cache/cache-service');
jest.mock('@/lib/logging/simple-logger');

const mockSecretsManager = {
  getSecrets: jest.fn(),
};

const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  lpush: jest.fn(),
  ltrim: jest.fn(),
  lrange: jest.fn(),
};

(getSecretsManager as jest.Mock).mockReturnValue(mockSecretsManager);
(getCacheInstance as jest.Mock).mockReturnValue(mockCache);

describe('Salesforce Integration', () => {
  const mockSecrets = {
    salesforce: {
      clientId: 'test_client_id',
      clientSecret: 'test_client_secret',
      username: 'test@example.com',
      password: 'password',
      securityToken: 'token123',
      instanceUrl: 'https://test.salesforce.com',
      apiVersion: 'v62.0',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSecretsManager.getSecrets.mockResolvedValue(mockSecrets);
    mockCache.get.mockResolvedValue(null);
    mockCache.keys.mockResolvedValue([]);
  });

  afterEach(async () => {
    await salesforceService.cleanup();
  });

  describe('Service Initialization', () => {
    it('should initialize with OAuth credentials', async () => {
      // Mock successful OAuth initialization
      const mockConn = {
        login: jest.fn().mockResolvedValue({ id: 'user123' }),
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        instanceUrl: 'https://test.salesforce.com',
      };

      // Mock jsforce Connection constructor
      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await salesforceService.initialize();

      expect(mockConn.login).toHaveBeenCalledWith('test@example.com', 'passwordtoken123');
      expect(mockCache.set).toHaveBeenCalledWith(
        'salesforce:tokens',
        expect.stringContaining('access_token_123'),
        expect.any(Number)
      );
    });

    it('should handle missing credentials gracefully', async () => {
      mockSecretsManager.getSecrets.mockResolvedValue({ salesforce: null });

      await expect(salesforceService.initialize()).resolves.not.toThrow();

      // Should warn about missing credentials but not throw
      expect(mockSecretsManager.getSecrets).toHaveBeenCalled();
    });

    it('should start periodic sync after initialization', async () => {
      const mockConn = {
        login: jest.fn().mockResolvedValue({ id: 'user123' }),
        accessToken: 'access_token_123',
        instanceUrl: 'https://test.salesforce.com',
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await salesforceService.initialize();

      // Check that periodic sync was started (interval should be set)
      expect(salesforceService['syncInterval']).toBeDefined();
    });
  });

  describe('Contact Operations', () => {
    const mockContact: SalesforceContact = {
      Id: 'contact123',
      Name: 'John Doe',
      FirstName: 'John',
      LastName: 'Doe',
      Email: 'john@example.com',
      Phone: '555-1234',
      AccountId: 'account123',
    };

    beforeEach(async () => {
      const mockConn = {
        login: jest.fn().mockResolvedValue({ id: 'user123' }),
        query: jest.fn(),
        sobject: jest.fn(),
        accessToken: 'access_token_123',
        instanceUrl: 'https://test.salesforce.com',
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await salesforceService.initialize();
    });

    it('should search contacts successfully', async () => {
      const mockConn = salesforceService['conn'];
      mockConn.query = jest.fn().mockResolvedValue({
        records: [mockContact],
      });

      const result = await salesforceService.searchContacts('John', 10);

      expect(result).toEqual([mockContact]);
      expect(mockConn.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM Contact')
      );
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should create contact successfully', async () => {
      const mockConn = salesforceService['conn'];
      mockConn.sobject = jest.fn().mockReturnValue({
        create: jest.fn().mockResolvedValue({
          success: true,
          id: 'new_contact_123',
        }),
      });

      const contactData = {
        FirstName: 'Jane',
        LastName: 'Smith',
        Email: 'jane@example.com',
      };

      const result = await salesforceService.createContact(contactData);

      expect(result).toBe('new_contact_123');
      expect(mockConn.sobject).toHaveBeenCalledWith('Contact');
    });

    it('should update contact successfully', async () => {
      const mockConn = salesforceService['conn'];
      mockConn.sobject = jest.fn().mockReturnValue({
        update: jest.fn().mockResolvedValue({
          success: true,
        }),
      });

      const updates = { Phone: '555-9999' };

      await salesforceService.updateContact('contact123', updates);

      expect(mockConn.sobject).toHaveBeenCalledWith('Contact');
      expect(mockConn.sobject().update).toHaveBeenCalledWith({
        Id: 'contact123',
        ...updates,
      });
    });

    it('should delete contact successfully', async () => {
      const mockConn = salesforceService['conn'];
      mockConn.sobject = jest.fn().mockReturnValue({
        delete: jest.fn().mockResolvedValue({
          success: true,
        }),
      });

      await salesforceService.deleteContact('contact123');

      expect(mockConn.sobject).toHaveBeenCalledWith('Contact');
      expect(mockConn.sobject().delete).toHaveBeenCalledWith('contact123');
    });

    it('should handle contact creation failure', async () => {
      const mockConn = salesforceService['conn'];
      mockConn.sobject = jest.fn().mockReturnValue({
        create: jest.fn().mockResolvedValue({
          success: false,
          errors: ['Validation error'],
        }),
      });

      const contactData = { LastName: 'Smith' };

      await expect(salesforceService.createContact(contactData))
        .rejects.toThrow('Failed to create contact: Validation error');
    });
  });

  describe('OAuth Token Management', () => {
    it('should cache OAuth tokens', async () => {
      const mockConn = {
        login: jest.fn().mockResolvedValue({ id: 'user123' }),
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        instanceUrl: 'https://test.salesforce.com',
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await salesforceService.initialize();

      expect(mockCache.set).toHaveBeenCalledWith(
        'salesforce:tokens',
        expect.stringContaining('access_token_123'),
        expect.any(Number)
      );
    });

    it('should use cached tokens when available', async () => {
      const cachedTokens = {
        accessToken: 'cached_token',
        refreshToken: 'cached_refresh',
        instanceUrl: 'https://cached.salesforce.com',
        expiresAt: Date.now() + 60000, // 1 minute from now
      };

      mockCache.get.mockResolvedValue(JSON.stringify(cachedTokens));

      const mockConn = {
        accessToken: cachedTokens.accessToken,
        refreshToken: cachedTokens.refreshToken,
        instanceUrl: cachedTokens.instanceUrl,
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await salesforceService.initialize();

      expect(mockCache.get).toHaveBeenCalledWith('salesforce:tokens');
    });

    it('should refresh expired tokens', async () => {
      const expiredTokens = {
        accessToken: 'expired_token',
        refreshToken: 'refresh_token',
        instanceUrl: 'https://test.salesforce.com',
        expiresAt: Date.now() - 60000, // Expired 1 minute ago
      };

      mockCache.get.mockResolvedValue(JSON.stringify(expiredTokens));

      const mockConn = {
        refreshToken: 'refresh_token',
        oauth2: {
          refreshToken: jest.fn().mockResolvedValue({
            access_token: 'new_access_token',
          }),
        },
        instanceUrl: 'https://test.salesforce.com',
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      // Trigger token refresh by making an API call that fails with INVALID_SESSION_ID
      const mockQuery = jest.fn()
        .mockRejectedValueOnce({ name: 'INVALID_SESSION_ID' })
        .mockResolvedValueOnce({ records: [] });

      mockConn.query = mockQuery;

      await salesforceService.initialize();
      await salesforceService.testConnection();

      expect(mockConn.oauth2.refreshToken).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('Batch Sync Operations', () => {
    it('should perform batch sync successfully', async () => {
      const mockConn = {
        login: jest.fn().mockResolvedValue({ id: 'user123' }),
        query: jest.fn().mockResolvedValue({ records: [] }),
        accessToken: 'access_token_123',
        instanceUrl: 'https://test.salesforce.com',
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await salesforceService.initialize();

      const result = await salesforceService.performBatchSync();

      expect(result).toEqual({
        success: true,
        processed: 0, // No records to process in this test
        errors: [],
        conflicts: [],
      });

      expect(mockCache.set).toHaveBeenCalledWith(
        'salesforce:lastSync',
        expect.any(String),
        24 * 60 * 60
      );
    });

    it('should handle sync errors gracefully', async () => {
      const mockConn = {
        login: jest.fn().mockResolvedValue({ id: 'user123' }),
        query: jest.fn().mockRejectedValue(new Error('API Error')),
        accessToken: 'access_token_123',
        instanceUrl: 'https://test.salesforce.com',
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await salesforceService.initialize();

      const result = await salesforceService.performBatchSync();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should track last sync time', async () => {
      const lastSyncTime = new Date().toISOString();
      mockCache.get.mockResolvedValue(lastSyncTime);

      const mockConn = {
        login: jest.fn().mockResolvedValue({ id: 'user123' }),
        query: jest.fn().mockResolvedValue({ records: [] }),
        accessToken: 'access_token_123',
        instanceUrl: 'https://test.salesforce.com',
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await salesforceService.initialize();
      await salesforceService.performBatchSync();

      expect(mockCache.get).toHaveBeenCalledWith('salesforce:lastSync');
    });
  });

  describe('Cache Management', () => {
    it('should clear contact caches on update', async () => {
      mockCache.keys.mockResolvedValue(['search:contacts:john', 'contact:123']);

      const mockConn = {
        login: jest.fn().mockResolvedValue({ id: 'user123' }),
        sobject: jest.fn().mockReturnValue({
          update: jest.fn().mockResolvedValue({ success: true }),
        }),
        accessToken: 'access_token_123',
        instanceUrl: 'https://test.salesforce.com',
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await salesforceService.initialize();
      await salesforceService.updateContact('contact123', { Phone: '555-9999' });

      expect(mockCache.keys).toHaveBeenCalledWith('search:contacts:*');
      expect(mockCache.del).toHaveBeenCalledWith('search:contacts:john');
      expect(mockCache.del).toHaveBeenCalledWith('contact:123');
    });

    it('should cache search results', async () => {
      const mockContact = { Id: 'contact123', Name: 'John Doe' };

      const mockConn = {
        login: jest.fn().mockResolvedValue({ id: 'user123' }),
        query: jest.fn().mockResolvedValue({ records: [mockContact] }),
        accessToken: 'access_token_123',
        instanceUrl: 'https://test.salesforce.com',
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await salesforceService.initialize();
      await salesforceService.searchContacts('John', 10);

      expect(mockCache.set).toHaveBeenCalledWith(
        'search:contacts:John:10',
        JSON.stringify([mockContact]),
        300 // 5 minutes
      );
    });
  });

  describe('Error Handling and Retries', () => {
    it('should retry operations on transient failures', async () => {
      const mockConn = {
        login: jest.fn().mockResolvedValue({ id: 'user123' }),
        query: jest.fn()
          .mockRejectedValueOnce(new Error('Temporary failure'))
          .mockResolvedValueOnce({ records: [] }),
        accessToken: 'access_token_123',
        instanceUrl: 'https://test.salesforce.com',
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await salesforceService.initialize();
      const result = await salesforceService.searchContacts('test', 10);

      expect(result).toEqual([]);
      expect(mockConn.query).toHaveBeenCalledTimes(2); // Initial call + 1 retry
    });

    it('should handle connection failures gracefully', async () => {
      mockSecretsManager.getSecrets.mockResolvedValue({
        salesforce: {
          username: 'invalid@example.com',
          password: 'wrong_password',
          securityToken: 'invalid_token',
        },
      });

      const mockConn = {
        login: jest.fn().mockRejectedValue(new Error('Invalid credentials')),
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await expect(salesforceService.initialize()).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      const mockConn = {
        login: jest.fn().mockResolvedValue({ id: 'user123' }),
        query: jest.fn().mockResolvedValue({ records: [] }),
        accessToken: 'access_token_123',
        instanceUrl: 'https://test.salesforce.com',
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await salesforceService.initialize();
      const isConnected = await salesforceService.testConnection();

      expect(isConnected).toBe(true);
      expect(mockConn.query).toHaveBeenCalledWith('SELECT Id FROM Contact LIMIT 1');
    });

    it('should return false for failed connection test', async () => {
      const mockConn = {
        login: jest.fn().mockResolvedValue({ id: 'user123' }),
        query: jest.fn().mockRejectedValue(new Error('Connection failed')),
        accessToken: 'access_token_123',
        instanceUrl: 'https://test.salesforce.com',
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await salesforceService.initialize();
      const isConnected = await salesforceService.testConnection();

      expect(isConnected).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      const mockConn = {
        login: jest.fn().mockResolvedValue({ id: 'user123' }),
        accessToken: 'access_token_123',
        instanceUrl: 'https://test.salesforce.com',
      };

      jest.doMock('jsforce', () => ({
        __esModule: true,
        default: {
          Connection: jest.fn().mockImplementation(() => mockConn),
        },
      }));

      await salesforceService.initialize();

      // Should have a sync interval set
      expect(salesforceService['syncInterval']).toBeDefined();

      await salesforceService.cleanup();

      // Should clear the sync interval and connection
      expect(salesforceService['syncInterval']).toBeNull();
      expect(salesforceService['conn']).toBeNull();
      expect(salesforceService['isInitialized']).toBe(false);
    });
  });
});
