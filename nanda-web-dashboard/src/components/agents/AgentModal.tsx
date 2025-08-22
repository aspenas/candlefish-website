'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AgentStatus } from '@/types/agent'
import { 
  X, 
  Activity, 
  Clock, 
  MapPin, 
  Zap,
  CheckCircle,
  AlertCircle,
  XCircle,
  Settings,
  BarChart3,
  Terminal
} from 'lucide-react'

interface AgentModalProps {
  agent: AgentStatus | null
  isOpen: boolean
  onClose: () => void
}

export function AgentModal({ agent, isOpen, onClose }: AgentModalProps) {
  if (!agent) return null

  const uptime = Math.floor(agent.uptime / 3600)
  const lastSeen = new Date(agent.lastHeartbeat)
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-5 h-5 text-quantum-400" />
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-400" />
      case 'offline': return <XCircle className="w-5 h-5 text-red-400" />
      default: return <Activity className="w-5 h-5 text-muted-foreground" />
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto agent-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-4">
                {getStatusIcon(agent.status)}
                <div>
                  <h2 className="text-3xl font-bold text-gradient">{agent.name}</h2>
                  <p className="text-muted-foreground font-mono">{agent.id}</p>
                  <p className="text-sm text-consciousness-400 mt-1">
                    v{agent.version} • {agent.type.charAt(0).toUpperCase() + agent.type.slice(1)} Agent
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Purpose */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center space-x-2">
                <Settings className="w-5 h-5 text-consciousness-400" />
                <span>Purpose</span>
              </h3>
              <p className="text-muted-foreground">{agent.purpose}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* System Metrics */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-neural-400" />
                    <span>System Metrics</span>
                  </h3>
                  <div className="space-y-4">
                    {/* CPU Usage */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">CPU Usage</span>
                        <span className="text-sm font-mono text-consciousness-400">
                          {agent.metrics.cpuUsage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2">
                        <motion.div
                          className="h-2 rounded-full bg-gradient-to-r from-consciousness-500 to-consciousness-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(agent.metrics.cpuUsage, 100)}%` }}
                          transition={{ duration: 1 }}
                        />
                      </div>
                    </div>

                    {/* Memory Usage */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Memory Usage</span>
                        <span className="text-sm font-mono text-neural-400">
                          {(agent.metrics.memoryUsage / 1024).toFixed(2)} GB
                        </span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2">
                        <motion.div
                          className="h-2 rounded-full bg-gradient-to-r from-neural-500 to-neural-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((agent.metrics.memoryUsage / 2048) * 100, 100)}%` }}
                          transition={{ duration: 1, delay: 0.2 }}
                        />
                      </div>
                    </div>

                    {/* Response Time */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Response Time</span>
                        <span className="text-sm font-mono text-quantum-400">
                          {agent.metrics.responseTime}ms
                        </span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2">
                        <motion.div
                          className="h-2 rounded-full bg-gradient-to-r from-quantum-500 to-quantum-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((agent.metrics.responseTime / 500) * 100, 100)}%` }}
                          transition={{ duration: 1, delay: 0.4 }}
                        />
                      </div>
                    </div>

                    {/* Success Rate */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Success Rate</span>
                        <span className="text-sm font-mono text-matrix-400">
                          {agent.metrics.successRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2">
                        <motion.div
                          className="h-2 rounded-full bg-gradient-to-r from-matrix-500 to-matrix-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${agent.metrics.successRate}%` }}
                          transition={{ duration: 1, delay: 0.6 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Responsibilities */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                    <Terminal className="w-5 h-5 text-matrix-400" />
                    <span>Responsibilities</span>
                  </h3>
                  <ul className="space-y-2">
                    {agent.responsibilities.map((responsibility, index) => (
                      <motion.li
                        key={index}
                        className="flex items-start space-x-3 text-sm"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="w-1.5 h-1.5 bg-consciousness-400 rounded-full mt-2 flex-shrink-0" />
                        <span className="text-muted-foreground">{responsibility}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Status Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-quantum-400" />
                    <span>Status Information</span>
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Uptime</span>
                      </div>
                      <span className="font-mono text-consciousness-400">
                        {Math.floor(uptime / 24)}d {uptime % 24}h
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Port</span>
                      </div>
                      <span className="font-mono text-neural-400">:{agent.port}</span>
                    </div>

                    {agent.apiPort && (
                      <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Terminal className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">API Port</span>
                        </div>
                        <span className="font-mono text-quantum-400">:{agent.apiPort}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Last Heartbeat</span>
                      </div>
                      <span className="font-mono text-matrix-400">
                        {lastSeen.toLocaleTimeString()}
                      </span>
                    </div>

                    {agent.location && (
                      <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">Location</span>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-purple-400">{agent.location.region}</div>
                          <div className="text-xs text-muted-foreground">{agent.location.host}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Task Statistics */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Task Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-background/50 rounded-lg">
                      <div className="text-2xl font-bold text-quantum-400 mb-1">
                        {agent.metrics.tasksCompleted.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center p-4 bg-background/50 rounded-lg">
                      <div className="text-2xl font-bold text-neural-400 mb-1">
                        {agent.metrics.tasksQueued}
                      </div>
                      <div className="text-xs text-muted-foreground">Queued</div>
                    </div>
                    <div className="text-center p-4 bg-background/50 rounded-lg">
                      <div className="text-2xl font-bold text-consciousness-400 mb-1">
                        {agent.metrics.requestsPerMinute}
                      </div>
                      <div className="text-xs text-muted-foreground">Req/min</div>
                    </div>
                    <div className="text-center p-4 bg-background/50 rounded-lg">
                      <div className="text-2xl font-bold text-matrix-400 mb-1">
                        {agent.metrics.errorsPerHour}
                      </div>
                      <div className="text-xs text-muted-foreground">Errors/hr</div>
                    </div>
                  </div>
                </div>

                {/* Capabilities */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Capabilities</h3>
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.map((capability, index) => (
                      <motion.span
                        key={capability}
                        className="px-3 py-1 bg-consciousness-500/20 text-consciousness-300 rounded-full text-xs font-medium"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        {capability}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Neural Connection Visualization */}
            <div className="mt-8 p-4 bg-background/30 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Neural Activity</h3>
              <div className="relative h-16 overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-consciousness-400/30 to-transparent h-px top-1/2"
                  animate={{
                    x: ['-100%', '200%']
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-neural-400/30 to-transparent h-px top-1/3"
                  animate={{
                    x: ['-100%', '200%']
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "linear",
                    delay: 1
                  }}
                />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-quantum-400/30 to-transparent h-px top-2/3"
                  animate={{
                    x: ['-100%', '200%']
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "linear",
                    delay: 2
                  }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}