// Living Agent Network Types

export interface AgentCapability {
  id: string
  name: string
  category: 'code-review' | 'performance' | 'testing' | 'ml-engineering' | 'security' | 'data-processing' | 'orchestration'
  performance: number // 0-100 score
  cost: number // computational cost per operation
  availability: number // 0-100% availability
}

export interface AgentBid {
  agentId: string
  queryId: string
  confidence: number // 0-100 confidence in handling the query
  estimatedTime: number // milliseconds
  bidAmount: number // virtual credits
  capabilities: AgentCapability[]
  timestamp: Date
}

export interface AgentConsortium {
  id: string
  leadAgentId: string
  memberAgentIds: string[]
  taskId: string
  formation: Date
  status: 'forming' | 'active' | 'executing' | 'dissolved'
  performance: number
  consensusScore: number
}

export interface AgentNegotiation {
  id: string
  initiatorId: string
  recipientId: string
  type: 'task-delegation' | 'resource-sharing' | 'consortium-formation' | 'load-balancing'
  status: 'proposed' | 'negotiating' | 'accepted' | 'rejected'
  terms: Record<string, any>
  timestamp: Date
}

export interface AgentReputation {
  agentId: string
  trustScore: number // 0-100
  completedTasks: number
  failedTasks: number
  avgResponseTime: number
  specializations: string[]
  endorsements: string[] // from other agents
  penalties: number
}

export interface LivingAgent {
  id: string
  name: string
  type: 'performance-engineer' | 'code-reviewer' | 'test-automator' | 'ml-engineer' | 'orchestrator' | 'monitor' | 'optimizer'
  status: 'idle' | 'negotiating' | 'executing' | 'optimizing' | 'healing'
  health: number // 0-100
  load: number // 0-100
  capabilities: AgentCapability[]
  reputation: AgentReputation
  currentTasks: string[]
  consortiums: string[]
  connections: string[] // connected agent IDs
  location: {
    region: string
    latency: number
  }
  metrics: {
    requestsHandled: number
    successRate: number
    avgResponseTime: number
    lastOptimized: Date
  }
  wallet: {
    credits: number
    earnedToday: number
    spentToday: number
  }
}

export interface MeshNetworkState {
  agents: Map<string, LivingAgent>
  negotiations: AgentNegotiation[]
  consortiums: AgentConsortium[]
  activeBids: AgentBid[]
  networkHealth: number
  consensusVersion: number
  lastSync: Date
}

export interface AgentMessage {
  id: string
  from: string
  to: string | 'broadcast'
  type: 'heartbeat' | 'bid' | 'negotiate' | 'execute' | 'optimize' | 'consensus' | 'discover'
  payload: any
  timestamp: Date
  ttl: number // time to live in ms
}

export interface PerformanceOptimization {
  agentId: string
  targetMetric: 'latency' | 'throughput' | 'memory' | 'cpu'
  currentValue: number
  targetValue: number
  optimizationType: 'cache' | 'algorithm' | 'resource-allocation' | 'load-distribution'
  status: 'analyzing' | 'optimizing' | 'testing' | 'deployed' | 'rolled-back'
  improvement: number // percentage
  timestamp: Date
}
