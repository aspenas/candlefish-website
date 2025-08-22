import { NextResponse } from 'next/server'

// NANDA Agent Registry - Real agents from MIT Project NANDA
const NANDA_AGENTS = [
  {
    id: 'nanda-claude',
    name: 'Claude (NANDA)',
    vendor: 'Anthropic via NANDA',
    status: 'online',
    capabilities: ['text', 'analysis', 'creative'],
    url: 'http://localhost:7001',
    projectUrl: 'https://github.com/projnanda/adapter'
  },
  {
    id: 'nanda-gpt4',
    name: 'GPT-4 (NANDA)',
    vendor: 'OpenAI via NANDA',
    status: 'online',
    capabilities: ['text', 'code', 'vision'],
    url: 'http://localhost:7002',
    projectUrl: 'https://github.com/projnanda/adapter'
  },
  {
    id: 'nanda-swarm',
    name: 'Swarm Coordinator',
    vendor: 'NANDA Collective',
    status: 'online',
    capabilities: ['coordination', 'consensus', 'optimization'],
    url: 'http://localhost:7003',
    projectUrl: 'https://github.com/projnanda/nanda-index'
  },
  {
    id: 'nanda-index',
    name: 'NANDA Index',
    vendor: 'MIT',
    status: 'online',
    capabilities: ['registry', 'discovery', 'allocation'],
    url: 'https://index.projectnanda.org',
    projectUrl: 'https://github.com/projnanda'
  }
]

export async function GET() {
  try {
    // In production, this would query real NANDA index
    const agents = NANDA_AGENTS.map(agent => ({
      ...agent,
      lastSeen: new Date().toISOString(),
      metrics: {
        requests: Math.floor(Math.random() * 1000),
        avgResponseTime: Math.floor(Math.random() * 200) + 50,
        uptime: 99.9
      }
    }))

    return NextResponse.json({
      agents,
      index: {
        url: 'https://index.projectnanda.org',
        status: 'connected',
        totalAgents: agents.length,
        activeAgents: agents.filter(a => a.status === 'online').length
      },
      project: {
        name: 'Project NANDA',
        description: 'Open Agentic Web - MIT',
        github: 'https://github.com/projnanda',
        website: 'http://projectnanda.org'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch NANDA agents' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { agentId, message } = await request.json()

    const agent = NANDA_AGENTS.find(a => a.id === agentId)
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      )
    }

    // In production, this would forward to real NANDA agent
    const response = {
      agentId,
      message: `Response from ${agent.name}: Processing "${message}" through NANDA infrastructure`,
      timestamp: new Date().toISOString(),
      metadata: {
        model: agent.vendor,
        capabilities: agent.capabilities,
        projectUrl: agent.projectUrl
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
