import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import type { AgentMetrics } from '../../hooks/useRealtimeData'

interface AgentStatusGridProps {
  agents: AgentMetrics[]
  onAgentSelect?: (agent: AgentMetrics) => void
}

const StatusIcon = ({ status, className = "" }: { status: AgentMetrics['status'], className?: string }) => {
  const getStatusConfig = (status: AgentMetrics['status']) => {
    switch (status) {
      case 'online':
        return { color: 'text-green-400', bg: 'bg-green-400/20', border: 'border-green-400/30', pulse: 'animate-pulse' }
      case 'warning':
        return { color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/30', pulse: 'animate-pulse' }
      case 'error':
        return { color: 'text-red-400', bg: 'bg-red-400/20', border: 'border-red-400/30', pulse: 'animate-pulse' }
      case 'offline':
        return { color: 'text-gray-500', bg: 'bg-gray-500/20', border: 'border-gray-500/30', pulse: '' }
    }
  }

  const config = getStatusConfig(status)

  return (
    <div className={`
      w-3 h-3 rounded-full border-2 ${config.bg} ${config.border} ${config.pulse}
      relative overflow-hidden ${className}
    `}>
      <div className={`absolute inset-0 rounded-full ${config.color.replace('text-', 'bg-')}`} />
      {status === 'online' && (
        <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30" />
      )}
    </div>
  )
}

const PlatformIcon = ({ platform }: { platform: AgentMetrics['platform'] }) => {
  const getPlatformColor = (platform: AgentMetrics['platform']) => {
    switch (platform) {
      case 'OpenAI': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'Anthropic': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'Google': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'Cohere': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'Mistral': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'Local': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <span className={`
      px-2 py-1 text-xs font-medium rounded-full border
      ${getPlatformColor(platform)}
    `}>
      {platform}
    </span>
  )
}

const MetricBar = ({
  value,
  max,
  color = 'bg-primary',
  className = ''
}: {
  value: number
  max: number
  color?: string
  className?: string
}) => (
  <div className={`w-full h-1.5 bg-muted rounded-full overflow-hidden ${className}`}>
    <motion.div
      className={`h-full ${color} rounded-full`}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      transition={{ duration: 1, ease: "easeOut" }}
    />
  </div>
)

export function AgentStatusGrid({ agents, onAgentSelect }: AgentStatusGridProps) {
  const sortedAgents = [...agents].sort((a, b) => {
    // Sort by status priority: online > warning > offline > error
    const statusPriority = { online: 0, warning: 1, offline: 2, error: 3 }
    const aPriority = statusPriority[a.status]
    const bPriority = statusPriority[b.status]

    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }

    // If same status, sort by response time (lower is better)
    return a.responseTime - b.responseTime
  })

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Agent Network Status</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {agents.filter(a => a.status === 'online').length} of {agents.length} agents online
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <StatusIcon status="online" />
            <span className="text-muted-foreground">Online</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon status="warning" />
            <span className="text-muted-foreground">Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon status="error" />
            <span className="text-muted-foreground">Error</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon status="offline" />
            <span className="text-muted-foreground">Offline</span>
          </div>
        </div>
      </div>

      <div className="agent-grid">
        <AnimatePresence>
          {sortedAgents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="agent-card cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              onClick={() => onAgentSelect?.(agent)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onAgentSelect?.(agent)
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`View details for ${agent.name}, ${agent.platform} agent, status: ${agent.status}`}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="agent-header">
                <div className="flex items-center gap-3">
                  <StatusIcon status={agent.status} className="flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="agent-name font-semibold text-foreground group-hover:text-primary transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{agent.region}</p>
                  </div>
                </div>
                <PlatformIcon platform={agent.platform} />
              </div>

              <div className="space-y-3 mt-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Response Time</span>
                    <span className="font-medium text-foreground">{Math.round(agent.responseTime)}ms</span>
                  </div>
                  <MetricBar
                    value={agent.responseTime}
                    max={500}
                    color={agent.responseTime < 100 ? 'bg-green-500' : agent.responseTime < 200 ? 'bg-yellow-500' : 'bg-red-500'}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-medium text-foreground">{agent.successRate.toFixed(1)}%</span>
                  </div>
                  <MetricBar
                    value={agent.successRate}
                    max={100}
                    color={agent.successRate > 95 ? 'bg-green-500' : agent.successRate > 90 ? 'bg-yellow-500' : 'bg-red-500'}
                  />
                </div>

                <div className="agent-metrics pt-2 border-t border-border/50">
                  <div className="agent-metric">
                    <div className="agent-metric-value text-primary">
                      {agent.requestsPerMinute}
                    </div>
                    <div className="agent-metric-label">req/min</div>
                  </div>
                  <div className="agent-metric">
                    <div className="agent-metric-value text-primary">
                      {agent.uptime.toFixed(1)}%
                    </div>
                    <div className="agent-metric-label">uptime</div>
                  </div>
                  <div className="agent-metric">
                    <div className="agent-metric-value text-primary">
                      {agent.version}
                    </div>
                    <div className="agent-metric-label">version</div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground border-t border-border/50 pt-2">
                  Last seen: {format(agent.lastSeen, 'MMM dd, HH:mm')}
                </div>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none" />

              {/* Status indicator glow */}
              {agent.status === 'online' && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500/30 rounded-full blur-sm animate-pulse" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
