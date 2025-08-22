'use client'

import { motion } from 'framer-motion'
import { AgentStatus } from '@/types/agent'
import { 
  Monitor, 
  TestTube, 
  Zap, 
  Shield, 
  Rocket, 
  Brain,
  User,
  Activity,
  Clock,
  MapPin
} from 'lucide-react'

interface AgentCardProps {
  agent: AgentStatus
  onClick: () => void
}

const getAgentIcon = (type: string) => {
  switch (type) {
    case 'monitor': return Monitor
    case 'test': return TestTube
    case 'optimization': return Zap
    case 'security': return Shield
    case 'deployment': return Rocket
    case 'cognitive': return Brain
    case 'ui': return User
    default: return Activity
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return 'text-quantum-400 bg-quantum-500/20'
    case 'offline': return 'text-red-400 bg-red-500/20'
    case 'warning': return 'text-yellow-400 bg-yellow-500/20'
    case 'error': return 'text-red-400 bg-red-500/20'
    default: return 'text-muted-foreground bg-muted/20'
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'monitor': return 'text-consciousness-400'
    case 'test': return 'text-neural-400'
    case 'optimization': return 'text-quantum-400'
    case 'security': return 'text-matrix-400'
    case 'deployment': return 'text-purple-400'
    case 'cognitive': return 'text-blue-400'
    case 'ui': return 'text-green-400'
    default: return 'text-muted-foreground'
  }
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const Icon = getAgentIcon(agent.type)
  const statusColor = getStatusColor(agent.status)
  const typeColor = getTypeColor(agent.type)
  
  const uptime = Math.floor(agent.uptime / 3600) // Convert to hours
  const lastSeen = new Date(agent.lastHeartbeat)
  const timeSinceLastSeen = Math.floor((Date.now() - lastSeen.getTime()) / 1000)

  return (
    <motion.div
      className="agent-card cursor-pointer h-full"
      onClick={onClick}
      whileHover={{ 
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <motion.div
            className={`p-2 rounded-lg ${typeColor.replace('text-', 'bg-').replace('400', '500/20')}`}
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Icon className={`w-5 h-5 ${typeColor}`} />
          </motion.div>
          <div>
            <h3 className="font-semibold text-lg">{agent.name}</h3>
            <p className="text-sm text-muted-foreground font-mono">{agent.id}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`status-indicator ${
            agent.status === 'online' ? 'status-online' :
            agent.status === 'warning' ? 'status-warning' : 'status-offline'
          }`} />
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>
            {agent.status}
          </span>
        </div>
      </div>

      {/* Purpose */}
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {agent.purpose}
      </p>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">CPU</span>
            <span className="text-xs font-mono text-consciousness-400">
              {agent.metrics.cpuUsage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-1.5">
            <motion.div
              className="h-1.5 rounded-full bg-gradient-to-r from-consciousness-500 to-consciousness-400"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(agent.metrics.cpuUsage, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Memory</span>
            <span className="text-xs font-mono text-neural-400">
              {(agent.metrics.memoryUsage / 1024).toFixed(1)}GB
            </span>
          </div>
          <div className="w-full bg-background rounded-full h-1.5">
            <motion.div
              className="h-1.5 rounded-full bg-gradient-to-r from-neural-500 to-neural-400"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((agent.metrics.memoryUsage / 2048) * 100, 100)}%` }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
        <div className="text-center">
          <div className="text-quantum-400 font-mono">
            {agent.metrics.successRate.toFixed(1)}%
          </div>
          <div className="text-muted-foreground">Success</div>
        </div>
        <div className="text-center">
          <div className="text-matrix-400 font-mono">
            {agent.metrics.responseTime}ms
          </div>
          <div className="text-muted-foreground">Response</div>
        </div>
        <div className="text-center">
          <div className="text-purple-400 font-mono">
            {agent.metrics.tasksCompleted}
          </div>
          <div className="text-muted-foreground">Tasks</div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-white/10">
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>{uptime}h uptime</span>
        </div>
        
        {agent.location && (
          <div className="flex items-center space-x-1">
            <MapPin className="w-3 h-3" />
            <span>{agent.location.region}</span>
          </div>
        )}
      </div>

      {/* Heartbeat Indicator */}
      <div className="absolute top-2 right-2">
        {timeSinceLastSeen < 60 && (
          <motion.div
            className="w-2 h-2 bg-quantum-400 rounded-full"
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </div>

      {/* Neural Connection Lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
        <motion.div
          className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-consciousness-400/30 to-transparent"
          animate={{
            x: ['-100%', '200%']
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 4
          }}
        />
      </div>
    </motion.div>
  )
}