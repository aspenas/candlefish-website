'use client'

import React, { useEffect, useRef } from 'react'
import { WorkshopMetrics } from '../../lib/workshop/types'

interface Props {
  metrics: WorkshopMetrics
  height?: number
}

export default function TelemetryChart({ metrics, height = 60 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Get container width
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = height
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    
    // Convert metrics to normalized values
    const values = Object.entries(metrics)
      .filter(([_, v]) => typeof v === 'number')
      .map(([_, v]) => v as number)
    
    if (values.length === 0) return
    
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    const range = maxValue - minValue || 1
    
    const normalizedValues = values.map(v => 
      (v - minValue) / range
    )
    
    let time = 0
    const history: number[][] = []
    const maxHistory = 100
    
    const draw = () => {
      const width = canvas.width
      
      // Clear canvas
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, width, height)
      
      // Generate new values with slight variation
      const newValues = normalizedValues.map((v, i) => {
        const variation = Math.sin(time * 0.001 + i) * 0.05
        return Math.max(0, Math.min(1, v + variation))
      })
      
      history.push(newValues)
      if (history.length > maxHistory) {
        history.shift()
      }
      
      // Draw telemetry lines
      const stepX = width / maxHistory
      
      normalizedValues.forEach((_, valueIndex) => {
        ctx.strokeStyle = `hsl(${170 + valueIndex * 30}, 70%, 50%)`
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.6
        
        ctx.beginPath()
        history.forEach((histValues, histIndex) => {
          const x = histIndex * stepX
          const y = height - (histValues[valueIndex] * height * 0.8) - height * 0.1
          
          if (histIndex === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        ctx.stroke()
      })
      
      // Draw subtle grid
      ctx.globalAlpha = 0.1
      ctx.strokeStyle = '#3FD3C6'
      ctx.lineWidth = 0.5
      
      // Horizontal lines
      for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      
      ctx.globalAlpha = 1
      
      time += 16
      animationRef.current = requestAnimationFrame(draw)
    }
    
    draw()
    
    return () => {
      window.removeEventListener('resize', updateSize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [metrics, height])
  
  // Check for prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  
  if (prefersReducedMotion) {
    // Static visualization for reduced motion
    return (
      <div className="h-[60px] bg-[#0a0a0a] border border-[#333] rounded flex items-center justify-center">
        <div className="flex gap-4">
          {Object.entries(metrics)
            .filter(([_, v]) => typeof v === 'number')
            .slice(0, 4)
            .map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="text-xs text-[#666]">{key.replace(/_/g, ' ')}</div>
                <div className="text-sm text-[#3FD3C6]">{value}</div>
              </div>
            ))}
        </div>
      </div>
    )
  }
  
  return (
    <canvas 
      ref={canvasRef}
      className="w-full rounded"
      style={{ height }}
      aria-label="Real-time telemetry visualization"
      role="img"
    />
  )
}