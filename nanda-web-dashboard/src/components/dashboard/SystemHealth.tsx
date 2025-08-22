'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Heart,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  Database,
  Network,
  Cpu,
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Globe
} from 'lucide-react'

export interface HealthCheck {
  id: string
  name: string
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  message: string
  lastChecked: string
  responseTime?: number
  uptime?: string
  details?: Record<string, any>
}

export interface SystemHealthData {
  overall: 'healthy' | 'warning' | 'critical'
  uptime: string
  lastUpdate: string
  checks: HealthCheck[]
  metrics: {
    cpu: number
    memory: number
    network: number
    storage: number
  }
  services: {
    name: string
    status: 'online' | 'offline' | 'degraded'
    instances: number
  }[]
}

export interface SystemHealthProps {
  data?: SystemHealthData
  onRefresh?: () => void
  refreshInterval?: number
  showDetails?: boolean
  compact?: boolean
  className?: string
}

// Individual health check component
const HealthCheckItem = ({
  check,
  showDetails = false
}: {
  check: HealthCheck
  showDetails?: boolean
}) => {
  const [expanded, setExpanded] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'critical': return 'text-red-400'
      case 'unknown': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'critical': return <XCircle className="w-4 h-4" />
      case 'unknown': return <Clock className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/10 border-green-500/20'
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/20'
      case 'critical': return 'bg-red-500/10 border-red-500/20'
      case 'unknown': return 'bg-gray-500/10 border-gray-500/20'
      default: return 'bg-gray-500/10 border-gray-500/20'
    }
  }

  return (
    <motion.div
      className={`p-4 rounded-lg border transition-all ${getStatusBg(check.status)}`}
      whileHover={{ scale: 1.02 }}
      layout
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={getStatusColor(check.status)}>
            {getStatusIcon(check.status)}
          </div>
          <div>
            <div className="font-medium text-white">{check.name}</div>
            <div className="text-sm text-gray-400">{check.message}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {check.responseTime && (
            <div className="text-sm text-gray-400">
              {check.responseTime}ms
            </div>
          )}
          <div className="text-xs text-gray-500">
            {check.lastChecked}
          </div>
          {showDetails && check.details && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && check.details && (
        <motion.div
          className="mt-4 pt-4 border-t border-slate-700"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            {Object.entries(check.details).map(([key, value]) => (
              <div key={key}>
                <div className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</div>
                <div className="text-white font-mono">{JSON.stringify(value)}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// Resource usage gauge component
const ResourceGauge = ({
  title,
  value,
  icon,
  color = 'blue',
  target = 80
}: {
  title: string
  value: number
  icon: React.ReactNode
  color?: string
  target?: number
}) => {
  const getColor = () => {
    switch (color) {
      case 'green': return { bg: 'bg-green-500', text: 'text-green-400' }
      case 'blue': return { bg: 'bg-blue-500', text: 'text-blue-400' }
      case 'purple': return { bg: 'bg-purple-500', text: 'text-purple-400' }
      case 'orange': return { bg: 'bg-orange-500', text: 'text-orange-400' }
      default: return { bg: 'bg-blue-500', text: 'text-blue-400' }
    }
  }

  const colors = getColor()
  const isHigh = value > target
  const displayColor = isHigh ? 'bg-red-500' : colors.bg

  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={colors.text}>
            {icon}
          </div>
          <span className="text-white font-medium">{title}</span>
        </div>
        <div className={`text-lg font-bold ${isHigh ? 'text-red-400' : 'text-white'}`}>
          {value}%
        </div>
      </div>

      <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
        <motion.div
          className={`h-3 rounded-full transition-colors ${displayColor}`}
          style={{ width: `${Math.min(value, 100)}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <span>0%</span>
        <span>Target: {target}%</span>
        <span>100%</span>
      </div>
    </div>
  )
}

// Service status component
const ServiceStatus = ({
  services
}: {
  services: SystemHealthData['services']
}) => {
  const getServiceColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400'
      case 'offline': return 'text-red-400'
      case 'degraded': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const getServiceIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />
      case 'offline': return <XCircle className="w-4 h-4" />
      case 'degraded': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-4">
      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Server className="w-5 h-5 text-blue-400" />
        Services
      </h4>

      <div className="space-y-3">
        {services.map((service, index) => (
          <motion.div
            key={service.name}
            className="flex items-center justify-between"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center gap-3">
              <div className={getServiceColor(service.status)}>
                {getServiceIcon(service.status)}
              </div>
              <span className="text-white">{service.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">
                {service.instances} instance{service.instances !== 1 ? 's' : ''}
              </span>
              <div className={`px-2 py-1 rounded text-xs ${
                service.status === 'online' ? 'bg-green-500/20 text-green-400' :
                service.status === 'degraded' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {service.status}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Main SystemHealth component
export const SystemHealth = ({
  data,
  onRefresh,
  refreshInterval = 30000,
  showDetails = true,
  compact = false,
  className = ""
}: SystemHealthProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Mock data if none provided
  const mockData: SystemHealthData = {
    overall: 'healthy',
    uptime: '24h 15m',
    lastUpdate: new Date().toISOString(),
    checks: [
      {
        id: 'api',
        name: 'API Server',
        status: 'healthy',
        message: 'All endpoints responding normally',
        lastChecked: '30s ago',
        responseTime: 45,
        uptime: '99.9%'
      },
      {
        id: 'database',
        name: 'Database',
        status: 'healthy',
        message: 'Connection pool healthy',
        lastChecked: '1m ago',
        responseTime: 12,
        uptime: '100%'
      },
      {
        id: 'cache',
        name: 'Cache Layer',
        status: 'warning',
        message: 'High memory usage',
        lastChecked: '45s ago',
        responseTime: 8,
        uptime: '99.5%'
      },
      {
        id: 'external',
        name: 'External APIs',
        status: 'healthy',
        message: 'All integrations operational',
        lastChecked: '2m ago',
        responseTime: 120,
        uptime: '98.2%'
      }
    ],
    metrics: {
      cpu: 67,
      memory: 74,
      network: 45,
      storage: 32
    },
    services: [
      { name: 'NANDA Registry', status: 'online', instances: 2 },
      { name: 'Agent Manager', status: 'online', instances: 1 },
      { name: 'Metrics Collector', status: 'degraded', instances: 1 },
      { name: 'Deployment Service', status: 'offline', instances: 0 }
    ]
  }

  const healthData = data || mockData

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setLastUpdate(new Date())
    await onRefresh?.()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        setLastUpdate(new Date())
        onRefresh?.()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, onRefresh])

  const getOverallColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'critical': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getOverallIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <Heart className="w-6 h-6" />
      case 'warning': return <AlertTriangle className="w-6 h-6" />
      case 'critical': return <XCircle className="w-6 h-6" />
      default: return <Clock className="w-6 h-6" />
    }
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div className={getOverallColor(healthData.overall)}>
            {getOverallIcon(healthData.overall)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">System Health</h2>
            <p className="text-gray-400">
              Overall status: <span className={`font-medium ${getOverallColor(healthData.overall)}`}>
                {healthData.overall}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-400">Uptime</div>
            <div className="text-lg font-semibold text-white">{healthData.uptime}</div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
            title="Refresh system health"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Checks */}
        <div className="lg:col-span-2">
          <motion.div
            className="bg-slate-800/30 rounded-lg p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Health Checks
            </h3>

            <div className="space-y-3">
              {healthData.checks.map((check, index) => (
                <motion.div
                  key={check.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <HealthCheckItem check={check} showDetails={showDetails} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Resource Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Resources
            </h3>

            <div className="space-y-4">
              <ResourceGauge
                title="CPU"
                value={healthData.metrics.cpu}
                icon={<Cpu className="w-4 h-4" />}
                color="blue"
                target={80}
              />
              <ResourceGauge
                title="Memory"
                value={healthData.metrics.memory}
                icon={<Database className="w-4 h-4" />}
                color="purple"
                target={85}
              />
              <ResourceGauge
                title="Network"
                value={healthData.metrics.network}
                icon={<Network className="w-4 h-4" />}
                color="green"
                target={70}
              />
              <ResourceGauge
                title="Storage"
                value={healthData.metrics.storage}
                icon={<Database className="w-4 h-4" />}
                color="orange"
                target={90}
              />
            </div>
          </motion.div>

          {/* Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <ServiceStatus services={healthData.services} />
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <motion.div
        className="mt-6 text-center text-sm text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Last updated: {lastUpdate.toLocaleTimeString()}
      </motion.div>
    </div>
  )
}
