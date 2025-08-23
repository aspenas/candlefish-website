'use client'

import React, { useEffect, useRef } from 'react'
import { ArchitectureNode, ArchitectureLink } from '../../lib/workshop/types'

interface Props {
  nodes: ArchitectureNode[]
  links: ArchitectureLink[]
  width?: number
  height?: number
}

export default function ArchitectureVisualization({ 
  nodes, 
  links,
  width = 800,
  height = 400
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  
  // Position nodes in a force-directed layout
  const positionNodes = (nodes: ArchitectureNode[]) => {
    const positioned: any[] = []
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) * 0.3
    
    // Group nodes by kind
    const groups: { [key: string]: ArchitectureNode[] } = {}
    nodes.forEach(node => {
      if (!groups[node.kind]) groups[node.kind] = []
      groups[node.kind].push(node)
    })
    
    // Position each group
    const kinds = Object.keys(groups)
    kinds.forEach((kind, kindIndex) => {
      const angleStep = (Math.PI * 2) / kinds.length
      const baseAngle = angleStep * kindIndex
      
      groups[kind].forEach((node, nodeIndex) => {
        const nodeAngle = baseAngle + (nodeIndex * 0.2) - (groups[kind].length * 0.1)
        const nodeRadius = radius + (nodeIndex * 20)
        
        positioned.push({
          ...node,
          x: centerX + Math.cos(nodeAngle) * nodeRadius,
          y: centerY + Math.sin(nodeAngle) * nodeRadius,
          radius: 8,
          color: getNodeColor(node.kind)
        })
      })
    })
    
    return positioned
  }
  
  const getNodeColor = (kind: string) => {
    switch (kind) {
      case 'source': return '#3FD3C6'
      case 'service': return '#6666ff'
      case 'database': return '#ff9944'
      case 'ui': return '#44ff44'
      case 'machine': return '#ff4444'
      case 'integration': return '#ffff00'
      default: return '#888888'
    }
  }
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size
    canvas.width = width
    canvas.height = height
    
    const positionedNodes = positionNodes(nodes)
    let time = 0
    
    const draw = () => {
      // Clear canvas
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, width, height)
      
      // Draw links
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 1
      links.forEach(link => {
        const source = positionedNodes.find(n => n.id === link.source)
        const target = positionedNodes.find(n => n.id === link.target)
        
        if (source && target) {
          ctx.beginPath()
          ctx.moveTo(source.x, source.y)
          
          // Add slight curve to links
          const midX = (source.x + target.x) / 2
          const midY = (source.y + target.y) / 2
          const offset = Math.sin(time * 0.001) * 10
          
          ctx.quadraticCurveTo(
            midX + offset,
            midY - offset,
            target.x,
            target.y
          )
          ctx.stroke()
          
          // Draw link label if present
          if (link.label) {
            ctx.fillStyle = '#666'
            ctx.font = '10px monospace'
            ctx.fillText(link.label, midX, midY - 10)
          }
        }
      })
      
      // Draw nodes
      positionedNodes.forEach((node, index) => {
        const pulse = Math.sin(time * 0.002 + index) * 0.2 + 1
        
        // Node glow
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.radius * 2 * pulse
        )
        gradient.addColorStop(0, node.color + '40')
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius * 2 * pulse, 0, Math.PI * 2)
        ctx.fill()
        
        // Node circle
        ctx.fillStyle = node.color
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
        ctx.fill()
        
        // Node label
        ctx.fillStyle = '#d4d4d4'
        ctx.font = '11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(node.label, node.x, node.y + node.radius + 15)
      })
      
      time += 16
      animationRef.current = requestAnimationFrame(draw)
    }
    
    draw()
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [nodes, links, width, height])
  
  return (
    <div className="relative">
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ maxWidth: width, maxHeight: height }}
        aria-label="Architecture diagram showing system components and their connections"
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 text-xs space-y-1 bg-[#0a0a0a]/80 p-3 rounded">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#3FD3C6]" />
          <span className="text-[#666]">Source</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#6666ff]" />
          <span className="text-[#666]">Service</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff9944]" />
          <span className="text-[#666]">Database</span>
        </div>
      </div>
    </div>
  )
}