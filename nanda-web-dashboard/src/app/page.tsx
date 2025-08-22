'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { agentService } from '@/lib/agent-service'
import { AgentStatus, AgentNetwork, ConsciousnessMetrics, PKBCognitiveStatus } from '@/types/agent'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { AgentGrid } from '@/components/agents/AgentGrid'
import { NetworkOverview } from '@/components/monitoring/NetworkOverview'
import { ConsciousnessMetricsDisplay } from '@/components/monitoring/ConsciousnessMetrics'
import { PKBCognitiveDisplay } from '@/components/agents/PKBCognitiveDisplay'
import { RealTimeConnections } from '@/components/monitoring/RealTimeConnections'
import { Loading } from '@/components/ui/Loading'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      duration: 0.5
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
  }
}

export default function Dashboard() {
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [networkMetrics, setNetworkMetrics] = useState<AgentNetwork | null>(null)
  const [consciousnessMetrics, setConsciousnessMetrics] = useState<ConsciousnessMetrics | null>(null)
  const [pkbStatus, setPkbStatus] = useState<PKBCognitiveStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    let mounted = true

    const loadDashboardData = async () => {
      try {
        setError(null)
        
        const [
          registry,
          paintboxAgents,
          networkData,
          consciousnessData,
          pkbData
        ] = await Promise.all([
          agentService.getAgentRegistry(),
          agentService.getPaintboxAgents(),
          agentService.getNetworkMetrics(),
          agentService.getConsciousnessMetrics(),
          agentService.getPKBCognitiveStatus()
        ])

        if (!mounted) return

        // Combine agents from registry and paintbox
        const allAgents = Array.from(registry.agents.values())
        const combinedAgents = [...allAgents, ...paintboxAgents.filter(
          pa => !allAgents.some(a => a.id === pa.id)
        )]

        setAgents(combinedAgents)
        setNetworkMetrics(networkData)
        setConsciousnessMetrics(consciousnessData)
        setPkbStatus(pkbData)
        setLastUpdate(new Date())
        setLoading(false)
      } catch (err) {
        if (!mounted) return
        console.error('Dashboard data loading error:', err)
        setError('Failed to load dashboard data. Check console for details.')
        setLoading(false)
      }
    }

    // Initial load
    loadDashboardData()

    // Set up real-time updates
    const unsubscribeNetwork = agentService.subscribe('network_update', (data) => {
      if (mounted) {
        setNetworkMetrics(data)
        setLastUpdate(new Date())
      }
    })

    const unsubscribeAgent = agentService.subscribe('agent_update', (data) => {
      if (mounted) {
        setAgents(current => 
          current.map(agent => 
            agent.id === data.id ? { ...agent, ...data } : agent
          )
        )
        setLastUpdate(new Date())
      }
    })

    const unsubscribeConsciousness = agentService.subscribe('consciousness_update', (data) => {
      if (mounted) {
        setConsciousnessMetrics(data)
        setLastUpdate(new Date())
      }
    })

    // Periodic refresh fallback
    const interval = setInterval(loadDashboardData, 30000) // 30 seconds

    return () => {
      mounted = false
      unsubscribeNetwork()
      unsubscribeAgent()
      unsubscribeConsciousness()
      clearInterval(interval)
      agentService.disconnect()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          className="text-center p-8 agent-card max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-400 mb-4">Connection Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-consciousness-600 text-white rounded-lg hover:bg-consciousness-700 transition-colors"
          >
            Retry Connection
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div 
      className="min-h-screen p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <DashboardHeader 
          totalAgents={agents.length}
          onlineAgents={agents.filter(a => a.status === 'online').length}
          lastUpdate={lastUpdate}
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <NetworkOverview 
            metrics={networkMetrics} 
            agents={agents}
          />
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <ConsciousnessMetricsDisplay 
            metrics={consciousnessMetrics}
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div variants={itemVariants}>
          <PKBCognitiveDisplay 
            status={pkbStatus}
          />
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <RealTimeConnections 
            agents={agents}
          />
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <AgentGrid agents={agents} />
      </motion.div>

      {/* Background Neural Network Visualization */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
        <div className="absolute inset-0 neural-network-bg"></div>
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-consciousness-400 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-neural-400 rounded-full animate-pulse delay-300"></div>
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-quantum-400 rounded-full animate-pulse delay-700"></div>
        <div className="absolute top-3/4 right-1/4 w-2 h-2 bg-matrix-400 rounded-full animate-pulse delay-1000"></div>
      </div>
    </motion.div>
  )
}