'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Rocket,
  Play,
  Pause,
  Stop,
  RefreshCw,
  Settings,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Terminal,
  GitBranch,
  Server,
  Cloud,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Upload,
  Activity,
  Code,
  Database,
  Shield,
  Monitor
} from 'lucide-react'

interface DeploymentConfig {
  id: string
  name: string
  type: 'agent' | 'service' | 'monitor'
  repository: string
  branch: string
  environment: 'development' | 'staging' | 'production'
  status: 'idle' | 'building' | 'deploying' | 'running' | 'failed' | 'stopped'
  lastDeploy: string
  version: string
  instances: number
  resources: {
    cpu: string
    memory: string
    storage: string
  }
  environment_vars: Record<string, string>
  health_check: string
  dependencies: string[]
}

interface DeploymentLog {
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  deploymentId: string
}

const DeploymentPage = () => {
  const [deployments, setDeployments] = useState<DeploymentConfig[]>([
    {
      id: 'eggshell-monitor',
      name: 'Eggshell Monitor Agent',
      type: 'monitor',
      repository: 'candlefish-ai/eggshell-recovery',
      branch: 'main',
      environment: 'production',
      status: 'running',
      lastDeploy: '2 hours ago',
      version: '2.1.0',
      instances: 1,
      resources: { cpu: '1 vCPU', memory: '1GB', storage: '10GB' },
      environment_vars: { API_URL: 'https://api.eggshell.ai', LOG_LEVEL: 'info' },
      health_check: '/health',
      dependencies: ['redis', 'postgresql']
    },
    {
      id: 'paintbox-engine',
      name: 'Paintbox Calculation Engine',
      type: 'service',
      repository: 'candlefish-ai/paintbox',
      branch: 'main',
      environment: 'production',
      status: 'running',
      lastDeploy: '4 hours ago',
      version: '1.8.2',
      instances: 2,
      resources: { cpu: '2 vCPU', memory: '4GB', storage: '20GB' },
      environment_vars: { EXCEL_API_URL: 'https://excel.api.com', CACHE_SIZE: '1GB' },
      health_check: '/api/health',
      dependencies: ['redis', 'aws-secrets-manager']
    },
    {
      id: 'pkb-cognitive',
      name: 'PKB Cognitive Agent',
      type: 'agent',
      repository: 'candlefish-ai/pkb-cognitive',
      branch: 'development',
      environment: 'staging',
      status: 'failed',
      lastDeploy: '1 day ago',
      version: '3.0.1-beta',
      instances: 1,
      resources: { cpu: '4 vCPU', memory: '8GB', storage: '50GB' },
      environment_vars: { ML_MODEL_URL: 'https://ml.api.com', MEMORY_SIZE: '2GB' },
      health_check: '/cognitive/health',
      dependencies: ['tensorflow', 'redis', 'postgresql']
    },
    {
      id: 'security-monitor',
      name: 'Security Monitoring Service',
      type: 'monitor',
      repository: 'candlefish-ai/security-monitor',
      branch: 'main',
      environment: 'production',
      status: 'running',
      lastDeploy: '6 hours ago',
      version: '1.5.4',
      instances: 1,
      resources: { cpu: '1 vCPU', memory: '2GB', storage: '15GB' },
      environment_vars: { THREAT_DB_URL: 'https://threats.db.com', SCAN_INTERVAL: '60' },
      health_check: '/security/status',
      dependencies: ['postgresql', 'elasticsearch']
    }
  ])

  const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLog[]>([
    { timestamp: '14:32:15', level: 'success', message: 'Eggshell Monitor deployed successfully', deploymentId: 'eggshell-monitor' },
    { timestamp: '14:28:42', level: 'info', message: 'Building Docker image for Paintbox Engine', deploymentId: 'paintbox-engine' },
    { timestamp: '14:25:18', level: 'error', message: 'PKB Cognitive deployment failed: Memory limit exceeded', deploymentId: 'pkb-cognitive' },
    { timestamp: '14:22:03', level: 'warning', message: 'Security Monitor scaling down due to low traffic', deploymentId: 'security-monitor' },
    { timestamp: '14:18:45', level: 'info', message: 'Starting health checks for all services', deploymentId: 'all' }
  ])

  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentConfig | null>(null)
  const [showLogs, setShowLogs] = useState<boolean>(false)
  const [showNewDeployment, setShowNewDeployment] = useState<boolean>(false)
  const [showEnvVars, setShowEnvVars] = useState<Record<string, boolean>>({})

  // New deployment form state
  const [newDeployment, setNewDeployment] = useState<Partial<DeploymentConfig>>({
    name: '',
    type: 'agent',
    repository: '',
    branch: 'main',
    environment: 'development',
    instances: 1,
    resources: { cpu: '1 vCPU', memory: '1GB', storage: '10GB' },
    environment_vars: {},
    health_check: '/health',
    dependencies: []
  })

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
      case 'deploying': return <Upload className="w-4 h-4 animate-pulse" />
      case 'failed': return <AlertCircle className="w-4 h-4" />
      case 'stopped': return <Stop className="w-4 h-4" />
      case 'idle': return <Clock className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'agent': return 'bg-purple-500/20 text-purple-400'
      case 'service': return 'bg-blue-500/20 text-blue-400'
      case 'monitor': return 'bg-green-500/20 text-green-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'agent': return <Code className="w-4 h-4" />
      case 'service': return <Server className="w-4 h-4" />
      case 'monitor': return <Monitor className="w-4 h-4" />
      default: return <Server className="w-4 h-4" />
    }
  }

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'success': return 'text-green-400'
      case 'info': return 'text-blue-400'
      case 'warning': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const handleDeploy = (deploymentId: string) => {
    setDeployments(prev => prev.map(dep =>
      dep.id === deploymentId ? { ...dep, status: 'building' as const } : dep
    ))

    // Simulate deployment process
    setTimeout(() => {
      setDeployments(prev => prev.map(dep =>
        dep.id === deploymentId ? { ...dep, status: 'deploying' as const } : dep
      ))
    }, 2000)

    setTimeout(() => {
      setDeployments(prev => prev.map(dep =>
        dep.id === deploymentId ? { ...dep, status: 'running' as const, lastDeploy: 'just now' } : dep
      ))

      // Add success log
      setDeploymentLogs(prev => [{
        timestamp: new Date().toLocaleTimeString(),
        level: 'success' as const,
        message: `${deployments.find(d => d.id === deploymentId)?.name} deployed successfully`,
        deploymentId
      }, ...prev])
    }, 4000)
  }

  const handleStop = (deploymentId: string) => {
    setDeployments(prev => prev.map(dep =>
      dep.id === deploymentId ? { ...dep, status: 'stopped' as const } : dep
    ))

    setDeploymentLogs(prev => [{
      timestamp: new Date().toLocaleTimeString(),
      level: 'info' as const,
      message: `${deployments.find(d => d.id === deploymentId)?.name} stopped`,
      deploymentId
    }, ...prev])
  }

  const toggleEnvVars = (deploymentId: string) => {
    setShowEnvVars(prev => ({
      ...prev,
      [deploymentId]: !prev[deploymentId]
    }))
  }

  const handleCreateDeployment = () => {
    if (newDeployment.name && newDeployment.repository) {
      const deployment: DeploymentConfig = {
        id: newDeployment.name!.toLowerCase().replace(/\s+/g, '-'),
        name: newDeployment.name!,
        type: newDeployment.type || 'agent',
        repository: newDeployment.repository!,
        branch: newDeployment.branch || 'main',
        environment: newDeployment.environment || 'development',
        status: 'idle',
        lastDeploy: 'Never',
        version: '0.1.0',
        instances: newDeployment.instances || 1,
        resources: newDeployment.resources || { cpu: '1 vCPU', memory: '1GB', storage: '10GB' },
        environment_vars: newDeployment.environment_vars || {},
        health_check: newDeployment.health_check || '/health',
        dependencies: newDeployment.dependencies || []
      }

      setDeployments(prev => [...prev, deployment])
      setShowNewDeployment(false)

      // Reset form
      setNewDeployment({
        name: '',
        type: 'agent',
        repository: '',
        branch: 'main',
        environment: 'development',
        instances: 1,
        resources: { cpu: '1 vCPU', memory: '1GB', storage: '10GB' },
        environment_vars: {},
        health_check: '/health',
        dependencies: []
      })
    }
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Deployment Control</h1>
            <p className="text-gray-400">Manage and deploy your distributed consciousness agents</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Terminal className="w-4 h-4" />
              {showLogs ? 'Hide' : 'Show'} Logs
            </button>
            <button
              onClick={() => setShowNewDeployment(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Deployment
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deployments List */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {deployments.map((deployment, index) => (
              <motion.div
                key={deployment.id}
                className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {/* Deployment Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(deployment.type)}`}>
                      {getTypeIcon(deployment.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{deployment.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <GitBranch className="w-3 h-3" />
                        {deployment.repository} • {deployment.branch}
                      </div>
                    </div>
                  </div>

                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${getStatusColor(deployment.status)}`}>
                    {getStatusIcon(deployment.status)}
                    {deployment.status}
                  </div>
                </div>

                {/* Deployment Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-400">Environment</div>
                    <div className={`text-sm font-medium ${
                      deployment.environment === 'production' ? 'text-red-400' :
                      deployment.environment === 'staging' ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {deployment.environment}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Version</div>
                    <div className="text-sm text-white font-medium">{deployment.version}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Instances</div>
                    <div className="text-sm text-white font-medium">{deployment.instances}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Last Deploy</div>
                    <div className="text-sm text-white font-medium">{deployment.lastDeploy}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Resources</div>
                    <div className="text-sm text-white font-medium">{deployment.resources.cpu} • {deployment.resources.memory}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Health Check</div>
                    <div className="text-sm text-white font-medium">{deployment.health_check}</div>
                  </div>
                </div>

                {/* Environment Variables */}
                <div className="mb-4">
                  <button
                    onClick={() => toggleEnvVars(deployment.id)}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {showEnvVars[deployment.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    Environment Variables ({Object.keys(deployment.environment_vars).length})
                  </button>

                  <AnimatePresence>
                    {showEnvVars[deployment.id] && (
                      <motion.div
                        className="mt-2 p-3 bg-slate-900/50 rounded-lg"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {Object.entries(deployment.environment_vars).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-xs mb-1 last:mb-0">
                            <span className="text-gray-400">{key}:</span>
                            <span className="text-white font-mono">{value}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Dependencies */}
                {deployment.dependencies.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-2">Dependencies</div>
                    <div className="flex flex-wrap gap-1">
                      {deployment.dependencies.map((dep, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-slate-700 text-xs text-gray-300 rounded"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {deployment.status === 'running' ? (
                    <button
                      onClick={() => handleStop(deployment.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <Stop className="w-4 h-4" />
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeploy(deployment.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      disabled={deployment.status === 'building' || deployment.status === 'deploying'}
                    >
                      <Rocket className="w-4 h-4" />
                      Deploy
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedDeployment(deployment)}
                    className="px-4 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeployments(prev => prev.filter(d => d.id !== deployment.id))}
                    className="px-4 bg-red-700 hover:bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <motion.div
            className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Deployment Stats
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Deployments</span>
                <span className="text-white font-medium">{deployments.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Running</span>
                <span className="text-green-400 font-medium">
                  {deployments.filter(d => d.status === 'running').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Failed</span>
                <span className="text-red-400 font-medium">
                  {deployments.filter(d => d.status === 'failed').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Building/Deploying</span>
                <span className="text-yellow-400 font-medium">
                  {deployments.filter(d => d.status === 'building' || d.status === 'deploying').length}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Deployment Logs */}
          <AnimatePresence>
            {showLogs && (
              <motion.div
                className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-green-400" />
                    Deployment Logs
                  </h3>
                  <button
                    onClick={() => setShowLogs(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-slate-900 rounded-lg p-3 font-mono text-sm max-h-64 overflow-y-auto">
                  {deploymentLogs.map((log, index) => (
                    <div key={index} className="flex gap-2 mb-1">
                      <span className="text-gray-500">{log.timestamp}</span>
                      <span className={getLogLevelColor(log.level)}>
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="text-gray-300">{log.message}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* New Deployment Modal */}
      <AnimatePresence>
        {showNewDeployment && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-2xl font-bold text-white mb-6">Create New Deployment</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Name *</label>
                  <input
                    type="text"
                    value={newDeployment.name || ''}
                    onChange={(e) => setNewDeployment(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    placeholder="My Agent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Type</label>
                  <select
                    value={newDeployment.type}
                    onChange={(e) => setNewDeployment(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="agent">Agent</option>
                    <option value="service">Service</option>
                    <option value="monitor">Monitor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Repository *</label>
                  <input
                    type="text"
                    value={newDeployment.repository || ''}
                    onChange={(e) => setNewDeployment(prev => ({ ...prev, repository: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    placeholder="candlefish-ai/my-agent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Branch</label>
                  <input
                    type="text"
                    value={newDeployment.branch || ''}
                    onChange={(e) => setNewDeployment(prev => ({ ...prev, branch: e.target.value }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    placeholder="main"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Environment</label>
                  <select
                    value={newDeployment.environment}
                    onChange={(e) => setNewDeployment(prev => ({ ...prev, environment: e.target.value as any }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
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
                    value={newDeployment.instances || 1}
                    onChange={(e) => setNewDeployment(prev => ({ ...prev, instances: parseInt(e.target.value) }))}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowNewDeployment(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDeployment}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  disabled={!newDeployment.name || !newDeployment.repository}
                >
                  Create Deployment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DeploymentPage
