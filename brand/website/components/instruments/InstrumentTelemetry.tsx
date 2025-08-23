'use client'

import React, { useEffect, useRef } from 'react'
import { InstrumentTelemetry } from '../../lib/instruments/types'

interface Props {
  telemetry: InstrumentTelemetry
  height?: number
  showLabels?: boolean
}

export default function InstrumentTelemetryChart({
  telemetry,
  height = 120,
  showLabels = true
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Update canvas size
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = height
    }

    updateSize()
    window.addEventListener('resize', updateSize)

    let offset = 0

    const draw = () => {
      const width = canvas.width
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, width, height)

      // Draw grid
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth = 0.5
      for (let i = 0; i <= 4; i++) {
        const y = (height / 4) * i
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Metrics to display
      const metrics = [
        { data: telemetry.throughput, color: '#3FD3C6', label: 'Throughput', scale: 1 },
        { data: telemetry.utilization, color: '#6666ff', label: 'CPU', scale: 0.01 },
        { data: telemetry.errorRate, color: '#ff4444', label: 'Errors', scale: 10 }
      ]

      const stepX = width / telemetry.throughput.length

      metrics.forEach((metric, metricIndex) => {
        ctx.strokeStyle = metric.color
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.8

        ctx.beginPath()
        metric.data.forEach((value, i) => {
          const x = i * stepX + (Math.sin(offset * 0.001) * 2)
          const normalizedValue = Math.min(1, value * metric.scale / 100)
          const y = height - (normalizedValue * height * 0.8) - height * 0.1

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        ctx.stroke()

        // Draw glow effect for the latest point
        const lastIndex = metric.data.length - 1
        const lastX = lastIndex * stepX
        const lastValue = Math.min(1, metric.data[lastIndex] * metric.scale / 100)
        const lastY = height - (lastValue * height * 0.8) - height * 0.1

        const gradient = ctx.createRadialGradient(lastX, lastY, 0, lastX, lastY, 10)
        gradient.addColorStop(0, metric.color + '40')
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(lastX, lastY, 10, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw labels
      if (showLabels) {
        ctx.globalAlpha = 1
        ctx.font = '10px monospace'

        metrics.forEach((metric, i) => {
          ctx.fillStyle = metric.color
          ctx.fillText(metric.label, 10, 20 + i * 15)

          // Current value
          const currentValue = metric.data[metric.data.length - 1]
          ctx.fillStyle = '#666'
          ctx.fillText(currentValue.toFixed(1), 80, 20 + i * 15)
        })
      }

      ctx.globalAlpha = 1
      offset += 16
      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', updateSize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [telemetry, height, showLabels])

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded"
      style={{ height }}
      aria-label="Real-time instrument telemetry"
      role="img"
    />
  )
}
