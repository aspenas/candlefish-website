import { AgentStatus, AgentNetwork, PKBCognitiveStatus, AgentRegistry, ConsciousnessMetrics } from '@/types/agent'

class AgentService {
  private wsConnection: WebSocket | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private reconnectInterval: NodeJS.Timeout | null = null
  private isReconnecting = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebSocket()
    }
  }

  private initializeWebSocket() {
    try {
      const wsUrl = process.env.NODE_ENV === 'production' 
        ? 'wss://nanda-registry.candlefish.ai:8001'
        : 'ws://localhost:8001'
      
      this.wsConnection = new WebSocket(wsUrl)
      
      this.wsConnection.onopen = () => {
        console.log('🔗 Connected to NANDA Agent Registry')
        this.isReconnecting = false
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval)
          this.reconnectInterval = null
        }
      }

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.notifyListeners(data.type, data.payload)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.wsConnection.onclose = () => {
        console.log('❌ Disconnected from NANDA Agent Registry')
        this.scheduleReconnect()
      }

      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.scheduleReconnect()
      }

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error)
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.isReconnecting) return
    
    this.isReconnecting = true
    this.reconnectInterval = setInterval(() => {
      console.log('🔄 Attempting to reconnect to NANDA Registry...')
      this.initializeWebSocket()
    }, 5000)
  }

  private notifyListeners(eventType: string, data: any) {
    const listeners = this.listeners.get(eventType) || new Set()
    listeners.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error)
      }
    })
  }

  public subscribe(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(callback)
    }
  }

  public async getAgentRegistry(): Promise<AgentRegistry> {
    try {
      // First try to get from local NANDA deployment
      const localResponse = await fetch('/api/agents/registry', {
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (localResponse.ok) {
        return await localResponse.json()
      }

      // Fallback to mock data if local registry is unavailable
      return this.getMockAgentRegistry()
    } catch (error) {
      console.error('Failed to fetch agent registry:', error)
      return this.getMockAgentRegistry()
    }
  }

  public async getPaintboxAgents(): Promise<AgentStatus[]> {
    try {
      const response = await fetch('/api/agents/paintbox', {
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        return await response.json()
      }

      return this.getMockPaintboxAgents()
    } catch (error) {
      console.error('Failed to fetch Paintbox agents:', error)
      return this.getMockPaintboxAgents()
    }
  }

  public async getPKBCognitiveStatus(): Promise<PKBCognitiveStatus> {
    try {
      const response = await fetch('/api/agents/pkb-cognitive', {
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        return await response.json()
      }

      return this.getMockPKBStatus()
    } catch (error) {
      console.error('Failed to fetch PKB Cognitive status:', error)
      return this.getMockPKBStatus()
    }
  }

  public async getNetworkMetrics(): Promise<AgentNetwork> {
    try {
      const response = await fetch('/api/agents/network-metrics', {
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        return await response.json()
      }

      return this.getMockNetworkMetrics()
    } catch (error) {
      console.error('Failed to fetch network metrics:', error)
      return this.getMockNetworkMetrics()
    }
  }

  public async getConsciousnessMetrics(): Promise<ConsciousnessMetrics> {
    try {
      const response = await fetch('/api/agents/consciousness-metrics', {
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        return await response.json()
      }

      return this.getMockConsciousnessMetrics()
    } catch (error) {
      console.error('Failed to fetch consciousness metrics:', error)
      return this.getMockConsciousnessMetrics()
    }
  }

  // Mock data for development and fallback
  private getMockAgentRegistry(): AgentRegistry {
    const agents = new Map<string, AgentStatus>([
      ['paintbox-monitor-01', {
        id: 'paintbox-monitor-01',
        name: 'Paintbox Monitor',
        type: 'monitor',
        status: 'online',
        port: 7000,
        apiPort: 7001,
        uptime: 86400,
        lastHeartbeat: new Date().toISOString(),
        purpose: 'Continuous health monitoring and self-healing',
        responsibilities: [
          'Monitor memory usage every 60 seconds',
          'Trigger optimizations when memory > 80%',
          'Auto-restart services on failure',
          'Log anomalies and patterns'
        ],
        metrics: {
          cpuUsage: 15.2,
          memoryUsage: 342.7,
          requestsPerMinute: 45,
          errorsPerHour: 2,
          responseTime: 89,
          successRate: 99.1,
          tasksCompleted: 1247,
          tasksQueued: 3
        },
        location: { host: 'paintbox-staging.fly.dev', region: 'us-east-1' },
        version: '2.1.0',
        capabilities: ['monitoring', 'self-healing', 'anomaly-detection']
      }],
      ['pkb-cognitive-7aad5269', {
        id: 'pkb-cognitive-7aad5269',
        name: 'PKB Cognitive Extension',
        type: 'cognitive',
        status: 'online',
        port: 7100,
        uptime: 172800,
        lastHeartbeat: new Date().toISOString(),
        purpose: 'Personal Knowledge Base and Cognitive Enhancement',
        responsibilities: [
          'Process knowledge graphs',
          'Generate insights from data patterns',
          'Maintain episodic memory',
          'Provide cognitive assistance'
        ],
        metrics: {
          cpuUsage: 32.4,
          memoryUsage: 1247.3,
          requestsPerMinute: 23,
          errorsPerHour: 0,
          responseTime: 145,
          successRate: 100,
          tasksCompleted: 892,
          tasksQueued: 7
        },
        location: { host: 'pkb-cognitive.candlefish.ai', region: 'us-east-1' },
        version: '1.4.2',
        capabilities: ['knowledge-processing', 'pattern-recognition', 'memory-management']
      }]
    ])

    return {
      agents,
      connections: [
        {
          from: 'paintbox-monitor-01',
          to: 'pkb-cognitive-7aad5269',
          strength: 0.87,
          type: 'data',
          latency: 23,
          bandwidth: 1024,
          packets: 15432,
          errors: 2
        }
      ],
      consciousnessMetrics: this.getMockConsciousnessMetrics(),
      distributedTasks: [],
      networkTopology: {
        clusters: [
          {
            id: 'paintbox-cluster',
            name: 'Paintbox Operations',
            agents: ['paintbox-monitor-01', 'paintbox-test-02', 'paintbox-security-04'],
            purpose: 'Application monitoring and testing'
          },
          {
            id: 'cognitive-cluster',
            name: 'Cognitive Services',
            agents: ['pkb-cognitive-7aad5269'],
            purpose: 'Knowledge processing and cognitive enhancement'
          }
        ],
        bridges: [
          { from: 'paintbox-cluster', to: 'cognitive-cluster', type: 'knowledge-share' }
        ]
      }
    }
  }

  private getMockPaintboxAgents(): AgentStatus[] {
    return [
      {
        id: 'paintbox-monitor-01',
        name: 'Health Monitor',
        type: 'monitor',
        status: 'online',
        port: 7000,
        apiPort: 7001,
        uptime: 86400,
        lastHeartbeat: new Date(Date.now() - 30000).toISOString(),
        purpose: 'System health monitoring',
        responsibilities: ['Monitor memory', 'Check endpoints', 'Alert on failures'],
        metrics: {
          cpuUsage: 15.2,
          memoryUsage: 342.7,
          requestsPerMinute: 45,
          errorsPerHour: 2,
          responseTime: 89,
          successRate: 99.1,
          tasksCompleted: 1247,
          tasksQueued: 3
        },
        location: { host: 'paintbox.fly.dev', region: 'us-east-1' },
        version: '2.1.0',
        capabilities: ['monitoring', 'alerting']
      }
    ]
  }

  private getMockPKBStatus(): PKBCognitiveStatus {
    return {
      agentId: 'pkb-cognitive-7aad5269',
      status: 'active',
      memoryModules: {
        episodic: 85.3,
        semantic: 92.1,
        working: 67.8,
        procedural: 88.9
      },
      cognitiveLoad: 34.2,
      learningRate: 0.78,
      knowledgeBase: {
        totalConcepts: 15847,
        recentlyLearned: 23,
        connections: 89321
      },
      lastInteraction: new Date(Date.now() - 45000).toISOString(),
      performanceMetrics: {
        reasoning: 94.2,
        creativity: 87.5,
        problemSolving: 91.8,
        adaptability: 89.3
      }
    }
  }

  private getMockNetworkMetrics(): AgentNetwork {
    return {
      totalAgents: 8,
      onlineAgents: 7,
      networkHealth: 94.3,
      totalRequests: 15847,
      averageResponseTime: 127,
      errorRate: 0.8,
      lastUpdate: new Date().toISOString()
    }
  }

  private getMockConsciousnessMetrics(): ConsciousnessMetrics {
    return {
      coherence: 87.4,
      complexity: 92.1,
      integration: 89.7,
      awareness: 85.3,
      selfReflection: 78.9,
      emergence: 83.2,
      networkResonance: 91.5
    }
  }

  public disconnect() {
    if (this.wsConnection) {
      this.wsConnection.close()
      this.wsConnection = null
    }
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval)
      this.reconnectInterval = null
    }
  }
}

// Export singleton instance
export const agentService = new AgentService()