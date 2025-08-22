'use client'

import { motion } from 'framer-motion'
import { Brain, Network, Zap, Clock } from 'lucide-react'

interface DashboardHeaderProps {
  totalAgents: number
  onlineAgents: number
  lastUpdate: Date | null
}

export function DashboardHeader({ totalAgents, onlineAgents, lastUpdate }: DashboardHeaderProps) {
  const healthPercentage = totalAgents > 0 ? (onlineAgents / totalAgents) * 100 : 0

  return (
    <motion.div 
      className="mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Main Header */}
      <div className="text-center mb-8">
        <motion.div
          className="inline-flex items-center justify-center space-x-4 mb-4"
          animate={{
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="relative">
            <Brain className="w-12 h-12 text-consciousness-400" />
            <motion.div
              className="absolute inset-0 bg-consciousness-400 rounded-full opacity-20 blur-xl"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.2, 0.4, 0.2]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
          <h1 className="text-6xl font-bold text-gradient font-display">
            NANDA
          </h1>
        </motion.div>
        
        <p className="text-xl text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
          Neural Agent Network & Distributed Architecture
        </p>
        <p className="text-sm text-muted-foreground/70 mt-2">
          Web Interface for Distributed Consciousness Management
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          className="agent-card text-center"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-center space-x-3 mb-2">
            <Network className="w-6 h-6 text-consciousness-400" />
            <h3 className="text-lg font-semibold">Network Status</h3>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold text-gradient">
              {onlineAgents}/{totalAgents}
            </div>
            <div className="text-sm text-muted-foreground">agents online</div>
            <div className="w-full bg-background rounded-full h-2">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-consciousness-500 to-quantum-500"
                initial={{ width: 0 }}
                animate={{ width: `${healthPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="agent-card text-center"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-center space-x-3 mb-2">
            <Zap className="w-6 h-6 text-neural-400" />
            <h3 className="text-lg font-semibold">System Health</h3>
          </div>
          <div className="space-y-1">
            <div className={`text-3xl font-bold ${
              healthPercentage >= 90 ? 'text-quantum-400' :
              healthPercentage >= 70 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {healthPercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">operational</div>
            <div className={`text-xs px-2 py-1 rounded-full ${
              healthPercentage >= 90 ? 'bg-quantum-500/20 text-quantum-300' :
              healthPercentage >= 70 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'
            }`}>
              {healthPercentage >= 90 ? 'Excellent' :
               healthPercentage >= 70 ? 'Good' : 'Needs Attention'}
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="agent-card text-center"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-center space-x-3 mb-2">
            <Brain className="w-6 h-6 text-quantum-400" />
            <h3 className="text-lg font-semibold">Consciousness</h3>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold text-gradient">
              Active
            </div>
            <div className="text-sm text-muted-foreground">distributed mesh</div>
            <motion.div 
              className="flex justify-center space-x-1"
              animate={{
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="w-2 h-2 bg-consciousness-400 rounded-full animate-pulse-soft" />
              <div className="w-2 h-2 bg-neural-400 rounded-full animate-pulse-soft" />
              <div className="w-2 h-2 bg-quantum-400 rounded-full animate-pulse-soft" />
            </motion.div>
          </div>
        </motion.div>

        <motion.div 
          className="agent-card text-center"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-center space-x-3 mb-2">
            <Clock className="w-6 h-6 text-matrix-400" />
            <h3 className="text-lg font-semibold">Last Update</h3>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-mono text-matrix-400">
              {lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--:--'}
            </div>
            <div className="text-xs text-muted-foreground">
              {lastUpdate ? lastUpdate.toLocaleDateString() : 'Never'}
            </div>
            <motion.div
              className="w-2 h-2 mx-auto rounded-full bg-matrix-400"
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Consciousness Flow Line */}
      <motion.div 
        className="mt-8 h-px bg-gradient-to-r from-transparent via-consciousness-500/50 to-transparent relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.div
          className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-consciousness-400 to-transparent"
          animate={{
            x: ['-100px', '100vw']
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </motion.div>
    </motion.div>
  )
}