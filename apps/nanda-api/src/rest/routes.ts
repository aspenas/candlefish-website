import { FastifyInstance } from 'fastify'

export function registerRESTRoutes(app: FastifyInstance, context: any) {
  // REST API routes
  app.get('/api/agents', async (request, reply) => {
    return {
      data: [
        {
          agent_id: 'agent_1',
          name: 'GPT-4',
          platform: 'openai',
          capabilities: ['text-generation', 'code-completion']
        }
      ],
      meta: {
        total: 1,
        page: 1,
        limit: 10
      }
    }
  })

  app.post('/api/agents', async (request, reply) => {
    return {
      agent_id: `agent_${Date.now()}`,
      ...(request.body as any),
      created_at: new Date().toISOString()
    }
  })

  // Admin seeding endpoint
  app.post('/admin/seed', async (request, reply) => {
    // Mock seeding response
    return {
      success: true,
      message: 'Seeded 1000 sample agents',
      agents_created: 1000
    }
  })
}