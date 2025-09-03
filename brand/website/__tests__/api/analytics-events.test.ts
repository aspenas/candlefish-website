import { AnimationEventFactory, AnimationMetricsFactory } from '../factories/animation-updated.factory';
import { server } from '../mocks/animation-api.mock';
import { rest } from 'msw';

const mockApiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

describe('/api/animation/analytics API endpoints', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('POST /api/animation/analytics/events', () => {
    it('should accept single event submission', async () => {
      const mockEvent = AnimationEventFactory.create({
        animationId: 'test-animation-123',
        eventType: 'interaction'
      });

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          const body = await req.json();
          
          expect(body).toHaveProperty('events');
          expect(Array.isArray(body.events)).toBe(true);
          expect(body.events).toHaveLength(1);
          expect(body.events[0]).toMatchObject({
            animationId: mockEvent.animationId,
            eventType: mockEvent.eventType
          });

          return res(
            ctx.status(201),
            ctx.json({
              success: true,
              data: {
                processed: 1,
                eventIds: [body.events[0].eventId]
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: [mockEvent] }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.processed).toBe(1);
    });

    it('should accept batch event submissions', async () => {
      const batchEvents = [
        AnimationEventFactory.create({ eventType: 'view' }),
        AnimationEventFactory.create({ eventType: 'interaction' }),
        AnimationEventFactory.create({ eventType: 'performance' }),
        AnimationEventFactory.create({ eventType: 'error' })
      ];

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          const body = await req.json();
          
          expect(body.events).toHaveLength(4);
          expect(body.events.map((e: any) => e.eventType)).toEqual([
            'view', 'interaction', 'performance', 'error'
          ]);

          return res(
            ctx.status(201),
            ctx.json({
              success: true,
              data: {
                processed: 4,
                eventIds: body.events.map((e: any) => e.eventId)
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: batchEvents }),
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.processed).toBe(4);
    });

    it('should validate event structure', async () => {
      const invalidEvent = {
        eventId: 'test-event-123',
        // Missing required fields
        eventType: 'invalid-type'
      };

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid event structure',
                details: {
                  animationId: 'Required field missing',
                  eventType: 'Invalid event type',
                  eventData: 'Required field missing',
                  metadata: 'Required field missing'
                }
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: [invalidEvent] }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toHaveProperty('animationId');
    });

    it('should enforce batch size limits', async () => {
      const tooManyEvents = Array.from({ length: 101 }, () => 
        AnimationEventFactory.create()
      );

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          const body = await req.json();
          
          if (body.events.length > 100) {
            return res(
              ctx.status(413),
              ctx.json({
                success: false,
                error: {
                  code: 'BATCH_SIZE_EXCEEDED',
                  message: 'Batch size exceeds maximum limit',
                  details: {
                    received: body.events.length,
                    maxAllowed: 100
                  }
                },
                timestamp: new Date().toISOString()
              })
            );
          }

          return res(ctx.status(201), ctx.json({ success: true }));
        })
      );

      const response = await fetch(`${mockApiBase}/animation/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: tooManyEvents }),
      });

      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error.code).toBe('BATCH_SIZE_EXCEEDED');
    });

    it('should handle duplicate event IDs gracefully', async () => {
      const duplicateEvents = [
        AnimationEventFactory.create({ eventId: 'duplicate-event-123' }),
        AnimationEventFactory.create({ eventId: 'duplicate-event-123' })
      ];

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              data: {
                processed: 1, // Only one processed due to deduplication
                skipped: 1,
                eventIds: ['duplicate-event-123']
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: duplicateEvents }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.processed).toBe(1);
      expect(data.data.skipped).toBe(1);
    });

    it('should validate event timestamps', async () => {
      const eventWithFutureTimestamp = AnimationEventFactory.create({
        eventData: {
          timestamp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours in future
        }
      });

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error: {
                code: 'INVALID_TIMESTAMP',
                message: 'Event timestamp is invalid',
                details: {
                  reason: 'Timestamp cannot be in the future',
                  maxAllowedSkew: '5 minutes'
                }
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: [eventWithFutureTimestamp] }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_TIMESTAMP');
    });

    it('should handle rate limiting for events', async () => {
      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          return res(
            ctx.status(429),
            ctx.set('Retry-After', '30'),
            ctx.json({
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many analytics events',
                details: {
                  limit: '1000 events per minute per IP',
                  retryAfter: 30
                }
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: [AnimationEventFactory.create()] }),
      });

      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.headers.get('retry-after')).toBe('30');
    });

    it('should sanitize sensitive data', async () => {
      const eventWithSensitiveData = AnimationEventFactory.create({
        eventData: {
          timestamp: Date.now(),
          errorMessage: 'Database connection failed',
          errorStack: 'Error: Database connection failed\n  at connect (/app/db.js:123:45)\n  at password: "admin123"' // Contains sensitive info
        }
      });

      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, async (req, res, ctx) => {
          const body = await req.json();
          
          // Verify sensitive data is sanitized
          expect(body.events[0].eventData.errorStack).not.toContain('admin123');

          return res(
            ctx.status(201),
            ctx.json({
              success: true,
              data: { processed: 1 },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: [eventWithSensitiveData] }),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('GET /api/animation/analytics/metrics', () => {
    it('should return analytics metrics for animation', async () => {
      const testAnimationId = 'test-animation-123';
      const mockMetrics = AnimationMetricsFactory.create({
        animationId: testAnimationId
      });

      server.use(
        rest.get(`${mockApiBase}/animation/analytics/metrics`, (req, res, ctx) => {
          const url = new URL(req.url);
          expect(url.searchParams.get('animationId')).toBe(testAnimationId);

          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              data: mockMetrics,
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(
        `${mockApiBase}/animation/analytics/metrics?animationId=${testAnimationId}`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        animationId: testAnimationId,
        views: expect.objectContaining({
          total: expect.any(Number),
          unique: expect.any(Number)
        }),
        performance: expect.objectContaining({
          averageFPS: expect.any(Number)
        })
      });
    });

    it('should filter metrics by time range', async () => {
      const startTime = '2024-01-01T00:00:00.000Z';
      const endTime = '2024-01-02T00:00:00.000Z';
      const mockMetrics = AnimationMetricsFactory.createForTimeRange(
        new Date(startTime),
        new Date(endTime)
      );

      server.use(
        rest.get(`${mockApiBase}/animation/analytics/metrics`, (req, res, ctx) => {
          const url = new URL(req.url);
          expect(url.searchParams.get('start')).toBe(startTime);
          expect(url.searchParams.get('end')).toBe(endTime);

          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              data: mockMetrics,
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(
        `${mockApiBase}/animation/analytics/metrics?animationId=test&start=${startTime}&end=${endTime}`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.timeRange.start).toBe(startTime);
      expect(data.data.timeRange.end).toBe(endTime);
    });

    it('should validate time range parameters', async () => {
      const invalidStartTime = 'invalid-date';
      
      server.use(
        rest.get(`${mockApiBase}/animation/analytics/metrics`, (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error: {
                code: 'INVALID_TIME_RANGE',
                message: 'Invalid time range parameters',
                details: {
                  start: 'Invalid date format',
                  expectedFormat: 'ISO 8601 datetime'
                }
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(
        `${mockApiBase}/animation/analytics/metrics?animationId=test&start=${invalidStartTime}`
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_TIME_RANGE');
    });

    it('should require animation ID parameter', async () => {
      server.use(
        rest.get(`${mockApiBase}/animation/analytics/metrics`, (req, res, ctx) => {
          const url = new URL(req.url);
          if (!url.searchParams.get('animationId')) {
            return res(
              ctx.status(400),
              ctx.json({
                success: false,
                error: {
                  code: 'MISSING_PARAMETER',
                  message: 'Required parameter missing',
                  details: {
                    parameter: 'animationId',
                    description: 'Animation ID is required for metrics query'
                  }
                },
                timestamp: new Date().toISOString()
              })
            );
          }

          return res(ctx.status(200), ctx.json({ success: true }));
        })
      );

      const response = await fetch(`${mockApiBase}/animation/analytics/metrics`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('MISSING_PARAMETER');
    });

    it('should handle empty metrics gracefully', async () => {
      const testAnimationId = 'animation-no-data';

      server.use(
        rest.get(`${mockApiBase}/animation/analytics/metrics`, (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              data: {
                animationId: testAnimationId,
                timeRange: {
                  start: new Date(Date.now() - 24*60*60*1000).toISOString(),
                  end: new Date().toISOString()
                },
                views: { total: 0, unique: 0, averageDuration: 0 },
                interactions: { clicks: 0, hovers: 0, ripples: 0 },
                performance: {
                  averageFPS: 0,
                  memoryUsage: { average: 0, peak: 0 },
                  errorRate: 0,
                  loadTime: { average: 0, p95: 0 }
                },
                variants: {}
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(
        `${mockApiBase}/animation/analytics/metrics?animationId=${testAnimationId}`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.views.total).toBe(0);
      expect(data.data.interactions.clicks).toBe(0);
    });

    it('should support aggregation options', async () => {
      server.use(
        rest.get(`${mockApiBase}/animation/analytics/metrics`, (req, res, ctx) => {
          const url = new URL(req.url);
          const aggregation = url.searchParams.get('aggregation');
          
          expect(aggregation).toBe('hourly');

          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              data: {
                aggregation: 'hourly',
                buckets: [
                  {
                    timestamp: '2024-01-01T00:00:00.000Z',
                    views: 10,
                    interactions: 5
                  },
                  {
                    timestamp: '2024-01-01T01:00:00.000Z',
                    views: 15,
                    interactions: 8
                  }
                ]
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(
        `${mockApiBase}/animation/analytics/metrics?animationId=test&aggregation=hourly`
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.aggregation).toBe('hourly');
      expect(data.data.buckets).toHaveLength(2);
    });

    it('should include cache headers for performance', async () => {
      const testAnimationId = 'test-animation-cache';
      const mockMetrics = AnimationMetricsFactory.create({
        animationId: testAnimationId
      });

      server.use(
        rest.get(`${mockApiBase}/animation/analytics/metrics`, (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.set('Cache-Control', 'public, max-age=300'), // 5 minutes
            ctx.set('ETag', '"metrics-123"'),
            ctx.json({
              success: true,
              data: mockMetrics,
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(
        `${mockApiBase}/animation/analytics/metrics?animationId=${testAnimationId}`
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('public, max-age=300');
      expect(response.headers.get('etag')).toBe('"metrics-123"');
    });

    it('should handle conditional requests with If-None-Match', async () => {
      const testAnimationId = 'test-animation-conditional';

      server.use(
        rest.get(`${mockApiBase}/animation/analytics/metrics`, (req, res, ctx) => {
          const ifNoneMatch = req.headers.get('If-None-Match');
          
          if (ifNoneMatch === '"metrics-123"') {
            return res(
              ctx.status(304),
              ctx.set('ETag', '"metrics-123"'),
              ctx.set('Cache-Control', 'public, max-age=300')
            );
          }

          return res(
            ctx.status(200),
            ctx.set('ETag', '"metrics-123"'),
            ctx.json({
              success: true,
              data: AnimationMetricsFactory.create({ animationId: testAnimationId }),
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(
        `${mockApiBase}/animation/analytics/metrics?animationId=${testAnimationId}`,
        {
          headers: {
            'If-None-Match': '"metrics-123"'
          }
        }
      );

      expect(response.status).toBe(304);
      expect(response.headers.get('etag')).toBe('"metrics-123"');
    });
  });

  describe('Error handling and resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, (req, res, ctx) => {
          return res(
            ctx.status(503),
            ctx.json({
              success: false,
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Analytics service temporarily unavailable',
                details: {
                  cause: 'Database connection timeout',
                  retryAfter: 30
                }
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          events: [AnimationEventFactory.create()] 
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should handle malformed event data', async () => {
      server.use(
        rest.post(`${mockApiBase}/animation/analytics/events`, (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error: {
                code: 'MALFORMED_DATA',
                message: 'Event data contains malformed or corrupted fields',
                details: {
                  affectedEvents: [0, 2],
                  errors: {
                    0: 'Invalid eventData structure',
                    2: 'Missing required metadata fields'
                  }
                }
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const malformedEvents = [
        { eventId: 'test-1', eventData: 'invalid' },
        AnimationEventFactory.create(),
        { eventId: 'test-3', animationId: 'test' }
      ];

      const response = await fetch(`${mockApiBase}/animation/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: malformedEvents }),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('MALFORMED_DATA');
      expect(data.error.details.affectedEvents).toEqual([0, 2]);
    });
  });
});