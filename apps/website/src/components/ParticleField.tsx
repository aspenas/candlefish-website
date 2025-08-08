import React, { useRef, useMemo, useEffect } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}

const ParticleField: React.FC = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const prefersReducedMotion = useReducedMotion()

  const springProps = useSpring({
    opacity: prefersReducedMotion ? 0.05 : 0.1,
    config: { tension: 50, friction: 20 }
  })

  const initParticles = useMemo(() => {
    const count = prefersReducedMotion ? 20 : 50
    const particles: Particle[] = []

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.5
      })
    }
    return particles
  }, [prefersReducedMotion])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    particlesRef.current = initParticles

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Wrap around edges
        if (particle.x > canvas.width) particle.x = 0
        if (particle.x < 0) particle.x = canvas.width
        if (particle.y > canvas.height) particle.y = 0
        if (particle.y < 0) particle.y = canvas.height

        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 206, 209, ${particle.opacity * 0.3})`
        ctx.fill()
      })

      if (!prefersReducedMotion) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [initParticles, prefersReducedMotion])

  return (
    <animated.canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        opacity: springProps.opacity,
        willChange: 'opacity'
      }}
      aria-hidden="true"
    />
  )
})

ParticleField.displayName = 'ParticleField'

export default ParticleField
