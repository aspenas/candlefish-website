import { renderHook, waitFor, act } from '@testing-library/react';
import { server } from '../mocks/animation-api.mock';
import { AnimationConfigFactory } from '../factories/animation-updated.factory';
import { useAnimationConfig } from '../../hooks/useAnimationConfig';
import { rest } from 'msw';

// Mock the API base URL
const mockApiBase = '/api';
Object.defineProperty(process.env, 'NEXT_PUBLIC_API_BASE_URL', {
  value: mockApiBase,
  writable: true
});

const testAnimationId = 'test-animation-123';

describe('useAnimationConfig', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    // Clear any cached data
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('fetchConfig', () => {
    it('should fetch animation configuration successfully', async () => {
      const mockConfig = AnimationConfigFactory.create({ 
        animationId: testAnimationId 
      });

      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          return res(ctx.json({
            success: true,
            data: mockConfig,
            timestamp: new Date().toISOString()
          }));
        })
      );

      const { result } = renderHook(() => useAnimationConfig(testAnimationId));

      expect(result.current.loading).toBe(true);
      expect(result.current.config).toBe(null);
      expect(result.current.error).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.config).toEqual(mockConfig);
        expect(result.current.error).toBe(null);
      });
    });

    it('should handle API errors gracefully', async () => {
      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          return res(
            ctx.status(404),
            ctx.json({
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Animation configuration not found'
              }
            })
          );
        })
      );

      const { result } = renderHook(() => useAnimationConfig(testAnimationId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.config).toBe(null);
        expect(result.current.error).toBe('Animation configuration not found');
      });
    });

    it('should handle network errors', async () => {
      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res) => {
          return res.networkError('Network connection failed');
        })
      );

      const { result } = renderHook(() => useAnimationConfig(testAnimationId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.config).toBe(null);
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should use cached configuration when available', async () => {
      const mockConfig = AnimationConfigFactory.create({ 
        animationId: testAnimationId 
      });

      let requestCount = 0;
      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          requestCount++;
          return res(ctx.json({
            success: true,
            data: mockConfig,
            timestamp: new Date().toISOString()
          }));
        })
      );

      // First render
      const { result, rerender } = renderHook(() => useAnimationConfig(testAnimationId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.config).toEqual(mockConfig);
      });

      expect(requestCount).toBe(1);

      // Second render with same animation ID - should use cache
      rerender();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.config).toEqual(mockConfig);
      });

      // Should still be 1 request due to caching
      expect(requestCount).toBe(1);
    });

    it('should refresh cache when explicitly requested', async () => {
      const mockConfig = AnimationConfigFactory.create({ 
        animationId: testAnimationId 
      });
      const updatedConfig = AnimationConfigFactory.create({ 
        animationId: testAnimationId,
        speed: 2.0
      });

      let requestCount = 0;
      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          requestCount++;
          return res(ctx.json({
            success: true,
            data: requestCount === 1 ? mockConfig : updatedConfig,
            timestamp: new Date().toISOString()
          }));
        })
      );

      const { result } = renderHook(() => useAnimationConfig(testAnimationId));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.config).toEqual(mockConfig);
      });

      // Refresh configuration
      act(() => {
        result.current.refreshConfig();
      });

      await waitFor(() => {
        expect(result.current.config).toEqual(updatedConfig);
      });

      expect(requestCount).toBe(2);
    });
  });

  describe('updateConfig', () => {
    it('should update animation configuration successfully', async () => {
      const originalConfig = AnimationConfigFactory.create({ 
        animationId: testAnimationId,
        speed: 1.0
      });
      const updates = { speed: 2.0 };
      const updatedConfig = { ...originalConfig, ...updates };

      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          return res(ctx.json({
            success: true,
            data: originalConfig,
            timestamp: new Date().toISOString()
          }));
        }),
        rest.put(`${mockApiBase}/animation/config/${testAnimationId}`, async (req, res, ctx) => {
          const body = await req.json();
          expect(body).toEqual(updates);
          
          return res(ctx.json({
            success: true,
            data: updatedConfig,
            timestamp: new Date().toISOString()
          }));
        })
      );

      const { result } = renderHook(() => useAnimationConfig(testAnimationId));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.config).toEqual(originalConfig);
      });

      // Update configuration
      act(() => {
        result.current.updateConfig(updates);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.config?.speed).toBe(2.0);
      });
    });

    it('should handle update errors', async () => {
      const originalConfig = AnimationConfigFactory.create({ 
        animationId: testAnimationId 
      });

      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          return res(ctx.json({
            success: true,
            data: originalConfig,
            timestamp: new Date().toISOString()
          }));
        }),
        rest.put(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid configuration values'
              }
            })
          );
        })
      );

      const { result } = renderHook(() => useAnimationConfig(testAnimationId));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.config).toEqual(originalConfig);
      });

      // Attempt to update with invalid data
      let updateError;
      await act(async () => {
        try {
          await result.current.updateConfig({ speed: -1 });
        } catch (error) {
          updateError = error;
        }
      });

      expect(updateError).toBeDefined();
      expect(result.current.error).toBe('Invalid configuration values');
    });
  });

  describe('cache management', () => {
    it('should expire cached data after TTL', async () => {
      const mockConfig = AnimationConfigFactory.create({ 
        animationId: testAnimationId 
      });

      let requestCount = 0;
      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          requestCount++;
          return res(ctx.json({
            success: true,
            data: mockConfig,
            timestamp: new Date().toISOString()
          }));
        })
      );

      const { result } = renderHook(() => useAnimationConfig(testAnimationId));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.config).toEqual(mockConfig);
      });

      expect(requestCount).toBe(1);

      // Check if cache is stale (should not be initially)
      expect(result.current.isStale()).toBe(false);

      // Mock time passage (beyond TTL of 5 minutes)
      jest.spyOn(Date, 'now').mockImplementation(() => Date.now() + 6 * 60 * 1000);

      // Check if cache is now stale
      expect(result.current.isStale()).toBe(true);

      jest.restoreAllMocks();
    });

    it('should clean up expired cache entries', async () => {
      const mockConfig = AnimationConfigFactory.create({ 
        animationId: testAnimationId 
      });

      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          return res(ctx.json({
            success: true,
            data: mockConfig,
            timestamp: new Date().toISOString()
          }));
        })
      );

      const { result, unmount } = renderHook(() => useAnimationConfig(testAnimationId));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.config).toEqual(mockConfig);
      });

      // Mock time passage to trigger cache cleanup
      jest.useFakeTimers();
      
      // Fast forward time to trigger cache cleanup interval
      act(() => {
        jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes
      });

      jest.useRealTimers();

      // Verify cache cleanup occurred (cache should be stale)
      expect(result.current.isStale()).toBe(true);

      unmount();
    });
  });

  describe('edge cases', () => {
    it('should handle empty animation ID', () => {
      const { result } = renderHook(() => useAnimationConfig(''));

      expect(result.current.loading).toBe(true);
      expect(result.current.config).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should handle animation ID changes', async () => {
      const config1 = AnimationConfigFactory.create({ animationId: 'animation-1' });
      const config2 = AnimationConfigFactory.create({ animationId: 'animation-2' });

      server.use(
        rest.get(`${mockApiBase}/animation/config/animation-1`, (req, res, ctx) => {
          return res(ctx.json({
            success: true,
            data: config1,
            timestamp: new Date().toISOString()
          }));
        }),
        rest.get(`${mockApiBase}/animation/config/animation-2`, (req, res, ctx) => {
          return res(ctx.json({
            success: true,
            data: config2,
            timestamp: new Date().toISOString()
          }));
        })
      );

      const { result, rerender } = renderHook(
        ({ animationId }) => useAnimationConfig(animationId),
        { initialProps: { animationId: 'animation-1' } }
      );

      // Wait for first config to load
      await waitFor(() => {
        expect(result.current.config).toEqual(config1);
      });

      // Change animation ID
      rerender({ animationId: 'animation-2' });

      // Wait for second config to load
      await waitFor(() => {
        expect(result.current.config).toEqual(config2);
      });
    });

    it('should handle malformed API responses', async () => {
      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          return res(ctx.json({ invalid: 'response' }));
        })
      );

      const { result } = renderHook(() => useAnimationConfig(testAnimationId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.config).toBe(null);
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('performance', () => {
    it('should debounce rapid configuration updates', async () => {
      const originalConfig = AnimationConfigFactory.create({ 
        animationId: testAnimationId,
        speed: 1.0
      });

      let updateCount = 0;
      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          return res(ctx.json({
            success: true,
            data: originalConfig,
            timestamp: new Date().toISOString()
          }));
        }),
        rest.put(`${mockApiBase}/animation/config/${testAnimationId}`, async (req, res, ctx) => {
          updateCount++;
          const body = await req.json();
          
          return res(ctx.json({
            success: true,
            data: { ...originalConfig, ...body },
            timestamp: new Date().toISOString()
          }));
        })
      );

      const { result } = renderHook(() => useAnimationConfig(testAnimationId));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.config).toEqual(originalConfig);
      });

      // Rapidly fire multiple updates
      act(() => {
        result.current.updateConfig({ speed: 1.5 });
        result.current.updateConfig({ speed: 2.0 });
        result.current.updateConfig({ speed: 2.5 });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have made fewer requests than updates due to debouncing
      expect(updateCount).toBeLessThan(3);
    });
  });
});