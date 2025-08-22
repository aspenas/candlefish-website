// Simple mock resolvers for NANDA API
export const resolvers = {
  Query: {
    agents: async () => ({
      edges: [
        {
          node: {
            agent_id: 'agent_1',
            name: 'GPT-4',
            platform: 'openai',
            capabilities: ['text-generation', 'code-completion'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            metadata: { model: 'gpt-4-turbo' }
          },
          cursor: 'cursor_1'
        }
      ],
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: 'cursor_1',
        endCursor: 'cursor_1'
      },
      totalCount: 1
    }),

    agent: async (_: any, { id }: { id: string }) => ({
      agent_id: id,
      name: 'Claude-3',
      platform: 'anthropic',
      capabilities: ['text-generation', 'analysis'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: { model: 'claude-3-opus' }
    }),

    health: () => 'OK'
  },

  Mutation: {
    registerAgent: async (_: any, { input }: any) => ({
      agent_id: `agent_${Date.now()}`,
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }),

    updateAgent: async (_: any, { id, input }: any) => ({
      agent_id: id,
      ...input,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString()
    }),

    deleteAgent: async () => true
  }
}
