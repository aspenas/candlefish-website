'use client'

import { motion } from 'framer-motion'
import { AgentNetwork, AgentStatus } from '@/types/agent'
import { 
  Activity, 
  Zap, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

interface NetworkOverviewProps {
  metrics: AgentNetwork | null
  agents: AgentStatus[]
}

export function NetworkOverview({ metrics, agents }: NetworkOverviewProps) {
  if (!metrics) {
    return (
      <div className="agent-card">
        <div className="animate-pulse">
          <div className="h-6 bg-background rounded mb-4 w-1/3" />
          <div className="h-20 bg-background rounded" />
        </div>
      </div>
    )
  }

  const getHealthStatus = (health: number) => {
    if (health >= 90) return { color: 'text-quantum-400', icon: CheckCircle, status: 'Excellent' }
    if (health >= 75) return { color: 'text-yellow-400', icon: AlertTriangle, status: 'Good' }
    return { color: 'text-red-400', icon: AlertTriangle, status: 'Needs Attention' }
  }

  const getTrend = (value: number, baseline: number = 100) => {
    const diff = ((value - baseline) / baseline) * 100
    if (Math.abs(diff) < 5) return { icon: Minus, color: 'text-muted-foreground', label: 'stable' }
    if (diff > 0) return { icon: TrendingUp, color: 'text-quantum-400', label: 'improving' }
    return { icon: TrendingDown, color: 'text-red-400', label: 'declining' }
  }

  const healthStatus = getHealthStatus(metrics.networkHealth)
  const responseTrend = getTrend(200 - metrics.averageResponseTime, 100) // Lower is better
  const errorTrend = getTrend(10 - metrics.errorRate, 10) // Lower is better

  // Calculate type distribution
  const typeDistribution = agents.reduce((acc, agent) => {
    acc[agent.type] = (acc[agent.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <motion.div
      className="agent-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gradient mb-2">Network Overview</h2>
          <p className="text-sm text-muted-foreground">
            Real-time monitoring of the NANDA distributed network
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <healthStatus.icon className={`w-6 h-6 ${healthStatus.color}`} />
          <span className={`font-semibold ${healthStatus.color}`}>
            {healthStatus.status}
          </span>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Network Health */}
        <motion.div
          className="bg-background/50 rounded-lg p-4 text-center"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Activity className="w-5 h-5 text-consciousness-400" />
            <span className="text-sm font-medium">Network Health</span>
          </div>
          <div className="text-2xl font-bold text-gradient mb-1">
            {metrics.networkHealth.toFixed(1)}%
          </div>
          <div className="w-full bg-background rounded-full h-2">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-consciousness-500 to-quantum-500"
              initial={{ width: 0 }}
              animate={{ width: `${metrics.networkHealth}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </motion.div>

        {/* Total Requests */}
        <motion.div
          className="bg-background/50 rounded-lg p-4 text-center"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Zap className="w-5 h-5 text-neural-400" />
            <span className="text-sm font-medium">Total Requests</span>
          </div>
          <div className="text-2xl font-bold text-neural-400 mb-1">
            {metrics.totalRequests.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            Since network start
          </div>
        </motion.div>

        {/* Response Time */}
        <motion.div
          className="bg-background/50 rounded-lg p-4 text-center"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Clock className="w-5 h-5 text-quantum-400" />
            <span className="text-sm font-medium">Avg Response</span>
          </div>
          <div className="text-2xl font-bold text-quantum-400 mb-1">
            {metrics.averageResponseTime}ms
          </div>
          <div className={`flex items-center justify-center space-x-1 text-xs ${responseTrend.color}`}>
            <responseTrend.icon className="w-3 h-3" />
            <span>{responseTrend.label}</span>
          </div>
        </motion.div>

        {/* Error Rate */}
        <motion.div
          className="bg-background/50 rounded-lg p-4 text-center"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-center space-x-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-matrix-400" />
            <span className="text-sm font-medium">Error Rate</span>
          </div>
          <div className="text-2xl font-bold text-matrix-400 mb-1">
            {metrics.errorRate.toFixed(2)}%
          </div>
          <div className={`flex items-center justify-center space-x-1 text-xs ${errorTrend.color}`}>
            <errorTrend.icon className="w-3 h-3" />
            <span>{errorTrend.label}</span>
          </div>
        </motion.div>
      </div>

      {/* Agent Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Agent Status</h3>
          <div className="space-y-3">
            {[
              { status: 'online', count: agents.filter(a => a.status === 'online').length, color: 'quantum', label: 'Online' },
              { status: 'warning', count: agents.filter(a => a.status === 'warning').length, color: 'yellow', label: 'Warning' },
              { status: 'offline', count: agents.filter(a => a.status === 'offline').length, color: 'red', label: 'Offline' },
              { status: 'error', count: agents.filter(a => a.status === 'error').length, color: 'red', label: 'Error' },
            ].map((item, index) => (
              <motion.div
                key={item.status}
                className="flex items-center justify-between"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full bg-${item.color}-400`} />
                  <span className="text-sm">{item.label}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-mono">{item.count}</span>
                  <div className="w-20 bg-background rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full bg-${item.color}-400`}
                      initial={{ width: 0 }}
                      animate={{ width: agents.length > 0 ? `${(item.count / agents.length) * 100}%` : '0%' }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Type Distribution */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Agent Types</h3>
          <div className="space-y-3">
            {Object.entries(typeDistribution)
              .sort(([,a], [,b]) => b - a)
              .map(([type, count], index) => (
                <motion.div
                  key={type}
                  className="flex items-center justify-between"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-consciousness-400" />
                    <span className="text-sm capitalize">{type}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono">{count}</span>
                    <div className="w-20 bg-background rounded-full h-2">
                      <motion.div
                        className="h-2 rounded-full bg-consciousness-400"
                        initial={{ width: 0 }}
                        animate={{ width: agents.length > 0 ? `${(count / agents.length) * 100}%` : '0%' }}
                        transition={{ duration: 0.8, delay: index * 0.1 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      </div>

      {/* Real-time Activity Indicator */}
      <div className="mt-6 flex items-center justify-center">
        <motion.div
          className="flex items-center space-x-2 text-xs text-muted-foreground"
          animate={{
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="w-2 h-2 bg-quantum-400 rounded-full animate-pulse-soft" />
          <span>Real-time monitoring active</span>
          <div className="text-xs font-mono text-consciousness-400">
            Last update: {new Date(metrics.lastUpdate).toLocaleTimeString()}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}