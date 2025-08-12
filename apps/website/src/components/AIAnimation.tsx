import React, { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'

interface NeuralNodeProps {
  x: number
  y: number
  size: number
  delay: number
  color: string
  id: number
}

const NeuralNode: React.FC<NeuralNodeProps> = ({ x, y, size, delay, color, id }) => {
  const [isActive, setIsActive] = useState(false)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsActive(prev => !prev)
    }, 2000 + Math.random() * 2000)
    return () => clearInterval(interval)
  }, [])
  
  return (
    <>
      <motion.div
        className="absolute rounded-full cursor-pointer"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color} 0%, ${color}80 70%, transparent 100%)`,
          filter: isActive ? `drop-shadow(0 0 20px ${color})` : 'none',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: [0.8, 1.2, 1],
          opacity: [0.6, 1, 0.8],
          boxShadow: [
            `0 0 10px ${color}40`,
            `0 0 30px ${color}80`,
            `0 0 15px ${color}60`,
          ]
        }}
        transition={{
          duration: 2.5,
          delay: delay,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
        whileHover={{ scale: 1.5, filter: `drop-shadow(0 0 30px ${color})` }}
        whileTap={{ scale: 0.9 }}
      />
      {/* Signal pulse when active */}
      {isActive && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: size * 2,
            height: size * 2,
            transform: 'translate(-25%, -25%)',
            border: `2px solid ${color}`,
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      )}
    </>
  )
}

interface ConnectionLineProps {
  from: { x: number; y: number }
  to: { x: number; y: number }
  delay: number
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ from, to, delay }) => {
  const length = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
  const angle = Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI)
  
  return (
    <>
      {/* Main connection line */}
      <motion.div
        className="absolute origin-left"
        style={{
          left: `${from.x}%`,
          top: `${from.y}%`,
          width: `${length * 0.8}%`,
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, #00CED1 20%, #007AFF 50%, #AF52DE 80%, transparent 100%)',
          transform: `rotate(${angle}deg)`,
          transformOrigin: '0 50%',
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ 
          scaleX: [0, 1, 0.8],
          opacity: [0, 0.8, 0.4],
        }}
        transition={{
          duration: 3,
          delay: delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Data packet animation */}
      <motion.div
        className="absolute w-2 h-2 rounded-full bg-cyan-400"
        style={{
          left: `${from.x}%`,
          top: `${from.y}%`,
          boxShadow: '0 0 10px rgba(0, 206, 209, 0.8)',
        }}
        animate={{
          left: [`${from.x}%`, `${to.x}%`],
          top: [`${from.y}%`, `${to.y}%`],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 2,
          delay: delay + 1,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 1,
        }}
      />
    </>
  )
}

const AIAnimation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10])
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10])
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        mouseX.set(e.clientX - centerX)
        mouseY.set(e.clientY - centerY)
      }
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
  
  // Define neural network nodes
  const nodes: NeuralNodeProps[] = [
    { id: 1, x: 50, y: 15, size: 16, delay: 0, color: '#00CED1' },
    { id: 2, x: 25, y: 35, size: 12, delay: 0.3, color: '#007AFF' },
    { id: 3, x: 75, y: 35, size: 12, delay: 0.6, color: '#AF52DE' },
    { id: 4, x: 15, y: 60, size: 14, delay: 0.9, color: '#00CED1' },
    { id: 5, x: 50, y: 55, size: 18, delay: 1.2, color: '#007AFF' },
    { id: 6, x: 85, y: 60, size: 14, delay: 1.5, color: '#AF52DE' },
    { id: 7, x: 30, y: 80, size: 10, delay: 1.8, color: '#00CED1' },
    { id: 8, x: 70, y: 80, size: 10, delay: 2.1, color: '#007AFF' },
    { id: 9, x: 50, y: 90, size: 12, delay: 2.4, color: '#AF52DE' },
  ]
  
  // Define connections between nodes
  const connections: ConnectionLineProps[] = [
    { from: { x: 50, y: 15 }, to: { x: 25, y: 35 }, delay: 0.5 },
    { from: { x: 50, y: 15 }, to: { x: 75, y: 35 }, delay: 0.8 },
    { from: { x: 25, y: 35 }, to: { x: 15, y: 60 }, delay: 1.1 },
    { from: { x: 25, y: 35 }, to: { x: 50, y: 55 }, delay: 1.4 },
    { from: { x: 75, y: 35 }, to: { x: 50, y: 55 }, delay: 1.7 },
    { from: { x: 75, y: 35 }, to: { x: 85, y: 60 }, delay: 2.0 },
    { from: { x: 15, y: 60 }, to: { x: 30, y: 80 }, delay: 2.3 },
    { from: { x: 50, y: 55 }, to: { x: 30, y: 80 }, delay: 2.6 },
    { from: { x: 50, y: 55 }, to: { x: 70, y: 80 }, delay: 2.9 },
    { from: { x: 85, y: 60 }, to: { x: 70, y: 80 }, delay: 3.2 },
    { from: { x: 30, y: 80 }, to: { x: 50, y: 90 }, delay: 3.5 },
    { from: { x: 70, y: 80 }, to: { x: 50, y: 90 }, delay: 3.8 },
  ]

  return (
    <motion.div 
      className="w-full h-full flex items-center justify-center relative" 
      ref={containerRef}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
    >
      {/* Central Glow Effect */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-60"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at center, rgba(0, 206, 209, 0.3) 0%, rgba(0, 122, 255, 0.2) 30%, rgba(175, 82, 222, 0.1) 60%, transparent 100%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Outer Ring Animation */}
      <motion.div
        className="absolute w-96 h-96 rounded-full border-2 opacity-30"
        style={{
          borderImage: 'linear-gradient(45deg, #00CED1, #007AFF, #AF52DE, #00CED1) 1',
          borderStyle: 'solid',
        }}
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: {
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          },
          scale: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }
        }}
      />

      {/* Quantum field effect */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            'radial-gradient(circle at 20% 80%, rgba(0, 206, 209, 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 20%, rgba(175, 82, 222, 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 50% 50%, rgba(0, 122, 255, 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 80%, rgba(0, 206, 209, 0.1) 0%, transparent 50%)',
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* AI Brain Container */}
      <div className="relative w-80 h-80" style={{ transformStyle: 'preserve-3d' }}>
        {/* Connection Lines */}
        {connections.map((connection, index) => (
          <ConnectionLine
            key={index}
            from={connection.from}
            to={connection.to}
            delay={connection.delay}
          />
        ))}
        
        {/* Neural Nodes */}
        {nodes.map((node) => (
          <NeuralNode
            key={node.id}
            x={node.x}
            y={node.y}
            size={node.size}
            delay={node.delay}
            color={node.color}
            id={node.id}
          />
        ))}
        
        {/* Central Processing Unit */}
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full"
          style={{
            background: 'linear-gradient(135deg, #00CED1, #007AFF, #AF52DE)',
          }}
          animate={{
            scale: [1, 1.3, 1],
            boxShadow: [
              '0 0 20px rgba(0, 206, 209, 0.5)',
              '0 0 40px rgba(0, 122, 255, 0.8)',
              '0 0 60px rgba(175, 82, 222, 0.6)',
              '0 0 20px rgba(0, 206, 209, 0.5)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Enhanced Data Flow Particles */}
        {Array.from({ length: 12 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-cyan-400"
            style={{
              left: '50%',
              top: '50%',
            }}
            animate={{
              x: [0, Math.cos(i * Math.PI / 6) * 120, 0],
              y: [0, Math.sin(i * Math.PI / 6) * 120, 0],
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 3,
              delay: i * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Floating Text and Status */}
      <motion.div
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center"
      >
        <motion.div
          className="text-cyan-300 font-mono text-sm opacity-60 mb-2"
          animate={{
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          AI Processing...
        </motion.div>
        <div className="flex items-center space-x-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-3 bg-cyan-400 rounded-full"
              animate={{
                scaleY: [0.3, 1, 0.3],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                delay: i * 0.1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default AIAnimation
