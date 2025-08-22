import { motion } from 'framer-motion'
import {
  Server,
  Globe,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Signal
} from 'lucide-react'
import type { SystemMetrics } from '../../hooks/useRealtimeData'

interface MetricsDashboardProps {
  metrics: SystemMetrics
}

interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'danger'
  trend?: 'up' | 'down' | 'stable'
  subtitle?: string
}

const MetricCard = ({ title, value, change, icon, color, trend, subtitle }: MetricCardProps) => {
  const getColorClasses = (color: MetricCardProps['color']) => {
    switch (color) {
      case 'primary':
        return {
          icon: 'text-primary bg-primary/20 border-primary/30',
          value: 'text-primary',
          change: 'text-primary'
        }
      case 'success':
        return {
          icon: 'text-green-400 bg-green-500/20 border-green-500/30',
          value: 'text-green-400',
          change: 'text-green-400'
        }
      case 'warning':
        return {
          icon: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
          value: 'text-yellow-400',
          change: 'text-yellow-400'
        }
      case 'danger':
        return {
          icon: 'text-red-400 bg-red-500/20 border-red-500/30',
          value: 'text-red-400',
          change: 'text-red-400'
        }
    }
  }

  const colors = getColorClasses(color)

  const getTrendIcon = () => {
    if (trend === 'up') return '↗'
    if (trend === 'down') return '↘'
    return '→'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card group cursor-pointer relative overflow-hidden"
      whileHover={{ scale: 1.02, y: -2 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl border-2 ${colors.icon} flex items-center justify-center shadow-lg shadow-current/20`}>
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
              {subtitle && (
                <p className="text-xs text-muted-foreground/60 mt-1">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <motion.div
              className={`text-3xl font-bold ${colors.value} tracking-tight`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
            </motion.div>

            {change && (
              <div className={`flex items-center gap-1 text-sm ${colors.change}`}>
                <span className="text-lg">{getTrendIcon()}</span>
                <span>{change}</span>
                <span className="text-muted-foreground">vs last hour</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animated background glow */}
      <div className={`
        absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
        bg-gradient-radial from-current/10 to-transparent pointer-events-none
        ${colors.value.replace('text-', 'text-')}
      `} />

      {/* Status indicator */}
      <div className="absolute top-4 right-4">
        <div className={`w-2 h-2 rounded-full ${colors.value.replace('text-', 'bg-')} animate-pulse`} />
      </div>
    </motion.div>
  )
}

const HealthIndicator = ({ value, className = '' }: { value: number, className?: string }) => {
  const getHealthColor = (health: number) => {
    if (health >= 95) return 'text-green-400 bg-green-500'
    if (health >= 85) return 'text-yellow-400 bg-yellow-500'
    return 'text-red-400 bg-red-500'
  }

  const color = getHealthColor(value)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative w-16 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <span className={`text-sm font-medium ${color.split(' ')[0]}`}>
        {value.toFixed(1)}%
      </span>
    </div>
  )
}

export function MetricsDashboard({ metrics }: MetricsDashboardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }

  const formatResponseTime = (ms: number) => {
    return `${Math.round(ms)}ms`
  }

  return (
    <div className="space-y-6">
      {/* Main Metrics Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Agents"
          value={metrics.totalAgents.toLocaleString()}
          change="+12%"
          trend="up"
          icon={<Server className="w-6 h-6" />}
          color="primary"
          subtitle="Registered in network"
        />

        <MetricCard
          title="Active Agents"
          value={metrics.activeAgents.toLocaleString()}
          change="+5%"
          trend="up"
          icon={<Signal className="w-6 h-6" />}
          color="success"
          subtitle="Currently online"
        />

        <MetricCard
          title="Total Requests"
          value={formatNumber(metrics.totalRequests)}
          change="+23%"
          trend="up"
          icon={<BarChart3 className="w-6 h-6" />}
          color="primary"
          subtitle="Last 24 hours"
        />

        <MetricCard
          title="Avg Response"
          value={formatResponseTime(metrics.avgResponseTime)}
          change="-8%"
          trend="down"
          icon={<Clock className="w-6 h-6" />}
          color="success"
          subtitle="Network latency"
        />

        <MetricCard
          title="Success Rate"
          value={`${metrics.successRate.toFixed(1)}%`}
          change="+2%"
          trend="up"
          icon={<CheckCircle className="w-6 h-6" />}
          color="success"
          subtitle="Request completion"
        />

        <MetricCard
          title="Error Rate"
          value={`${metrics.errorRate.toFixed(2)}%`}
          change="-15%"
          trend="down"
          icon={<AlertTriangle className="w-6 h-6" />}
          color="warning"
          subtitle="Failed requests"
        />
      </div>

      {/* Network Health Overview */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Network Health Overview</h2>
            <p className="text-sm text-muted-foreground mt-1">
              System-wide performance indicators
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">All systems operational</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Network Uptime</span>
              <span className="text-lg font-bold text-green-400">{metrics.uptime}%</span>
            </div>
            <HealthIndicator value={metrics.uptime} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">System Health</span>
              <span className="text-lg font-bold text-green-400">{metrics.networkHealth.toFixed(1)}%</span>
            </div>
            <HealthIndicator value={metrics.networkHealth} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Agent Coverage</span>
              <span className="text-lg font-bold text-primary">
                {((metrics.activeAgents / metrics.totalAgents) * 100).toFixed(1)}%
              </span>
            </div>
            <HealthIndicator value={(metrics.activeAgents / metrics.totalAgents) * 100} />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary mb-1">
              {Math.round(metrics.totalRequests / metrics.totalAgents)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Req/Agent</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary mb-1">
              {Math.round(metrics.avgResponseTime / 10) * 10}ms
            </div>
            <div className="text-xs text-muted-foreground">Target SLA</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary mb-1">
              {metrics.totalAgents - metrics.activeAgents}
            </div>
            <div className="text-xs text-muted-foreground">Offline Agents</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary mb-1">
              99.9%
            </div>
            <div className="text-xs text-muted-foreground">SLA Target</div>
          </div>
        </div>
      </div>
    </div>
  )
}
