'use client'

import { useEffect, useRef, useState } from 'react'

// Simple fish animation without any external dependencies
// Bulletproof implementation that works in all environments
export default function SimpleFishAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const fishRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: 0,
    time: 0,
    state: 'idle' as 'idle' | 'dart' | 'recover'
  })

  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set up canvas
    const parent = canvas.parentElement
    if (!parent) return

    const resizeCanvas = () => {
      const rect = parent.getBoundingClientRect()
      const width = Math.max(rect.width, 400)
      const height = Math.max(rect.height, 180)
      
      canvas.width = width * window.devicePixelRatio
      canvas.height = height * window.devicePixelRatio
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      
      // Initialize fish position
      fishRef.current.x = width * 0.2
      fishRef.current.y = height * 0.5
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Simple noise function
    const noise = (x: number, y: number) => {
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
      return n - Math.floor(n)
    }

    // Fish drawing function
    const drawFish = (x: number, y: number, angle: number, glow: number) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle)

      // Body glow effect
      if (glow > 0) {
        ctx.shadowColor = '#3FD3C6'
        ctx.shadowBlur = 15 * glow
      }

      // Fish body
      ctx.fillStyle = `rgba(63, 211, 198, ${0.7 + glow * 0.3})`
      ctx.beginPath()
      ctx.ellipse(0, 0, 30, 12, 0, 0, Math.PI * 2)
      ctx.fill()

      // Fish tail
      ctx.beginPath()
      ctx.moveTo(-25, 0)
      ctx.lineTo(-40, -8)
      ctx.lineTo(-35, 0)
      ctx.lineTo(-40, 8)
      ctx.closePath()
      ctx.fill()

      // Eye
      ctx.fillStyle = '#0D1B2A'
      ctx.beginPath()
      ctx.arc(8, -3, 3, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    }

    // Animation loop
    const animate = () => {
      const fish = fishRef.current
      const time = Date.now() / 1000
      fish.time = time

      // Clear canvas
      ctx.fillStyle = 'transparent'
      ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio)

      const bounds = {
        width: canvas.width / window.devicePixelRatio,
        height: canvas.height / window.devicePixelRatio
      }

      // Simple fish behavior
      const noiseX = noise(fish.x * 0.01, time * 0.3) - 0.5
      const noiseY = noise(fish.y * 0.01, time * 0.2) - 0.5

      // Base movement
      fish.vx += noiseX * 0.5
      fish.vy += noiseY * 0.3

      // Boundary avoidance
      const margin = 50
      if (fish.x < margin) fish.vx += (margin - fish.x) * 0.01
      if (fish.x > bounds.width - margin) fish.vx -= (fish.x - (bounds.width - margin)) * 0.01
      if (fish.y < margin) fish.vy += (margin - fish.y) * 0.01
      if (fish.y > bounds.height - margin) fish.vy -= (fish.y - (bounds.height - margin)) * 0.01

      // Damping
      fish.vx *= 0.98
      fish.vy *= 0.98

      // Update position
      fish.x += fish.vx
      fish.y += fish.vy

      // Calculate angle
      fish.angle = Math.atan2(fish.vy, fish.vx)

      // Calculate glow intensity
      const speed = Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy)
      const glow = Math.min(speed * 0.1, 1.0)

      // Draw fish
      drawFish(fish.x, fish.y, fish.angle, glow)

      animationRef.current = requestAnimationFrame(animate)
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!prefersReducedMotion) {
      setIsVisible(true)
      animate()
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  if (!isVisible) {
    return (
      <div 
        style={{
          position: 'relative',
          width: '100%',
          height: 'clamp(180px, 25vh, 320px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent'
        }}
      >
        <div 
          style={{
            width: '60px',
            height: '60px',
            opacity: 0.3,
            backgroundImage: 'url("/img/cf-fish-fallback.svg")',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center'
          }}
          aria-label="Decorative fish illustration"
        />
      </div>
    )
  }

  return (
    <div 
      style={{
        position: 'relative',
        width: '100%',
        height: 'clamp(180px, 25vh, 320px)',
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label="Animated candlefish swimming"
        role="img"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  )
}