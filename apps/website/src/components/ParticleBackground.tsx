import React, { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      console.warn('WebGL not supported, particles disabled')
      return
    }

    // Resize canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Shader sources
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

    const fragmentShaderSource = `
      precision mediump float;

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
      return shader
    }

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource)

    if (!vertexShader || !fragmentShader) return

    // Create program
    const program = gl.createProgram()
    if (!program) return

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    // Get attribute locations
    const positionLocation = gl.getAttribLocation(program, 'a_position')
    const sizeLocation = gl.getAttribLocation(program, 'a_size')
    const opacityLocation = gl.getAttribLocation(program, 'a_opacity')

    // Create particles
    const particleCount = 30
    const particles: Particle[] = []

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * 2 - 1,
        y: Math.random() * 2 - 1,
        vx: (Math.random() - 0.5) * 0.0005,
        vy: (Math.random() - 0.5) * 0.0005,
        size: Math.random() * 8 + 4,
        opacity: Math.random() * 0.3 + 0.1
      })
    }

    // Animation loop
    const animate = () => {
      if (!gl || gl.isContextLost()) return

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.useProgram(program)

      particles.forEach(particle => {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x > 1) particle.x = -1
        if (particle.x < -1) particle.x = 1
        if (particle.y > 1) particle.y = -1
        if (particle.y < -1) particle.y = 1

        gl.vertexAttrib2f(positionLocation, particle.x, particle.y)
        gl.vertexAttrib1f(sizeLocation, particle.size)
        gl.vertexAttrib1f(opacityLocation, particle.opacity)

        gl.drawArrays(gl.POINTS, 0, 1)
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 opacity-10 pointer-events-none"
      id="particles-canvas"
    />
  )
}

export default ParticleBackground
