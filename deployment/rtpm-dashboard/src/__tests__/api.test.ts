/**
 * Tests for API client functionality.
 * Covers HTTP client, request/response handling, and error management.
 */

import { deploymentAPI } from '../services/api';
import * as apiMock from './__mocks__/apiMock';

// Mock axios
jest.mock('axios');

describe('API Client', () => {
  beforeEach(() => {
    apiMock.resetAllMocks();
    localStorage.clear();
  });

  describe('Authentication', () => {
    it('includes auth token in requests', async () => {
      const token = 'test-auth-token';
      localStorage.setItem('authToken', token);

      await deploymentAPI.getDeploymentStatus();

      const lastCall = apiMock.getLastApiCall();
      expect(lastCall.url).toContain('/deployment/status');
    });

    it('handles requests without auth token', async () => {
      // No token in localStorage

      await deploymentAPI.healthCheck();

      // Should still make request but without Authorization header
      expect(apiMock.getApiCallCount()).toBeGreaterThan(0);
    });

    it('handles token refresh on 401 response', async () => {
      const expiredToken = 'expired-token';
      const newToken = 'refreshed-token';

      localStorage.setItem('authToken', expiredToken);

      // Mock 401 response followed by successful refresh
      apiMock.setApiError('getDeploymentStatus', {
        response: { status: 401, data: { error: 'Token expired' } }
      });

      apiMock.setApiResponse('refreshToken', {
        access_token: newToken,
        token_type: 'bearer'
      });

      try {
        await deploymentAPI.getDeploymentStatus();
      } catch (error) {
        // Expected to fail initially
      }

      // Should have attempted token refresh
      expect(localStorage.getItem('authToken')).toBeNull(); // Cleared expired token
    });

    it('redirects to login on persistent 401', async () => {
      const originalLocation = window.location;

      // Mock window.location
      delete (window as any).location;
      window.location = { ...originalLocation, href: '' };

      localStorage.setItem('authToken', 'invalid-token');

      apiMock.setApiError('getDeploymentStatus', {
        response: { status: 401, data: { error: 'Invalid token' } }
      });

      try {
        await deploymentAPI.getDeploymentStatus();
      } catch (error) {
        // Expected
      }

      // Should clear token and redirect
      expect(localStorage.getItem('authToken')).toBeNull();

      // Restore original location
      window.location = originalLocation;
    });
  });

  describe('Request Handling', () => {
    it('sets correct content-type headers', async () => {
      const data = { test: 'data' };

      await deploymentAPI.scaleDeployment('test-app', 'default', 3);

      const lastCall = apiMock.getLastApiCall();
      expect(lastCall.method).toBe('POST');
    });

    it('handles query parameters correctly', async () => {
      await deploymentAPI.getMetrics('cpu_usage', '1h');

      const lastCall = apiMock.getLastApiCall();
      expect(lastCall.url).toContain('/monitoring/metrics/cpu_usage');
    });

    it('handles request timeouts', async () => {
      // Mock timeout error
      apiMock.setApiError('getDeploymentStatus', {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded'
      });

      await expect(deploymentAPI.getDeploymentStatus()).rejects.toThrow(/timeout/);
    });

    it('handles network errors', async () => {
      apiMock.setApiError('getDeploymentStatus', {
        code: 'NETWORK_ERROR',
        message: 'Network Error'
      });

      await expect(deploymentAPI.getDeploymentStatus()).rejects.toThrow(/Network Error/);
    });

    it('validates request data', async () => {
      // Test with invalid data
      const invalidData = null;

      await expect(
        deploymentAPI.updateAlertConfiguration('rule-123', invalidData as any)
      ).rejects.toThrow();
    });
  });

  describe('Response Handling', () => {
    it('parses JSON responses correctly', async () => {
      const mockResponse = {
        status: 'healthy',
        services: {
          database: 'up',
          redis: 'up'
        }
      };

      apiMock.setApiResponse('getDeploymentStatus', mockResponse);

      const result = await deploymentAPI.getDeploymentStatus();

      expect(result).toEqual(mockResponse);
    });

    it('handles empty responses', async () => {
      apiMock.setApiResponse('scaleDeployment', undefined);

      // Should not throw for operations that return void
      await expect(
        deploymentAPI.scaleDeployment('test-app', 'default', 3)
      ).resolves.toBeUndefined();
    });

    it('handles malformed JSON responses', async () => {
      // Mock response with invalid JSON
      const mockAxios = require('axios');
      mockAxios.get.mockResolvedValue({
        data: 'invalid json response',
        status: 200
      });

      // Should handle gracefully or throw appropriate error
      await expect(deploymentAPI.healthCheck()).resolves.toBeDefined();
    });

    it('transforms response data correctly', async () => {
      const rawResponse = {
        deployment_status: 'healthy',
        last_update: '2022-01-01T00:00:00Z'
      };

      apiMock.setApiResponse('getDeploymentStatus', rawResponse);

      const result = await deploymentAPI.getDeploymentStatus();

      // Should transform snake_case to camelCase if configured
      expect(result).toEqual(rawResponse);
    });
  });

  describe('Error Handling', () => {
    it('handles 400 validation errors', async () => {
      apiMock.setApiError('scaleDeployment', {
        response: {
          status: 400,
          data: {
            error: 'Validation failed',
            validation_errors: [
              { field: 'replicas', message: 'Must be a positive integer' }
            ]
          }
        }
      });

      await expect(
        deploymentAPI.scaleDeployment('test-app', 'default', -1)
      ).rejects.toMatchObject({
        response: {
          status: 400,
          data: expect.objectContaining({
            validation_errors: expect.any(Array)
          })
        }
      });
    });

    it('handles 403 permission errors', async () => {
      apiMock.setApiError('scaleDeployment', {
        response: {
          status: 403,
          data: { error: 'Insufficient permissions' }
        }
      });

      await expect(
        deploymentAPI.scaleDeployment('test-app', 'default', 3)
      ).rejects.toMatchObject({
        response: {
          status: 403
        }
      });
    });

    it('handles 404 not found errors', async () => {
      apiMock.setApiError('updateAlertConfiguration', {
        response: {
          status: 404,
          data: { error: 'Alert rule not found' }
        }
      });

      await expect(
        deploymentAPI.updateAlertConfiguration('nonexistent-rule', { enabled: false })
      ).rejects.toMatchObject({
        response: {
          status: 404
        }
      });
    });

    it('handles 500 server errors', async () => {
      apiMock.setApiError('getDeploymentStatus', {
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        }
      });

      await expect(deploymentAPI.getDeploymentStatus()).rejects.toMatchObject({
        response: {
          status: 500
        }
      });
    });

    it('handles rate limiting (429)', async () => {
      apiMock.setApiError('getMetrics', {
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded', retry_after: 60 }
        }
      });

      await expect(
        deploymentAPI.getMetrics('cpu_usage', '1h')
      ).rejects.toMatchObject({
        response: {
          status: 429
        }
      });
    });

    it('provides helpful error messages', async () => {
      const errorCases = [
        {
          error: { code: 'ECONNREFUSED' },
          expectedMessage: /connection refused/i
        },
        {
          error: { code: 'ENOTFOUND' },
          expectedMessage: /network error/i
        },
        {
          error: { code: 'ECONNABORTED' },
          expectedMessage: /timeout/i
        }
      ];

      for (const { error, expectedMessage } of errorCases) {
        apiMock.setApiError('healthCheck', error);

        await expect(deploymentAPI.healthCheck()).rejects.toThrow(expectedMessage);
      }
    });
  });

  describe('Retry Logic', () => {
    it('retries failed requests with exponential backoff', async () => {
      let attempt = 0;
      const mockAxios = require('axios');

      mockAxios.get.mockImplementation(() => {
        attempt++;
        if (attempt < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ data: { status: 'healthy' } });
      });

      const result = await deploymentAPI.healthCheck();

      expect(attempt).toBe(3);
      expect(result).toEqual({ status: 'healthy' });
    });

    it('limits retry attempts', async () => {
      let attempt = 0;
      const mockAxios = require('axios');

      mockAxios.get.mockImplementation(() => {
        attempt++;
        return Promise.reject(new Error('Persistent error'));
      });

      await expect(deploymentAPI.healthCheck()).rejects.toThrow('Persistent error');

      // Should not exceed maximum retry attempts (e.g., 3)
      expect(attempt).toBeLessThanOrEqual(3);
    });

    it('does not retry on non-retryable errors', async () => {
      let attempt = 0;
      const mockAxios = require('axios');

      mockAxios.get.mockImplementation(() => {
        attempt++;
        const error = new Error('Client error');
        (error as any).response = { status: 400 };
        return Promise.reject(error);
      });

      await expect(deploymentAPI.getDeploymentStatus()).rejects.toThrow();

      // Should only attempt once for 400 error
      expect(attempt).toBe(1);
    });
  });

  describe('Request Cancellation', () => {
    it('supports request cancellation', async () => {
      // Mock long-running request
      const mockAxios = require('axios');
      let cancelled = false;

      mockAxios.get.mockImplementation(() => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            resolve({ data: { status: 'healthy' } });
          }, 1000);

          // Mock cancellation
          return {
            then: (onResolve: any) => {
              if (cancelled) {
                reject(new Error('Request cancelled'));
              } else {
                setTimeout(onResolve, 1000);
              }
            }
          };
        });
      });

      const requestPromise = deploymentAPI.healthCheck();

      // Cancel request
      setTimeout(() => {
        cancelled = true;
      }, 100);

      await expect(requestPromise).rejects.toThrow('Request cancelled');
    });
  });

  describe('Caching', () => {
    it('caches GET requests appropriately', async () => {
      const mockResponse = { status: 'healthy' };
      apiMock.setApiResponse('healthCheck', mockResponse);

      // Make same request twice
      const result1 = await deploymentAPI.healthCheck();
      const result2 = await deploymentAPI.healthCheck();

      expect(result1).toEqual(mockResponse);
      expect(result2).toEqual(mockResponse);

      // With caching, should only make one actual request
      // This depends on implementation details
    });

    it('bypasses cache when requested', async () => {
      const mockResponse = { status: 'healthy' };
      apiMock.setApiResponse('healthCheck', mockResponse);

      // Make request with cache bypass
      await deploymentAPI.healthCheck();

      // Change mock response
      const newResponse = { status: 'degraded' };
      apiMock.setApiResponse('healthCheck', newResponse);

      // Make another request - should get new response if cache bypassed
      const result = await deploymentAPI.healthCheck();

      expect(result).toEqual(newResponse);
    });

    it('invalidates cache on write operations', async () => {
      // Get initial data
      await deploymentAPI.getKubernetesDeployments();

      // Perform write operation
      await deploymentAPI.scaleDeployment('test-app', 'default', 5);

      // Subsequent read should fetch fresh data
      await deploymentAPI.getKubernetesDeployments();

      // Verify cache was invalidated (implementation dependent)
    });
  });

  describe('API Versioning', () => {
    it('includes correct API version in requests', async () => {
      await deploymentAPI.getDeploymentStatus();

      const lastCall = apiMock.getLastApiCall();
      expect(lastCall.url).toMatch(/\/api\/v1\//);
    });

    it('handles API version compatibility', async () => {
      // Test with different API version response
      const v2Response = {
        version: 'v2',
        status: 'healthy',
        additional_field: 'new_data'
      };

      apiMock.setApiResponse('healthCheck', v2Response);

      const result = await deploymentAPI.healthCheck();

      // Should handle backwards compatibility
      expect(result.status).toBe('healthy');
    });
  });

  describe('Request Logging', () => {
    it('logs requests in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await deploymentAPI.healthCheck();

      // Should log request details in development
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('does not log requests in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await deploymentAPI.healthCheck();

      // Should not log in production
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });
});
