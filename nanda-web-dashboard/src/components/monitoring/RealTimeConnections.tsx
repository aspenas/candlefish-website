'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgentStatus } from '@/types/agent'
import { 
  Network, 
  Wifi, 
  WifiOff, 
  Zap,
  Activity,
  ArrowRight,
  Radio
} from 'lucide-react'

interface RealTimeConnectionsProps {
  agents: AgentStatus[]
}

interface Connection {
  id: string
  from: string
  to: string
  fromAgent: AgentStatus
  toAgent: AgentStatus
  strength: number
  type: 'data' | 'control' | 'heartbeat' | 'sync'
  latency: number
  active: boolean
  lastActivity: number
}

export function RealTimeConnections({ agents }: RealTimeConnectionsProps) {
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    // Generate mock connections based on available agents
    const generateConnections = (): Connection[] => {
      const onlineAgents = agents.filter(a => a.status === 'online')
      const connectionList: Connection[] = []

      // Create connections between agents
      for (let i = 0; i < onlineAgents.length; i++) {
        for (let j = i + 1; j < onlineAgents.length; j++) {
          const fromAgent = onlineAgents[i]
          const toAgent = onlineAgents[j]
          
          // Create bidirectional connections
          connectionList.push({
            id: `${fromAgent.id}-${toAgent.id}`,
            from: fromAgent.id,
            to: toAgent.id,
            fromAgent,
            toAgent,
            strength: 0.7 + Math.random() * 0.3,
            type: Math.random() > 0.5 ? 'data' : 'heartbeat',
            latency: 20 + Math.random() * 100,
            active: Math.random() > 0.1,
            lastActivity: Date.now() - Math.random() * 30000
          })
        }
      }

      return connectionList.slice(0, 8) // Limit to prevent overcrowding
    }

    setConnections(generateConnections())

    // Simulate real-time updates
    const interval = setInterval(() => {
      setConnections(current => 
        current.map(conn => ({
          ...conn,
          active: Math.random() > 0.2,
          latency: 20 + Math.random() * 100,
          strength: 0.6 + Math.random() * 0.4,
          lastActivity: conn.active ? Date.now() : conn.lastActivity
        }))
      )
    }, 3000)

    // Simulate connection status changes
    const statusInterval = setInterval(() => {
      setIsConnected(current => Math.random() > 0.05 ? true : current)
    }, 5000)

    return () => {
      clearInterval(interval)
      clearInterval(statusInterval)
    }
  }, [agents])

  const getConnectionTypeColor = (type: string) => {
    switch (type) {
      case 'data': return 'consciousness'
      case 'control': return 'neural'
      case 'heartbeat': return 'quantum'
      case 'sync': return 'matrix'
      default: return 'muted'
    }
  }

  const getConnectionTypeIcon = (type: string) => {
    switch (type) {
      case 'data': return Network
      case 'control': return Zap
      case 'heartbeat': return Activity
      case 'sync': return Radio
      default: return Wifi
    }
  }

  const activeConnections = connections.filter(c => c.active)
  const averageLatency = activeConnections.length > 0 
    ? activeConnections.reduce((sum, c) => sum + c.latency, 0) / activeConnections.length 
    : 0

  return (
    <motion.div
      className="agent-card h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gradient mb-2">Real-Time Connections</h2>
          <p className="text-sm text-muted-foreground">
            Neural mesh network activity
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {isConnected ? (
            <Wifi className="w-5 h-5 text-quantum-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-400" />
          )}
          <span className={`text-sm font-medium ${
            isConnected ? 'text-quantum-400' : 'text-red-400'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-background/50 rounded-lg">
          <div className="text-2xl font-bold text-consciousness-400 mb-1">
            {activeConnections.length}
          </div>
          <div className="text-xs text-muted-foreground">Active Links</div>
        </div>
        <div className="text-center p-3 bg-background/50 rounded-lg">
          <div className="text-2xl font-bold text-neural-400 mb-1">
            {averageLatency.toFixed(0)}ms
          </div>
          <div className="text-xs text-muted-foreground">Avg Latency</div>
        </div>
        <div className="text-center p-3 bg-background/50 rounded-lg">
          <div className="text-2xl font-bold text-quantum-400 mb-1">
            {(activeConnections.reduce((sum, c) => sum + c.strength, 0) / activeConnections.length * 100 || 0).toFixed(0)}%
          </div>
          <div className="text-xs text-muted-foreground">Signal Strength</div>
        </div>
      </div>

      {/* Connections List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {connections.map((connection, index) => {
            const TypeIcon = getConnectionTypeIcon(connection.type)
            const typeColor = getConnectionTypeColor(connection.type)
            const timeSinceActivity = (Date.now() - connection.lastActivity) / 1000
            
            return (
              <motion.div
                key={connection.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 ${
                  connection.active 
                    ? 'bg-background/50 border-white/20 hover:border-consciousness-400/50' 
                    : 'bg-background/20 border-white/5 opacity-60'
                } ${selectedConnection?.id === connection.id ? 'border-consciousness-400' : ''}`}
                onClick={() => setSelectedConnection(connection)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <motion.div
                      className={`p-1.5 rounded bg-${typeColor}-500/20`}
                      animate={connection.active ? {
                        scale: [1, 1.1, 1],
                      } : {}}
                      transition={{
                        duration: 2,
                        repeat: connection.active ? Infinity : 0,
                        ease: "easeInOut"
                      }}
                    >
                      <TypeIcon className={`w-3 h-3 text-${typeColor}-400`} />
                    </motion.div>
                    
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <span className="text-sm font-mono text-consciousness-400 truncate">
                        {connection.fromAgent.name}
                      </span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-mono text-neural-400 truncate">
                        {connection.toAgent.name}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-xs">
                    <span className={`font-mono text-${typeColor}-400`}>
                      {connection.latency.toFixed(0)}ms
                    </span>
                    <div className="w-12 bg-background rounded-full h-1">
                      <motion.div
                        className={`h-1 rounded-full bg-${typeColor}-400`}
                        initial={{ width: 0 }}
                        animate={{ width: `${connection.strength * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Activity indicator */}
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span className="capitalize">{connection.type} connection</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      connection.active ? 'bg-quantum-400 animate-pulse-soft' : 'bg-muted'
                    }`} />
                    <span>
                      {connection.active ? 'Active' : 
                       timeSinceActivity < 60 ? `${timeSinceActivity.toFixed(0)}s ago` :
                       `${(timeSinceActivity / 60).toFixed(0)}m ago`}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {connections.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No active connections</p>
          <p className="text-xs">Agents are not yet networked</p>
        </div>
      )}

      {/* Network Activity Visualization */}
      <div className="mt-6 relative h-16 overflow-hidden rounded-lg bg-background/30">
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="text-xs text-muted-foreground font-mono"
            animate={{
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            Neural mesh synchronization
          </motion.div>
        </div>
        
        {/* Data flow visualization */}
        {activeConnections.slice(0, 3).map((connection, index) => (
          <motion.div
            key={connection.id}
            className={`absolute h-px bg-gradient-to-r from-transparent via-${getConnectionTypeColor(connection.type)}-400/50 to-transparent`}
            style={{
              top: `${30 + index * 20}%`,
              width: '100%'
            }}
            animate={{
              x: ['-100%', '200%']
            }}
            transition={{
              duration: 3 + index,
              repeat: Infinity,
              ease: "linear",
              delay: index * 0.5
            }}
          />
        ))}
      </div>
    </motion.div>
  )
}