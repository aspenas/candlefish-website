'use client'

import React, { useEffect, useRef, useState } from 'react'

interface Layer {
  name: string
  color: string
  nodes: Array<{
    label: string
    x: number
    y: number
    connections: number[]
  }>
}

export default function SystemArchitectureFlow() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions] = useState({ width: 600, height: 400 })
  const animationRef = useRef<number>()
  const timeRef = useRef(0)
  const particlesRef = useRef<Array<{x: number, y: number, targetX: number, targetY: number, speed: number, trail: Array<{x: number, y: number}>}>>([])

  useEffect(() => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas resolution
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = dimensions.width * dpr
    canvas.height = dimensions.height * dpr
    ctx.scale(dpr, dpr)

    // Architecture layers - representing the engraving automation flow
    const layers: Layer[] = [
      {
        name: 'INPUT',
        color: '#DAA520',
        nodes: [
          { label: 'Customer Files', x: 100, y: 100, connections: [3, 4] },
          { label: 'Order Data', x: 100, y: 200, connections: [4] },
          { label: 'Design Specs', x: 100, y: 300, connections: [4, 5] }
        ]
      },
      {
        name: 'PROCESSING',
        color: '#3FD3C6',
        nodes: [
          { label: 'AI Parser', x: 300, y: 150, connections: [6] },
          { label: 'Pattern Recognition', x: 300, y: 250, connections: [6, 7] }
        ]
      },
      {
        name: 'OUTPUT',
        color: '#F8F8F2',
        nodes: [
          { label: 'Corel Draw', x: 500, y: 200, connections: [] },
          { label: 'Quality Check', x: 500, y: 300, connections: [] }
        ]
      }
    ]

    // Flatten all nodes for easier access
    const allNodes = layers.flatMap(layer => layer.nodes)

    // Initialize particles for data flow
    const initParticles = () => {
      particlesRef.current = []
      // Create particles that flow through the system
      for (let i = 0; i < 15; i++) {
        setTimeout(() => {
          const startNode = allNodes[Math.floor(Math.random() * 3)] // Start from input nodes
          particlesRef.current.push({
            x: startNode.x,
            y: startNode.y,
            targetX: 500,
            targetY: 200 + Math.random() * 100,
            speed: 0.5 + Math.random() * 1,
            trail: []
          })
        }, i * 300)
      }
    }

    initParticles()

    const animate = () => {
      timeRef.current += 0.015

      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(27, 38, 59, 0.92)'
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)

      // Draw background grid
      ctx.strokeStyle = 'rgba(65, 90, 119, 0.1)'
      ctx.lineWidth = 0.5
      const gridSize = 30

      for (let x = 0; x <= dimensions.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, dimensions.height)
        ctx.stroke()
      }

      for (let y = 0; y <= dimensions.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(dimensions.width, y)
        ctx.stroke()
      }

      // Draw layer zones
      layers.forEach((layer, layerIndex) => {
        const x = layerIndex * 200
        const width = 180

        // Layer background
        ctx.fillStyle = `${layer.color}05`
        ctx.fillRect(x, 0, width, dimensions.height)

        // Layer label
        ctx.save()
        ctx.translate(x + 20, dimensions.height / 2)
        ctx.rotate(-Math.PI / 2)
        ctx.fillStyle = `${layer.color}40`
        ctx.font = '10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(layer.name, 0, 0)
        ctx.restore()
      })

      // Draw connections
      layers.forEach((layer) => {
        layer.nodes.forEach((node, nodeIndex) => {
          node.connections.forEach(targetIndex => {
            if (targetIndex < allNodes.length) {
              const target = allNodes[targetIndex]

              // Animated pulse along connection
              const pulse = (Math.sin(timeRef.current * 2 + nodeIndex) + 1) / 2

              ctx.beginPath()
              ctx.moveTo(node.x, node.y)

              // Create curved path
              const controlX = (node.x + target.x) / 2
              const controlY = (node.y + target.y) / 2 + Math.sin(timeRef.current + nodeIndex) * 10

              ctx.quadraticCurveTo(controlX, controlY, target.x, target.y)

              // Gradient stroke
              const gradient = ctx.createLinearGradient(node.x, node.y, target.x, target.y)
              gradient.addColorStop(0, `${layer.color}20`)
              gradient.addColorStop(0.5, `${layer.color}${Math.floor(30 + pulse * 20).toString(16)}`)
              gradient.addColorStop(1, `${layer.color}10`)

              ctx.strokeStyle = gradient
              ctx.lineWidth = 1 + pulse
              ctx.stroke()
            }
          })
        })
      })

      // Draw nodes
      layers.forEach((layer, layerIndex) => {
        layer.nodes.forEach((node, nodeIndex) => {
          const nodeActivity = (Math.sin(timeRef.current * 3 + layerIndex + nodeIndex) + 1) / 2

          // Node glow
          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 20)
          gradient.addColorStop(0, `${layer.color}${Math.floor(20 * nodeActivity).toString(16)}`)
          gradient.addColorStop(1, `${layer.color}00`)
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(node.x, node.y, 20, 0, Math.PI * 2)
          ctx.fill()

          // Node core
          ctx.beginPath()
          ctx.arc(node.x, node.y, 4 + nodeActivity * 2, 0, Math.PI * 2)
          ctx.fillStyle = layer.color
          ctx.fill()

          // Node ring
          ctx.beginPath()
          ctx.arc(node.x, node.y, 8 + nodeActivity * 4, 0, Math.PI * 2)
          ctx.strokeStyle = `${layer.color}60`
          ctx.lineWidth = 0.5
          ctx.stroke()

          // Node label
          ctx.fillStyle = `${layer.color}CC`
          ctx.font = '9px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(node.label, node.x, node.y + 25)
        })
      })

      // Update and draw particles (data flowing through system)
      particlesRef.current = particlesRef.current.filter(particle => {
        // Update trail
        particle.trail.push({ x: particle.x, y: particle.y })
        if (particle.trail.length > 15) {
          particle.trail.shift()
        }

        // Draw trail
        particle.trail.forEach((point, i) => {
          const alpha = (i / particle.trail.length) * 0.3
          ctx.fillStyle = `rgba(63, 211, 198, ${alpha})`
          ctx.beginPath()
          ctx.arc(point.x, point.y, 1, 0, Math.PI * 2)
          ctx.fill()
        })

        // Move particle
        const dx = particle.targetX - particle.x
        const dy = particle.targetY - particle.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance > 5) {
          particle.x += (dx / distance) * particle.speed * 2
          particle.y += (dy / distance) * particle.speed * 2

          // Draw particle
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2)
          ctx.fillStyle = '#3FD3C6'
          ctx.fill()

          // Particle glow
          const glow = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, 6)
          glow.addColorStop(0, 'rgba(63, 211, 198, 0.4)')
          glow.addColorStop(1, 'rgba(63, 211, 198, 0)')
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, 6, 0, Math.PI * 2)
          ctx.fill()

          return true
        } else {
          // Particle reached destination, respawn
          const startNode = allNodes[Math.floor(Math.random() * 3)]
          particle.x = startNode.x
          particle.y = startNode.y
          particle.targetX = 500
          particle.targetY = 200 + Math.random() * 100
          particle.trail = []
          return true
        }
      })

      // Draw status text
      ctx.fillStyle = '#3FD3C6'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('ENGRAVING AUTOMATION PIPELINE', 10, 20)

      ctx.fillStyle = '#415A77'
      ctx.textAlign = 'right'
      ctx.fillText(`Processing: ${Math.floor((Math.sin(timeRef.current) + 1) * 138)} items/min`, dimensions.width - 10, 20)

      // Performance metrics
      const efficiency = 94 + Math.sin(timeRef.current * 0.5) * 2
      ctx.fillStyle = '#DAA520'
      ctx.textAlign = 'right'
      ctx.fillText(`Efficiency: ${efficiency.toFixed(1)}%`, dimensions.width - 10, dimensions.height - 10)

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [dimensions])

  return (
    <div className="relative w-full h-full bg-[#1B263B]/20">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          width: dimensions.width,
          height: dimensions.height
        }}
      />
    </div>
  )
}
