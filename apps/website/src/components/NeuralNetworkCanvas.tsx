import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
  connections: number[]
  pulsePhase: number
  type: 'node' | 'data'
  targetX?: number
  targetY?: number
  lifetime?: number
  maxLifetime?: number
}

const NeuralNetworkCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = dimensions.width
    canvas.height = dimensions.height

    // Initialize neural network nodes
    const initializeParticles = () => {
      const particles: Particle[] = []
      const layers = [3, 5, 4, 3, 1] // Neural network structure
      const layerSpacing = dimensions.width / (layers.length + 1)

      let nodeIndex = 0
      layers.forEach((nodeCount, layerIndex) => {
        const x = layerSpacing * (layerIndex + 1)
        const ySpacing = dimensions.height / (nodeCount + 1)

        for (let i = 0; i < nodeCount; i++) {
          const y = ySpacing * (i + 1)
          particles.push({
            x,
            y,
            vx: 0,
            vy: 0,
            radius: layerIndex === Math.floor(layers.length / 2) ? 8 : 6,
            color: layerIndex === 0 ? '#00CED1' :
                   layerIndex === layers.length - 1 ? '#AF52DE' : '#007AFF',
            connections: [],
            pulsePhase: Math.random() * Math.PI * 2,
            type: 'node'
          })

          // Connect to next layer
          if (layerIndex < layers.length - 1) {
            const nextLayerStart = nodeIndex + nodeCount - i
            const nextLayerCount = layers[layerIndex + 1]
            for (let j = 0; j < nextLayerCount; j++) {
              particles[nodeIndex].connections.push(nextLayerStart + j)
            }
          }

          nodeIndex++
        }
      })

      particlesRef.current = particles
    }

    initializeParticles()

    // Add data particles
    const addDataParticle = () => {
      if (particlesRef.current.length === 0) return

      const nodes = particlesRef.current.filter(p => p.type === 'node')
      if (nodes.length < 2) return

      const sourceNode = nodes[Math.floor(Math.random() * Math.floor(nodes.length / 2))]
      const targetIndex = sourceNode.connections[Math.floor(Math.random() * sourceNode.connections.length)]
      const targetNode = particlesRef.current[targetIndex]

      if (!targetNode) return

      particlesRef.current.push({
        x: sourceNode.x,
        y: sourceNode.y,
        vx: 0,
        vy: 0,
        radius: 2,
        color: sourceNode.color,
        connections: [],
        pulsePhase: 0,
        type: 'data',
        targetX: targetNode.x,
        targetY: targetNode.y,
        lifetime: 0,
        maxLifetime: 60
      })
    }

    // Mouse interaction
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove)

    // Animation loop
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)

      // Add new data particles periodically
      if (Math.random() < 0.05) {
        addDataParticle()
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(particle => {
        if (particle.type === 'data') {
          // Move data particles toward their targets
          if (particle.targetX !== undefined && particle.targetY !== undefined) {
            const dx = particle.targetX - particle.x
            const dy = particle.targetY - particle.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance > 2 && particle.lifetime! < particle.maxLifetime!) {
              particle.x += (dx / distance) * 3
              particle.y += (dy / distance) * 3
              particle.lifetime!++
            } else {
              return false // Remove particle
            }
          }
        } else {
          // Neural nodes hover effect
          const dx = mouseRef.current.x - particle.x
          const dy = mouseRef.current.y - particle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 100) {
            particle.vx += dx * 0.0001
            particle.vy += dy * 0.0001
          }

          // Apply damping and update position
          particle.vx *= 0.95
          particle.vy *= 0.95
          particle.x += particle.vx
          particle.y += particle.vy

          // Pulse animation
          particle.pulsePhase += 0.05
        }

        // Draw particle
        const radius = particle.type === 'node'
          ? particle.radius + Math.sin(particle.pulsePhase) * 2
          : particle.radius

        // Glow effect
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, radius * 3
        )
        gradient.addColorStop(0, particle.color)
        gradient.addColorStop(0.5, particle.color + '40')
        gradient.addColorStop(1, 'transparent')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, radius * 3, 0, Math.PI * 2)
        ctx.fill()

        // Core
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2)
        ctx.fill()

        // Draw connections for nodes
        if (particle.type === 'node') {
          particle.connections.forEach(targetIndex => {
            const target = particlesRef.current[targetIndex]
            if (target && target.type === 'node') {
              ctx.strokeStyle = particle.color + '20'
              ctx.lineWidth = 1
              ctx.beginPath()
              ctx.moveTo(particle.x, particle.y)

              // Bezier curve for smoother connections
              const cpx = (particle.x + target.x) / 2
              const cpy = (particle.y + target.y) / 2 + Math.sin(particle.pulsePhase) * 10
              ctx.quadraticCurveTo(cpx, cpy, target.x, target.y)
              ctx.stroke()

              // Animated connection pulse
              const pulseProgress = (particle.pulsePhase % (Math.PI * 2)) / (Math.PI * 2)
              const pulseX = particle.x + (target.x - particle.x) * pulseProgress
              const pulseY = particle.y + (target.y - particle.y) * pulseProgress

              ctx.fillStyle = particle.color + '60'
              ctx.beginPath()
              ctx.arc(pulseX, pulseY, 2, 0, Math.PI * 2)
              ctx.fill()
            }
          })
        }

        return true // Keep particle
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [dimensions])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: 'transparent' }}
      />

      {/* Overlay UI Elements */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-center space-x-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-cyan-500/20"
        >
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-mono text-cyan-300">Neural Network Online</span>
        </motion.div>
      </div>

      <div className="absolute bottom-4 right-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="text-xs font-mono text-gray-400"
        >
          <div className="flex items-center space-x-2">
            <span>Nodes: {particlesRef.current.filter(p => p.type === 'node').length}</span>
            <span className="text-gray-600">|</span>
            <span>Active: {particlesRef.current.filter(p => p.type === 'data').length}</span>
          </div>
        </motion.div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-cyan-500/20" />
      <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-cyan-500/20" />
      <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-cyan-500/20" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-cyan-500/20" />
    </div>
  )
}

export default NeuralNetworkCanvas
