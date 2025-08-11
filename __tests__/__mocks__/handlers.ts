import { http, HttpResponse } from 'msw';

// Mock data
export const mockUser = {
  id: 'user-123',
  email: 'test@candlefish.ai',
  name: 'Test User',
  organizationId: 'org-123',
  role: 'USER',
  permissions: ['read:dashboard', 'write:estimates'],
};

export const mockOrganization = {
  id: 'org-123',
  name: 'Test Organization',
  domain: 'test.candlefish.ai',
  settings: {
    theme: 'light',
    notifications: true,
  },
};

export const mockProjects = [
  {
    id: 'project-1',
    name: 'Main Street Renovation',
    address: '123 Main St, Anytown, USA',
    status: 'active',
    estimatedValue: 25000,
    createdAt: '2024-01-15T10:00:00Z',
    organizationId: 'org-123',
  },
  {
    id: 'project-2',
    name: 'Office Building Repaint',
    address: '456 Business Ave, Corporate City, USA',
    status: 'completed',
    estimatedValue: 45000,
    createdAt: '2024-02-01T10:00:00Z',
    organizationId: 'org-123',
  },
];

export const mockEstimate = {
  id: 'estimate-1',
  projectId: 'project-1',
  rooms: [
    {
      id: 'room-1',
      name: 'Living Room',
      dimensions: {
        length: 20,
        width: 15,
        height: 9,
      },
      surfaces: {
        walls: 4,
        ceiling: 1,
        trim: 80,
      },
      paintType: 'premium',
      laborHours: 16,
      materialCost: 120,
      laborCost: 480,
    },
  ],
  totals: {
    materialCost: 120,
    laborCost: 480,
    totalCost: 600,
    totalSquareFootage: 630,
  },
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T15:30:00Z',
};

// API handlers
export const handlers = [
  // Authentication
  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json() as { email: string; password: string };

    if (email === 'test@candlefish.ai' && password === 'password123') {
      return HttpResponse.json({
        user: mockUser,
        token: 'mock-jwt-token',
        organization: mockOrganization,
      });
    }

    return new HttpResponse(null, {
      status: 401,
      statusText: 'Invalid credentials',
    });
  }),

  http.post('/api/auth/logout', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
      return HttpResponse.json(mockUser);
    }

    return new HttpResponse(null, {
      status: 401,
      statusText: 'Unauthorized',
    });
  }),

  // Organizations
  http.get('/api/organizations/:orgId', ({ params }) => {
    const { orgId } = params;

    if (orgId === 'org-123') {
      return HttpResponse.json(mockOrganization);
    }

    return new HttpResponse(null, {
      status: 404,
      statusText: 'Organization not found',
    });
  }),

  // Projects
  http.get('/api/projects', ({ request }) => {
    const url = new URL(request.url);
    const organizationId = url.searchParams.get('organizationId');

    if (organizationId === 'org-123') {
      return HttpResponse.json({
        projects: mockProjects,
        total: mockProjects.length,
        page: 1,
        limit: 10,
      });
    }

    return HttpResponse.json({
      projects: [],
      total: 0,
      page: 1,
      limit: 10,
    });
  }),

  http.get('/api/projects/:projectId', ({ params }) => {
    const { projectId } = params;
    const project = mockProjects.find(p => p.id === projectId);

    if (project) {
      return HttpResponse.json(project);
    }

    return new HttpResponse(null, {
      status: 404,
      statusText: 'Project not found',
    });
  }),

  http.post('/api/projects', async ({ request }) => {
    const projectData = await request.json() as any;

    const newProject = {
      id: `project-${Date.now()}`,
      ...projectData,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    return HttpResponse.json(newProject, { status: 201 });
  }),

  // Estimates
  http.get('/api/estimates/:estimateId', ({ params }) => {
    const { estimateId } = params;

    if (estimateId === 'estimate-1') {
      return HttpResponse.json(mockEstimate);
    }

    return new HttpResponse(null, {
      status: 404,
      statusText: 'Estimate not found',
    });
  }),

  http.post('/api/estimates', async ({ request }) => {
    const estimateData = await request.json() as any;

    const newEstimate = {
      id: `estimate-${Date.now()}`,
      ...estimateData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return HttpResponse.json(newEstimate, { status: 201 });
  }),

  // PDF Generation
  http.post('/api/v1/pdf/generate', async ({ request }) => {
    const pdfRequest = await request.json() as any;

    return HttpResponse.json({
      pdfUrl: 'https://example.com/mock-pdf.pdf',
      estimateId: pdfRequest.estimateId,
      generatedAt: new Date().toISOString(),
    });
  }),

  // CompanyCam Integration
  http.get('/api/v1/companycam/projects/:projectId/photos', ({ params }) => {
    const { projectId } = params;

    return HttpResponse.json({
      photos: [
        {
          id: 'photo-1',
          url: 'https://example.com/photo1.jpg',
          thumbnailUrl: 'https://example.com/photo1-thumb.jpg',
          caption: 'Before photo - exterior',
          takenAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 'photo-2',
          url: 'https://example.com/photo2.jpg',
          thumbnailUrl: 'https://example.com/photo2-thumb.jpg',
          caption: 'After photo - exterior',
          takenAt: '2024-01-20T14:30:00Z',
        },
      ],
    });
  }),

  // Salesforce Integration
  http.get('/api/v1/salesforce/accounts', () => {
    return HttpResponse.json({
      accounts: [
        {
          id: 'acc-1',
          name: 'ABC Construction',
          phone: '(555) 123-4567',
          email: 'contact@abcconstruction.com',
        },
      ],
    });
  }),

  // Health Check
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
        s3: 'connected',
      },
    });
  }),

  // Error scenarios for testing
  http.get('/api/error/500', () => {
    return new HttpResponse(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }),

  http.get('/api/error/timeout', () => {
    // Simulate timeout
    return new Promise(() => {});
  }),

  // Rate limiting
  http.get('/api/rate-limited', () => {
    return new HttpResponse(null, {
      status: 429,
      statusText: 'Too Many Requests',
      headers: {
        'Retry-After': '60',
      },
    });
  }),
];
