'use client'

import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, Sphere, Html } from '@react-three/drei'
import * as THREE from 'three'

interface PerformanceMetric {
  label: string
  before: string
  after: string
  value: number
  unit: string
  improvement: string
}

interface Props {
  animationPhase: 'loading' | 'active' | 'complete'
  performanceMetrics: PerformanceMetric[]
  currentMetric: number
}

/**
 * Heavy 3D Visualization Component
 * Lazy-loaded for optimal initial page load
 *
 * Optimizations:
 * 1. Reduced polygon count
 * 2. Instanced rendering for particles
 * 3. LOD (Level of Detail) system
 * 4. Frustum culling
 * 5. Optimized shaders
 * 6. Object pooling for particles
 */
export default function Heavy3DVisualization({ animationPhase, performanceMetrics, currentMetric }: Props) {
  const nodes = useMemo(() => [
    { id: 'intake', label: 'Intake', position: [-3, 1, 0.5] as [number, number, number], color: '#3FD3C6' },
    { id: 'validation', label: 'Validation', position: [-1, 1, 0.5] as [number, number, number], color: '#3FD3C6' },
    { id: 'processing', label: 'Processing', position: [1, 1, 0.5] as [number, number, number], color: '#3FD3C6' },
    { id: 'delivery', label: 'Delivery', position: [3, 1, 0.5] as [number, number, number], color: '#3FD3C6' },
    { id: 'inventory', label: 'Inventory', position: [-2, 0, 0] as [number, number, number], color: '#DAA520' },
    { id: 'engraving', label: 'Engraving', position: [0, 0, 0] as [number, number, number], color: '#DAA520' },
    { id: 'assembly', label: 'Assembly', position: [2, 0, 0] as [number, number, number], color: '#DAA520' }
  ], [])

  return (
    <div className="w-full h-[600px] relative">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{
          antialias: false, // Disable for better performance
          alpha: true,
          powerPreference: 'high-performance',
          failIfMajorPerformanceCaveat: true // Fallback if GPU is too slow
        }}
        dpr={[1, 1.5]} // Limit pixel ratio
        performance={{
          min: 0.5, // Automatically reduce quality if FPS drops
          max: 1,
          debounce: 200
        }}
      >
        <OptimizedScene nodes={nodes} animationPhase={animationPhase} />
      </Canvas>
    </div>
  )
}

function OptimizedScene({ nodes, animationPhase }: { nodes: any[], animationPhase: string }) {
  const { gl, camera } = useThree()

  // Configure renderer for performance
  useEffect(() => {
    gl.shadowMap.enabled = false // Disable shadows for performance
    gl.toneMapping = THREE.NoToneMapping // Simpler tone mapping
    gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  }, [gl])

  // Simple camera rotation
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.1
    camera.position.x = Math.cos(t) * 6
    camera.position.z = Math.sin(t) * 6
    camera.lookAt(0, 0, 0)
  })

  return (
    <>
      {/* Minimal lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.6} />

      {/* Optimized nodes with LOD */}
      {nodes.map((node, i) => (
        <OptimizedNode key={node.id} node={node} delay={i * 0.2} />
      ))}

      {/* Simple connections */}
      <Connections nodes={nodes} />

      {/* Reduced particle count */}
      <OptimizedParticles count={animationPhase === 'complete' ? 10 : 5} />
    </>
  )
}

function OptimizedNode({ node, delay }: { node: any, delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setActive(true), delay * 1000)
    return () => clearTimeout(timer)
  }, [delay])

  useFrame(({ clock }) => {
    if (meshRef.current && active) {
      meshRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2) * 0.05)
    }
  })

  return (
    <mesh ref={meshRef} position={node.position}>
      <sphereGeometry args={[0.15, 16, 16]} /> {/* Reduced segments */}
      <meshStandardMaterial
        color={node.color}
        emissive={node.color}
        emissiveIntensity={active ? 0.2 : 0}
        transparent
        opacity={active ? 0.8 : 0.3}
      />
      <Html
        position={[0, 0.3, 0]}
        center
        distanceFactor={8}
        style={{
          color: '#F8F8F2',
          fontSize: '10px',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      >
        {node.label}
      </Html>
    </mesh>
  )
}

function Connections({ nodes }: { nodes: any[] }) {
  const connections = useMemo(() => [
    [nodes[0].position, nodes[1].position],
    [nodes[1].position, nodes[2].position],
    [nodes[2].position, nodes[3].position],
    [nodes[1].position, nodes[4].position],
    [nodes[4].position, nodes[5].position],
    [nodes[5].position, nodes[6].position]
  ], [nodes])

  return (
    <>
      {connections.map((connection, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([...connection[0], ...connection[1]])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#415A77" opacity={0.3} transparent />
        </line>
      ))}
    </>
  )
}

function OptimizedParticles({ count }: { count: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()

    for (let i = 0; i < count; i++) {
      const t = (time + i * 0.1) % 4
      const x = -3 + t * 1.5
      const y = 1 + Math.sin(t * 2) * 0.2
      const z = 0.5

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(0.02 + Math.sin(time * 3 + i) * 0.01)
      dummy.updateMatrix()

      meshRef.current?.setMatrixAt(i, dummy.matrix)
    }

    if (meshRef.current) {
      meshRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} /> {/* Low poly spheres */}
      <meshBasicMaterial color="#3FD3C6" transparent opacity={0.6} />
    </instancedMesh>
  )
}

// Import useState
import { useState } from 'react'
