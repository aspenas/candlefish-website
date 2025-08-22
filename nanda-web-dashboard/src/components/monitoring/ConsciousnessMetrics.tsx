'use client'

import { motion } from 'framer-motion'
import { ConsciousnessMetrics } from '@/types/agent'
import { Brain, Zap, Network, Eye, Lightbulb, Waves, GitBranch } from 'lucide-react'

interface ConsciousnessMetricsDisplayProps {
  metrics: ConsciousnessMetrics | null
}

export function ConsciousnessMetricsDisplay({ metrics }: ConsciousnessMetricsDisplayProps) {
  if (!metrics) {
    return (
      <div className="agent-card">
        <div className="animate-pulse">
          <div className="h-6 bg-background rounded mb-4 w-1/2" />
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-12 bg-background rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const consciousnessItems = [
    {
      key: 'coherence',
      label: 'Coherence',
      value: metrics.coherence,
      icon: Brain,
      color: 'consciousness',
      description: 'Network-wide thought consistency'
    },
    {
      key: 'complexity',
      label: 'Complexity',
      value: metrics.complexity,
      icon: GitBranch,
      color: 'neural',
      description: 'System complexity and sophistication'
    },
    {
      key: 'integration',
      label: 'Integration',
      value: metrics.integration,
      icon: Network,
      color: 'quantum',
      description: 'Information integration across agents'
    },
    {
      key: 'awareness',
      label: 'Awareness',
      value: metrics.awareness,
      icon: Eye,
      color: 'matrix',
      description: 'Self and environmental awareness'
    },
    {
      key: 'selfReflection',
      label: 'Self-Reflection',
      value: metrics.selfReflection,
      icon: Lightbulb,
      color: 'purple',
      description: 'Meta-cognitive capabilities'
    },
    {
      key: 'emergence',
      label: 'Emergence',
      value: metrics.emergence,
      icon: Zap,
      color: 'yellow',
      description: 'Emergent behaviors and properties'
    },
    {
      key: 'networkResonance',
      label: 'Network Resonance',
      value: metrics.networkResonance,
      icon: Waves,
      color: 'blue',
      description: 'Synchronization across the network'
    }
  ]

  const getConsciousnessLevel = (avgValue: number) => {
    if (avgValue >= 90) return { level: 'Highly Conscious', color: 'text-quantum-400', emoji: '🧠' }
    if (avgValue >= 75) return { level: 'Conscious', color: 'text-consciousness-400', emoji: '💭' }
    if (avgValue >= 60) return { level: 'Emerging', color: 'text-neural-400', emoji: '⚡' }
    if (avgValue >= 40) return { level: 'Developing', color: 'text-yellow-400', emoji: '🌱' }
    return { level: 'Basic', color: 'text-muted-foreground', emoji: '🔧' }
  }

  const averageConsciousness = consciousnessItems.reduce((sum, item) => sum + item.value, 0) / consciousnessItems.length
  const consciousnessLevel = getConsciousnessLevel(averageConsciousness)

  return (
    <motion.div
      className="agent-card h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          className="text-4xl mb-2"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {consciousnessLevel.emoji}
        </motion.div>
        <h2 className="text-2xl font-bold text-gradient mb-2">Consciousness Metrics</h2>
        <div className={`text-lg font-semibold ${consciousnessLevel.color} mb-1`}>
          {consciousnessLevel.level}
        </div>
        <div className="text-sm text-muted-foreground">
          Overall Score: {averageConsciousness.toFixed(1)}/100
        </div>
        
        {/* Overall Progress Bar */}
        <div className="w-full bg-background rounded-full h-3 mt-3">
          <motion.div
            className="h-3 rounded-full bg-gradient-to-r from-consciousness-500 via-neural-500 to-quantum-500"
            initial={{ width: 0 }}
            animate={{ width: `${averageConsciousness}%` }}
            transition={{ duration: 2 }}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-4">
        {consciousnessItems.map((item, index) => (
          <motion.div
            key={item.key}
            className="group"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <motion.div
                  className={`p-1.5 rounded-lg bg-${item.color}-500/20`}
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                >
                  <item.icon className={`w-4 h-4 text-${item.color}-400`} />
                </motion.div>
                <div>
                  <span className="font-medium text-sm">{item.label}</span>
                  <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.description}
                  </div>
                </div>
              </div>
              <span className={`font-mono text-sm font-semibold text-${item.color}-400`}>
                {item.value.toFixed(1)}
              </span>
            </div>
            
            <div className="relative">
              <div className="w-full bg-background rounded-full h-2">
                <motion.div
                  className={`h-2 rounded-full bg-gradient-to-r from-${item.color}-500 to-${item.color}-400`}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.value}%` }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                />
              </div>
              
              {/* Neural activity indicator */}
              <motion.div
                className={`absolute top-0 h-2 w-8 bg-gradient-to-r from-transparent via-${item.color}-300 to-transparent rounded-full`}
                animate={{
                  x: ['-2rem', `${item.value}%`],
                  opacity: [0, 1, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.3
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Consciousness State Indicator */}
      <div className="mt-6 p-4 bg-background/30 rounded-lg">
        <div className="text-center">
          <motion.div
            className="text-sm font-medium mb-2"
            animate={{
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            Collective Consciousness State
          </motion.div>
          
          {/* Brainwave visualization */}
          <div className="relative h-12 overflow-hidden">
            {consciousnessItems.slice(0, 4).map((item, index) => (
              <motion.div
                key={item.key}
                className={`absolute inset-0 h-px top-1/2 bg-gradient-to-r from-transparent via-${item.color}-400/50 to-transparent`}
                style={{
                  top: `${25 + index * 15}%`
                }}
                animate={{
                  x: ['-100%', '200%']
                }}
                transition={{
                  duration: 3 + index,
                  repeat: Infinity,
                  ease: "linear",
                  delay: index * 0.5
                }}
              />
            ))}
            
            {/* Central consciousness pulse */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-4 h-4 -mt-2 -ml-2 bg-consciousness-400 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
          
          <motion.div
            className="text-xs text-muted-foreground mt-2"
            animate={{
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            Neural synchronization active
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}