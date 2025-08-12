import React, { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Sphere, Box, MeshDistortMaterial, Float, Trail } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'

// Custom shader for glowing effect
const glowVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const glowFragmentShader = `
  uniform float time;
  uniform vec3 color;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    float intensity = pow(0.8 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    vec3 glow = color * intensity;

    // Add pulsing effect
    float pulse = sin(time * 2.0) * 0.5 + 0.5;
    glow *= (0.5 + pulse * 0.5);

    // Add noise-based variation
    float noise = sin(vPosition.x * 10.0 + time) * sin(vPosition.y * 10.0 + time) * sin(vPosition.z * 10.0 + time);
    glow += color * noise * 0.1;

    gl_FragColor = vec4(glow, intensity);
  }
`

interface NeuralNodeProps {
  position: [number, number, number]
  color: string
  delay: number
  size?: number
  connections?: [number, number, number][]
}

const NeuralNode: React.FC<NeuralNodeProps> = ({ position, color, delay, size = 0.3, connections = [] }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime + delay) * 0.1
      meshRef.current.rotation.y = Math.cos(state.clock.elapsedTime + delay) * 0.1

      // Pulsing scale effect
      const pulse = Math.sin(state.clock.elapsedTime * 2 + delay) * 0.1 + 1
      meshRef.current.scale.setScalar(size * pulse * (hovered ? 1.3 : 1))
    }

    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime
    }
  })

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh
          ref={meshRef}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[1, 32, 32]} />
          <shaderMaterial
            ref={materialRef}
            vertexShader={glowVertexShader}
            fragmentShader={glowFragmentShader}
            uniforms={{
              time: { value: 0 },
              color: { value: new THREE.Color(color) }
            }}
            transparent
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Inner core */}
        <mesh scale={0.5}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>

        {/* Outer glow */}
        <mesh scale={1.5}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </Float>

      {/* Connection lines */}
      {connections.map((targetPos, i) => (
        <ConnectionLine
          key={i}
          start={position}
          end={targetPos}
          color={color}
          delay={delay + i * 0.2}
        />
      ))}
    </group>
  )
}

interface ConnectionLineProps {
  start: [number, number, number]
  end: [number, number, number]
  color: string
  delay: number
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ start, end, color, delay }) => {
  const lineRef = useRef<THREE.Line>(null)
  const materialRef = useRef<THREE.LineBasicMaterial>(null)

  const points = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(...start),
      new THREE.Vector3(
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2 + Math.random() * 0.5 - 0.25,
        (start[2] + end[2]) / 2
      ),
      new THREE.Vector3(...end)
    ])
    return curve.getPoints(50)
  }, [start, end])

  useFrame((state) => {
    if (materialRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 3 + delay) * 0.5 + 0.5
      materialRef.current.opacity = pulse * 0.3
    }
  })

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={0.3}
        blending={THREE.AdditiveBlending}
      />
    </line>
  )
}

interface DataParticleProps {
  startPos: [number, number, number]
  endPos: [number, number, number]
  delay: number
  color: string
}

const DataParticle: React.FC<DataParticleProps> = ({ startPos, endPos, delay, color }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const [progress, setProgress] = useState(0)

  useFrame((state) => {
    const t = ((state.clock.elapsedTime + delay) % 3) / 3
    setProgress(t)

    if (meshRef.current) {
      // Cubic bezier interpolation for smooth movement
      const x = startPos[0] + (endPos[0] - startPos[0]) * t
      const y = startPos[1] + (endPos[1] - startPos[1]) * t + Math.sin(t * Math.PI) * 0.5
      const z = startPos[2] + (endPos[2] - startPos[2]) * t

      meshRef.current.position.set(x, y, z)
      meshRef.current.scale.setScalar(0.05 * (1 - Math.abs(t - 0.5) * 2))
    }
  })

  return (
    <Trail
      width={2}
      length={6}
      color={new THREE.Color(color)}
      attenuation={(t) => t * t}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
    </Trail>
  )
}

const ParticleField: React.FC = () => {
  const particlesRef = useRef<THREE.Points>(null)
  const particleCount = 500

  const particleData = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 10
      positions[i3 + 1] = (Math.random() - 0.5) * 10
      positions[i3 + 2] = (Math.random() - 0.5) * 10

      const color = new THREE.Color()
      color.setHSL(Math.random() * 0.2 + 0.5, 0.8, 0.6)
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b

      sizes[i] = Math.random() * 0.05 + 0.01
    }

    return { positions, colors, sizes }
  }, [])

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.05
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particleData.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={particleData.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={particleData.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

const AIBrain: React.FC = () => {
  const { mouse } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1
      groupRef.current.rotation.x = mouse.y * 0.2
      groupRef.current.rotation.z = mouse.x * 0.2
    }
  })

  // Define neural network structure
  const layers = [
    // Input layer
    [
      { pos: [-2, 2, 0] as [number, number, number], color: '#00CED1' },
      { pos: [-2, 0, 0] as [number, number, number], color: '#00CED1' },
      { pos: [-2, -2, 0] as [number, number, number], color: '#00CED1' },
    ],
    // Hidden layer 1
    [
      { pos: [0, 3, 0] as [number, number, number], color: '#007AFF' },
      { pos: [0, 1, 0] as [number, number, number], color: '#007AFF' },
      { pos: [0, -1, 0] as [number, number, number], color: '#007AFF' },
      { pos: [0, -3, 0] as [number, number, number], color: '#007AFF' },
    ],
    // Hidden layer 2
    [
      { pos: [2, 2, 0] as [number, number, number], color: '#AF52DE' },
      { pos: [2, 0, 0] as [number, number, number], color: '#AF52DE' },
      { pos: [2, -2, 0] as [number, number, number], color: '#AF52DE' },
    ],
    // Output layer
    [
      { pos: [4, 0, 0] as [number, number, number], color: '#00CED1' },
    ],
  ]

  return (
    <group ref={groupRef}>
      {/* Render nodes with connections */}
      {layers.map((layer, layerIndex) => (
        layer.map((node, nodeIndex) => {
          const connections = layerIndex < layers.length - 1
            ? layers[layerIndex + 1].map(nextNode => nextNode.pos)
            : []

          return (
            <NeuralNode
              key={`${layerIndex}-${nodeIndex}`}
              position={node.pos}
              color={node.color}
              delay={layerIndex * 0.3 + nodeIndex * 0.1}
              connections={connections}
            />
          )
        })
      ))}

      {/* Data flow particles */}
      {layers.slice(0, -1).map((layer, layerIndex) => (
        layer.map((node, nodeIndex) => (
          layers[layerIndex + 1].map((nextNode, nextIndex) => (
            <DataParticle
              key={`particle-${layerIndex}-${nodeIndex}-${nextIndex}`}
              startPos={node.pos}
              endPos={nextNode.pos}
              delay={layerIndex * 0.5 + nodeIndex * 0.2 + nextIndex * 0.1}
              color={node.color}
            />
          ))
        ))
      ))}
    </group>
  )
}

const Scene: React.FC = () => {
  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#AF52DE" />

      {/* Background particle field */}
      <ParticleField />

      {/* Main AI brain visualization */}
      <AIBrain />

      {/* Ambient floating shapes */}
      <Float speed={4} rotationIntensity={0.5} floatIntensity={1}>
        <Box position={[-4, 3, -2]} scale={0.3}>
          <MeshDistortMaterial
            color="#00CED1"
            speed={2}
            distort={0.3}
            radius={1}
            transparent
            opacity={0.3}
          />
        </Box>
      </Float>

      <Float speed={3} rotationIntensity={0.3} floatIntensity={0.8}>
        <Sphere position={[4, -3, -2]} scale={0.4}>
          <MeshDistortMaterial
            color="#AF52DE"
            speed={3}
            distort={0.4}
            radius={1}
            transparent
            opacity={0.2}
          />
        </Sphere>
      </Float>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 2}
      />
    </>
  )
}

const AdvancedAIVisualization: React.FC = () => {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      >
        <Scene />
      </Canvas>

      {/* Overlay UI */}
      <motion.div
        className="absolute bottom-4 left-4 right-4 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-black/30 backdrop-blur-md border border-cyan-500/20">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-300 font-mono text-sm">Neural Network Active</span>
          <span className="text-gray-400 text-xs">|</span>
          <span className="text-gray-300 font-mono text-xs">Processing: {Math.random() * 100 | 0}%</span>
        </div>
      </motion.div>
    </div>
  )
}

export default AdvancedAIVisualization
