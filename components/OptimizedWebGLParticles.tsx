import { useEffect, useRef, useCallback } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}

const PARTICLE_COUNT = 20 // Reduced from 30 for better performance
const TARGET_FPS = 60
const FRAME_DURATION = 1000 / TARGET_FPS

export default function OptimizedWebGLParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const lastFrameRef = useRef<number>(0)

  // Vertex shader source - optimized for performance
  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute float a_size;
    attribute float a_opacity;

    varying float v_opacity;

    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      gl_PointSize = a_size;
      v_opacity = a_opacity;
    }
  `

  // Fragment shader source - optimized with early discard
  const fragmentShaderSource = `
    precision mediump float;

    varying float v_opacity;

    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float distance = length(coord);

      // Early discard for performance
      if (distance > 0.5) {
        discard;
      }

      // Smooth edge
      float alpha = 1.0 - smoothstep(0.0, 0.5, distance);

      // Candlefish teal color
      gl_FragColor = vec4(0.0, 0.808, 0.82, alpha * v_opacity * 0.3);
    }
  `

  // Initialize particles with better distribution
  const initializeParticles = useCallback(() => {
    const particles: Particle[] = []

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Better initial distribution using golden ratio
      const goldenAngle = Math.PI * (3 - Math.sqrt(5))
      const angle = i * goldenAngle
      const radius = Math.sqrt(i / PARTICLE_COUNT) * 0.8

      particles.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.0003,
        vy: (Math.random() - 0.5) * 0.0003,
        size: Math.random() * 6 + 3,
        opacity: Math.random() * 0.2 + 0.1
      })
    }

    return particles
  }, [])

  // Create and compile shader
  const createShader = useCallback((
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ): WebGLShader | null => {
    const shader = gl.createShader(type)
    if (!shader) return null

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }

    return shader
  }, [])

  // Optimized render function
  const render = useCallback((timestamp: number) => {
    const gl = glRef.current
    if (!gl || !canvasRef.current) return

    // Frame rate limiting for consistent performance
    const elapsed = timestamp - lastFrameRef.current

    if (elapsed >= FRAME_DURATION) {
      lastFrameRef.current = timestamp - (elapsed % FRAME_DURATION)

      // Clear with transparent background
      gl.clear(gl.COLOR_BUFFER_BIT)

      // Update and render particles
      particlesRef.current.forEach((particle, index) => {
        // Update position with boundary wrapping
        particle.x += particle.vx
        particle.y += particle.vy

        // Wrap around edges smoothly
        if (particle.x > 1) particle.x = -1
        if (particle.x < -1) particle.x = 1
        if (particle.y > 1) particle.y = -1
        if (particle.y < -1) particle.y = 1

        // Set attributes for this particle
        gl.vertexAttrib2f(0, particle.x, particle.y)
        gl.vertexAttrib1f(1, particle.size)
        gl.vertexAttrib1f(2, particle.opacity)

        // Draw single point
        gl.drawArrays(gl.POINTS, 0, 1)
      })
    }

    animationRef.current = requestAnimationFrame(render)
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    const gl = glRef.current
    if (gl && gl.getExtension('WEBGL_lose_context')) {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }

    glRef.current = null
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Try WebGL 2 first, fallback to WebGL 1
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
      premultipliedAlpha: true,
      failIfMajorPerformanceCaveat: true
    }) || canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance'
    })

    if (!gl) {
      console.warn('WebGL not supported, particles disabled')
      return
    }

    glRef.current = gl

    // Set canvas size
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) // Cap at 2x for performance
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)

    if (!vertexShader || !fragmentShader) {
      cleanup()
      return
    }

    // Create program
    const program = gl.createProgram()
    if (!program) {
      cleanup()
      return
    }

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program))
      cleanup()
      return
    }

    // Use program
    gl.useProgram(program)

    // Enable vertex attributes
    gl.enableVertexAttribArray(0) // position
    gl.enableVertexAttribArray(1) // size
    gl.enableVertexAttribArray(2) // opacity

    // Set up blending for transparency
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    // Clear color
    gl.clearColor(0, 0, 0, 0)

    // Initialize particles
    particlesRef.current = initializeParticles()

    // Start animation
    animationRef.current = requestAnimationFrame(render)

    // Handle visibility change for performance
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      } else {
        animationRef.current = requestAnimationFrame(render)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cleanup()
      window.removeEventListener('resize', resizeCanvas)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [createShader, cleanup, initializeParticles, render])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none opacity-10"
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)' // Force GPU layer
      }}
      aria-hidden="true"
    />
  )
}
