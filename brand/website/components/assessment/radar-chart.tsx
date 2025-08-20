import { useEffect, useRef } from 'react'
import type { DimensionScore } from '@/types/assessment'

interface DimensionalRadarChartProps {
  dimensions: DimensionScore[]
  industry?: number[]
}

export const DimensionalRadarChart = ({ dimensions, industry }: DimensionalRadarChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    
    const canvas = canvasRef.current
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 60
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw background circles
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath()
      ctx.strokeStyle = '#415A77'
      ctx.lineWidth = 0.5
      ctx.globalAlpha = 0.3
      
      for (let j = 0; j < dimensions.length; j++) {
        const angle = (j * 2 * Math.PI) / dimensions.length - Math.PI / 2
        const x = centerX + (radius * i / 4) * Math.cos(angle)
        const y = centerY + (radius * i / 4) * Math.sin(angle)
        
        if (j === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      
      ctx.closePath()
      ctx.stroke()
    }
    
    ctx.globalAlpha = 1
    
    // Draw axes
    dimensions.forEach((dim, idx) => {
      const angle = (idx * 2 * Math.PI) / dimensions.length - Math.PI / 2
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      
      // Draw axis line
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(x, y)
      ctx.strokeStyle = '#415A77'
      ctx.lineWidth = 0.5
      ctx.stroke()
      
      // Draw labels
      ctx.fillStyle = '#E0E1DD'
      ctx.font = '11px system-ui'
      
      // Calculate text position
      const labelRadius = radius + 20
      const labelX = centerX + labelRadius * Math.cos(angle)
      const labelY = centerY + labelRadius * Math.sin(angle)
      
      // Adjust text alignment based on position
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      
      // Split long labels
      const words = dim.name.split(' ')
      if (words.length > 1) {
        const mid = Math.ceil(words.length / 2)
        const line1 = words.slice(0, mid).join(' ')
        const line2 = words.slice(mid).join(' ')
        ctx.fillText(line1, labelX, labelY - 6)
        ctx.fillText(line2, labelX, labelY + 6)
      } else {
        ctx.fillText(dim.name, labelX, labelY)
      }
    })
    
    // Draw industry comparison if provided
    if (industry && industry.length === dimensions.length) {
      ctx.beginPath()
      ctx.strokeStyle = '#E84855'
      ctx.fillStyle = 'rgba(232, 72, 85, 0.1)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 5])
      
      industry.forEach((value, idx) => {
        const angle = (idx * 2 * Math.PI) / industry.length - Math.PI / 2
        const normalizedValue = Math.min(value, 4) / 4
        const x = centerX + radius * normalizedValue * Math.cos(angle)
        const y = centerY + radius * normalizedValue * Math.sin(angle)
        
        if (idx === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      
      ctx.closePath()
      ctx.stroke()
      ctx.fill()
      ctx.setLineDash([])
    }
    
    // Draw user data
    ctx.beginPath()
    ctx.fillStyle = 'rgba(63, 211, 198, 0.2)'
    ctx.strokeStyle = '#3FD3C6'
    ctx.lineWidth = 2
    
    dimensions.forEach((dim, idx) => {
      const angle = (idx * 2 * Math.PI) / dimensions.length - Math.PI / 2
      const value = dim.rawScore / 4
      const x = centerX + radius * value * Math.cos(angle)
      const y = centerY + radius * value * Math.sin(angle)
      
      if (idx === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    
    // Draw data points
    dimensions.forEach((dim, idx) => {
      const angle = (idx * 2 * Math.PI) / dimensions.length - Math.PI / 2
      const value = dim.rawScore / 4
      const x = centerX + radius * value * Math.cos(angle)
      const y = centerY + radius * value * Math.sin(angle)
      
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fillStyle = '#3FD3C6'
      ctx.fill()
      ctx.strokeStyle = '#0D1B2A'
      ctx.lineWidth = 1
      ctx.stroke()
    })
    
  }, [dimensions, industry])
  
  return (
    <div className="relative bg-[#1C1C1C] p-8 rounded">
      <canvas 
        ref={canvasRef}
        width={600}
        height={600}
        className="w-full max-w-2xl mx-auto"
        style={{ maxHeight: '600px' }}
      />
      
      {/* Legend */}
      <div className="flex justify-center gap-8 mt-6">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[#3FD3C6] mr-2" />
          <span className="text-sm text-[#E0E1DD]">Your Operation</span>
        </div>
        {industry && (
          <div className="flex items-center">
            <div className="w-4 h-1 border-t-2 border-dashed border-[#E84855] mr-2" style={{ width: '16px' }} />
            <span className="text-sm text-[#E0E1DD]">Industry Average</span>
          </div>
        )}
      </div>
      
      {/* Score Scale */}
      <div className="flex justify-center gap-4 mt-4 text-xs text-[#415A77]">
        <span>0 - Ad-hoc</span>
        <span>1 - Scripted</span>
        <span>2 - Assisted</span>
        <span>3 - Orchestrated</span>
        <span>4 - Autonomous</span>
      </div>
    </div>
  )
}