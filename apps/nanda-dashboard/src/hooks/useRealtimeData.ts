import { useState, useEffect, useRef } from 'react'

export interface AgentMetrics {
  id: string
  name: string
  platform: 'OpenAI' | 'Anthropic' | 'Google' | 'Cohere' | 'Mistral' | 'Local'
  status: 'online' | 'offline' | 'warning' | 'error'
  uptime: number
  responseTime: number
  requestsPerMinute: number
  successRate: number
  lastSeen: Date
  region: string
  version: string
  capabilities: string[]
}

export interface SystemMetrics {
  totalAgents: number
  activeAgents: number
  totalRequests: number
  avgResponseTime: number
  successRate: number
  errorRate: number
  uptime: number
  networkHealth: number
}

export interface ActivityItem {
  id: string
  type: 'agent_registered' | 'agent_online' | 'agent_offline' | 'error' | 'maintenance' | 'discovery'
  agentId?: string
  agentName?: string
  platform?: string
  message: string
  timestamp: Date
  severity: 'info' | 'warning' | 'error' | 'success'
}

export interface PerformanceMetrics {
  timestamp: Date
  responseTime: number
  requestVolume: number
  errorRate: number
  activeConnections: number
}

// Mock data generators for demonstration
const generateMockAgentMetrics = (): AgentMetrics[] => {
  const platforms = ['OpenAI', 'Anthropic', 'Google', 'Cohere', 'Mistral', 'Local'] as const
  const regions = ['US-East', 'US-West', 'EU-West', 'Asia-Pacific', 'Canada', 'Australia']
  const statuses = ['online', 'offline', 'warning', 'error'] as const

  return Array.from({ length: 24 }, (_, i) => ({
    id: `agent-${i + 1}`,
    name: `Agent-${String(i + 1).padStart(3, '0')}`,
    platform: platforms[Math.floor(Math.random() * platforms.length)],
    status: statuses[Math.floor(Math.random() * 10) < 8 ? 0 : Math.floor(Math.random() * statuses.length)],
    uptime: Math.random() * 30 + 95,
    responseTime: Math.random() * 200 + 50,
    requestsPerMinute: Math.floor(Math.random() * 100) + 10,
    successRate: Math.random() * 10 + 90,
    lastSeen: new Date(Date.now() - Math.random() * 3600000),
    region: regions[Math.floor(Math.random() * regions.length)],
    version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
    capabilities: ['text-generation', 'code-completion', 'analysis', 'translation'].slice(0, Math.floor(Math.random() * 4) + 1)
  }))
}

const generateMockSystemMetrics = (agents: AgentMetrics[]): SystemMetrics => {
  const activeAgents = agents.filter(a => a.status === 'online').length
  const totalRequests = agents.reduce((sum, agent) => sum + agent.requestsPerMinute, 0)
  const avgResponseTime = agents.reduce((sum, agent) => sum + agent.responseTime, 0) / agents.length
  const successRate = agents.reduce((sum, agent) => sum + agent.successRate, 0) / agents.length

  return {
    totalAgents: agents.length,
    activeAgents,
    totalRequests: totalRequests * 60, // Convert to requests per hour
    avgResponseTime,
    successRate,
    errorRate: 100 - successRate,
    uptime: 99.7,
    networkHealth: Math.min(98.5 + Math.random() * 1.5, 100)
  }
}

const generateMockActivity = (): ActivityItem[] => {
  const types = ['agent_registered', 'agent_online', 'agent_offline', 'error', 'maintenance', 'discovery'] as const
  const severities = ['info', 'warning', 'error', 'success'] as const
  const platforms = ['OpenAI', 'Anthropic', 'Google', 'Cohere', 'Mistral']

  return Array.from({ length: 50 }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)]
    const agentId = `agent-${Math.floor(Math.random() * 100) + 1}`
    const platform = platforms[Math.floor(Math.random() * platforms.length)]

    const messages = {
      agent_registered: `New agent ${agentId} registered on ${platform}`,
      agent_online: `Agent ${agentId} came online`,
      agent_offline: `Agent ${agentId} went offline`,
      error: `Connection error with agent ${agentId}`,
      maintenance: `Scheduled maintenance on ${platform} platform`,
      discovery: `Discovered new agent capabilities: ${agentId}`
    }

    return {
      id: `activity-${i}`,
      type,
      agentId: type.includes('agent') ? agentId : undefined,
      agentName: type.includes('agent') ? `Agent-${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}` : undefined,
      platform: type === 'maintenance' || Math.random() > 0.5 ? platform : undefined,
      message: messages[type],
      timestamp: new Date(Date.now() - Math.random() * 86400000), // Random within last 24h
      severity: severities[type === 'error' ? 2 : type === 'maintenance' ? 1 : Math.floor(Math.random() * severities.length)]
    }
  }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

export function useRealtimeData() {
  const [agents, setAgents] = useState<AgentMetrics[]>([])
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetrics[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Initialize with mock data
    const initialAgents = generateMockAgentMetrics()
    setAgents(initialAgents)
    setSystemMetrics(generateMockSystemMetrics(initialAgents))
    setActivity(generateMockActivity())

    // Generate initial performance history (last 24 hours)
    const now = new Date()
    const history: PerformanceMetrics[] = []
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 3600000)
      history.push({
        timestamp,
        responseTime: 80 + Math.random() * 40,
        requestVolume: Math.floor(Math.random() * 1000) + 500,
        errorRate: Math.random() * 5,
        activeConnections: Math.floor(Math.random() * 100) + 150
      })
    }
    setPerformanceHistory(history)

    // Simulate WebSocket connection
    const connectWebSocket = () => {
      try {
        // In a real implementation, this would connect to your WebSocket endpoint
        // wsRef.current = new WebSocket('wss://api.nanda.ai/ws/dashboard')

        // Simulate connection
        setIsConnected(true)

        // Simulate real-time updates
        const interval = setInterval(() => {
          // Update some random agents
          setAgents(prevAgents => {
            const updatedAgents = [...prevAgents]
            const agentToUpdate = updatedAgents[Math.floor(Math.random() * updatedAgents.length)]

            if (agentToUpdate) {
              agentToUpdate.responseTime = Math.max(10, agentToUpdate.responseTime + (Math.random() - 0.5) * 20)
              agentToUpdate.requestsPerMinute = Math.max(0, agentToUpdate.requestsPerMinute + Math.floor((Math.random() - 0.5) * 10))
              agentToUpdate.lastSeen = new Date()

              // Occasionally change status
              if (Math.random() < 0.05) {
                const statuses = ['online', 'offline', 'warning', 'error'] as const
                agentToUpdate.status = statuses[Math.floor(Math.random() * statuses.length)]
              }
            }

            return updatedAgents
          })

          // Update system metrics
          setSystemMetrics(prevMetrics => {
            if (!prevMetrics) return null
            return {
              ...prevMetrics,
              networkHealth: Math.min(98 + Math.random() * 2, 100),
              avgResponseTime: prevMetrics.avgResponseTime + (Math.random() - 0.5) * 5,
              totalRequests: prevMetrics.totalRequests + Math.floor(Math.random() * 100)
            }
          })

          // Add new performance data point
          setPerformanceHistory(prevHistory => {
            const newPoint: PerformanceMetrics = {
              timestamp: new Date(),
              responseTime: 80 + Math.random() * 40,
              requestVolume: Math.floor(Math.random() * 1000) + 500,
              errorRate: Math.random() * 5,
              activeConnections: Math.floor(Math.random() * 100) + 150
            }

            const updated = [...prevHistory.slice(-23), newPoint]
            return updated
          })

          // Occasionally add new activity
          if (Math.random() < 0.3) {
            const types = ['agent_online', 'agent_offline', 'discovery', 'error'] as const
            const type = types[Math.floor(Math.random() * types.length)]
            const agentId = `agent-${Math.floor(Math.random() * 100) + 1}`

            const newActivity: ActivityItem = {
              id: `activity-${Date.now()}`,
              type,
              agentId,
              agentName: `Agent-${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`,
              platform: ['OpenAI', 'Anthropic', 'Google'][Math.floor(Math.random() * 3)],
              message: `Real-time: Agent ${agentId} ${type.replace('_', ' ')}`,
              timestamp: new Date(),
              severity: type === 'error' ? 'error' : type === 'agent_online' ? 'success' : 'info'
            }

            setActivity(prevActivity => [newActivity, ...prevActivity.slice(0, 49)])
          }
        }, 3000) // Update every 3 seconds

        return () => {
          clearInterval(interval)
          if (wsRef.current) {
            wsRef.current.close()
          }
        }
      } catch (error) {
        console.error('WebSocket connection failed:', error)
        setIsConnected(false)
      }
    }

    const cleanup = connectWebSocket()
    return cleanup
  }, [])

  // Recalculate system metrics when agents change
  useEffect(() => {
    if (agents.length > 0) {
      setSystemMetrics(generateMockSystemMetrics(agents))
    }
  }, [agents])

  return {
    agents,
    systemMetrics,
    activity,
    performanceHistory,
    isConnected
  }
}
