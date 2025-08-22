'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AgentStatus } from '@/types/agent'
import { AgentCard } from './AgentCard'
import { AgentModal } from './AgentModal'
import { Search, Filter, Grid, List } from 'lucide-react'

interface AgentGridProps {
  agents: AgentStatus[]
}

export function AgentGrid({ agents }: AgentGridProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'warning'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Filter agents based on search and filters
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.purpose.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter
    const matchesType = typeFilter === 'all' || agent.type === typeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const getUniqueTypes = () => {
    const types = [...new Set(agents.map(agent => agent.type))]
    return types.sort()
  }

  const getStatusCounts = () => {
    const counts = {
      all: agents.length,
      online: agents.filter(a => a.status === 'online').length,
      offline: agents.filter(a => a.status === 'offline').length,
      warning: agents.filter(a => a.status === 'warning').length,
    }
    return counts
  }

  const statusCounts = getStatusCounts()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gradient mb-2">Agent Network</h2>
          <p className="text-muted-foreground">
            {filteredAgents.length} of {agents.length} agents
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' 
                ? 'bg-consciousness-500/20 text-consciousness-400' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' 
                ? 'bg-consciousness-500/20 text-consciousness-400' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-card/50 border border-white/10 rounded-lg focus:border-consciousness-400/50 focus:outline-none focus:ring-2 focus:ring-consciousness-400/20 transition-colors"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 bg-card/50 border border-white/10 rounded-lg focus:border-consciousness-400/50 focus:outline-none focus:ring-2 focus:ring-consciousness-400/20 transition-colors"
        >
          <option value="all">All Status ({statusCounts.all})</option>
          <option value="online">Online ({statusCounts.online})</option>
          <option value="offline">Offline ({statusCounts.offline})</option>
          <option value="warning">Warning ({statusCounts.warning})</option>
        </select>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-card/50 border border-white/10 rounded-lg focus:border-consciousness-400/50 focus:outline-none focus:ring-2 focus:ring-consciousness-400/20 transition-colors"
        >
          <option value="all">All Types</option>
          {getUniqueTypes().map(type => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('all')
              setTypeFilter('all')
            }}
            className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Agent Grid/List */}
      <AnimatePresence mode="wait">
        {filteredAgents.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-12 agent-card"
          >
            <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No agents found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or filters
            </p>
          </motion.div>
        ) : viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <AgentCard
                  agent={agent}
                  onClick={() => setSelectedAgent(agent)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {filteredAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedAgent(agent)}
                className="agent-card cursor-pointer flex items-center justify-between p-4 hover:border-consciousness-400/50"
              >
                <div className="flex items-center space-x-4">
                  <div className={`status-indicator ${
                    agent.status === 'online' ? 'status-online' :
                    agent.status === 'warning' ? 'status-warning' : 'status-offline'
                  }`} />
                  <div>
                    <h3 className="font-semibold">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">{agent.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-consciousness-400">
                    {agent.metrics.cpuUsage.toFixed(1)}% CPU
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(agent.metrics.memoryUsage / 1024).toFixed(1)} GB
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Details Modal */}
      <AgentModal
        agent={selectedAgent}
        isOpen={!!selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
    </motion.div>
  )
}