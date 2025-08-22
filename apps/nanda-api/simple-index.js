/**
 * Simple NANDA API Server - Node.js version without TypeScript complications
 */

const fastify = require('fastify')({ logger: true });

// Mock NANDA data
const mockData = {
  agents: [
    { id: 'agent-1', name: 'Claude 3 Opus', status: 'active', platform: 'Anthropic' },
    { id: 'agent-2', name: 'GPT-4 Turbo', status: 'active', platform: 'OpenAI' },
    { id: 'agent-3', name: 'Gemini 1.5 Pro', status: 'active', platform: 'Google' },
    { id: 'agent-4', name: 'Llama 3 70B', status: 'active', platform: 'Meta' },
    { id: 'agent-5', name: 'Mistral Large', status: 'active', platform: 'Mistral AI' }
  ],
  statistics: {
    totalAgents: 1247,
    connectedPlatforms: 5,
    queriesPerSecond: 42,
    globalNodes: 12
  }
};

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    service: 'nanda-api',
    timestamp: new Date().toISOString(),
    statistics: mockData.statistics
  };
});

// API info endpoint
fastify.get('/', async (request, reply) => {
  return {
    name: 'NANDA Index API',
    version: '1.0.0',
    description: 'AI Agent Discovery Platform',
    status: 'operational',
    endpoints: {
      health: '/health',
      agents: '/api/agents',
      statistics: '/api/statistics',
      graphql: '/graphql'
    }
  };
});

// Agents API
fastify.get('/api/agents', async (request, reply) => {
  return {
    agents: mockData.agents,
    total: mockData.agents.length,
    timestamp: new Date().toISOString()
  };
});

// Statistics API
fastify.get('/api/statistics', async (request, reply) => {
  return {
    ...mockData.statistics,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
});

// Simple GraphQL endpoint (returns mock schema)
fastify.get('/graphql', async (request, reply) => {
  return {
    message: 'GraphQL endpoint available',
    schema: 'Available queries: agents, statistics',
    example: 'POST to this endpoint with GraphQL queries'
  };
});

// Metrics endpoint for monitoring
fastify.get('/metrics', async (request, reply) => {
  const metrics = {
    process: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      version: process.version
    },
    timestamp: new Date().toISOString()
  };
  
  reply.type('application/json');
  return metrics;
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port: port, host: host });
    
    console.log(`
      🚀 NANDA API Server is running!

      🔗 REST API: http://${host}:${port}
      📊 GraphQL: http://${host}:${port}/graphql
      💓 Health: http://${host}:${port}/health
      📈 Metrics: http://${host}:${port}/metrics

      Ready to revolutionize AI agent discovery!
    `);
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();