// Comprehensive unit tests for Netlify API Client

import {
  NetlifyApiClient,
  NetlifyApiError,
  netlifyApi,
  createNetlifyApiClient,
  isNetlifyApiError,
  handleApiError
} from '../../lib/netlify-api';

import {
  createMockSite,
  createMockExtension,
  createMockPerformanceMetrics,
  createMockExtensionConfig,
  createMockRecommendation,
  mockApiErrors,
  createBulkOperationData,
  createWebSocketMessage,
  assertionHelpers
} from '../factories/netlify-factory';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation((url) => ({
  url,
  readyState: 1,
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

describe('NetlifyApiClient', () => {
  let client: NetlifyApiClient;

  beforeEach(() => {
    client = new NetlifyApiClient('/api/test', 'test-api-key');
    mockFetch.mockClear();
    jest.clearAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default parameters', () => {
      const defaultClient = new NetlifyApiClient();
      expect(defaultClient).toBeInstanceOf(NetlifyApiClient);
    });

    it('should initialize with custom base URL and API key', () => {
      const customClient = new NetlifyApiClient('https://custom-api.com', 'custom-key');
      expect(customClient).toBeInstanceOf(NetlifyApiClient);
    });

    it('should remove trailing slash from base URL', () => {
      const clientWithSlash = new NetlifyApiClient('/api/test/');
      expect(clientWithSlash).toBeInstanceOf(NetlifyApiClient);
    });
  });

  describe('Extensions API', () => {
    describe('getExtensions', () => {
      it('should fetch all extensions successfully', async () => {
        const mockExtensions = [
          createMockExtension({ id: 'ext-1', name: 'Extension 1' }),
          createMockExtension({ id: 'ext-2', name: 'Extension 2' })
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { extensions: mockExtensions, total: 2, categories: ['performance', 'security'] },
            timestamp: new Date()
          })
        } as Response);

        const result = await client.getExtensions();

        expect(mockFetch).toHaveBeenCalledWith('/api/test/extensions', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }
        });
        expect(result).toEqual(mockExtensions);
      });

      it('should handle API errors gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => mockApiErrors.notFound
        } as Response);

        await expect(client.getExtensions()).rejects.toThrow(NetlifyApiError);
        await expect(client.getExtensions()).rejects.toThrow('Resource not found');
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(client.getExtensions()).rejects.toThrow(NetlifyApiError);
        await expect(client.getExtensions()).rejects.toThrow('Network error occurred');
      });
    });

    describe('getSiteExtensions', () => {
      it('should fetch site-specific extensions', async () => {
        const siteId = 'test-site-1';
        const mockResponse = {
          siteId,
          extensions: [createMockExtension()],
          recommendations: [createMockRecommendation()],
          performance: createMockPerformanceMetrics()
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockResponse,
            timestamp: new Date()
          })
        } as Response);

        const result = await client.getSiteExtensions(siteId);

        expect(mockFetch).toHaveBeenCalledWith(`/api/test/sites/${siteId}/extensions`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }
        });
        expect(result).toEqual(mockResponse);
      });
    });

    describe('enableExtension', () => {
      it('should enable extension successfully', async () => {
        const siteId = 'test-site';
        const extensionId = 'test-extension';
        const mockExtension = createMockExtension({ id: extensionId, isEnabled: true });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockExtension,
            timestamp: new Date()
          })
        } as Response);

        const result = await client.enableExtension(siteId, extensionId);

        expect(mockFetch).toHaveBeenCalledWith(`/api/test/sites/${siteId}/extensions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          },
          body: JSON.stringify({ extensionId })
        });
        expect(result).toEqual(mockExtension);
        expect(result.isEnabled).toBe(true);
      });

      it('should handle validation errors', async () => {
        const siteId = 'test-site';
        const extensionId = '';

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => mockApiErrors.validationError
        } as Response);

        await expect(client.enableExtension(siteId, extensionId)).rejects.toThrow(NetlifyApiError);
      });
    });

    describe('disableExtension', () => {
      it('should disable extension successfully', async () => {
        const siteId = 'test-site';
        const extensionId = 'test-extension';

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: null,
            timestamp: new Date()
          })
        } as Response);

        await client.disableExtension(siteId, extensionId);

        expect(mockFetch).toHaveBeenCalledWith(`/api/test/sites/${siteId}/extensions/${extensionId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }
        });
      });
    });
  });

  describe('Configuration API', () => {
    describe('getExtensionConfig', () => {
      it('should fetch extension configuration', async () => {
        const siteId = 'test-site';
        const extensionId = 'test-extension';
        const mockConfig = createMockExtensionConfig();

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockConfig,
            timestamp: new Date()
          })
        } as Response);

        const result = await client.getExtensionConfig(siteId, extensionId);

        expect(result).toEqual(mockConfig);
      });

      it('should return null for non-existent config', async () => {
        const siteId = 'test-site';
        const extensionId = 'test-extension';

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => mockApiErrors.notFound
        } as Response);

        const result = await client.getExtensionConfig(siteId, extensionId);
        expect(result).toBeNull();
      });
    });

    describe('updateExtensionConfig', () => {
      it('should update extension configuration', async () => {
        const siteId = 'test-site';
        const extensionId = 'test-extension';
        const config = { threshold: 100, enabled: true };
        const mockUpdatedConfig = createMockExtensionConfig({ config });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockUpdatedConfig,
            timestamp: new Date()
          })
        } as Response);

        const result = await client.updateExtensionConfig(siteId, extensionId, config);

        expect(mockFetch).toHaveBeenCalledWith(`/api/test/extension-config/${siteId}/${extensionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          },
          body: JSON.stringify({ config })
        });
        expect(result).toEqual(mockUpdatedConfig);
      });
    });
  });

  describe('Recommendations API', () => {
    describe('getRecommendations', () => {
      it('should fetch ML recommendations', async () => {
        const siteId = 'test-site';
        const mockRecommendations = [
          createMockRecommendation({ confidence: 0.95 }),
          createMockRecommendation({ confidence: 0.87 })
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { recommendations: mockRecommendations },
            timestamp: new Date()
          })
        } as Response);

        const result = await client.getRecommendations(siteId);

        expect(result).toEqual(mockRecommendations);
        expect(result).toHaveLength(2);
        expect(result[0].confidence).toBeGreaterThan(result[1].confidence);
      });
    });
  });

  describe('Performance Metrics API', () => {
    describe('getPerformanceMetrics', () => {
      it('should fetch performance metrics with default timeRange', async () => {
        const siteId = 'test-site';
        const mockMetrics = [
          createMockPerformanceMetrics({ timestamp: new Date('2024-01-20T10:00:00Z') }),
          createMockPerformanceMetrics({ timestamp: new Date('2024-01-20T11:00:00Z') })
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: mockMetrics,
            timestamp: new Date()
          })
        } as Response);

        const result = await client.getPerformanceMetrics(siteId);

        expect(mockFetch).toHaveBeenCalledWith(`/api/test/sites/${siteId}/metrics?timeRange=24h`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }
        });
        expect(result).toEqual(mockMetrics);
      });

      it('should fetch metrics with custom timeRange', async () => {
        const siteId = 'test-site';
        const timeRange = '7d';

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [],
            timestamp: new Date()
          })
        } as Response);

        await client.getPerformanceMetrics(siteId, timeRange);

        expect(mockFetch).toHaveBeenCalledWith(`/api/test/sites/${siteId}/metrics?timeRange=${timeRange}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          }
        });
      });
    });
  });

  describe('Sites API', () => {
    describe('getSites', () => {
      it('should return mock Candlefish sites', async () => {
        const sites = await client.getSites();

        expect(sites).toHaveLength(8);
        expect(sites[0].name).toBe('Candlefish AI');
        expect(sites[0].url).toBe('https://candlefish.ai');

        // Validate all sites have required properties
        sites.forEach(site => {
          expect(site).toHaveProperty('id');
          expect(site).toHaveProperty('name');
          expect(site).toHaveProperty('url');
          expect(site).toHaveProperty('status');
        });
      });
    });
  });

  describe('Utility Methods', () => {
    describe('healthCheck', () => {
      it('should return ok status on successful health check', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { status: 'ok' },
            timestamp: new Date()
          })
        } as Response);

        const result = await client.healthCheck();

        expect(result.status).toBe('ok');
        expect(result.timestamp).toBeInstanceOf(Date);
      });

      it('should return error status on failed health check', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Health check failed'));

        const result = await client.healthCheck();

        expect(result.status).toBe('error');
        expect(result.timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('Batch Operations', () => {
    describe('batchToggleExtensions', () => {
      it('should successfully process batch operations', async () => {
        const { operations } = createBulkOperationData();

        // Mock successful responses for all operations
        operations.forEach((_, index) => {
          if (operations[index].action === 'enable') {
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                success: true,
                data: createMockExtension({ isEnabled: true }),
                timestamp: new Date()
              })
            } as Response);
          } else {
            mockFetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({
                success: true,
                data: null,
                timestamp: new Date()
              })
            } as Response);
          }
        });

        const result = await client.batchToggleExtensions(operations);

        expect(result.success).toBe(operations.length);
        expect(result.failed).toBe(0);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle partial failures in batch operations', async () => {
        const { operations } = createBulkOperationData();

        // Mock mixed success/failure responses
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: createMockExtension(), timestamp: new Date() })
          } as Response)
          .mockResolvedValueOnce({
            ok: false,
            status: 404,
            json: async () => mockApiErrors.notFound
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, data: null, timestamp: new Date() })
          } as Response);

        const result = await client.batchToggleExtensions(operations.slice(0, 3));

        expect(result.success).toBe(2);
        expect(result.failed).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].error).toContain('Resource not found');
      });
    });
  });

  describe('WebSocket Connection', () => {
    it('should create WebSocket connection successfully', () => {
      // Mock window object
      Object.defineProperty(window, 'WebSocket', {
        writable: true,
        value: jest.fn().mockImplementation((url) => ({
          url,
          readyState: 1,
          close: jest.fn(),
          send: jest.fn()
        }))
      });

      const siteId = 'test-site';
      const ws = client.createWebSocketConnection(siteId);

      expect(ws).toBeDefined();
      expect(WebSocket).toHaveBeenCalledWith(`ws://test/ws/sites/${siteId}`);
    });

    it('should handle WebSocket creation errors', () => {
      const originalWebSocket = global.WebSocket;
      global.WebSocket = jest.fn().mockImplementation(() => {
        throw new Error('WebSocket not supported');
      });

      const siteId = 'test-site';
      const ws = client.createWebSocketConnection(siteId);

      expect(ws).toBeNull();

      global.WebSocket = originalWebSocket;
    });

    it('should return null in SSR environment', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const siteId = 'test-site';
      const ws = client.createWebSocketConnection(siteId);

      expect(ws).toBeNull();

      global.window = originalWindow;
    });
  });
});

describe('NetlifyApiError', () => {
  it('should create error with code and message', () => {
    const error = new NetlifyApiError('TEST_ERROR', 'Test error message');

    expect(error.name).toBe('NetlifyApiError');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test error message');
    expect(error.details).toBeUndefined();
  });

  it('should create error with additional details', () => {
    const details = { field: 'test', value: 123 };
    const error = new NetlifyApiError('TEST_ERROR', 'Test error message', details);

    expect(error.details).toEqual(details);
  });
});

describe('Utility Functions', () => {
  describe('createNetlifyApiClient', () => {
    it('should create new client instance', () => {
      const client = createNetlifyApiClient('https://custom-api.com', 'custom-key');
      expect(client).toBeInstanceOf(NetlifyApiClient);
    });
  });

  describe('isNetlifyApiError', () => {
    it('should identify NetlifyApiError instances', () => {
      const netlifyError = new NetlifyApiError('TEST', 'Test');
      const regularError = new Error('Regular error');

      expect(isNetlifyApiError(netlifyError)).toBe(true);
      expect(isNetlifyApiError(regularError)).toBe(false);
      expect(isNetlifyApiError(null)).toBe(false);
      expect(isNetlifyApiError(undefined)).toBe(false);
    });
  });

  describe('handleApiError', () => {
    it('should handle NetlifyApiError with known codes', () => {
      const networkError = new NetlifyApiError('NETWORK_ERROR', 'Network failed');
      const notFoundError = new NetlifyApiError('NOT_FOUND', 'Not found');
      const unauthorizedError = new NetlifyApiError('UNAUTHORIZED', 'Unauthorized');
      const rateLimitError = new NetlifyApiError('RATE_LIMITED', 'Rate limited');

      expect(handleApiError(networkError)).toBe('Network connection failed. Please check your internet connection.');
      expect(handleApiError(notFoundError)).toBe('The requested resource was not found.');
      expect(handleApiError(unauthorizedError)).toBe('You are not authorized to perform this action.');
      expect(handleApiError(rateLimitError)).toBe('Too many requests. Please try again later.');
    });

    it('should handle NetlifyApiError with validation details', () => {
      const validationError = new NetlifyApiError('VALIDATION_ERROR', 'Invalid data', {
        message: 'Custom validation message'
      });

      expect(handleApiError(validationError)).toBe('Custom validation message');
    });

    it('should handle unknown NetlifyApiError codes', () => {
      const unknownError = new NetlifyApiError('UNKNOWN_CODE', 'Unknown error');

      expect(handleApiError(unknownError)).toBe('Unknown error');
    });

    it('should handle regular Error instances', () => {
      const regularError = new Error('Regular error message');

      expect(handleApiError(regularError)).toBe('Regular error message');
    });

    it('should handle non-Error values', () => {
      expect(handleApiError('string error')).toBe('An unexpected error occurred.');
      expect(handleApiError(null)).toBe('An unexpected error occurred.');
      expect(handleApiError(undefined)).toBe('An unexpected error occurred.');
    });
  });
});

describe('Singleton Instance', () => {
  it('should export singleton netlifyApi instance', () => {
    expect(netlifyApi).toBeInstanceOf(NetlifyApiClient);
  });
});

describe('Error Handling Integration', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should handle malformed JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('Invalid JSON');
      }
    } as Response);

    await expect(client.getExtensions()).rejects.toThrow(NetlifyApiError);
    await expect(client.getExtensions()).rejects.toThrow('Internal Server Error');
  });

  it('should handle empty error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: '',
      json: async () => {
        throw new Error('Invalid JSON');
      }
    } as Response);

    await expect(client.getExtensions()).rejects.toThrow('An error occurred');
  });
});
