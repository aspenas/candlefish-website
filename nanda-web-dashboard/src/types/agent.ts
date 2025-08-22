export interface AgentStatus {
  id: string
  name: string
  type: 'monitor' | 'test' | 'optimization' | 'security' | 'deployment' | 'cognitive' | 'ui'
  status: 'online' | 'offline' | 'warning' | 'error'
  port: number
  apiPort?: number
  uptime: number
  lastHeartbeat: string
  purpose: string
  responsibilities: string[]
  metrics: AgentMetrics
  location?: {
    host: string
    region: string
  }
  version: string
  capabilities: string[]
}

export interface AgentMetrics {
  cpuUsage: number
  memoryUsage: number
  requestsPerMinute: number
  errorsPerHour: number
  responseTime: number
  successRate: number
  tasksCompleted: number
  tasksQueued: number
  customMetrics?: Record<string, number | string>
}

export interface AgentNetwork {
  totalAgents: number
  onlineAgents: number
  networkHealth: number
  totalRequests: number
  averageResponseTime: number
  errorRate: number
  lastUpdate: string
}

export interface PKBCognitiveStatus {
  agentId: string
  status: 'active' | 'idle' | 'processing' | 'disconnected'
  memoryModules: {
    episodic: number
    semantic: number
    working: number
    procedural: number
  }
  cognitiveLoad: number
  learningRate: number
  knowledgeBase: {
    totalConcepts: number
    recentlyLearned: number
    connections: number
  }
  lastInteraction: string
  performanceMetrics: {
    reasoning: number
    creativity: number
    problemSolving: number
    adaptability: number
  }
}

export interface ConsciousnessMetrics {
  coherence: number
  complexity: number
  integration: number
  awareness: number
  selfReflection: number
  emergence: number
  networkResonance: number
}

export interface DistributedTask {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed'
  assignedTo: string[]
  requiredCapabilities: string[]
  progress: number
  createdAt: string
  updatedAt: string
  estimatedCompletion?: string
  dependencies?: string[]
}

export interface NeuralConnection {
  from: string
  to: string
  strength: number
  type: 'data' | 'control' | 'feedback' | 'learning'
  latency: number
  bandwidth: number
  packets: number
  errors: number
}

export interface AgentRegistry {
  agents: Map<string, AgentStatus>
  connections: NeuralConnection[]
  consciousnessMetrics: ConsciousnessMetrics
  distributedTasks: DistributedTask[]
  networkTopology: {
    clusters: Array<{
      id: string
      name: string
      agents: string[]
      purpose: string
    }>
    bridges: Array<{
      from: string
      to: string
      type: string
    }>
  }
}