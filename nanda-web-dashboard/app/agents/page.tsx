'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Square,
  Settings,
  Edit3,
  Trash2,
  Copy,
  MoreVertical,
  Filter,
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Cpu,
  Memory,
  Network,
  Database
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  type: 'monitor' | 'computation' | 'security' | 'deployment' | 'cognitive' | 'ui'
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'error'
  uptime: string
  version: string
  port: number
  resources: {
    cpu: number
    memory: number
    network: number
    storage: number
  }
  capabilities: string[]
  lastUpdate: string
  config: Record<string, any>
}

const AgentsPage = () => {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'eggshell-monitor',
      name: 'Eggshell Monitor',
      type: 'monitor',
      status: 'running',
      uptime: '24h 15m',
      version: '2.1.0',
      port: 8080,
      resources: { cpu: 45, memory: 67, network: 23, storage: 12 },
      capabilities: ['monitoring', 'alerting', 'metrics collection'],
      lastUpdate: '2 minutes ago',
      config: { alertThreshold: 80, interval: 30 }
    },
    {
      id: 'paintbox-engine',
      name: 'Paintbox Engine',
      type: 'computation',
      status: 'running',
      uptime: '12h 03m',
      version: '1.8.2',
      port: 8081,
      resources: { cpu: 78, memory: 89, network: 45, storage: 34 },
      capabilities: ['calculation', 'formula processing', 'excel conversion'],
      lastUpdate: '30 seconds ago',
      config: { maxConcurrentTasks: 50, cacheSize: '1GB' }
    },
    {
      id: 'pkb-cognitive',
      name: 'PKB Cognitive',
      type: 'cognitive',
      status: 'error',
      uptime: '6h 44m',
      version: '3.0.1',
      port: 8082,
      resources: { cpu: 92, memory: 76, network: 67, storage: 56 },
      capabilities: ['memory processing', 'pattern recognition', 'learning'],
      lastUpdate: '1 minute ago',
      config: { learningRate: 0.001, memorySize: '2GB' }
    },
    {
      id: 'security-monitor',
      name: 'Security Monitor',
      type: 'security',
      status: 'running',
      uptime: '48h 12m',
      version: '1.5.4',
      port: 8083,
      resources: { cpu: 23, memory: 45, network: 12, storage: 8 },
      capabilities: ['threat detection', 'audit logging', 'compliance monitoring'],
      lastUpdate: '5 minutes ago',
      config: { scanInterval: 60, threatLevel: 'medium' }
    },
    {
      id: 'deployment-agent',
      name: 'Deployment Agent',
      type: 'deployment',
      status: 'stopped',
      uptime: '0h 00m',
      version: '1.2.3',
      port: 8084,
      resources: { cpu: 0, memory: 0, network: 0, storage: 0 },
      capabilities: ['service deployment', 'scaling', 'health checks'],
      lastUpdate: '10 minutes ago',
      config: { autoScale: true, maxInstances: 10 }
    },
    {
      id: 'ui-orchestrator',
      name: 'UI Orchestrator',
      type: 'ui',
      status: 'starting',
      uptime: '0h 02m',
      version: '2.0.0-beta',
      port: 8085,
      resources: { cpu: 15, memory: 32, network: 8, storage: 5 },
      capabilities: ['interface management', 'user interaction', 'presentation'],
      lastUpdate: '1 minute ago',
      config: { theme: 'dark', responsiveness: true }
    }
  ])

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false)

  const filteredAgents = agents.filter(agent => {
    const matchesFilter = filter === 'all' || agent.status === filter || agent.type === filter
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.type.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-400 bg-green-900/20'
      case 'stopped': return 'text-gray-400 bg-gray-900/20'
      case 'starting': return 'text-blue-400 bg-blue-900/20'
      case 'stopping': return 'text-yellow-400 bg-yellow-900/20'
      case 'error': return 'text-red-400 bg-red-900/20'
      default: return 'text-gray-400 bg-gray-900/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle className="w-4 h-4" />
      case 'stopped': return <Square className="w-4 h-4" />
      case 'starting': return <Clock className="w-4 h-4 animate-spin" />
      case 'stopping': return <RefreshCw className="w-4 h-4 animate-spin" />
      case 'error': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'monitor': return 'bg-blue-500/20 text-blue-400'
      case 'computation': return 'bg-purple-500/20 text-purple-400'
      case 'security': return 'bg-red-500/20 text-red-400'
      case 'deployment': return 'bg-green-500/20 text-green-400'
      case 'cognitive': return 'bg-orange-500/20 text-orange-400'
      case 'ui': return 'bg-pink-500/20 text-pink-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const handleAgentAction = (agentId: string, action: 'start' | 'stop' | 'restart' | 'delete') => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        switch (action) {
          case 'start':
            return { ...agent, status: 'starting' as const }
          case 'stop':
            return { ...agent, status: 'stopping' as const }
          case 'restart':
            return { ...agent, status: 'starting' as const }
          default:
            return agent
        }
      }
      return agent
    }))

    // Simulate status change after delay
    setTimeout(() => {
      if (action !== 'delete') {
        setAgents(prev => prev.map(agent => {
          if (agent.id === agentId) {
            const newStatus = action === 'start' || action === 'restart' ? 'running' : 'stopped'
            return { ...agent, status: newStatus as const }
          }
          return agent
        }))
      } else {
        setAgents(prev => prev.filter(agent => agent.id !== agentId))
      }
    }, 2000)
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
            <h1 className="text-4xl font-bold text-white mb-2">Agent Management</h1>
            <p className="text-gray-400">Control and monitor your distributed consciousness agents</p>
          </div>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" />
            Deploy New Agent
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Agents</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
            <option value="error">Error</option>
            <option value="monitor">Monitors</option>
            <option value="computation">Computation</option>
            <option value="security">Security</option>
            <option value="deployment">Deployment</option>
            <option value="cognitive">Cognitive</option>
            <option value="ui">UI</option>
          </select>

          <button className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white hover:bg-slate-700 transition-colors flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredAgents.map((agent, index) => (
            <motion.div
              key={agent.id}
              className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition-colors"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              layout
            >
              {/* Agent Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getTypeColor(agent.type)}`}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{agent.name}</h3>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(agent.status)}`}>
                      {getStatusIcon(agent.status)}
                      {agent.status}
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <button
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {selectedAgent?.id === agent.id && (
                    <motion.div
                      className="absolute right-0 top-10 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-10 min-w-[150px]"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 rounded-t-lg flex items-center gap-2"
                        onClick={() => setShowConfigModal(true)}
                      >
                        <Settings className="w-4 h-4" />
                        Configure
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                        onClick={() => handleAgentAction(agent.id, 'restart')}
                      >
                        <RefreshCw className="w-4 h-4" />
                        Restart
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-slate-700 flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Clone
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 rounded-b-lg flex items-center gap-2"
                        onClick={() => handleAgentAction(agent.id, 'delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Agent Info */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-400">Version</div>
                  <div className="text-sm text-white font-medium">{agent.version}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Port</div>
                  <div className="text-sm text-white font-medium">{agent.port}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Uptime</div>
                  <div className="text-sm text-white font-medium">{agent.uptime}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Last Update</div>
                  <div className="text-sm text-white font-medium">{agent.lastUpdate}</div>
                </div>
              </div>

              {/* Resource Usage */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>CPU</span>
                      <span>{agent.resources.cpu}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${agent.resources.cpu > 80 ? 'bg-red-400' : agent.resources.cpu > 60 ? 'bg-yellow-400' : 'bg-green-400'}`}
                        style={{ width: `${agent.resources.cpu}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Memory className="w-4 h-4 text-purple-400" />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Memory</span>
                      <span>{agent.resources.memory}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${agent.resources.memory > 80 ? 'bg-red-400' : agent.resources.memory > 60 ? 'bg-yellow-400' : 'bg-green-400'}`}
                        style={{ width: `${agent.resources.memory}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-2">Capabilities</div>
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.map((capability, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-slate-700 text-xs text-gray-300 rounded"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {agent.status === 'running' ? (
                  <button
                    onClick={() => handleAgentAction(agent.id, 'stop')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={() => handleAgentAction(agent.id, 'start')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    disabled={agent.status === 'starting'}
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                )}

                <button className="px-4 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Configuration Modal */}
      <AnimatePresence>
        {showConfigModal && selectedAgent && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-xl font-bold text-white mb-4">Configure {selectedAgent.name}</h3>

              <div className="space-y-4">
                {Object.entries(selectedAgent.config).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm text-gray-400 mb-2 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </label>
                    <input
                      type={typeof value === 'number' ? 'number' : 'text'}
                      defaultValue={value}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AgentsPage
