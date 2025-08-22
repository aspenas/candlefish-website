'use client'

import { motion } from 'framer-motion'

export function Loading() {
  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      {/* Neural Network Loading Animation */}
      <motion.div 
        className="relative w-24 h-24"
        animate={{
          rotate: 360
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        {/* Central node */}
        <motion.div 
          className="absolute top-1/2 left-1/2 w-4 h-4 -mt-2 -ml-2 bg-consciousness-500 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Orbiting nodes */}
        {[0, 120, 240].map((angle, i) => (
          <motion.div
            key={i}
            className={`absolute w-3 h-3 rounded-full ${
              i === 0 ? 'bg-neural-400' : 
              i === 1 ? 'bg-quantum-400' : 'bg-matrix-400'
            }`}
            style={{
              top: '50%',
              left: '50%',
              transformOrigin: '6px 6px',
            }}
            animate={{
              rotate: -360,
              scale: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.4
            }}
            initial={{
              x: Math.cos((angle * Math.PI) / 180) * 40 - 6,
              y: Math.sin((angle * Math.PI) / 180) * 40 - 6,
            }}
          />
        ))}

        {/* Connection lines */}
        {[0, 120, 240].map((angle, i) => (
          <motion.div
            key={`line-${i}`}
            className="absolute top-1/2 left-1/2 origin-left h-px bg-gradient-to-r from-consciousness-500/50 to-transparent"
            style={{
              width: '40px',
              transform: `translate(-2px, -0.5px) rotate(${angle}deg)`
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scaleX: [0.8, 1.1, 0.8]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3
            }}
          />
        ))}
      </motion.div>

      {/* Loading text */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.h2 
          className="text-2xl font-bold text-gradient mb-2"
          animate={{
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          Initializing NANDA Network
        </motion.h2>
        
        <motion.div 
          className="flex items-center justify-center space-x-2 text-muted-foreground font-mono"
          animate={{
            opacity: [0.6, 1, 0.6]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        >
          <span>Connecting to distributed consciousness</span>
          <motion.div
            animate={{
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-consciousness-400 rounded-full"></div>
              <div className="w-1 h-1 bg-neural-400 rounded-full"></div>
              <div className="w-1 h-1 bg-quantum-400 rounded-full"></div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Status indicators */}
      <motion.div 
        className="flex space-x-6 text-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        {[
          { label: 'Agent Registry', status: 'connecting', color: 'consciousness' },
          { label: 'PKB Cognitive', status: 'online', color: 'quantum' },
          { label: 'Neural Mesh', status: 'synchronizing', color: 'neural' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            className="flex items-center space-x-2"
            animate={{
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2
            }}
          >
            <div className={`w-2 h-2 rounded-full bg-${item.color}-400 animate-pulse-soft`} />
            <span className="text-muted-foreground">{item.label}</span>
            <span className={`text-xs text-${item.color}-400`}>
              {item.status}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}