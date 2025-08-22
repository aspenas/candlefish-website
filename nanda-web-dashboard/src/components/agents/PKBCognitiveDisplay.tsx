'use client'

import { motion } from 'framer-motion'
import { PKBCognitiveStatus } from '@/types/agent'
import { 
  Brain, 
  Database, 
  Lightbulb, 
  Zap,
  BookOpen,
  Network,
  TrendingUp,
  Activity,
  Clock
} from 'lucide-react'

interface PKBCognitiveDisplayProps {
  status: PKBCognitiveStatus | null
}

export function PKBCognitiveDisplay({ status }: PKBCognitiveDisplayProps) {
  if (!status) {
    return (
      <div className="agent-card">
        <div className="animate-pulse">
          <div className="h-6 bg-background rounded mb-4 w-1/2" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-background rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const getStatusColor = (agentStatus: string) => {
    switch (agentStatus) {
      case 'active': return 'text-quantum-400 bg-quantum-500/20'
      case 'processing': return 'text-consciousness-400 bg-consciousness-500/20'
      case 'idle': return 'text-yellow-400 bg-yellow-500/20'
      case 'disconnected': return 'text-red-400 bg-red-500/20'
      default: return 'text-muted-foreground bg-muted/20'
    }
  }

  const getStatusIcon = (agentStatus: string) => {
    switch (agentStatus) {
      case 'active': return Activity
      case 'processing': return Zap
      case 'idle': return Clock
      case 'disconnected': return Database
      default: return Brain
    }
  }

  const StatusIcon = getStatusIcon(status.status)
  const statusColor = getStatusColor(status.status)

  const memoryModules = [
    { name: 'Episodic', value: status.memoryModules.episodic, icon: BookOpen, color: 'consciousness' },
    { name: 'Semantic', value: status.memoryModules.semantic, icon: Database, color: 'neural' },
    { name: 'Working', value: status.memoryModules.working, icon: Zap, color: 'quantum' },
    { name: 'Procedural', value: status.memoryModules.procedural, icon: Network, color: 'matrix' },
  ]

  const performanceMetrics = [
    { name: 'Reasoning', value: status.performanceMetrics.reasoning, color: 'consciousness' },
    { name: 'Creativity', value: status.performanceMetrics.creativity, color: 'neural' },
    { name: 'Problem Solving', value: status.performanceMetrics.problemSolving, color: 'quantum' },
    { name: 'Adaptability', value: status.performanceMetrics.adaptability, color: 'matrix' },
  ]

  const lastInteraction = new Date(status.lastInteraction)
  const timeSinceInteraction = Math.floor((Date.now() - lastInteraction.getTime()) / 1000)

  return (
    <motion.div
      className="agent-card h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-3">
          <motion.div
            className="p-3 rounded-lg bg-consciousness-500/20"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Brain className="w-6 h-6 text-consciousness-400" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-gradient">PKB Cognitive Extension</h2>
            <p className="text-sm text-muted-foreground font-mono">{status.agentId}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <StatusIcon className="w-5 h-5" />
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>
            {status.status}
          </span>
        </div>
      </div>

      {/* Cognitive Load & Learning Rate */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-4 bg-background/50 rounded-lg">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Zap className="w-5 h-5 text-neural-400" />
            <span className="text-sm font-medium">Cognitive Load</span>
          </div>
          <div className="text-3xl font-bold text-neural-400 mb-2">
            {status.cognitiveLoad.toFixed(1)}%
          </div>
          <div className="w-full bg-background rounded-full h-2">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-neural-500 to-neural-400"
              initial={{ width: 0 }}
              animate={{ width: `${status.cognitiveLoad}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        <div className="text-center p-4 bg-background/50 rounded-lg">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-quantum-400" />
            <span className="text-sm font-medium">Learning Rate</span>
          </div>
          <div className="text-3xl font-bold text-quantum-400 mb-2">
            {(status.learningRate * 100).toFixed(1)}%
          </div>
          <div className="w-full bg-background rounded-full h-2">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-quantum-500 to-quantum-400"
              initial={{ width: 0 }}
              animate={{ width: `${status.learningRate * 100}%` }}
              transition={{ duration: 1, delay: 0.2 }}
            />
          </div>
        </div>
      </div>

      {/* Memory Modules */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Database className="w-5 h-5 text-consciousness-400" />
          <span>Memory Modules</span>
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {memoryModules.map((module, index) => (
            <motion.div
              key={module.name}
              className="space-y-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <module.icon className={`w-4 h-4 text-${module.color}-400`} />
                  <span className="text-sm">{module.name}</span>
                </div>
                <span className={`text-xs font-mono text-${module.color}-400`}>
                  {module.value.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-background rounded-full h-1.5">
                <motion.div
                  className={`h-1.5 rounded-full bg-gradient-to-r from-${module.color}-500 to-${module.color}-400`}
                  initial={{ width: 0 }}
                  animate={{ width: `${module.value}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Knowledge Base */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-matrix-400" />
          <span>Knowledge Base</span>
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-background/50 rounded-lg">
            <div className="text-xl font-bold text-consciousness-400 mb-1">
              {status.knowledgeBase.totalConcepts.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Concepts</div>
          </div>
          <div className="p-3 bg-background/50 rounded-lg">
            <div className="text-xl font-bold text-neural-400 mb-1">
              {status.knowledgeBase.recentlyLearned}
            </div>
            <div className="text-xs text-muted-foreground">Recently Learned</div>
          </div>
          <div className="p-3 bg-background/50 rounded-lg">
            <div className="text-xl font-bold text-quantum-400 mb-1">
              {status.knowledgeBase.connections.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Connections</div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          <span>Performance Metrics</span>
        </h3>
        <div className="space-y-3">
          {performanceMetrics.map((metric, index) => (
            <motion.div
              key={metric.name}
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <span className="text-sm">{metric.name}</span>
              <div className="flex items-center space-x-3">
                <div className="w-24 bg-background rounded-full h-2">
                  <motion.div
                    className={`h-2 rounded-full bg-gradient-to-r from-${metric.color}-500 to-${metric.color}-400`}
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.value}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                  />
                </div>
                <span className={`text-xs font-mono text-${metric.color}-400 w-12 text-right`}>
                  {metric.value.toFixed(1)}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Last Interaction */}
      <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-white/10">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4" />
          <span>Last Interaction</span>
        </div>
        <div className="text-right">
          <div className="text-matrix-400 font-mono">
            {timeSinceInteraction < 60 ? 'Just now' :
             timeSinceInteraction < 3600 ? `${Math.floor(timeSinceInteraction / 60)}m ago` :
             lastInteraction.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Neural Activity Visualization */}
      <div className="mt-4 relative h-8 overflow-hidden rounded">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-consciousness-400/30 to-transparent h-px top-1/4"
          animate={{
            x: ['-100%', '200%']
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-neural-400/30 to-transparent h-px top-1/2"
          animate={{
            x: ['-100%', '200%']
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear",
            delay: 1
          }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-quantum-400/30 to-transparent h-px top-3/4"
          animate={{
            x: ['-100%', '200%']
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear",
            delay: 2
          }}
        />
      </div>
    </motion.div>
  )
}