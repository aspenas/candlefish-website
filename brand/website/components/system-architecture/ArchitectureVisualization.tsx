'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

interface Node {
  id: string
  label: string
  x: number
  y: number
  radius: number
  color: string
  connections: string[]
  isActive: boolean
  layer: number
  processCount: number
  load: number
}

interface FlowParticle {
  id: string
  x: number
  y: number
  targetX: number
  targetY: number
  progress: number
  speed: number
  path: string[]
  currentPath: number
  color: string
  size: number
  opacity: number
  trail: Array<{ x: number; y: number; opacity: number }>
}

interface PerformanceMetric {
  label: string
  before: string
  after: string
  value: number
  unit: string
  improvement: string
}

interface DataFlow {
  from: string
  to: string
  intensity: number
  color: string
}

const ArchitectureVisualization: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [isVisible, setIsVisible] = useState(false)
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0, pixelRatio: 1 })
  const [scaledNodes, setScaledNodes] = useState<Node[]>([])
  const [currentMetric, setCurrentMetric] = useState(0)
  const [animationPhase, setAnimationPhase] = useState<'loading' | 'active' | 'complete'>('loading')

  const performanceMetrics: PerformanceMetric[] = [
    { label: 'Processing Time', before: '45+ min', after: '<1 min', value: 98, unit: '%', improvement: 'reduction' },
    { label: 'Error Rate', before: '12%', after: '<1%', value: 92, unit: '%', improvement: 'reduction' },
    { label: 'Throughput', before: '1.3/hr', after: '60/hr', value: 4600, unit: '%', improvement: 'increase' },
    { label: 'Labor Cost', before: '$45', after: '$0.75', value: 98, unit: '%', improvement: 'reduction' }
  ]

  // Define system nodes with enhanced properties
  const nodes: Node[] = [
    // Main pipeline (top row)
    { id: 'intake', label: 'Intake', x: 80, y: 80, radius: 24, color: '#3FD3C6', connections: ['validation'], isActive: false, layer: 1, processCount: 0, load: 0 },
    { id: 'validation', label: 'Validation', x: 200, y: 80, radius: 24, color: '#3FD3C6', connections: ['processing', 'inventory'], isActive: false, layer: 1, processCount: 0, load: 0 },
    { id: 'processing', label: 'Processing', x: 320, y: 80, radius: 24, color: '#3FD3C6', connections: ['delivery', 'assembly'], isActive: false, layer: 1, processCount: 0, load: 0 },
    { id: 'delivery', label: 'Delivery', x: 440, y: 80, radius: 24, color: '#3FD3C6', connections: [], isActive: false, layer: 1, processCount: 0, load: 0 },
    
    // Subsystem nodes (middle layer)
    { id: 'inventory', label: 'Inventory', x: 120, y: 180, radius: 20, color: '#DAA520', connections: ['engraving'], isActive: false, layer: 2, processCount: 0, load: 0 },
    { id: 'engraving', label: 'Engraving', x: 240, y: 180, radius: 20, color: '#DAA520', connections: ['assembly'], isActive: false, layer: 2, processCount: 0, load: 0 },
    { id: 'assembly', label: 'Assembly', x: 360, y: 180, radius: 20, color: '#DAA520', connections: ['qa'], isActive: false, layer: 2, processCount: 0, load: 0 },
    
    // Quality & shipping (bottom layer)
    { id: 'qa', label: 'QA', x: 200, y: 280, radius: 18, color: '#E84855', connections: ['shipping'], isActive: false, layer: 3, processCount: 0, load: 0 },
    { id: 'shipping', label: 'Shipping', x: 320, y: 280, radius: 18, color: '#E84855', connections: [], isActive: false, layer: 3, processCount: 0, load: 0 }
  ]

  const [flowParticles, setFlowParticles] = useState<FlowParticle[]>([])
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set())
  const [nodeLoads, setNodeLoads] = useState<Map<string, number>>(new Map())

  // Enhanced particle creation with better pathing
  const createParticle = useCallback((): FlowParticle => {
    const paths = [
      ['intake', 'validation', 'processing', 'delivery'],
      ['validation', 'inventory', 'engraving', 'assembly', 'qa', 'shipping'],
      ['processing', 'assembly', 'qa', 'shipping'],
      ['intake', 'validation', 'inventory', 'engraving', 'assembly', 'qa', 'shipping']
    ]
    
    const selectedPath = paths[Math.floor(Math.random() * paths.length)]
    const startNode = scaledNodes.find(n => n.id === selectedPath[0])!
    
    return {
      id: Math.random().toString(36),
      x: startNode.x,
      y: startNode.y,
      targetX: startNode.x,
      targetY: startNode.y,
      progress: 0,
      speed: 0.6 + Math.random() * 0.8,
      path: selectedPath,
      currentPath: 0,
      color: `hsl(${175 + Math.random() * 30}, ${70 + Math.random() * 20}%, ${60 + Math.random() * 25}%)`,
      size: 1.5 + Math.random() * 2.5,
      opacity: 0.7 + Math.random() * 0.3,
      trail: []
    }
  }, [scaledNodes])

  // Setup high-quality canvas context
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: false,
      colorSpace: 'srgb',
      willReadFrequently: false
    })
    if (!ctx) return null

    // Configure high-quality rendering
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    // Note: textRenderingOptimization is not standard, so we skip it
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    return ctx
  }, [])

  // Enhanced animation loop with sophisticated effects
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = setupCanvas()
    if (!ctx) return

    const time = Date.now() * 0.001
    const { width, height, pixelRatio } = canvasDimensions

    // High-quality canvas clear with proper alpha handling
    ctx.save()
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(13, 27, 42, 0.08)'
    ctx.fillRect(0, 0, width, height)
    ctx.restore()

    // Draw animated background grid with sub-pixel precision
    ctx.save()
    ctx.strokeStyle = `rgba(65, 90, 119, ${0.05 + Math.sin(time * 0.5) * 0.02})`
    ctx.lineWidth = Math.max(0.5, pixelRatio * 0.5)
    const gridOffset = (time * 10) % 40
    
    // Snap grid lines to pixel boundaries for crispness
    for (let i = -40; i < width + 40; i += 40) {
      const x = Math.round((i + gridOffset) * pixelRatio) / pixelRatio
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let i = -40; i < height + 40; i += 40) {
      const y = Math.round((i + gridOffset * 0.5) * pixelRatio) / pixelRatio
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.restore()

    // Calculate node loads based on nearby particles
    const newNodeLoads = new Map<string, number>()
    scaledNodes.forEach(node => {
      const nearbyParticles = flowParticles.filter(p => {
        const dx = p.x - node.x
        const dy = p.y - node.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        return distance < node.radius * 2
      }).length
      newNodeLoads.set(node.id, Math.min(1, nearbyParticles / 3))
    })
    setNodeLoads(newNodeLoads)

    // Draw dynamic connections with flow visualization
    scaledNodes.forEach(node => {
      node.connections.forEach(connectionId => {
        const targetNode = scaledNodes.find(n => n.id === connectionId)
        if (targetNode) {
          const load = newNodeLoads.get(node.id) || 0
          const flowIntensity = 0.3 + load * 0.5
          
          // High-quality animated connection line
          const gradient = ctx.createLinearGradient(node.x, node.y, targetNode.x, targetNode.y)
          gradient.addColorStop(0, `rgba(65, 90, 119, ${Math.min(1, flowIntensity * 1.2)})`)
          gradient.addColorStop(0.5, `rgba(63, 211, 198, ${Math.min(1, flowIntensity)})`)
          gradient.addColorStop(1, `rgba(65, 90, 119, ${Math.min(1, flowIntensity * 1.2)})`)
          
          ctx.save()
          ctx.strokeStyle = gradient
          ctx.lineWidth = Math.max(0.5, (1.5 + load * 2) * pixelRatio) / pixelRatio
          ctx.lineCap = 'round'
          
          // Draw connection with subtle wave and pixel-perfect positioning
          const midX = (node.x + targetNode.x) / 2
          const midY = (node.y + targetNode.y) / 2
          const waveOffset = Math.sin(time * 3 + node.x * 0.01) * 3 * load
          
          // Snap to pixel boundaries for crisp lines
          const startX = Math.round(node.x * pixelRatio) / pixelRatio
          const startY = Math.round(node.y * pixelRatio) / pixelRatio
          const controlX = Math.round((midX + waveOffset) * pixelRatio) / pixelRatio
          const controlY = Math.round((midY + waveOffset) * pixelRatio) / pixelRatio
          const endX = Math.round(targetNode.x * pixelRatio) / pixelRatio
          const endY = Math.round(targetNode.y * pixelRatio) / pixelRatio
          
          ctx.beginPath()
          ctx.moveTo(startX, startY)
          ctx.quadraticCurveTo(controlX, controlY, endX, endY)
          ctx.stroke()
          ctx.restore()
        }
      })
    })

    // Update and draw particles with enhanced effects
    setFlowParticles(prevParticles => {
      const updatedParticles = prevParticles.map(particle => {
        const currentNode = scaledNodes.find(n => n.id === particle.path[particle.currentPath])
        const nextNode = scaledNodes.find(n => n.id === particle.path[particle.currentPath + 1])

        if (!currentNode || !nextNode) {
          return particle
        }

        // Update trail
        particle.trail.unshift({ x: particle.x, y: particle.y, opacity: particle.opacity })
        if (particle.trail.length > 5) {
          particle.trail.pop()
        }

        // Update particle position
        particle.progress += particle.speed * 0.015
        
        if (particle.progress >= 1) {
          particle.progress = 0
          particle.currentPath++
          
          if (particle.currentPath >= particle.path.length - 1) {
            // Reset particle with new path
            return createParticle()
          }
        }

        // Smooth interpolation with easing
        const t = easeInOutCubic(particle.progress)
        particle.x = currentNode.x + (nextNode.x - currentNode.x) * t
        particle.y = currentNode.y + (nextNode.y - currentNode.y) * t

        return particle
      })

      // Draw particle trails
      updatedParticles.forEach(particle => {
        particle.trail.forEach((point, index) => {
          const trailOpacity = particle.opacity * (1 - index / particle.trail.length) * 0.5
          ctx.save()
          ctx.globalAlpha = trailOpacity
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(point.x, point.y, particle.size * (1 - index / particle.trail.length), 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        })
      })

      // Draw main particles with glow effects
      updatedParticles.forEach(particle => {
        // Outer glow
        ctx.save()
        ctx.globalAlpha = particle.opacity * 0.3
        ctx.fillStyle = particle.color
        ctx.shadowColor = particle.color
        ctx.shadowBlur = particle.size * 4
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * 1.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Core particle
        ctx.save()
        ctx.globalAlpha = particle.opacity
        ctx.fillStyle = particle.color
        ctx.shadowColor = particle.color
        ctx.shadowBlur = particle.size
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      return updatedParticles
    })

    // Draw nodes with enhanced visual effects
    scaledNodes.forEach(node => {
      const isActive = activeNodes.has(node.id)
      const load = nodeLoads.get(node.id) || 0
      const pulseIntensity = isActive ? Math.sin(time * 4) * 0.3 + 0.7 : 0.4 + load * 0.4
      
      // Dynamic outer glow based on activity
      ctx.save()
      ctx.globalAlpha = pulseIntensity * 0.4
      ctx.fillStyle = node.color
      ctx.shadowColor = node.color
      ctx.shadowBlur = node.radius * (1 + load)
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius * (1.5 + load * 0.5), 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Main node with load-based fill
      ctx.save()
      ctx.globalAlpha = 0.15 + load * 0.25
      ctx.fillStyle = node.color
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // Animated border
      ctx.save()
      ctx.strokeStyle = node.color
      ctx.lineWidth = 2 + load * 2
      ctx.globalAlpha = pulseIntensity
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()

      // Load indicator (inner circle)
      if (load > 0.1) {
        ctx.save()
        ctx.fillStyle = node.color
        ctx.globalAlpha = load * 0.6
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius * load * 0.7, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // High-quality node label with optimized font rendering
      ctx.save()
      ctx.fillStyle = '#F8F8F2'
      
      // Use consistent font size to prevent re-rasterization
      const fontSize = Math.round((13 + Math.min(load * 2, 4)) * pixelRatio) / pixelRatio
      ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      
      // Optimize text rendering
      ctx.globalAlpha = Math.min(1, 0.85 + load * 0.15)
      
      // Pixel-perfect text positioning
      const textX = Math.round(node.x * pixelRatio) / pixelRatio
      const textY = Math.round((node.y + node.radius + 16) * pixelRatio) / pixelRatio
      
      // Add subtle text shadow for better readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)'
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = pixelRatio * 0.5
      ctx.shadowBlur = pixelRatio * 2
      
      ctx.fillText(node.label, textX, textY)
      ctx.restore()
    })

    animationRef.current = requestAnimationFrame(animate)
  }, [flowParticles, activeNodes, nodeLoads, createParticle, canvasDimensions, setupCanvas, scaledNodes])

  // Canvas initialization with high-DPI support
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    // Get device pixel ratio for high-DPI displays
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 3) // Cap at 3x for performance
    
    // Calculate optimal dimensions based on container
    const containerRect = container.getBoundingClientRect()
    const displayWidth = Math.floor(containerRect.width)
    const displayHeight = Math.floor(containerRect.height || 384) // 96 * 4 = 384px fallback
    
    // Set actual canvas size (accounting for pixel ratio)
    const actualWidth = Math.floor(displayWidth * pixelRatio)
    const actualHeight = Math.floor(displayHeight * pixelRatio)
    
    // Update canvas properties
    canvas.width = actualWidth
    canvas.height = actualHeight
    
    // Set display size via CSS (this is what users see)
    canvas.style.width = `${displayWidth}px`
    canvas.style.height = `${displayHeight}px`
    
    // Update state for animation loop
    setCanvasDimensions({
      width: actualWidth,
      height: actualHeight,
      pixelRatio
    })

    // Scale nodes to new dimensions without mutating original
    const scaleX = actualWidth / 520
    const scaleY = actualHeight / 360
    
    const newScaledNodes = nodes.map(node => ({
      ...node,
      x: node.x * scaleX,
      y: node.y * scaleY,
      radius: node.radius * Math.min(scaleX, scaleY)
    }))
    
    setScaledNodes(newScaledNodes)
  }, [nodes])

  // Enhanced easing functions
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  // Initialize scaled nodes from base nodes
  useEffect(() => {
    if (scaledNodes.length === 0) {
      setScaledNodes(nodes)
    }
  }, [scaledNodes.length])

  // Resize handler for responsive canvas
  useEffect(() => {
    const handleResize = () => {
      if (isVisible) {
        initializeCanvas()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isVisible, initializeCanvas])

  // Initialize particles and animation with sophisticated sequencing
  useEffect(() => {
    if (!isVisible) return

    // Initialize canvas first
    initializeCanvas()

    // Phase 1: Loading animation
    setAnimationPhase('loading')
    
    // Start background animation after canvas setup
    setTimeout(() => {
      animationRef.current = requestAnimationFrame(animate)
    }, 50)

    // Phase 2: Sequential node activation with timing
    const activationSequence = [
      { id: 'intake', delay: 500 },
      { id: 'validation', delay: 800 },
      { id: 'inventory', delay: 1200 },
      { id: 'processing', delay: 1600 },
      { id: 'engraving', delay: 2000 },
      { id: 'assembly', delay: 2400 },
      { id: 'qa', delay: 2800 },
      { id: 'shipping', delay: 3200 },
      { id: 'delivery', delay: 3600 }
    ]

    activationSequence.forEach(({ id, delay }) => {
      setTimeout(() => {
        setActiveNodes(prev => new Set([...Array.from(prev), id]))
      }, delay)
    })

    // Phase 3: Particle system initialization
    setTimeout(() => {
      setAnimationPhase('active')
      
      // Create initial particle burst
      for (let i = 0; i < 12; i++) {
        setTimeout(() => {
          setFlowParticles(prev => [...prev, createParticle()])
        }, i * 400)
      }
    }, 2000)

    // Phase 4: Full system activation
    setTimeout(() => {
      setAnimationPhase('complete')
    }, 5000)

    // Continuous particle generation
    const particleInterval = setInterval(() => {
      if (flowParticles.length < 15) {
        setFlowParticles(prev => [...prev, createParticle()])
      }
    }, 1200)

    // Performance metrics cycling
    const metricInterval = setInterval(() => {
      setCurrentMetric(prev => (prev + 1) % performanceMetrics.length)
    }, 4000)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      clearInterval(particleInterval)
      clearInterval(metricInterval)
    }
  }, [isVisible, animate, createParticle, flowParticles.length, performanceMetrics.length, initializeCanvas])

  // Intersection observer for visibility detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
        if (entry.isIntersecting) {
          // Reset animation state when coming into view
          setActiveNodes(new Set())
          setFlowParticles([])
          setAnimationPhase('loading')
        }
      },
      { threshold: 0.1 }
    )

    const canvas = canvasRef.current
    if (canvas) {
      observer.observe(canvas)
    }

    return () => {
      if (canvas) {
        observer.unobserve(canvas)
      }
    }
  }, [])

  const currentMetricData = performanceMetrics[currentMetric]

  return (
    <div className="relative">
      {/* System Status Banner */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-[#3FD3C6] text-sm font-mono">
          SYSTEM_STATUS: {animationPhase.toUpperCase()}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[#415A77] text-xs">NODES ACTIVE</div>
          <div className="text-[#F8F8F2] font-mono">{activeNodes.size}/{scaledNodes.length}</div>
        </div>
      </div>

      {/* Main Visualization Container */}
      <div className="bg-[#1B263B]/30 border border-[#415A77]/30 p-8 mb-8 relative overflow-hidden">
        {/* Loading overlay */}
        {animationPhase === 'loading' && (
          <div className="absolute inset-0 bg-[#0D1B2A]/50 flex items-center justify-center z-10">
            <div className="text-[#3FD3C6] text-sm font-mono animate-pulse">
              INITIALIZING AUTOMATION PIPELINE...
            </div>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          className="block w-full h-96 max-w-full"
          style={{ 
            background: 'radial-gradient(ellipse at center, rgba(13, 27, 42, 0.8) 0%, rgba(13, 27, 42, 1) 100%)',
            imageRendering: '-moz-crisp-edges',
          } as React.CSSProperties & { imageRendering?: string }}
        />

        {/* Real-time particle count */}
        <div className="absolute top-4 right-4 text-[#415A77] text-xs font-mono">
          PARTICLES: {flowParticles.length}
        </div>
      </div>

      {/* Enhanced Performance Metrics Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transformation Impact */}
        <div className="bg-[#0D1B2A]/50 border border-[#415A77]/30 p-6 relative overflow-hidden">
          {/* Animated background */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              background: `linear-gradient(45deg, transparent 30%, ${currentMetricData.improvement === 'increase' ? '#3FD3C6' : '#E84855'} 70%)`,
              transform: `translateX(${Math.sin(Date.now() * 0.001) * 10}px)`
            }}
          />
          
          <div className="relative z-10">
            <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Transformation Impact</span>
              <div className="flex space-x-1">
                {performanceMetrics.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-1 ${index === currentMetric ? 'bg-[#3FD3C6]' : 'bg-[#415A77]'} transition-colors duration-300`}
                  />
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#415A77] text-sm">Before</span>
                <span className="text-[#E84855] font-mono text-lg">{currentMetricData.before}</span>
              </div>
              
              {/* Animated transformation line */}
              <div className="relative h-px">
                <div className="absolute inset-0 bg-gradient-to-r from-[#E84855] to-[#3FD3C6]"></div>
                <div 
                  className="absolute h-full w-2 bg-[#F8F8F2] opacity-80"
                  style={{
                    left: `${(Math.sin(Date.now() * 0.003) + 1) * 50}%`,
                    transition: 'left 100ms ease-out'
                  }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-[#415A77] text-sm">After</span>
                <span className="text-[#3FD3C6] font-mono text-lg">{currentMetricData.after}</span>
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <div className="text-[#F8F8F2] text-3xl font-light mb-1">
                {currentMetricData.value}{currentMetricData.unit}
              </div>
              <div className="text-[#415A77] text-sm">
                {currentMetricData.label} {currentMetricData.improvement}
              </div>
            </div>
          </div>
        </div>

        {/* System Telemetry */}
        <div className="bg-[#0D1B2A]/50 border border-[#415A77]/30 p-6">
          <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4">
            System Telemetry
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#415A77] text-sm">Pipeline Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#3FD3C6] animate-pulse"></div>
                <span className="text-[#3FD3C6] text-sm">OPERATIONAL</span>
              </div>
            </div>
            
            <div className="flex justify-between">
              <span className="text-[#415A77] text-sm">Throughput</span>
              <span className="text-[#3FD3C6]">
                {Math.floor(95 + Math.sin(Date.now() * 0.002) * 4)}%
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-[#415A77] text-sm">Efficiency</span>
              <span className="text-[#3FD3C6]">
                {animationPhase === 'complete' ? 'OPTIMIZED' : 'CALIBRATING'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-[#415A77] text-sm">Data Flow</span>
              <span className="text-[#DAA520]">{flowParticles.length} streams</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-[#415A77] text-sm">Latency</span>
              <span className="text-[#3FD3C6]">
                {Math.floor(120 + Math.sin(Date.now() * 0.001) * 30)}ms
              </span>
            </div>
          </div>
          
          {/* Node activity indicators */}
          <div className="mt-6">
            <div className="text-[#415A77] text-xs uppercase tracking-wider mb-3">Node Activity</div>
            <div className="grid grid-cols-3 gap-2">
              {scaledNodes.slice(0, 9).map((node, index) => (
                <div
                  key={node.id}
                  className="flex items-center gap-2 text-xs"
                >
                  <div 
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      activeNodes.has(node.id) 
                        ? 'bg-[#3FD3C6] animate-pulse' 
                        : 'bg-[#415A77]'
                    }`}
                  />
                  <span className="text-[#415A77] truncate">{node.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Performance Summary */}
      <div className="mt-6 bg-[#1B263B]/20 border border-[#415A77]/20 p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-[#415A77]">
            Automation reduces manual processing from <span className="text-[#E84855]">45+ minutes</span> to{' '}
            <span className="text-[#3FD3C6]">&lt;1 minute</span> per item
          </div>
          <div className="text-[#3FD3C6] font-mono">
            {animationPhase === 'complete' ? 'READY FOR SCALE' : 'OPTIMIZING...'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArchitectureVisualization