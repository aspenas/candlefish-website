import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgentMeshNetwork } from '../../lib/agent-mesh-network'
import { LivingAgent, AgentNegotiation } from '../../types/agent.types'

interface AgentNode {
  agent: LivingAgent
  x: number
  y: number
  vx: number
  vy: number
}

export function LivingAgentEcosystem() {
  const [meshNetwork] = useState(() => new AgentMeshNetwork())
  const [networkState, setNetworkState] = useState(() => meshNetwork.getNetworkState())
  const [selectedAgent, setSelectedAgent] = useState<LivingAgent | null>(null)
  const [activeView, setActiveView] = useState<'network' | 'marketplace' | 'consortiums' | 'optimizations'>('network')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const nodesRef = useRef<Map<string, AgentNode>>(new Map())

  // Initialize agent ecosystem
  useEffect(() => {
    // Create mock living agents
    const agentTypes = [
      { type: 'performance-engineer', name: 'Perf-Optimizer-01', specialization: 'latency' },
      { type: 'code-reviewer', name: 'Code-Auditor-Alpha', specialization: 'security' },
      { type: 'test-automator', name: 'Test-Runner-Pro', specialization: 'e2e-testing' },
      { type: 'ml-engineer', name: 'ML-Predictor-X', specialization: 'anomaly-detection' },
      { type: 'orchestrator', name: 'Task-Coordinator-7', specialization: 'workflow' },
      { type: 'optimizer', name: 'Resource-Balancer', specialization: 'memory' }
    ] as const

    agentTypes.forEach((config, index) => {
      const agent: LivingAgent = {
        id: `agent-${config.type}-${index}`,
        name: config.name,
        type: config.type,
        status: Math.random() > 0.3 ? 'idle' : 'executing',
        health: 70 + Math.random() * 30,
        load: Math.random() * 100,
        capabilities: [
          {
            id: `cap-${index}-1`,
            name: config.specialization,
            category: config.type === 'performance-engineer' ? 'performance' :
                     config.type === 'code-reviewer' ? 'code-review' :
                     config.type === 'test-automator' ? 'testing' :
                     config.type === 'ml-engineer' ? 'ml-engineering' : 'orchestration',
            performance: 70 + Math.random() * 30,
            cost: Math.floor(Math.random() * 10) + 1,
            availability: 80 + Math.random() * 20
          }
        ],
        reputation: {
          agentId: `agent-${config.type}-${index}`,
          trustScore: 60 + Math.random() * 40,
          completedTasks: Math.floor(Math.random() * 1000),
          failedTasks: Math.floor(Math.random() * 50),
          avgResponseTime: 50 + Math.random() * 150,
          specializations: [config.specialization],
          endorsements: [],
          penalties: Math.floor(Math.random() * 5)
        },
        currentTasks: [],
        consortiums: [],
        connections: [],
        location: {
          region: ['US-East', 'US-West', 'EU-West', 'Asia-Pacific'][Math.floor(Math.random() * 4)],
          latency: Math.random() * 100
        },
        metrics: {
          requestsHandled: Math.floor(Math.random() * 10000),
          successRate: 85 + Math.random() * 15,
          avgResponseTime: 50 + Math.random() * 150,
          lastOptimized: new Date()
        },
        wallet: {
          credits: Math.floor(Math.random() * 10000),
          earnedToday: Math.floor(Math.random() * 1000),
          spentToday: Math.floor(Math.random() * 500)
        }
      }

      // Add to network (this would normally happen via WebSocket)
      meshNetwork['agents'].set(agent.id, agent)

      // Initialize node position for visualization
      const angle = (index / agentTypes.length) * Math.PI * 2
      const radius = 200
      nodesRef.current.set(agent.id, {
        agent,
        x: 400 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0
      })
    })

    // Simulate agent activities
    const activityInterval = setInterval(() => {
      // Random negotiations
      if (Math.random() > 0.7) {
        const agents = Array.from(meshNetwork['agents'].values())
        if (agents.length >= 2) {
          const initiator = agents[Math.floor(Math.random() * agents.length)]
          const recipient = agents[Math.floor(Math.random() * agents.length)]

          if (initiator.id !== recipient.id) {
            const negotiation: AgentNegotiation = {
              id: `nego-${Date.now()}`,
              initiatorId: initiator.id,
              recipientId: recipient.id,
              type: ['task-delegation', 'resource-sharing', 'load-balancing'][Math.floor(Math.random() * 3)] as any,
              status: 'negotiating',
              terms: {
                priority: Math.floor(Math.random() * 10),
                reward: Math.floor(Math.random() * 100)
              },
              timestamp: new Date()
            }
            meshNetwork['negotiations'].set(negotiation.id, negotiation)
          }
        }
      }

      // Random consortium formation
      if (Math.random() > 0.9) {
        meshNetwork.formConsortium(`task-${Date.now()}`, ['performance', 'testing'])
      }

      // Random optimization
      if (Math.random() > 0.8) {
        meshNetwork.optimizeDashboard()
      }

      setNetworkState(meshNetwork.getNetworkState())
    }, 2000)

    return () => clearInterval(activityInterval)
  }, [meshNetwork])

  // Animate network visualization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw connections
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)'
      ctx.lineWidth = 1

      nodesRef.current.forEach((node1, id1) => {
        nodesRef.current.forEach((node2, id2) => {
          if (id1 < id2) {
            const distance = Math.sqrt(
              Math.pow(node2.x - node1.x, 2) +
              Math.pow(node2.y - node1.y, 2)
            )

            if (distance < 150) {
              ctx.beginPath()
              ctx.moveTo(node1.x, node1.y)
              ctx.lineTo(node2.x, node2.y)
              ctx.stroke()
            }
          }
        })
      })

      // Update and draw nodes
      nodesRef.current.forEach(node => {
        // Apply forces
        nodesRef.current.forEach(other => {
          if (node !== other) {
            const dx = other.x - node.x
            const dy = other.y - node.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance > 0 && distance < 200) {
              // Repulsion
              const force = -50 / (distance * distance)
              node.vx += (dx / distance) * force
              node.vy += (dy / distance) * force
            }
          }
        })

        // Center attraction
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        node.vx += (centerX - node.x) * 0.001
        node.vy += (centerY - node.y) * 0.001

        // Apply velocity
        node.vx *= 0.95 // Damping
        node.vy *= 0.95
        node.x += node.vx
        node.y += node.vy

        // Draw node
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 20)

        if (node.agent.status === 'executing') {
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)')
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.1)')
        } else if (node.agent.status === 'negotiating') {
          gradient.addColorStop(0, 'rgba(251, 191, 36, 0.8)')
          gradient.addColorStop(1, 'rgba(251, 191, 36, 0.1)')
        } else {
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)')
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)')
        }

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, 10 + node.agent.load / 10, 0, Math.PI * 2)
        ctx.fill()

        // Draw label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
        ctx.font = '10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(node.agent.name, node.x, node.y - 20)
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [networkState])

  const AgentCard = ({ agent }: { agent: LivingAgent }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="glass-card p-4 cursor-pointer"
      onClick={() => setSelectedAgent(agent)}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">{agent.name}</h4>
        <span className={`px-2 py-1 text-xs rounded-full ${
          agent.status === 'executing' ? 'bg-green-500/20 text-green-400' :
          agent.status === 'negotiating' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-blue-500/20 text-blue-400'
        }`}>
          {agent.status}
        </span>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Health</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${agent.health}%` }}
              />
            </div>
            <span>{agent.health.toFixed(0)}%</span>
          </div>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Load</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  agent.load > 80 ? 'bg-red-500' :
                  agent.load > 50 ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${agent.load}%` }}
              />
            </div>
            <span>{agent.load.toFixed(0)}%</span>
          </div>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Trust Score</span>
          <span className="text-primary">{agent.reputation.trustScore.toFixed(0)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Credits</span>
          <span className="text-accent">{agent.wallet.credits.toLocaleString()}</span>
        </div>
      </div>
    </motion.div>
  )

  const NegotiationItem = ({ negotiation }: { negotiation: AgentNegotiation }) => {
    const initiator = meshNetwork.getAgent(negotiation.initiatorId)
    const recipient = meshNetwork.getAgent(negotiation.recipientId)

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-card p-3 text-xs"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-primary">{initiator?.name || 'Unknown'}</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-accent">{recipient?.name || 'Unknown'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{negotiation.type.replace('-', ' ')}</span>
          <span className={`px-2 py-1 rounded-full ${
            negotiation.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
            negotiation.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {negotiation.status}
          </span>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Living Agent Ecosystem
        </h2>

        <div className="flex gap-2 mb-4">
          {(['network', 'marketplace', 'consortiums', 'optimizations'] as const).map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeView === view
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 hover:bg-muted'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {networkState.agents.size}
            </div>
            <div className="text-xs text-muted-foreground">Active Agents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {networkState.negotiations.length}
            </div>
            <div className="text-xs text-muted-foreground">Negotiations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {networkState.consortiums.length}
            </div>
            <div className="text-xs text-muted-foreground">Consortiums</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {networkState.networkHealth.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">Network Health</div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Visualization */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6"
          >
            <h3 className="text-lg font-semibold mb-4">Agent Network Mesh</h3>
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="w-full h-[400px] bg-background/50 rounded-lg"
            />

            {activeView === 'marketplace' && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-sm mb-2">Active Bids</h4>
                {networkState.activeBids.slice(0, 5).map((bid, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                    <span>{meshNetwork.getAgent(bid.agentId)?.name}</span>
                    <span className="text-primary">{bid.confidence}% confidence</span>
                    <span className="text-accent">{bid.bidAmount} credits</span>
                  </div>
                ))}
              </div>
            )}

            {activeView === 'consortiums' && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-sm mb-2">Active Consortiums</h4>
                {networkState.consortiums.map(consortium => (
                  <div key={consortium.id} className="p-3 bg-muted/30 rounded">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-medium">Task: {consortium.taskId}</span>
                      <span className={`px-2 py-1 rounded-full ${
                        consortium.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        consortium.status === 'forming' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {consortium.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {consortium.memberAgentIds.length} agents collaborating
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeView === 'optimizations' && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-sm mb-2">Self-Optimizations</h4>
                {meshNetwork.getOptimizations().map(opt => (
                  <div key={opt.agentId} className="p-3 bg-muted/30 rounded">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-medium">{opt.targetMetric} optimization</span>
                      <span className={`px-2 py-1 rounded-full ${
                        opt.status === 'deployed' ? 'bg-green-500/20 text-green-400' :
                        opt.status === 'optimizing' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {opt.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {opt.improvement}% improvement achieved
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Agent List / Details */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-4"
          >
            <h3 className="text-lg font-semibold mb-4">Agent Registry</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {Array.from(networkState.agents.values()).map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4"
          >
            <h3 className="text-lg font-semibold mb-4">Live Negotiations</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {networkState.negotiations.slice(0, 10).map(negotiation => (
                <NegotiationItem key={negotiation.id} negotiation={negotiation} />
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedAgent(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="glass-card max-w-2xl w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-4">
                {selectedAgent.name} ({selectedAgent.type})
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Capabilities</h4>
                  {selectedAgent.capabilities.map(cap => (
                    <div key={cap.id} className="mb-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>{cap.name}</span>
                        <span className="text-primary">{cap.performance}%</span>
                      </div>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${cap.performance}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Metrics</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>Requests Handled</span>
                      <span>{selectedAgent.metrics.requestsHandled.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Success Rate</span>
                      <span className="text-green-400">{selectedAgent.metrics.successRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Response Time</span>
                      <span>{selectedAgent.metrics.avgResponseTime.toFixed(0)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Region</span>
                      <span>{selectedAgent.location.region}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-muted/30 rounded">
                  <div className="text-lg font-bold text-primary">
                    {selectedAgent.wallet.credits.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Credits</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded">
                  <div className="text-lg font-bold text-green-400">
                    +{selectedAgent.wallet.earnedToday.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Earned Today</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded">
                  <div className="text-lg font-bold text-red-400">
                    -{selectedAgent.wallet.spentToday.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Spent Today</div>
                </div>
              </div>

              <button
                onClick={() => setSelectedAgent(null)}
                className="btn-primary w-full"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
