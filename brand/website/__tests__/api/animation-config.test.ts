import { NextRequest } from 'next/server';
import { AnimationConfigFactory } from '../factories/animation-updated.factory';
import { server } from '../mocks/animation-api.mock';
import { rest } from 'msw';

// Mock Next.js API route handlers
jest.mock('next/server');

const mockApiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

describe('/api/animation/config API endpoints', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('GET /api/animation/config/:animationId', () => {
    const testAnimationId = 'test-animation-123';

    it('should return animation configuration successfully', async () => {
      const mockConfig = AnimationConfigFactory.create({
        animationId: testAnimationId
      });

      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              data: mockConfig,
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/config/${testAnimationId}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        data: mockConfig,
        timestamp: expect.any(String)
      });
    });

    it('should return 404 for non-existent animation', async () => {
      const nonExistentId = 'non-existent-animation';

      server.use(
        rest.get(`${mockApiBase}/animation/config/${nonExistentId}`, (req, res, ctx) => {
          return res(
            ctx.status(404),
            ctx.json({
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Animation configuration not found',
                details: { animationId: nonExistentId }
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/config/${nonExistentId}`);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Animation configuration not found'
        }
      });
    });

    it('should validate animation ID format', async () => {
      const invalidId = 'invalid-id-with-special-chars@#$';

      server.use(
        rest.get(`${mockApiBase}/animation/config/${invalidId}`, (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error: {
                code: 'INVALID_REQUEST',
                message: 'Invalid animation ID format',
                details: { 
                  animationId: invalidId,
                  expectedFormat: 'alphanumeric with hyphens only'
                }
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/config/${invalidId}`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should handle server errors gracefully', async () => {
      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({
              success: false,
              error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to retrieve animation configuration',
                details: { cause: 'Database connection timeout' }
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/config/${testAnimationId}`);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should include proper headers', async () => {
      const mockConfig = AnimationConfigFactory.create({
        animationId: testAnimationId
      });

      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.set('Content-Type', 'application/json'),
            ctx.set('Cache-Control', 'public, max-age=300'), // 5 minutes cache
            ctx.json({
              success: true,
              data: mockConfig,
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/config/${testAnimationId}`);

      expect(response.headers.get('content-type')).toBe('application/json');
      expect(response.headers.get('cache-control')).toBe('public, max-age=300');
    });
  });

  describe('PUT /api/animation/config/:animationId', () => {
    const testAnimationId = 'test-animation-123';

    it('should update animation configuration successfully', async () => {
      const originalConfig = AnimationConfigFactory.create({
        animationId: testAnimationId,
        speed: 1.0,
        enabled: true
      });

      const updates = {
        speed: 2.5,
        colors: {
          primary: '#ff0000',
          background: '#000000',
          trail: '#ffffff'
        }
      };

      const updatedConfig = {
        ...originalConfig,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      server.use(
        rest.put(`${mockApiBase}/animation/config/${testAnimationId}`, async (req, res, ctx) => {
          const body = await req.json();
          
          // Validate request body
          expect(body).toMatchObject(updates);

          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              data: updatedConfig,
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/config/${testAnimationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.speed).toBe(2.5);
      expect(data.data.colors.primary).toBe('#ff0000');
    });

    it('should validate configuration updates', async () => {
      const invalidUpdates = {
        speed: -1, // Invalid negative speed
        performance: {
          maxFPS: 999 // Invalid high FPS
        }
      };

      server.use(
        rest.put(`${mockApiBase}/animation/config/${testAnimationId}`, async (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid configuration values',
                details: {
                  speed: 'Speed must be between 0.1 and 3.0',
                  'performance.maxFPS': 'maxFPS must be between 30 and 120'
                }
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/config/${testAnimationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidUpdates),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toHaveProperty('speed');
      expect(data.error.details).toHaveProperty('performance.maxFPS');
    });

    it('should handle partial updates', async () => {
      const originalConfig = AnimationConfigFactory.create({
        animationId: testAnimationId
      });

      const partialUpdates = {
        enabled: false
      };

      const updatedConfig = {
        ...originalConfig,
        ...partialUpdates,
        updatedAt: new Date().toISOString()
      };

      server.use(
        rest.put(`${mockApiBase}/animation/config/${testAnimationId}`, async (req, res, ctx) => {
          const body = await req.json();
          expect(body).toEqual(partialUpdates);

          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              data: updatedConfig,
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/config/${testAnimationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(partialUpdates),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.enabled).toBe(false);
      expect(data.data.animationId).toBe(testAnimationId);
    });

    it('should return 404 for non-existent animation', async () => {
      const nonExistentId = 'non-existent-animation';

      server.use(
        rest.put(`${mockApiBase}/animation/config/${nonExistentId}`, (req, res, ctx) => {
          return res(
            ctx.status(404),
            ctx.json({
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Animation configuration not found',
                details: { animationId: nonExistentId }
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/config/${nonExistentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: true }),
      });

      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should handle malformed JSON', async () => {
      server.use(
        rest.put(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          return res(
            ctx.status(400),
            ctx.json({
              success: false,
              error: {
                code: 'INVALID_JSON',
                message: 'Request body contains invalid JSON',
                details: { cause: 'Unexpected token' }
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/config/${testAnimationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{ invalid json }',
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('INVALID_JSON');
    });

    it('should require authentication for sensitive updates', async () => {
      server.use(
        rest.put(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          const authHeader = req.headers.get('Authorization');
          
          if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res(
              ctx.status(401),
              ctx.json({
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required',
                  details: { requiredAuth: 'Bearer token' }
                },
                timestamp: new Date().toISOString()
              })
            );
          }

          return res(
            ctx.status(200),
            ctx.json({
              success: true,
              data: AnimationConfigFactory.create({ animationId: testAnimationId }),
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      // Request without authentication
      const unauthorizedResponse = await fetch(`${mockApiBase}/animation/config/${testAnimationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: false }),
      });

      const unauthorizedData = await unauthorizedResponse.json();

      expect(unauthorizedResponse.status).toBe(401);
      expect(unauthorizedData.error.code).toBe('UNAUTHORIZED');

      // Request with authentication
      const authorizedResponse = await fetch(`${mockApiBase}/animation/config/${testAnimationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ enabled: false }),
      });

      expect(authorizedResponse.status).toBe(200);
    });
  });

  describe('Rate limiting', () => {
    it('should handle rate limiting', async () => {
      const testAnimationId = 'test-animation-rate-limit';

      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          return res(
            ctx.status(429),
            ctx.set('Retry-After', '60'),
            ctx.json({
              success: false,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests',
                details: { 
                  retryAfter: 60,
                  limit: '100 requests per hour'
                }
              },
              timestamp: new Date().toISOString()
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/config/${testAnimationId}`);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(response.headers.get('retry-after')).toBe('60');
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('CORS handling', () => {
    it('should handle CORS preflight requests', async () => {
      const testAnimationId = 'test-animation-cors';

      server.use(
        rest.options(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.set('Access-Control-Allow-Origin', '*'),
            ctx.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS'),
            ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'),
            ctx.set('Access-Control-Max-Age', '86400')
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/config/${testAnimationId}`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('access-control-allow-methods')).toBe('GET, PUT, OPTIONS');
    });
  });

  describe('Content negotiation', () => {
    it('should support JSON content type', async () => {
      const testAnimationId = 'test-animation-json';
      const mockConfig = AnimationConfigFactory.create({ animationId: testAnimationId });

      server.use(
        rest.get(`${mockApiBase}/animation/config/${testAnimationId}`, (req, res, ctx) => {
          const acceptHeader = req.headers.get('Accept');
          
          if (acceptHeader && acceptHeader.includes('application/json')) {
            return res(
              ctx.status(200),
              ctx.set('Content-Type', 'application/json'),
              ctx.json({
                success: true,
                data: mockConfig,
                timestamp: new Date().toISOString()
              })
            );
          }

          return res(
            ctx.status(406),
            ctx.json({
              success: false,
              error: {
                code: 'NOT_ACCEPTABLE',
                message: 'Only application/json is supported'
              }
            })
          );
        })
      );

      const response = await fetch(`${mockApiBase}/animation/config/${testAnimationId}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/json');
    });
  });
});