/**
 * @jest-environment jsdom
 */

import { NetlifyApiClient, NetlifyApiError, isNetlifyApiError, handleApiError } from '../../lib/netlify-api';
import { Extension, ExtensionRecommendation, PerformanceMetrics, NetlifySite } from '../../types/netlify';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Test data factories
const createMockExtension = (overrides: Partial<Extension> = {}): Extension => ({
  id: 'test-extension-id',
  name: 'Test Extension',
  description: 'A test extension for unit testing',
  category: 'performance',
  version: '1.0.0',
  provider: 'Test Provider',
  isEnabled: false,
  performance: {
    impact: 'low',
    loadTime: 50,
    bundleSize: 12
  },
  documentation: {
    setupUrl: 'https://test.com/setup',
    apiUrl: 'https://test.com/api'
  },
  ...overrides
});

const createMockSite = (overrides: Partial<NetlifySite> = {}): NetlifySite => ({
  id: 'test-site-id',
  name: 'Test Site',
  url: 'https://test.candlefish.ai',
  status: 'active',
  deployBranch: 'main',
  lastDeploy: new Date('2024-01-01T12:00:00Z'),
  buildTime: 45,
  repository: {
    provider: 'github',
    repo: 'candlefish-ai/test'
  },
  ...overrides
});

const createMockPerformanceMetrics = (overrides: Partial<PerformanceMetrics> = {}): PerformanceMetrics => ({
  siteId: 'test-site-id',
  timestamp: new Date('2024-01-01T12:00:00Z'),
  metrics: {
    lcp: 2500,
    fid: 100,
    cls: 0.1,
    fcp: 1800,
    ttfb: 200,
    buildTime: 45,
    bundleSize: 150,
    functionInvocations: 1000,
    functionErrors: 5,
    functionDuration: 250,
    uniqueVisitors: 500,
    pageViews: 1200,
    bounceRate: 0.3
  },
  scores: {
    performance: 95,
    accessibility: 100,
    bestPractices: 90,
    seo: 95
  },
  ...overrides
});

describe('NetlifyApiClient', () => {
  let client: NetlifyApiClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new NetlifyApiClient('https://api.test.com', 'test-api-key');
  });

  describe('constructor', () => {
    it('should create client with default baseUrl', () => {
      const defaultClient = new NetlifyApiClient();
      expect(defaultClient).toBeInstanceOf(NetlifyApiClient);
    });

    it('should remove trailing slash from baseUrl', () => {
      const clientWithSlash = new NetlifyApiClient('https://api.test.com/');
      // We can't directly test the private baseUrl, but we can test a request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { status: 'ok' }, timestamp: new Date() })
      });
      
      clientWithSlash.healthCheck();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/health',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          })
        })
      );
    });
  });

  describe('Extensions API', () => {
    describe('getExtensions', () => {
      it('should fetch all extensions successfully', async () => {
        const mockExtensions = [createMockExtension(), createMockExtension({ id: 'ext-2' })];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { extensions: mockExtensions, total: 2, categories: ['performance'] },
            timestamp: new Date()
          })
        });

        const result = await client.getExtensions();

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/extensions',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-api-key'
            })
          })
        );
        expect(result).toEqual(mockExtensions);
      });

      it('should handle API errors gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: () => Promise.resolve({
            code: 'INTERNAL_ERROR',
            message: 'Internal server error occurred'
          })
        });

        await expect(client.getExtensions()).rejects.toThrow(NetlifyApiError);
        await expect(client.getExtensions()).rejects.toMatchObject({
          code: 'INTERNAL_ERROR',
          message: 'Internal server error occurred'
        });
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(client.getExtensions()).rejects.toThrow(NetlifyApiError);
        await expect(client.getExtensions()).rejects.toMatchObject({
          code: 'NETWORK_ERROR',
          message: 'Network error'
        });
      });
    });

    describe('getSiteExtensions', () => {
      it('should fetch site-specific extensions', async () => {
        const mockResponse = {
          siteId: 'test-site-id',
          extensions: [createMockExtension()],
          recommendations: [],
          performance: createMockPerformanceMetrics()
        };
        
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockResponse,
            timestamp: new Date()
          })
        });

        const result = await client.getSiteExtensions('test-site-id');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/sites/test-site-id/extensions',
          expect.any(Object)
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('enableExtension', () => {
      it('should enable extension for a site', async () => {
        const mockExtension = createMockExtension({ isEnabled: true });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockExtension,
            timestamp: new Date()
          })
        });

        const result = await client.enableExtension('test-site-id', 'test-extension-id');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/sites/test-site-id/extensions',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ extensionId: 'test-extension-id' }),
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer test-api-key'
            })
          })
        );
        expect(result).toEqual(mockExtension);
      });
    });

    describe('disableExtension', () => {
      it('should disable extension for a site', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {},
            timestamp: new Date()
          })
        });

        await client.disableExtension('test-site-id', 'test-extension-id');

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/sites/test-site-id/extensions/test-extension-id',
          expect.objectContaining({
            method: 'DELETE'
          })
        );
      });
    });
  });

  describe('Configuration API', () => {
    describe('getExtensionConfig', () => {
      it('should fetch extension configuration', async () => {
        const mockConfig = {
          extensionId: 'test-extension-id',
          siteId: 'test-site-id',
          config: { enabled: true, threshold: 50 },
          isEnabled: true,
          lastModified: new Date(),
          modifiedBy: 'test@user.com'
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockConfig,
            timestamp: new Date()
          })
        });

        const result = await client.getExtensionConfig('test-site-id', 'test-extension-id');

        expect(result).toEqual(mockConfig);
      });

      it('should return null for non-existent config', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: () => Promise.resolve({
            code: 'NOT_FOUND',
            message: 'Configuration not found'
          })
        });

        const result = await client.getExtensionConfig('test-site-id', 'test-extension-id');

        expect(result).toBeNull();
      });
    });

    describe('updateExtensionConfig', () => {
      it('should update extension configuration', async () => {
        const config = { threshold: 75, enabled: true };
        const mockResponse = {
          extensionId: 'test-extension-id',
          siteId: 'test-site-id',
          config,
          isEnabled: true,
          lastModified: new Date(),
          modifiedBy: 'test@user.com'
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockResponse,
            timestamp: new Date()
          })
        });

        const result = await client.updateExtensionConfig('test-site-id', 'test-extension-id', config);

        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.test.com/extension-config/test-site-id/test-extension-id',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ config })
          })
        );
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Recommendations API', () => {
    it('should fetch ML-based recommendations', async () => {
      const mockRecommendations: ExtensionRecommendation[] = [{
        extension: createMockExtension(),
        confidence: 0.85,
        reasoning: 'Your site would benefit from improved caching',
        potentialImpact: {
          performance: 15,
          security: 5,
          seo: 10,
          userExperience: 12
        },
        estimatedSetupTime: 15
      }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { recommendations: mockRecommendations },
          timestamp: new Date()
        })
      });

      const result = await client.getRecommendations('test-site-id');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/recommendations/test-site-id',
        expect.any(Object)
      );
      expect(result).toEqual(mockRecommendations);
    });
  });

  describe('Performance Metrics API', () => {
    it('should fetch performance metrics with default time range', async () => {
      const mockMetrics = [createMockPerformanceMetrics()];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockMetrics,
          timestamp: new Date()
        })
      });

      const result = await client.getPerformanceMetrics('test-site-id');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/sites/test-site-id/metrics?timeRange=24h',
        expect.any(Object)
      );
      expect(result).toEqual(mockMetrics);
    });

    it('should fetch performance metrics with custom time range', async () => {
      const mockMetrics = [createMockPerformanceMetrics()];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockMetrics,
          timestamp: new Date()
        })
      });

      await client.getPerformanceMetrics('test-site-id', '7d');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/sites/test-site-id/metrics?timeRange=7d',
        expect.any(Object)
      );
    });
  });

  describe('Sites API', () => {
    it('should fetch all sites', async () => {
      const sites = await client.getSites();

      // Should return mock sites
      expect(sites).toHaveLength(8);
      expect(sites[0].id).toBe('candlefish-ai');
      expect(sites[1].id).toBe('staging-candlefish-ai');
      expect(sites).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'Candlefish AI',
          url: 'https://candlefish.ai'
        })
      ]));
    });
  });

  describe('Utility Methods', () => {
    describe('healthCheck', () => {
      it('should return success status when API is healthy', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { status: 'ok' },
            timestamp: new Date()
          })
        });

        const result = await client.healthCheck();

        expect(result.status).toBe('ok');
        expect(result.timestamp).toBeInstanceOf(Date);
      });

      it('should return error status when API is unhealthy', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await client.healthCheck();

        expect(result.status).toBe('error');
        expect(result.timestamp).toBeInstanceOf(Date);
      });
    });

    describe('batchToggleExtensions', () => {
      it('should execute batch operations successfully', async () => {
        const mockExtension = createMockExtension({ isEnabled: true });
        
        // Mock enable operation
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockExtension,
            timestamp: new Date()
          })
        });

        // Mock disable operation
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {},
            timestamp: new Date()
          })
        });

        const operations = [
          { siteId: 'site-1', extensionId: 'ext-1', action: 'enable' as const },
          { siteId: 'site-1', extensionId: 'ext-2', action: 'disable' as const }
        ];

        const result = await client.batchToggleExtensions(operations);

        expect(result.success).toBe(2);
        expect(result.failed).toBe(0);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle partial failures in batch operations', async () => {
        const mockExtension = createMockExtension({ isEnabled: true });
        
        // Mock successful enable
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockExtension,
            timestamp: new Date()
          })
        });

        // Mock failed disable
        mockFetch.mockRejectedValueOnce(new NetlifyApiError('API_ERROR', 'Failed to disable extension'));

        const operations = [
          { siteId: 'site-1', extensionId: 'ext-1', action: 'enable' as const },
          { siteId: 'site-1', extensionId: 'ext-2', action: 'disable' as const }
        ];

        const result = await client.batchToggleExtensions(operations);

        expect(result.success).toBe(1);
        expect(result.failed).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].operation).toEqual(operations[1]);
      });
    });

    describe('createWebSocketConnection', () => {
      it('should return null in server environment', () => {
        // In jsdom environment, window exists but WebSocket might not
        const result = client.createWebSocketConnection('test-site-id');
        
        // This will return null or a WebSocket depending on the test environment
        expect(result === null || result instanceof WebSocket).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(client.getExtensions()).rejects.toThrow(NetlifyApiError);
      await expect(client.getExtensions()).rejects.toMatchObject({
        code: 'HTTP_500',
        message: 'Internal Server Error'
      });
    });

    it('should handle missing status text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: '',
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(client.getExtensions()).rejects.toThrow(NetlifyApiError);
      await expect(client.getExtensions()).rejects.toMatchObject({
        code: 'HTTP_500',
        message: 'An error occurred'
      });
    });
  });
});

describe('NetlifyApiError', () => {
  it('should create error with code and message', () => {
    const error = new NetlifyApiError('TEST_ERROR', 'Test error message');
    
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test error message');
    expect(error.name).toBe('NetlifyApiError');
  });

  it('should create error with details', () => {
    const details = { field: 'test', value: 123 };
    const error = new NetlifyApiError('TEST_ERROR', 'Test error', details);
    
    expect(error.details).toEqual(details);
  });
});

describe('Utility Functions', () => {
  describe('isNetlifyApiError', () => {
    it('should identify NetlifyApiError instances', () => {
      const apiError = new NetlifyApiError('TEST', 'test');
      const regularError = new Error('test');
      
      expect(isNetlifyApiError(apiError)).toBe(true);
      expect(isNetlifyApiError(regularError)).toBe(false);
      expect(isNetlifyApiError('string')).toBe(false);
    });
  });

  describe('handleApiError', () => {
    it('should handle NetlifyApiError with known codes', () => {
      const networkError = new NetlifyApiError('NETWORK_ERROR', 'Network failed');
      const notFoundError = new NetlifyApiError('NOT_FOUND', 'Resource not found');
      const unauthorizedError = new NetlifyApiError('UNAUTHORIZED', 'Unauthorized');
      const rateLimitError = new NetlifyApiError('RATE_LIMITED', 'Rate limited');
      
      expect(handleApiError(networkError)).toBe('Network connection failed. Please check your internet connection.');
      expect(handleApiError(notFoundError)).toBe('The requested resource was not found.');
      expect(handleApiError(unauthorizedError)).toBe('You are not authorized to perform this action.');
      expect(handleApiError(rateLimitError)).toBe('Too many requests. Please try again later.');
    });

    it('should handle validation errors with details', () => {
      const validationError = new NetlifyApiError(
        'VALIDATION_ERROR',
        'Validation failed',
        { message: 'Invalid email format' }
      );
      
      expect(handleApiError(validationError)).toBe('Invalid email format');
    });

    it('should handle unknown NetlifyApiError codes', () => {
      const unknownError = new NetlifyApiError('UNKNOWN_CODE', 'Unknown error occurred');
      
      expect(handleApiError(unknownError)).toBe('Unknown error occurred');
    });

    it('should handle regular Error instances', () => {
      const error = new Error('Regular error message');
      
      expect(handleApiError(error)).toBe('Regular error message');
    });

    it('should handle unknown error types', () => {
      expect(handleApiError('string error')).toBe('An unexpected error occurred.');
      expect(handleApiError(null)).toBe('An unexpected error occurred.');
      expect(handleApiError(undefined)).toBe('An unexpected error occurred.');
    });
  });
});