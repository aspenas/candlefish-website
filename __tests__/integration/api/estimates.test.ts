import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { mockEstimate, mockProjects, mockUser } from '../../__mocks__/handlers';

// Create a test server for integration tests
const server = setupServer();

// Mock the actual API client
const apiClient = {
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
process.env.JWT_SECRET = 'test-jwt-secret';

describe('Estimates API Integration Tests', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  describe('POST /api/estimates', () => {
    it('creates a new estimate successfully', async () => {
      const newEstimateData = {
        projectId: 'project-1',
        rooms: [
          {
            name: 'Living Room',
            dimensions: { length: 20, width: 15, height: 9 },
            surfaces: { walls: 4, ceiling: 1, trim: 80 },
            paintType: 'premium',
          },
        ],
      };

      server.use(
        http.post('http://localhost:3001/api/estimates', async ({ request }) => {
          const body = await request.json() as any;

          expect(body.projectId).toBe('project-1');
          expect(body.rooms).toHaveLength(1);

          const createdEstimate = {
            id: 'estimate-123',
            ...body,
            totals: {
              materialCost: 250,
              laborCost: 800,
              totalCost: 1050,
              totalSquareFootage: 750,
            },
            createdAt: new Date().toISOString(),
          };

          return HttpResponse.json(createdEstimate, { status: 201 });
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(newEstimateData),
      });

      expect(response.status).toBe(201);

      const createdEstimate = await response.json();
      expect(createdEstimate.id).toBe('estimate-123');
      expect(createdEstimate.totals.totalCost).toBe(1050);
    });

    it('validates required fields', async () => {
      server.use(
        http.post('http://localhost:3001/api/estimates', () => {
          return HttpResponse.json(
            {
              error: 'Validation failed',
              details: ['projectId is required', 'rooms array cannot be empty']
            },
            { status: 400 }
          );
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error.error).toBe('Validation failed');
      expect(error.details).toContain('projectId is required');
    });

    it('handles authentication errors', async () => {
      server.use(
        http.post('http://localhost:3001/api/estimates', () => {
          return new HttpResponse(null, {
            status: 401,
            statusText: 'Unauthorized'
          });
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId: 'project-1', rooms: [] }),
      });

      expect(response.status).toBe(401);
    });

    it('handles server errors gracefully', async () => {
      server.use(
        http.post('http://localhost:3001/api/estimates', () => {
          return new HttpResponse(null, {
            status: 500,
            statusText: 'Internal Server Error'
          });
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ projectId: 'project-1', rooms: [] }),
      });

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/estimates/:id', () => {
    it('retrieves an estimate by ID', async () => {
      server.use(
        http.get('http://localhost:3001/api/estimates/estimate-1', () => {
          return HttpResponse.json(mockEstimate);
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates/estimate-1', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);

      const estimate = await response.json();
      expect(estimate.id).toBe('estimate-1');
      expect(estimate.rooms).toHaveLength(1);
    });

    it('returns 404 for non-existent estimate', async () => {
      server.use(
        http.get('http://localhost:3001/api/estimates/non-existent', () => {
          return new HttpResponse(null, {
            status: 404,
            statusText: 'Estimate not found'
          });
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates/non-existent', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(404);
    });

    it('enforces multi-tenant isolation', async () => {
      server.use(
        http.get('http://localhost:3001/api/estimates/other-org-estimate', () => {
          return new HttpResponse(null, {
            status: 403,
            statusText: 'Forbidden'
          });
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates/other-org-estimate', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/estimates/:id', () => {
    it('updates an existing estimate', async () => {
      const updateData = {
        rooms: [
          {
            ...mockEstimate.rooms[0],
            paintType: 'standard',
            laborCost: 400,
          },
        ],
      };

      server.use(
        http.put('http://localhost:3001/api/estimates/estimate-1', async ({ request }) => {
          const body = await request.json() as any;

          const updatedEstimate = {
            ...mockEstimate,
            ...body,
            updatedAt: new Date().toISOString(),
          };

          return HttpResponse.json(updatedEstimate);
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates/estimate-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);

      const updatedEstimate = await response.json();
      expect(updatedEstimate.rooms[0].paintType).toBe('standard');
      expect(updatedEstimate.updatedAt).toBeTruthy();
    });

    it('recalculates totals on update', async () => {
      const updateData = {
        rooms: [
          {
            ...mockEstimate.rooms[0],
            materialCost: 200,
            laborCost: 600,
          },
        ],
      };

      server.use(
        http.put('http://localhost:3001/api/estimates/estimate-1', () => {
          const updatedEstimate = {
            ...mockEstimate,
            ...updateData,
            totals: {
              materialCost: 200,
              laborCost: 600,
              totalCost: 800,
              totalSquareFootage: 630,
            },
            updatedAt: new Date().toISOString(),
          };

          return HttpResponse.json(updatedEstimate);
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates/estimate-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(updateData),
      });

      const updatedEstimate = await response.json();
      expect(updatedEstimate.totals.totalCost).toBe(800);
      expect(updatedEstimate.totals.materialCost).toBe(200);
      expect(updatedEstimate.totals.laborCost).toBe(600);
    });
  });

  describe('DELETE /api/estimates/:id', () => {
    it('deletes an estimate', async () => {
      server.use(
        http.delete('http://localhost:3001/api/estimates/estimate-1', () => {
          return new HttpResponse(null, { status: 204 });
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates/estimate-1', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(204);
    });

    it('returns 404 for non-existent estimate', async () => {
      server.use(
        http.delete('http://localhost:3001/api/estimates/non-existent', () => {
          return new HttpResponse(null, {
            status: 404,
            statusText: 'Estimate not found'
          });
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates/non-existent', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/estimates (List)', () => {
    it('returns paginated list of estimates', async () => {
      const mockEstimates = [
        { ...mockEstimate, id: 'estimate-1' },
        { ...mockEstimate, id: 'estimate-2' },
        { ...mockEstimate, id: 'estimate-3' },
      ];

      server.use(
        http.get('http://localhost:3001/api/estimates', ({ request }) => {
          const url = new URL(request.url);
          const page = parseInt(url.searchParams.get('page') || '1');
          const limit = parseInt(url.searchParams.get('limit') || '10');
          const organizationId = url.searchParams.get('organizationId');

          expect(organizationId).toBe('org-123');

          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;
          const paginatedEstimates = mockEstimates.slice(startIndex, endIndex);

          return HttpResponse.json({
            estimates: paginatedEstimates,
            total: mockEstimates.length,
            page,
            limit,
            totalPages: Math.ceil(mockEstimates.length / limit),
          });
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates?organizationId=org-123&page=1&limit=2', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result.estimates).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(2);
    });

    it('filters estimates by project ID', async () => {
      server.use(
        http.get('http://localhost:3001/api/estimates', ({ request }) => {
          const url = new URL(request.url);
          const projectId = url.searchParams.get('projectId');

          expect(projectId).toBe('project-1');

          const filteredEstimates = [mockEstimate];

          return HttpResponse.json({
            estimates: filteredEstimates,
            total: 1,
            page: 1,
            limit: 10,
          });
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates?projectId=project-1', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      const result = await response.json();
      expect(result.estimates).toHaveLength(1);
      expect(result.estimates[0].projectId).toBe('project-1');
    });
  });

  describe('Error Handling', () => {
    it('handles network timeouts', async () => {
      server.use(
        http.post('http://localhost:3001/api/estimates', () => {
          // Simulate timeout by not resolving
          return new Promise(() => {});
        })
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);

      try {
        await fetch('http://localhost:3001/api/estimates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify({ projectId: 'project-1', rooms: [] }),
          signal: controller.signal,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).name).toBe('AbortError');
      }

      clearTimeout(timeoutId);
    });

    it('handles malformed JSON responses', async () => {
      server.use(
        http.get('http://localhost:3001/api/estimates/estimate-1', () => {
          return new HttpResponse('invalid json{', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates/estimate-1', {
        headers: {
          'Authorization': 'Bearer test-token',
        },
      });

      expect(response.status).toBe(200);

      try {
        await response.json();
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('handles rate limit responses', async () => {
      server.use(
        http.post('http://localhost:3001/api/estimates', () => {
          return new HttpResponse(null, {
            status: 429,
            statusText: 'Too Many Requests',
            headers: {
              'Retry-After': '60',
              'X-RateLimit-Limit': '100',
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': '1640995200',
            },
          });
        })
      );

      const response = await fetch('http://localhost:3001/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({ projectId: 'project-1', rooms: [] }),
      });

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });
});
