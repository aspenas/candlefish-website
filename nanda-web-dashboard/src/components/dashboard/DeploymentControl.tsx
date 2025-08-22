'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Rocket,
  Play,
  Square,
  RefreshCw,
  Settings,
  Plus,
  Trash2,
  GitBranch,
  Server,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Activity,
  Eye,
  EyeOff
} from 'lucide-react'

export interface DeploymentTarget {
  id: string
  name: string
  repository: string
  branch: string
  environment: 'development' | 'staging' | 'production'
  status: 'idle' | 'building' | 'deploying' | 'running' | 'failed' | 'stopped'
  lastDeploy?: string
  version?: string
  instances: number
  healthCheck?: string
  buildCommand?: string
  deployCommand?: string
  envVars?: Record<string, string>
}

export interface DeploymentLog {
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  deploymentId: string
}

export interface DeploymentControlProps {
  targets?: DeploymentTarget[]
  onDeploy?: (targetId: string) => Promise<void>
  onStop?: (targetId: string) => Promise<void>
  onDelete?: (targetId: string) => Promise<void>
  onCreateTarget?: (target: Partial<DeploymentTarget>) => Promise<void>
  showLogs?: boolean
  className?: string
}

// Individual deployment target component
const DeploymentTargetCard = ({
  target,
  onDeploy,
  onStop,
  onDelete,
  showEnvVars = false,
  onToggleEnvVars
}: {
  target: DeploymentTarget
  onDeploy?: (targetId: string) => Promise<void>
  onStop?: (targetId: string) => Promise<void>
  onDelete?: (targetId: string) => Promise<void>
  showEnvVars?: boolean
  onToggleEnvVars?: (targetId: string) => void
}) => {
  const [isLoading, setIsLoading] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-400 bg-green-900/20'
      case 'building': return 'text-blue-400 bg-blue-900/20'
      case 'deploying': return 'text-yellow-400 bg-yellow-900/20'
      case 'failed': return 'text-red-400 bg-red-900/20'
      case 'stopped': return 'text-gray-400 bg-gray-900/20'
      case 'idle': return 'text-gray-400 bg-gray-900/20'
      default: return 'text-gray-400 bg-gray-900/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle className="w-4 h-4" />
      case 'building': return <RefreshCw className="w-4 h-4 animate-spin" />
      case 'deploying': return <Rocket className="w-4 h-4 animate-pulse" />
      case 'failed': return <XCircle className="w-4 h-4" />
      case 'stopped': return <Square className="w-4 h-4" />
      case 'idle': return <Clock className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getEnvironmentColor = (environment: string) => {
    switch (environment) {
      case 'production': return 'bg-red-500/20 text-red-400'
      case 'staging': return 'bg-yellow-500/20 text-yellow-400'
      case 'development': return 'bg-green-500/20 text-green-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const handleAction = async (action: 'deploy' | 'stop' | 'delete') => {
    setIsLoading(true)
    try {
      switch (action) {
        case 'deploy':
          await onDeploy?.(target.id)
          break
        case 'stop':
          await onStop?.(target.id)
          break
        case 'delete':
          await onDelete?.(target.id)
          break
      }
    } catch (error) {
      console.error(`Failed to ${action} deployment:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors"
      whileHover={{ y: -2 }}
      layout
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-700 rounded-lg">
            <Server className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{target.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <GitBranch className="w-3 h-3" />
              {target.repository} • {target.branch}
            </div>
          </div>
        </div>

        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${getStatusColor(target.status)}`}>
          {getStatusIcon(target.status)}
          {target.status}
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-400">Environment</div>
          <div className={`text-sm px-2 py-1 rounded inline-block ${getEnvironmentColor(target.environment)}`}>
            {target.environment}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Version</div>
          <div className="text-sm text-white font-medium">{target.version || 'N/A'}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Instances</div>
          <div className="text-sm text-white font-medium">{target.instances}</div>
        </div>
        {target.lastDeploy && (
          <div>
            <div className="text-xs text-gray-400">Last Deploy</div>
            <div className="text-sm text-white font-medium">{target.lastDeploy}</div>
          </div>
        )}
        {target.healthCheck && (
          <div>
            <div className="text-xs text-gray-400">Health Check</div>
            <div className="text-sm text-white font-medium font-mono">{target.healthCheck}</div>
          </div>
        )}
      </div>

      {/* Environment Variables */}
      {target.envVars && Object.keys(target.envVars).length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => onToggleEnvVars?.(target.id)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {showEnvVars ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            Environment Variables ({Object.keys(target.envVars).length})
          </button>

          <AnimatePresence>
            {showEnvVars && (
              <motion.div
                className="mt-2 p-3 bg-slate-900/50 rounded-lg"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {Object.entries(target.envVars).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs mb-1 last:mb-0">
                    <span className="text-gray-400">{key}:</span>
                    <span className="text-white font-mono">{value}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {target.status === 'running' ? (
          <button
            onClick={() => handleAction('stop')}
            disabled={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>
        ) : (
          <button
            onClick={() => handleAction('deploy')}
            disabled={isLoading || target.status === 'building' || target.status === 'deploying'}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {target.status === 'building' || target.status === 'deploying' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {target.status === 'building' ? 'Building...' :
             target.status === 'deploying' ? 'Deploying...' : 'Deploy'}
          </button>
        )}

        <button
          className="px-4 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleAction('delete')}
          disabled={isLoading}
          className="px-4 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

// New deployment target form
const NewDeploymentForm = ({
  onSubmit,
  onCancel
}: {
  onSubmit: (target: Partial<DeploymentTarget>) => void
  onCancel: () => void
}) => {
  const [formData, setFormData] = useState<Partial<DeploymentTarget>>({
    name: '',
    repository: '',
    branch: 'main',
    environment: 'development',
    instances: 1,
    healthCheck: '/health',
    buildCommand: 'npm run build',
    deployCommand: 'npm start',
    envVars: {}
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name && formData.repository) {
      onSubmit(formData)
    }
  }

  return (
    <motion.div
      className="bg-slate-800 border border-slate-700 rounded-lg p-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <h3 className="text-xl font-bold text-white mb-4">New Deployment Target</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="My Service"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Repository *</label>
            <input
              type="text"
              value={formData.repository || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, repository: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="candlefish-ai/my-service"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Branch</label>
            <input
              type="text"
              value={formData.branch || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="main"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Environment</label>
            <select
              value={formData.environment}
              onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value as any }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Instances</label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.instances || 1}
              onChange={(e) => setFormData(prev => ({ ...prev, instances: parseInt(e.target.value) }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Health Check</label>
            <input
              type="text"
              value={formData.healthCheck || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, healthCheck: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="/health"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!formData.name || !formData.repository}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg transition-colors"
          >
            Create Target
          </button>
        </div>
      </form>
    </motion.div>
  )
}

// Main DeploymentControl component
export const DeploymentControl = ({
  targets = [],
  onDeploy,
  onStop,
  onDelete,
  onCreateTarget,
  showLogs = false,
  className = ""
}: DeploymentControlProps) => {
  const [showNewForm, setShowNewForm] = useState(false)
  const [showEnvVars, setShowEnvVars] = useState<Record<string, boolean>>({})

  // Mock data if none provided
  const mockTargets: DeploymentTarget[] = [
    {
      id: 'eggshell-monitor',
      name: 'Eggshell Monitor',
      repository: 'candlefish-ai/eggshell-recovery',
      branch: 'main',
      environment: 'production',
      status: 'running',
      lastDeploy: '2 hours ago',
      version: '2.1.0',
      instances: 1,
      healthCheck: '/health',
      buildCommand: 'npm run build',
      deployCommand: 'npm start',
      envVars: { NODE_ENV: 'production', LOG_LEVEL: 'info' }
    },
    {
      id: 'paintbox-engine',
      name: 'Paintbox Engine',
      repository: 'candlefish-ai/paintbox',
      branch: 'main',
      environment: 'production',
      status: 'running',
      lastDeploy: '4 hours ago',
      version: '1.8.2',
      instances: 2,
      healthCheck: '/api/health',
      buildCommand: 'npm run build',
      deployCommand: 'npm start',
      envVars: { NODE_ENV: 'production', CACHE_SIZE: '1GB' }
    },
    {
      id: 'nanda-dashboard',
      name: 'NANDA Dashboard',
      repository: 'candlefish-ai/nanda-web-dashboard',
      branch: 'main',
      environment: 'production',
      status: 'idle',
      instances: 1,
      healthCheck: '/api/health',
      buildCommand: 'npm run build',
      deployCommand: 'npm start',
      envVars: { NODE_ENV: 'production', PORT: '3000' }
    }
  ]

  const deploymentTargets = targets.length > 0 ? targets : mockTargets

  const handleCreateTarget = async (targetData: Partial<DeploymentTarget>) => {
    await onCreateTarget?.(targetData)
    setShowNewForm(false)
  }

  const toggleEnvVars = (targetId: string) => {
    setShowEnvVars(prev => ({
      ...prev,
      [targetId]: !prev[targetId]
    }))
  }

  const runningTargets = deploymentTargets.filter(t => t.status === 'running').length
  const totalTargets = deploymentTargets.length

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Deployment Control</h2>
            <p className="text-gray-400">
              {runningTargets}/{totalTargets} targets running
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Target
        </button>
      </div>

      {/* New deployment form */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <NewDeploymentForm
              onSubmit={handleCreateTarget}
              onCancel={() => setShowNewForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deployment targets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {deploymentTargets.map((target, index) => (
          <motion.div
            key={target.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <DeploymentTargetCard
              target={target}
              onDeploy={onDeploy}
              onStop={onStop}
              onDelete={onDelete}
              showEnvVars={showEnvVars[target.id]}
              onToggleEnvVars={toggleEnvVars}
            />
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {deploymentTargets.length === 0 && (
        <motion.div
          className="text-center py-12 text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Rocket className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No deployment targets configured</p>
          <p>Create your first deployment target to get started</p>
        </motion.div>
      )}

      {/* Summary stats */}
      <motion.div
        className="mt-8 bg-slate-800/30 rounded-lg p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-400">Total Targets: {totalTargets}</span>
            <span className="text-green-400">Running: {runningTargets}</span>
            <span className="text-gray-400">
              Idle: {deploymentTargets.filter(t => t.status === 'idle').length}
            </span>
            <span className="text-red-400">
              Failed: {deploymentTargets.filter(t => t.status === 'failed').length}
            </span>
          </div>
          <div className="text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
