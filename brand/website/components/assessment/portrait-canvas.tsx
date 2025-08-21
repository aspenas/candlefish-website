'use client'

import { useEffect, useRef } from 'react'
import type { OperationalPortrait } from '@/types/assessment'

interface OperationalPortraitCanvasProps {
  portrait: OperationalPortrait
}

export const OperationalPortraitCanvas = ({ portrait }: OperationalPortraitCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)

    const width = canvas.offsetWidth
    const height = canvas.offsetHeight
    const centerX = width / 2
    const centerY = height / 2

    let rotation = 0
    let pulsePhase = 0

    const draw = () => {
      // Clear canvas
      ctx.fillStyle = '#0D1B2A'
      ctx.fillRect(0, 0, width, height)

      // Create gradient background
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 200)
      gradient.addColorStop(0, 'rgba(63, 211, 198, 0.05)')
      gradient.addColorStop(1, 'rgba(13, 27, 42, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Draw operational signature shape
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(rotation)

      // Create unique shape based on dimensions
      ctx.beginPath()
      ctx.strokeStyle = portrait.color
      ctx.lineWidth = 2
      ctx.fillStyle = `${portrait.color}20`

      const points = portrait.dimensions.length
      const angleStep = (Math.PI * 2) / points

      portrait.dimensions.forEach((dim, idx) => {
        const angle = angleStep * idx
        const radius = 50 + (dim.score / 4) * 100 + Math.sin(pulsePhase + idx) * 5
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius

        if (idx === 0) {
          ctx.moveTo(x, y)
        } else {
          // Create curved connections
          const prevAngle = angleStep * (idx - 1)
          const prevRadius = 50 + (portrait.dimensions[idx - 1].score / 4) * 100 + Math.sin(pulsePhase + idx - 1) * 5
          const prevX = Math.cos(prevAngle) * prevRadius
          const prevY = Math.sin(prevAngle) * prevRadius

          const cpX = (prevX + x) / 2
          const cpY = (prevY + y) / 2

          ctx.quadraticCurveTo(cpX * 0.8, cpY * 0.8, x, y)
        }
      })

      // Close the shape
      const firstAngle = 0
      const firstRadius = 50 + (portrait.dimensions[0].score / 4) * 100 + Math.sin(pulsePhase) * 5
      const firstX = Math.cos(firstAngle) * firstRadius
      const firstY = Math.sin(firstAngle) * firstRadius

      const lastIdx = portrait.dimensions.length - 1
      const lastAngle = angleStep * lastIdx
      const lastRadius = 50 + (portrait.dimensions[lastIdx].score / 4) * 100 + Math.sin(pulsePhase + lastIdx) * 5
      const lastX = Math.cos(lastAngle) * lastRadius
      const lastY = Math.sin(lastAngle) * lastRadius

      const cpX = (lastX + firstX) / 2
      const cpY = (lastY + firstY) / 2

      ctx.quadraticCurveTo(cpX * 0.8, cpY * 0.8, firstX, firstY)

      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Draw inner rings
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath()
        ctx.strokeStyle = `${portrait.color}${(20 - i * 5).toString(16).padStart(2, '0')}`
        ctx.lineWidth = 0.5

        portrait.dimensions.forEach((dim, idx) => {
          const angle = angleStep * idx
          const radius = (50 + (dim.score / 4) * 100) * (i / 4)
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius

          if (idx === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })

        ctx.closePath()
        ctx.stroke()
      }

      // Draw connecting lines to center
      portrait.dimensions.forEach((dim, idx) => {
        const angle = angleStep * idx
        const radius = 50 + (dim.score / 4) * 100
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius

        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(x, y)
        ctx.strokeStyle = `${portrait.color}10`
        ctx.lineWidth = 0.5
        ctx.stroke()
      })

      // Draw center point
      ctx.beginPath()
      ctx.arc(0, 0, 8 + Math.sin(pulsePhase * 2) * 2, 0, Math.PI * 2)
      ctx.fillStyle = portrait.color
      ctx.fill()

      ctx.restore()

      // Draw signature text
      ctx.fillStyle = '#415A77'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`Signature: ${portrait.signature}`, centerX, height - 20)

      // Update animation values
      rotation += 0.001
      pulsePhase += 0.02

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [portrait])

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: '400px' }}
      />

      {/* Pattern Label */}
      <div className="absolute top-4 left-4 bg-[#0D1B2A]/80 backdrop-blur-sm px-3 py-1 rounded">
        <p className="text-xs text-[#415A77] uppercase tracking-wider">Pattern</p>
        <p className="text-[#3FD3C6] font-light capitalize">{portrait.pattern}</p>
      </div>
    </div>
  )
}
