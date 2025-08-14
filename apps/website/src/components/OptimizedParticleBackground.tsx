import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useViewportLazyLoad } from '../hooks/useIntersectionObserver'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}

const OptimizedParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const glRef = useRef<WebGLRenderingContext | null>(null)
  const programRef = useRef<WebGLProgram | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [containerRef, isVisible] = useViewportLazyLoad<HTMLDivElement>({
    threshold: 0.01,
    rootMargin: '100px'
  })

  // Performance settings based on device capabilities
  const getPerformanceSettings = useCallback(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const isLowEnd = navigator.hardwareConcurrency <= 2
    const hasReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (hasReducedMotion) {
      return { particleCount: 0, enabled: false }
    }

    if (isMobile || isLowEnd) {
      return { particleCount: 15, enabled: true }
    }

    return { particleCount: 30, enabled: true }
  }, [])

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = undefined
    }

    if (glRef.current && programRef.current) {
      glRef.current.deleteProgram(programRef.current)
      programRef.current = null
    }

    if (glRef.current) {
      const extension = glRef.current.getExtension('WEBGL_lose_context')
      if (extension) {
        extension.loseContext()
      }
      glRef.current = null
    }

    particlesRef.current = []
  }, [])

  useEffect(() => {
    if (!isVisible || isInitialized) return

    const canvas = canvasRef.current
    if (!canvas) return

    const settings = getPerformanceSettings()
    if (!settings.enabled) return

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
      failIfMajorPerformanceCaveat: true
    }) || canvas.getContext('experimental-webgl')

    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      console.warn('WebGL not supported, particles disabled')
      return
    }

    glRef.current = gl

    // Resize canvas with device pixel ratio
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) // Cap at 2x for performance
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resizeCanvas()

    // Throttled resize handler
    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(resizeCanvas, 100)
    }
    window.addEventListener('resize', handleResize, { passive: true })

    // Shader sources
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute float a_size;
      attribute float a_opacity;

      uniform vec2 u_resolution;
      varying float v_opacity;

      void main() {
        vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0.0, 1.0);
        gl_PointSize = a_size;
        v_opacity = a_opacity;
      }
    `

    const fragmentShaderSource = `
      precision lowp float;

      varying float v_opacity;

      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        float distance = length(coord);

        if (distance > 0.5) {
          discard;
        }

        float alpha = 1.0 - smoothstep(0.0, 0.5, distance);
        gl_FragColor = vec4(0.0, 0.808, 0.82, alpha * v_opacity * 0.3);
      }
    `

    // Create shaders
    const createShader = (type: number, source: string) => {
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
    }

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource)

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
      console.error('Program link error:', gl.getProgramInfoLog(program))
      cleanup()
      return
    }

    programRef.current = program

    // Get locations
    const positionLocation = gl.getAttribLocation(program, 'a_position')
    const sizeLocation = gl.getAttribLocation(program, 'a_size')
    const opacityLocation = gl.getAttribLocation(program, 'a_opacity')
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')

    // Clean up shaders after linking
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)

    // Create particles
    const particles: Particle[] = []
    for (let i = 0; i < settings.particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 6 + 3,
        opacity: Math.random() * 0.3 + 0.1
      })
    }
    particlesRef.current = particles

    // Animation loop with FPS limiting
    let lastTime = 0
    const targetFPS = 30 // Lower FPS for background animation
    const frameInterval = 1000 / targetFPS

    const animate = (currentTime: number) => {
      if (!glRef.current || glRef.current.isContextLost()) {
        cleanup()
        return
      }

      const deltaTime = currentTime - lastTime

      if (deltaTime >= frameInterval) {
        lastTime = currentTime - (deltaTime % frameInterval)

        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.useProgram(program)
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height)

        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

        particlesRef.current.forEach(particle => {
          particle.x += particle.vx
          particle.y += particle.vy

          // Wrap around edges
          if (particle.x > canvas.width) particle.x = 0
          if (particle.x < 0) particle.x = canvas.width
          if (particle.y > canvas.height) particle.y = 0
          if (particle.y < 0) particle.y = canvas.height

          gl.vertexAttrib2f(positionLocation, particle.x, particle.y)
          gl.vertexAttrib1f(sizeLocation, particle.size)
          gl.vertexAttrib1f(opacityLocation, particle.opacity)

          gl.drawArrays(gl.POINTS, 0, 1)
        })
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    // Handle context loss
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      cleanup()
      console.warn('WebGL context lost')
    }

    const handleContextRestored = () => {
      console.log('WebGL context restored')
      setIsInitialized(false) // Trigger re-initialization
    }

    canvas.addEventListener('webglcontextlost', handleContextLost, false)
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false)

    // Start animation
    animate(0)
    setIsInitialized(true)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
      clearTimeout(resizeTimeout)
      cleanup()
    }
  }, [isVisible, isInitialized, cleanup, getPerformanceSettings])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return (
    <div ref={containerRef} className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full opacity-10"
        id="particles-canvas"
        aria-hidden="true"
      />
    </div>
  )
}

export default OptimizedParticleBackground
