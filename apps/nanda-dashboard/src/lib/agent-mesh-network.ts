import { LivingAgent, AgentMessage, AgentBid, AgentConsortium, AgentNegotiation, MeshNetworkState, PerformanceOptimization } from '../types/agent.types'

// CRDT-based consensus mechanism for distributed state
class ConsensusEngine {
  private version: number = 0
  private states: Map<string, any> = new Map()
  private vectorClock: Map<string, number> = new Map()

  merge(remoteState: any, remoteVector: Map<string, number>): boolean {
    let hasChanges = false

    // Implement vector clock comparison and merge
    remoteVector.forEach((timestamp, nodeId) => {
      const localTimestamp = this.vectorClock.get(nodeId) || 0
      if (timestamp > localTimestamp) {
        this.vectorClock.set(nodeId, timestamp)
        hasChanges = true
      }
    })

    if (hasChanges) {
      this.version++
      // Merge states using CRDT rules
      Object.entries(remoteState).forEach(([key, value]) => {
        this.states.set(key, value)
      })
    }

    return hasChanges
  }

  getState(): any {
    return Object.fromEntries(this.states)
  }

  updateLocal(key: string, value: any, nodeId: string): void {
    this.states.set(key, value)
    const currentTime = this.vectorClock.get(nodeId) || 0
    this.vectorClock.set(nodeId, currentTime + 1)
    this.version++
  }
}

export class AgentMeshNetwork {
  private agents: Map<string, LivingAgent> = new Map()
  private connections: Map<string, WebSocket> = new Map()
  private consensus: ConsensusEngine = new ConsensusEngine()
  private negotiations: Map<string, AgentNegotiation> = new Map()
  private consortiums: Map<string, AgentConsortium> = new Map()
  private activeBids: Map<string, AgentBid[]> = new Map()
  private optimizations: Map<string, PerformanceOptimization> = new Map()
  private messageHandlers: Map<string, (msg: AgentMessage) => void> = new Map()
  private dashboardAgentId: string = 'dashboard-agent-001'

  constructor() {
    this.initializeDashboardAgent()
    this.setupMessageHandlers()
  }

  private initializeDashboardAgent(): void {
    const dashboardAgent: LivingAgent = {
      id: this.dashboardAgentId,
      name: 'NANDA Dashboard Monitor',
      type: 'monitor',
      status: 'idle',
      health: 100,
      load: 0,
      capabilities: [
        {
          id: 'monitoring',
          name: 'System Monitoring',
          category: 'orchestration',
          performance: 95,
          cost: 1,
          availability: 100
        },
        {
          id: 'visualization',
          name: 'Data Visualization',
          category: 'data-processing',
          performance: 90,
          cost: 2,
          availability: 100
        }
      ],
      reputation: {
        agentId: this.dashboardAgentId,
        trustScore: 100,
        completedTasks: 0,
        failedTasks: 0,
        avgResponseTime: 50,
        specializations: ['monitoring', 'visualization'],
        endorsements: [],
        penalties: 0
      },
      currentTasks: [],
      consortiums: [],
      connections: [],
      location: {
        region: 'US-East',
        latency: 10
      },
      metrics: {
        requestsHandled: 0,
        successRate: 100,
        avgResponseTime: 50,
        lastOptimized: new Date()
      },
      wallet: {
        credits: 10000,
        earnedToday: 0,
        spentToday: 0
      }
    }

    this.agents.set(this.dashboardAgentId, dashboardAgent)
  }

  private setupMessageHandlers(): void {
    this.messageHandlers.set('heartbeat', this.handleHeartbeat.bind(this))
    this.messageHandlers.set('bid', this.handleBid.bind(this))
    this.messageHandlers.set('negotiate', this.handleNegotiation.bind(this))
    this.messageHandlers.set('consensus', this.handleConsensus.bind(this))
    this.messageHandlers.set('optimize', this.handleOptimization.bind(this))
  }

  // Connect to agent network
  async connectToAgent(agentUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(agentUrl)

      ws.onopen = () => {
        const agentId = this.extractAgentId(agentUrl)
        this.connections.set(agentId, ws)
        this.broadcastDiscovery()
        resolve()
      }

      ws.onmessage = (event) => {
        const message: AgentMessage = JSON.parse(event.data)
        this.routeMessage(message)
      }

      ws.onerror = reject
    })
  }

  private extractAgentId(url: string): string {
    // Extract agent ID from URL
    return url.split('/').pop() || `agent-${Date.now()}`
  }

  private routeMessage(message: AgentMessage): void {
    const handler = this.messageHandlers.get(message.type)
    if (handler) {
      handler(message)
    }

    // Update last seen for sender
    const agent = this.agents.get(message.from)
    if (agent) {
      agent.metrics.lastOptimized = new Date()
    }
  }

  private handleHeartbeat(message: AgentMessage): void {
    const agentData = message.payload as LivingAgent
    this.agents.set(agentData.id, agentData)

    // Update consensus state
    this.consensus.updateLocal(`agent.${agentData.id}`, agentData, this.dashboardAgentId)
  }

  private handleBid(message: AgentMessage): void {
    const bid = message.payload as AgentBid
    const queryBids = this.activeBids.get(bid.queryId) || []
    queryBids.push(bid)
    this.activeBids.set(bid.queryId, queryBids)

    // Auto-select winner after timeout
    setTimeout(() => this.selectBidWinner(bid.queryId), 1000)
  }

  private handleNegotiation(message: AgentMessage): void {
    const negotiation = message.payload as AgentNegotiation
    this.negotiations.set(negotiation.id, negotiation)

    // Auto-respond to negotiations targeting dashboard
    if (negotiation.recipientId === this.dashboardAgentId) {
      this.respondToNegotiation(negotiation)
    }
  }

  private handleConsensus(message: AgentMessage): void {
    const { state, vectorClock } = message.payload
    const hasChanges = this.consensus.merge(state, new Map(Object.entries(vectorClock)))

    if (hasChanges) {
      // Propagate changes to other agents
      this.broadcastConsensus()
    }
  }

  private handleOptimization(message: AgentMessage): void {
    const optimization = message.payload as PerformanceOptimization
    this.optimizations.set(optimization.agentId, optimization)

    // If it's a dashboard optimization, apply it
    if (optimization.agentId === this.dashboardAgentId) {
      this.applyOptimization(optimization)
    }
  }

  // Bidding system
  async submitQuery(query: string, requirements: string[]): Promise<string> {
    const queryId = `query-${Date.now()}`

    const bidRequest: AgentMessage = {
      id: `msg-${Date.now()}`,
      from: this.dashboardAgentId,
      to: 'broadcast',
      type: 'bid',
      payload: {
        queryId,
        query,
        requirements,
        deadline: Date.now() + 5000
      },
      timestamp: new Date(),
      ttl: 5000
    }

    this.broadcast(bidRequest)
    return queryId
  }

  private selectBidWinner(queryId: string): void {
    const bids = this.activeBids.get(queryId) || []
    if (bids.length === 0) return

    // Score bids based on confidence, time, and reputation
    const scoredBids = bids.map(bid => {
      const agent = this.agents.get(bid.agentId)
      const reputationScore = agent?.reputation.trustScore || 50
      const score = (bid.confidence * 0.4) +
                    (reputationScore * 0.4) +
                    ((1000 / bid.estimatedTime) * 20)
      return { bid, score }
    })

    // Select winner
    scoredBids.sort((a, b) => b.score - a.score)
    const winner = scoredBids[0]

    // Notify winner
    this.sendToAgent(winner.bid.agentId, {
      id: `msg-${Date.now()}`,
      from: this.dashboardAgentId,
      to: winner.bid.agentId,
      type: 'execute',
      payload: {
        queryId,
        accepted: true
      },
      timestamp: new Date(),
      ttl: 5000
    })

    // Clear bids
    this.activeBids.delete(queryId)
  }

  // Consortium formation
  async formConsortium(taskId: string, requiredCapabilities: string[]): Promise<AgentConsortium> {
    const consortium: AgentConsortium = {
      id: `consortium-${Date.now()}`,
      leadAgentId: this.dashboardAgentId,
      memberAgentIds: [],
      taskId,
      formation: new Date(),
      status: 'forming',
      performance: 0,
      consensusScore: 0
    }

    // Find suitable agents
    const suitableAgents = Array.from(this.agents.values())
      .filter(agent =>
        agent.id !== this.dashboardAgentId &&
        agent.status === 'idle' &&
        agent.capabilities.some(cap =>
          requiredCapabilities.includes(cap.category)
        )
      )
      .slice(0, 3) // Max 3 agents per consortium

    // Invite agents
    for (const agent of suitableAgents) {
      const invitation: AgentNegotiation = {
        id: `nego-${Date.now()}`,
        initiatorId: this.dashboardAgentId,
        recipientId: agent.id,
        type: 'consortium-formation',
        status: 'proposed',
        terms: {
          consortiumId: consortium.id,
          taskId,
          role: 'member',
          rewardShare: 30
        },
        timestamp: new Date()
      }

      this.negotiations.set(invitation.id, invitation)
      consortium.memberAgentIds.push(agent.id)
    }

    consortium.status = 'active'
    this.consortiums.set(consortium.id, consortium)

    return consortium
  }

  // Self-optimization
  async optimizeDashboard(): Promise<PerformanceOptimization> {
    const optimization: PerformanceOptimization = {
      agentId: this.dashboardAgentId,
      targetMetric: 'latency',
      currentValue: 100,
      targetValue: 50,
      optimizationType: 'cache',
      status: 'analyzing',
      improvement: 0,
      timestamp: new Date()
    }

    // Simulate optimization process
    setTimeout(() => {
      optimization.status = 'optimizing'
      optimization.improvement = 25
      this.optimizations.set(this.dashboardAgentId, optimization)
    }, 1000)

    setTimeout(() => {
      optimization.status = 'deployed'
      optimization.improvement = 50
      this.optimizations.set(this.dashboardAgentId, optimization)
    }, 3000)

    return optimization
  }

  private applyOptimization(optimization: PerformanceOptimization): void {
    // Apply actual optimizations
    console.log('Applying optimization:', optimization)

    // Update agent metrics
    const agent = this.agents.get(this.dashboardAgentId)
    if (agent) {
      agent.metrics.avgResponseTime *= (1 - optimization.improvement / 100)
      agent.health = Math.min(100, agent.health + 10)
    }
  }

  private respondToNegotiation(negotiation: AgentNegotiation): void {
    // Auto-accept consortium invitations
    if (negotiation.type === 'consortium-formation') {
      negotiation.status = 'accepted'
      this.negotiations.set(negotiation.id, negotiation)
    }
  }

  private broadcastDiscovery(): void {
    this.broadcast({
      id: `msg-${Date.now()}`,
      from: this.dashboardAgentId,
      to: 'broadcast',
      type: 'discover',
      payload: this.agents.get(this.dashboardAgentId),
      timestamp: new Date(),
      ttl: 10000
    })
  }

  private broadcastConsensus(): void {
    this.broadcast({
      id: `msg-${Date.now()}`,
      from: this.dashboardAgentId,
      to: 'broadcast',
      type: 'consensus',
      payload: {
        state: this.consensus.getState(),
        vectorClock: Object.fromEntries(this.vectorClock)
      },
      timestamp: new Date(),
      ttl: 5000
    })
  }

  private broadcast(message: AgentMessage): void {
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message))
      }
    })
  }

  private sendToAgent(agentId: string, message: AgentMessage): void {
    const ws = this.connections.get(agentId)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  private vectorClock: Map<string, number> = new Map()

  // Public API
  getNetworkState(): MeshNetworkState {
    return {
      agents: this.agents,
      negotiations: Array.from(this.negotiations.values()),
      consortiums: Array.from(this.consortiums.values()),
      activeBids: Array.from(this.activeBids.values()).flat(),
      networkHealth: this.calculateNetworkHealth(),
      consensusVersion: this.consensus['version'],
      lastSync: new Date()
    }
  }

  private calculateNetworkHealth(): number {
    const agents = Array.from(this.agents.values())
    if (agents.length === 0) return 0

    const avgHealth = agents.reduce((sum, agent) => sum + agent.health, 0) / agents.length
    const activeRatio = agents.filter(a => a.status !== 'idle').length / agents.length

    return avgHealth * 0.7 + activeRatio * 30
  }

  getAgent(id: string): LivingAgent | undefined {
    return this.agents.get(id)
  }

  getOptimizations(): PerformanceOptimization[] {
    return Array.from(this.optimizations.values())
  }
}
