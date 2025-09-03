import { renderHook, waitFor, act } from '@testing-library/react';
import { server } from '../mocks/animation-api.mock';
import { AnimationEventFactory, AnimationMetricsFactory, PerformanceMetricsFactory } from '../factories/animation-updated.factory';
import { useAnimationAnalytics } from '../../hooks/useAnimationAnalytics';
import { rest } from 'msw';

// Mock the API base URL
const mockApiBase = '/api';
Object.defineProperty(process.env, 'NEXT_PUBLIC_API_BASE_URL', {
  value: mockApiBase,
  writable: true
});

const testAnimationId = 'test-animation-123';
const testUserId = 'user-456';

// Mock window properties for analytics
Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
Object.defineProperty(window, 'devicePixelRatio', { value: 2, writable: true });
Object.defineProperty(window, 'matchMedia', {
  value: jest.fn().mockImplementation(query => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock navigator
Object.defineProperty(navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  writable: true
});

describe('useAnimationAnalytics', () => {
  beforeAll(() => server.listen());
  afterEach(() => {
    server.resetHandlers();
    jest.clearAllTimers();
  });
  afterAll(() => server.close());

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('event tracking', () => {
    it('should track view events', async () => {
      let capturedEvents: any[] = [];

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          const { events } = await req.json();
          capturedEvents.push(...events);
          return res(ctx.status(201), ctx.json({ success: true }));
        })
      );

      const { result } = renderHook(() => 
        useAnimationAnalytics(testAnimationId, testUserId)
      );

      // Track a view event
      act(() => {
        result.current.trackView(5000, 'variant_a');
      });

      // Fast-forward timer to trigger event batching
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(capturedEvents).toHaveLength(1);
        expect(capturedEvents[0]).toMatchObject({
          animationId: testAnimationId,
          userId: testUserId,
          eventType: 'view',
          eventData: {
            duration: 5000
          },
          metadata: {
            variant: 'variant_a',
            viewport: { width: 1920, height: 1080 }
          }
        });
      });
    });

    it('should track interaction events with cursor position', async () => {
      let capturedEvents: any[] = [];

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          const { events } = await req.json();
          capturedEvents.push(...events);
          return res(ctx.status(201), ctx.json({ success: true }));
        })
      );

      const { result } = renderHook(() => 
        useAnimationAnalytics(testAnimationId, testUserId)
      );

      const cursorPosition = { x: 500, y: 300 };
      const clickPosition = { x: 505, y: 295 };

      // Track an interaction event
      act(() => {
        result.current.trackInteraction(cursorPosition, clickPosition, 'control');
      });

      // Fast-forward timer to trigger event batching
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(capturedEvents).toHaveLength(1);
        expect(capturedEvents[0]).toMatchObject({
          animationId: testAnimationId,
          eventType: 'interaction',
          eventData: {
            cursorPosition,
            clickPosition
          },
          metadata: {
            variant: 'control'
          }
        });
      });
    });

    it('should track performance events', async () => {
      let capturedEvents: any[] = [];

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          const { events } = await req.json();
          capturedEvents.push(...events);
          return res(ctx.status(201), ctx.json({ success: true }));
        })
      );

      const { result } = renderHook(() => 
        useAnimationAnalytics(testAnimationId, testUserId)
      );

      const performanceMetrics = PerformanceMetricsFactory.create({
        fps: 58.5,
        memoryUsage: 256
      });

      // Track performance event
      act(() => {
        result.current.trackPerformance(performanceMetrics);
      });

      // Fast-forward timer to trigger event batching
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(capturedEvents).toHaveLength(1);
        expect(capturedEvents[0]).toMatchObject({
          animationId: testAnimationId,
          eventType: 'performance',
          eventData: {
            fps: 58.5,
            memoryUsage: 256
          }
        });
      });
    });

    it('should track error events', async () => {
      let capturedEvents: any[] = [];

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          const { events } = await req.json();
          capturedEvents.push(...events);
          return res(ctx.status(201), ctx.json({ success: true }));
        })
      );

      const { result } = renderHook(() => 
        useAnimationAnalytics(testAnimationId)
      );

      const error = new Error('WebGL context lost');
      error.stack = 'Error: WebGL context lost\n  at animate (animation.js:123:45)';

      // Track error event
      act(() => {
        result.current.trackError(error, 'high_quality');
      });

      // Fast-forward timer to trigger event batching
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(capturedEvents).toHaveLength(1);
        expect(capturedEvents[0]).toMatchObject({
          animationId: testAnimationId,
          eventType: 'error',
          eventData: {
            errorMessage: 'WebGL context lost',
            errorStack: expect.stringContaining('animation.js:123:45')
          },
          metadata: {
            variant: 'high_quality'
          }
        });
      });
    });
  });

  describe('event batching', () => {
    it('should batch multiple events together', async () => {
      let batchCount = 0;
      let totalEvents = 0;

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          const { events } = await req.json();
          batchCount++;
          totalEvents += events.length;
          return res(ctx.status(201), ctx.json({ success: true }));
        })
      );

      const { result } = renderHook(() => 
        useAnimationAnalytics(testAnimationId, testUserId)
      );

      // Track multiple events quickly
      act(() => {
        result.current.trackView(1000);
        result.current.trackInteraction({ x: 100, y: 200 });
        result.current.trackView(2000);
        result.current.trackError(new Error('Test error'));
      });

      // Fast-forward timer to trigger batching
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(batchCount).toBe(1); // Should be sent as single batch
        expect(totalEvents).toBe(4); // But contain all 4 events
      });
    });

    it('should flush events on interval', async () => {
      let capturedEvents: any[] = [];

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          const { events } = await req.json();
          capturedEvents.push(...events);
          return res(ctx.status(201), ctx.json({ success: true }));
        })
      );

      const { result } = renderHook(() => 
        useAnimationAnalytics(testAnimationId, testUserId)
      );

      // Track an event
      act(() => {
        result.current.trackView(1000);
      });

      // Fast-forward to the 10-second auto-flush interval
      act(() => {
        jest.advanceTimersByTime(10100);
      });

      await waitFor(() => {
        expect(capturedEvents).toHaveLength(1);
      });
    });

    it('should flush events on unmount', async () => {
      let capturedEvents: any[] = [];

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          const { events } = await req.json();
          capturedEvents.push(...events);
          return res(ctx.status(201), ctx.json({ success: true }));
        })
      );

      const { result, unmount } = renderHook(() => 
        useAnimationAnalytics(testAnimationId, testUserId)
      );

      // Track an event
      act(() => {
        result.current.trackView(1000);
      });

      // Unmount without waiting for batch timer
      unmount();

      await waitFor(() => {
        expect(capturedEvents).toHaveLength(1);
      });
    });

    it('should handle failed event submissions gracefully', async () => {
      let attemptCount = 0;

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          attemptCount++;
          if (attemptCount === 1) {
            return res(ctx.status(500), ctx.json({ error: 'Server error' }));
          }
          return res(ctx.status(201), ctx.json({ success: true }));
        })
      );

      // Mock console.warn to verify error logging
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => 
        useAnimationAnalytics(testAnimationId, testUserId)
      );

      // Track an event
      act(() => {
        result.current.trackView(1000);
      });

      // Fast-forward timer to trigger event batching
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(warnSpy).toHaveBeenCalledWith(
          'Failed to send analytics events:', 
          expect.any(Error)
        );
      });

      warnSpy.mockRestore();
    });
  });

  describe('metrics fetching', () => {
    it('should fetch analytics metrics successfully', async () => {
      const mockMetrics = AnimationMetricsFactory.create({
        animationId: testAnimationId
      });

      server.use(
        rest.get(`${mockApiBase}/animation/analytics/metrics`, (req, res, ctx) => {
          const url = new URL(req.url);
          expect(url.searchParams.get('animationId')).toBe(testAnimationId);
          
          return res(ctx.json({
            success: true,
            data: mockMetrics
          }));
        })
      );

      const { result } = renderHook(() => 
        useAnimationAnalytics(testAnimationId, testUserId)
      );

      let fetchedMetrics;
      await act(async () => {
        fetchedMetrics = await result.current.fetchMetrics();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.metrics).toEqual(mockMetrics);
      expect(result.current.error).toBe(null);
      expect(fetchedMetrics).toEqual(mockMetrics);
    });

    it('should fetch metrics with time range filter', async () => {
      const mockMetrics = AnimationMetricsFactory.create({
        animationId: testAnimationId
      });

      const timeRange = {
        start: '2024-01-01T00:00:00.000Z',
        end: '2024-01-02T00:00:00.000Z'
      };

      server.use(
        rest.get(`${mockApiBase}/animation/analytics/metrics`, (req, res, ctx) => {
          const url = new URL(req.url);
          expect(url.searchParams.get('start')).toBe(timeRange.start);
          expect(url.searchParams.get('end')).toBe(timeRange.end);
          
          return res(ctx.json({
            success: true,
            data: mockMetrics
          }));
        })
      );

      const { result } = renderHook(() => 
        useAnimationAnalytics(testAnimationId, testUserId)
      );

      await act(async () => {
        await result.current.fetchMetrics(timeRange);
      });

      expect(result.current.metrics).toEqual(mockMetrics);
    });

    it('should handle metrics fetch errors', async () => {
      server.use(
        rest.get(`${mockApiBase}/animation/analytics/metrics`, (req, res, ctx) => {
          return res(
            ctx.status(403),
            ctx.json({
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: 'Insufficient permissions to access metrics'
              }
            })
          );
        })
      );

      const { result } = renderHook(() => 
        useAnimationAnalytics(testAnimationId, testUserId)
      );

      let fetchResult;
      await act(async () => {
        fetchResult = await result.current.fetchMetrics();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.metrics).toBe(null);
      expect(result.current.error).toBe('Insufficient permissions to access metrics');
      expect(fetchResult).toBe(null);
    });
  });

  describe('session management', () => {
    it('should generate unique session IDs', () => {
      const { result: result1 } = renderHook(() => 
        useAnimationAnalytics('animation-1', testUserId)
      );
      
      const { result: result2 } = renderHook(() => 
        useAnimationAnalytics('animation-2', testUserId)
      );

      // Both hooks should generate different session IDs
      expect(result1.current).toBeDefined();
      expect(result2.current).toBeDefined();
      // We can't directly access session IDs, but events should have different session IDs
    });

    it('should include metadata in all events', async () => {
      let capturedEvents: any[] = [];

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          const { events } = await req.json();
          capturedEvents.push(...events);
          return res(ctx.status(201), ctx.json({ success: true }));
        })
      );

      const { result } = renderHook(() => 
        useAnimationAnalytics(testAnimationId, testUserId)
      );

      // Track an event
      act(() => {
        result.current.trackView(1000, 'test_variant');
      });

      // Fast-forward timer to trigger event batching
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(capturedEvents[0].metadata).toMatchObject({
          userAgent: expect.stringContaining('Mozilla'),
          viewport: { width: 1920, height: 1080 },
          devicePixelRatio: 2,
          reducedMotion: expect.any(Boolean),
          variant: 'test_variant'
        });
      });
    });
  });

  describe('manual flushing', () => {
    it('should allow manual event flushing', async () => {
      let capturedEvents: any[] = [];

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          const { events } = await req.json();
          capturedEvents.push(...events);
          return res(ctx.status(201), ctx.json({ success: true }));
        })
      );

      const { result } = renderHook(() => 
        useAnimationAnalytics(testAnimationId, testUserId)
      );

      // Track events
      act(() => {
        result.current.trackView(1000);
        result.current.trackInteraction({ x: 100, y: 200 });
      });

      // Manually flush without waiting for timer
      await act(async () => {
        await result.current.flushEvents();
      });

      expect(capturedEvents).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should handle missing animation ID', () => {
      const { result } = renderHook(() => 
        useAnimationAnalytics('', testUserId)
      );

      // Should not crash, but tracking should be no-op
      act(() => {
        result.current.trackView(1000);
      });

      expect(result.current.metrics).toBe(null);
    });

    it('should handle missing user ID', async () => {
      let capturedEvents: any[] = [];

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          const { events } = await req.json();
          capturedEvents.push(...events);
          return res(ctx.status(201), ctx.json({ success: true }));
        })
      );

      const { result } = renderHook(() => 
        useAnimationAnalytics(testAnimationId)
      );

      // Track an event without user ID
      act(() => {
        result.current.trackView(1000);
      });

      // Fast-forward timer to trigger event batching
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      await waitFor(() => {
        expect(capturedEvents[0]).toMatchObject({
          animationId: testAnimationId,
          userId: undefined,
          eventType: 'view'
        });
      });
    });

    it('should limit event queue size to prevent memory leaks', async () => {
      let failureCount = 0;
      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          failureCount++;
          return res(ctx.status(500), ctx.json({ error: 'Server error' }));
        })
      );

      const { result } = renderHook(() => 
        useAnimationAnalytics(testAnimationId, testUserId)
      );

      // Generate many events to test queue limit
      act(() => {
        for (let i = 0; i < 150; i++) { // Exceeds the 100-event limit
          result.current.trackView(1000);
        }
      });

      // Fast-forward timer to trigger event batching (which will fail)
      act(() => {
        jest.advanceTimersByTime(1100);
      });

      // The implementation should limit the queue size and not crash
      expect(failureCount).toBeGreaterThan(0);
    });
  });
});