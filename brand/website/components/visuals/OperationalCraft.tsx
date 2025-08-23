'use client'

import React, { useEffect, useRef, useState } from 'react'

export default function OperationalCraft() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 400, height: 200 })
  const animationRef = useRef<number>()
  const timeRef = useRef(0)

  useEffect(() => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas resolution for retina displays
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = dimensions.width * dpr
    canvas.height = dimensions.height * dpr
    ctx.scale(dpr, dpr)

    // Craft-inspired elements: threads of operation connecting nodes
    const nodes: Array<{x: number, y: number, vx: number, vy: number, connections: number[]}> = []
    const numNodes = 8

    // Initialize nodes in an organic pattern
    for (let i = 0; i < numNodes; i++) {
      const angle = (i / numNodes) * Math.PI * 2
      const radius = 60 + Math.random() * 40
      nodes.push({
        x: dimensions.width / 2 + Math.cos(angle) * radius,
        y: dimensions.height / 2 + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        connections: []
      })
    }

    // Create connections (like a constellation or circuit diagram)
    nodes.forEach((node, i) => {
      const numConnections = 2 + Math.floor(Math.random() * 2)
      for (let j = 0; j < numConnections; j++) {
        const targetIndex = (i + 1 + Math.floor(Math.random() * (numNodes - 1))) % numNodes
        if (!node.connections.includes(targetIndex)) {
          node.connections.push(targetIndex)
        }
      }
    })

    const animate = () => {
      timeRef.current += 0.01

      // Clear with subtle fade effect
      ctx.fillStyle = 'rgba(27, 38, 59, 0.05)'
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)

      // Update node positions (subtle floating motion)
      nodes.forEach((node) => {
        // Add gentle oscillation
        node.x += node.vx + Math.sin(timeRef.current + node.y * 0.01) * 0.1
        node.y += node.vy + Math.cos(timeRef.current + node.x * 0.01) * 0.1

        // Soft boundaries with organic bounce
        const margin = 50
        if (node.x < margin || node.x > dimensions.width - margin) {
          node.vx *= -0.8
          node.x = Math.max(margin, Math.min(dimensions.width - margin, node.x))
        }
        if (node.y < margin || node.y > dimensions.height - margin) {
          node.vy *= -0.8
          node.y = Math.max(margin, Math.min(dimensions.height - margin, node.y))
        }
      })

      // Draw connections as flowing energy paths
      ctx.strokeStyle = 'rgba(63, 211, 198, 0.15)'
      ctx.lineWidth = 1

      nodes.forEach((node, i) => {
        node.connections.forEach((targetIndex) => {
          const target = nodes[targetIndex]

          // Calculate pulse along the connection
          const pulse = (Math.sin(timeRef.current * 2 + i) + 1) / 2

          ctx.beginPath()
          ctx.moveTo(node.x, node.y)

          // Create a curved path (bezier) for more organic feel
          const midX = (node.x + target.x) / 2
          const midY = (node.y + target.y) / 2
          const offsetX = Math.sin(timeRef.current + i) * 20
          const offsetY = Math.cos(timeRef.current + i) * 20

          ctx.quadraticCurveTo(
            midX + offsetX,
            midY + offsetY,
            target.x,
            target.y
          )

          // Gradient along the path (simulated with opacity)
          ctx.strokeStyle = `rgba(63, 211, 198, ${0.1 + pulse * 0.2})`
          ctx.stroke()

          // Draw energy packets moving along connections
          if (pulse > 0.8) {
            const t = ((timeRef.current * 0.5 + i) % 1)
            const packetX = node.x * (1 - t) + target.x * t
            const packetY = node.y * (1 - t) + target.y * t

            ctx.beginPath()
            ctx.arc(packetX, packetY, 2, 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(63, 211, 198, 0.6)'
            ctx.fill()
          }
        })
      })

      // Draw nodes as precision points
      nodes.forEach((node, i) => {
        const nodeActivity = (Math.sin(timeRef.current * 3 + i * 0.5) + 1) / 2

        // Outer glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 15)
        gradient.addColorStop(0, `rgba(63, 211, 198, ${0.3 * nodeActivity})`)
        gradient.addColorStop(1, 'rgba(63, 211, 198, 0)')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, 15, 0, Math.PI * 2)
        ctx.fill()

        // Core node
        ctx.beginPath()
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(248, 248, 242, ${0.6 + nodeActivity * 0.4})`
        ctx.fill()

        // Inner detail
        ctx.beginPath()
        ctx.arc(node.x, node.y, 1, 0, Math.PI * 2)
        ctx.fillStyle = '#3FD3C6'
        ctx.fill()
      })

      // Add subtle grid overlay for technical precision feel
      ctx.strokeStyle = 'rgba(65, 90, 119, 0.05)'
      ctx.lineWidth = 0.5
      const gridSize = 20

      for (let x = 0; x < dimensions.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, dimensions.height)
        ctx.stroke()
      }

      for (let y = 0; y < dimensions.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(dimensions.width, y)
        ctx.stroke()
      }

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
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          opacity: 0.9
        }}
      />
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
        <div className="text-xs text-[#415A77] font-mono">
          OPERATIONAL MATRIX
        </div>
        <div className="text-xs text-[#3FD3C6] font-mono">
          PRECISION MODE
        </div>
      </div>
    </div>
  )
}
