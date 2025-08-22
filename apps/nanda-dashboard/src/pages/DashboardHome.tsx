import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRealtimeData, type AgentMetrics } from '../hooks/useRealtimeData'
import { MetricsDashboard } from '../components/monitoring/MetricsDashboard'
import { AgentStatusGrid } from '../components/monitoring/AgentStatusGrid'
import { ActivityFeed } from '../components/monitoring/ActivityFeed'
import { PerformanceChart } from '../components/charts/PerformanceChart'
import { GlobalHeatMap } from '../components/monitoring/GlobalHeatMap'
import { LivingAgentEcosystem } from '../components/living-agents/LivingAgentEcosystem'

export function DashboardHome() {
  const { agents, systemMetrics, activity, performanceHistory, isConnected } = useRealtimeData()
  const [selectedAgent, setSelectedAgent] = useState<AgentMetrics | null>(null)
  const [selectedTab, setSelectedTab] = useState<'ecosystem' | 'overview' | 'agents' | 'performance' | 'globe'>('ecosystem')

  const handleAgentSelect = (agent: AgentMetrics) => {
    setSelectedAgent(agent)
    // Could open a modal or navigate to agent details
    console.log('Selected agent:', agent)
  }

  const TabButton = ({ tab, label, isActive, onClick }: {
    tab: string
    label: string
    isActive: boolean
    onClick: () => void
  }) => (
    <button
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className={`
        px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
        ${isActive
          ? 'bg-primary text-primary-foreground shadow-glow'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }
      `}
      role="tab"
      aria-selected={isActive}
      aria-controls={`${tab}-panel`}
      tabIndex={isActive ? 0 : -1}
    >
      {label}
    </button>
  )

  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
      <span className="text-muted-foreground">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
      {isConnected && (
        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
          Live Data
        </span>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-50" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />

        <div className="relative glass-card mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <motion.h1
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4"
              >
                NANDA Index Dashboard
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-lg text-muted-foreground mb-4"
              >
                Enterprise AI Agent Discovery & Management Platform
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex items-center gap-4"
              >
                <ConnectionStatus />
                <div className="h-4 w-px bg-border" />
                <span className="text-sm text-muted-foreground">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
              </motion.div>
            </div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex gap-3"
            >
              <button className="btn-primary">
                Discover Agents
              </button>
              <button className="px-6 py-3 text-sm font-medium border border-border rounded-lg hover:bg-muted/50 transition-colors">
                View Reports
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="glass-card mb-8 p-2"
      >
        <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Dashboard navigation">
          <TabButton
            tab="ecosystem"
            label="🧬 Living Ecosystem"
            isActive={selectedTab === 'ecosystem'}
            onClick={() => setSelectedTab('ecosystem')}
          />
          <TabButton
            tab="overview"
            label="📊 Overview"
            isActive={selectedTab === 'overview'}
            onClick={() => setSelectedTab('overview')}
          />
          <TabButton
            tab="agents"
            label="🤖 Agent Network"
            isActive={selectedTab === 'agents'}
            onClick={() => setSelectedTab('agents')}
          />
          <TabButton
            tab="performance"
            label="⚡ Performance"
            isActive={selectedTab === 'performance'}
            onClick={() => setSelectedTab('performance')}
          />
          <TabButton
            tab="globe"
            label="🌍 Global Map"
            isActive={selectedTab === 'globe'}
            onClick={() => setSelectedTab('globe')}
          />
        </div>
      </motion.div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {selectedTab === 'ecosystem' && (
          <motion.div
            key="ecosystem"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            role="tabpanel"
            id="ecosystem-panel"
            aria-labelledby="ecosystem-tab"
          >
            <LivingAgentEcosystem />
          </motion.div>
        )}

        {selectedTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
            role="tabpanel"
            id="overview-panel"
            aria-labelledby="overview-tab"
          >
            {systemMetrics && <MetricsDashboard metrics={systemMetrics} />}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2">
                <PerformanceChart data={performanceHistory} type="area" height={350} />
              </div>
              <div>
                <ActivityFeed activities={activity} maxItems={15} />
              </div>
            </div>
          </motion.div>
        )}

        {selectedTab === 'agents' && (
          <motion.div
            key="agents"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            role="tabpanel"
            id="agents-panel"
            aria-labelledby="agents-tab"
          >
            <AgentStatusGrid agents={agents} onAgentSelect={handleAgentSelect} />
          </motion.div>
        )}

        {selectedTab === 'performance' && (
          <motion.div
            key="performance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
            role="tabpanel"
            id="performance-panel"
            aria-labelledby="performance-tab"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <PerformanceChart data={performanceHistory} type="line" height={300} />
              <PerformanceChart data={performanceHistory} type="area" height={300} />
            </div>
            <ActivityFeed activities={activity.filter(a => a.type === 'error' || a.severity === 'warning')} maxItems={20} />
          </motion.div>
        )}

        {selectedTab === 'globe' && (
          <motion.div
            key="globe"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            role="tabpanel"
            id="globe-panel"
            aria-labelledby="globe-tab"
          >
            <GlobalHeatMap agents={agents} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedAgent(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="glass-card max-w-md w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Agent Details: {selectedAgent.name}
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform:</span>
                  <span className="font-medium">{selectedAgent.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-medium capitalize
                    ${selectedAgent.status === 'online' ? 'text-green-400' :
                      selectedAgent.status === 'warning' ? 'text-yellow-400' : 'text-red-400'}
                  `}>{selectedAgent.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response Time:</span>
                  <span className="font-medium">{Math.round(selectedAgent.responseTime)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Success Rate:</span>
                  <span className="font-medium">{selectedAgent.successRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Region:</span>
                  <span className="font-medium">{selectedAgent.region}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="btn-primary w-full mt-6"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
