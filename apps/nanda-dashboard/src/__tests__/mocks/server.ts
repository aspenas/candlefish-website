/**
 * Mock Service Worker (MSW) server setup
 * Provides mock API responses for testing
 */

import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { createMockAgent, createMockMetrics, createMockAlert, createMockRealtimeMetrics } from '../setup';

// Mock data
const mockAgents = Array.from({ length: 50 }, (_, i) => 
  createMockAgent({
    id: `agent-${String(i + 1).padStart(3, '0')}`,
    name: `Agent-${String(i + 1).padStart(3, '0')}`,
    status: ['online', 'offline', 'warning', 'error'][Math.floor(Math.random() * 4)],
  })
);

const mockAlerts = Array.from({ length: 10 }, (_, i) =>
  createMockAlert({
    id: `alert-${String(i + 1).padStart(3, '0')}`,
    name: `Alert ${i + 1}`,
  })
);

let mockMetricsHistory: any[] = [];

// Generate mock metrics history
for (let i = 0; i < 288; i++) { // 24 hours of 5-minute intervals
  const timestamp = new Date(Date.now() - (288 - i) * 5 * 60 * 1000);
  for (let j = 0; j < 10; j++) {
    mockMetricsHistory.push(
      createMockMetrics({
        agentId: `agent-${String(j + 1).padStart(3, '0')}`,
        timestamp,
        cpu: 20 + Math.random() * 60,
        memory: 30 + Math.random() * 40,
        requestRate: 100 + Math.random() * 400,
        errorRate: Math.random() * 5,
        responseTime: 50 + Math.random() * 150,
      })
    );
  }
}

export const handlers = [
  // Health check
  rest.get('/health', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'rtpm-api',
        version: '1.0.0',
      })
    );
  }),

  // System status
  rest.get('/api/v1/status', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'operational',
        services: {
          api: 'healthy',
          database: 'healthy',
          cache: 'healthy',
        },
        timestamp: new Date().toISOString(),
      })
    );
  }),

  // List agents
  rest.get('/api/v1/agents', (req, res, ctx) => {
    const page = parseInt(req.url.searchParams.get('page') || '1');
    const limit = parseInt(req.url.searchParams.get('limit') || '50');
    const status = req.url.searchParams.get('status');
    const region = req.url.searchParams.get('region');
    
    let filteredAgents = [...mockAgents];
    
    if (status) {
      filteredAgents = filteredAgents.filter(agent => agent.status === status);
    }
    
    if (region) {
      filteredAgents = filteredAgents.filter(agent => agent.region === region);
    }
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAgents = filteredAgents.slice(startIndex, endIndex);
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: paginatedAgents,
        pagination: {
          page,
          limit,
          total: filteredAgents.length,
          totalPages: Math.ceil(filteredAgents.length / limit),
          hasNext: endIndex < filteredAgents.length,
          hasPrev: page > 1,
        },
      })
    );
  }),

  // Get single agent
  rest.get('/api/v1/agents/:id', (req, res, ctx) => {
    const { id } = req.params;
    const agent = mockAgents.find(a => a.id === id);
    
    if (!agent) {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          error: 'Agent not found',
        })
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: agent,
      })
    );
  }),

  // Register agent
  rest.post('/api/v1/agents', async (req, res, ctx) => {
    const agentData = await req.json();
    
    // Validate required fields
    if (!agentData.id || !agentData.name || !agentData.status) {
      return res(
        ctx.status(422),
        ctx.json({
          success: false,
          error: 'Missing required fields',
        })
      );
    }
    
    const newAgent = createMockAgent(agentData);
    mockAgents.push(newAgent);
    
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: newAgent,
      })
    );
  }),

  // Update agent
  rest.put('/api/v1/agents/:id', async (req, res, ctx) => {
    const { id } = req.params;
    const updateData = await req.json();
    
    const agentIndex = mockAgents.findIndex(a => a.id === id);
    if (agentIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          error: 'Agent not found',
        })
      );
    }
    
    mockAgents[agentIndex] = { ...mockAgents[agentIndex], ...updateData };
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockAgents[agentIndex],
      })
    );
  }),

  // Delete agent
  rest.delete('/api/v1/agents/:id', (req, res, ctx) => {
    const { id } = req.params;
    const agentIndex = mockAgents.findIndex(a => a.id === id);
    
    if (agentIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          error: 'Agent not found',
        })
      );
    }
    
    mockAgents.splice(agentIndex, 1);
    
    return res(ctx.status(204));
  }),

  // Get agent metrics
  rest.get('/api/v1/agents/:id/metrics', (req, res, ctx) => {
    const { id } = req.params;
    const timeRange = req.url.searchParams.get('timeRange') || '24h';
    const startTime = req.url.searchParams.get('startTime');
    const endTime = req.url.searchParams.get('endTime');
    
    const agent = mockAgents.find(a => a.id === id);
    if (!agent) {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          error: 'Agent not found',
        })
      );
    }
    
    // Filter metrics by time range
    let filteredMetrics = mockMetricsHistory.filter(m => m.agentId === id);
    
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      filteredMetrics = filteredMetrics.filter(m => 
        m.timestamp >= start && m.timestamp <= end
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: filteredMetrics,
      })
    );
  }),

  // Get current metrics
  rest.get('/api/v1/metrics/current', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        metrics: [
          {
            name: 'cpu_usage',
            value: 45.2 + Math.random() * 20,
            unit: 'percent',
            timestamp: new Date().toISOString(),
          },
          {
            name: 'memory_usage',
            value: 58.7 + Math.random() * 15,
            unit: 'percent',
            timestamp: new Date().toISOString(),
          },
          {
            name: 'response_time',
            value: 125.3 + Math.random() * 50,
            unit: 'ms',
            timestamp: new Date().toISOString(),
          },
        ],
      })
    );
  }),

  // Get real-time metrics
  rest.get('/api/v1/metrics/realtime', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: createMockRealtimeMetrics(),
      })
    );
  }),

  // Get aggregated metrics
  rest.get('/api/v1/metrics/aggregate', (req, res, ctx) => {
    const timeRange = req.url.searchParams.get('timeRange') || '24h';
    const groupBy = req.url.searchParams.get('groupBy') || 'hour';
    
    // Generate aggregated data based on parameters
    const aggregatedData = Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - (24 - i) * 60 * 60 * 1000),
      avgCpu: 40 + Math.random() * 30,
      avgMemory: 50 + Math.random() * 20,
      avgResponseTime: 100 + Math.random() * 100,
      requestCount: Math.floor(1000 + Math.random() * 500),
      errorCount: Math.floor(Math.random() * 50),
    }));
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: aggregatedData,
      })
    );
  }),

  // Get historical metrics
  rest.get('/api/v1/metrics/historical', (req, res, ctx) => {
    const timeRange = req.url.searchParams.get('timeRange') || '24h';
    const agentIds = req.url.searchParams.getAll('agentId');
    const startTime = req.url.searchParams.get('startTime');
    const endTime = req.url.searchParams.get('endTime');
    
    let filteredMetrics = [...mockMetricsHistory];
    
    if (agentIds.length > 0) {
      filteredMetrics = filteredMetrics.filter(m => agentIds.includes(m.agentId));
    }
    
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      filteredMetrics = filteredMetrics.filter(m => 
        m.timestamp >= start && m.timestamp <= end
      );
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: filteredMetrics,
      })
    );
  }),

  // Ingest metrics
  rest.post('/api/v1/metrics', async (req, res, ctx) => {
    const metricsData = await req.json();
    
    // Add to mock history
    mockMetricsHistory.push({
      ...metricsData,
      timestamp: new Date(metricsData.timestamp || Date.now()),
    });
    
    // Keep only recent data
    if (mockMetricsHistory.length > 10000) {
      mockMetricsHistory = mockMetricsHistory.slice(-5000);
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        status: 'success',
        message: 'Metric ingested',
        timestamp: new Date().toISOString(),
      })
    );
  }),

  // List alerts
  rest.get('/api/v1/alerts', (req, res, ctx) => {
    const enabled = req.url.searchParams.get('enabled');
    const severity = req.url.searchParams.get('severity');
    
    let filteredAlerts = [...mockAlerts];
    
    if (enabled !== null) {
      filteredAlerts = filteredAlerts.filter(alert => 
        alert.enabled === (enabled === 'true')
      );
    }
    
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: filteredAlerts,
      })
    );
  }),

  // Create alert
  rest.post('/api/v1/alerts', async (req, res, ctx) => {
    const alertData = await req.json();
    
    if (!alertData.name || !alertData.metric || !alertData.operator || alertData.threshold === undefined) {
      return res(
        ctx.status(422),
        ctx.json({
          success: false,
          error: 'Missing required fields',
        })
      );
    }
    
    const newAlert = createMockAlert({
      ...alertData,
      id: `alert-${Date.now()}`,
    });
    
    mockAlerts.push(newAlert);
    
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: newAlert,
      })
    );
  }),

  // Update alert
  rest.put('/api/v1/alerts/:id', async (req, res, ctx) => {
    const { id } = req.params;
    const updateData = await req.json();
    
    const alertIndex = mockAlerts.findIndex(a => a.id === id);
    if (alertIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          error: 'Alert not found',
        })
      );
    }
    
    mockAlerts[alertIndex] = {
      ...mockAlerts[alertIndex],
      ...updateData,
      updatedAt: new Date(),
    };
    
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: mockAlerts[alertIndex],
      })
    );
  }),

  // Delete alert
  rest.delete('/api/v1/alerts/:id', (req, res, ctx) => {
    const { id } = req.params;
    const alertIndex = mockAlerts.findIndex(a => a.id === id);
    
    if (alertIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({
          success: false,
          error: 'Alert not found',
        })
      );
    }
    
    mockAlerts.splice(alertIndex, 1);
    
    return res(ctx.status(204));
  }),

  // Error simulation endpoints for testing error handling
  rest.get('/api/v1/error/500', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        error: 'Internal server error',
      })
    );
  }),

  rest.get('/api/v1/error/timeout', (req, res, ctx) => {
    return res(
      ctx.delay(30000), // 30 second delay to simulate timeout
      ctx.status(200),
      ctx.json({ success: true })
    );
  }),

  // Fallback handler for unmatched requests
  rest.all('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} request to ${req.url.pathname}`);
    return res(
      ctx.status(404),
      ctx.json({
        success: false,
        error: 'Endpoint not found',
        path: req.url.pathname,
      })
    );
  }),
];

export const server = setupServer(...handlers);