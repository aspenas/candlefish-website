'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Sphere, Line } from '@react-three/drei'
import * as THREE from 'three'

// Agent data with creative capabilities
const AGENTS = [
  { id: 'gpt-4-turbo', vendor: 'OpenAI', color: '#00D26A', position: [0, 0, 0], capabilities: ['text', 'code', 'vision'] },
  { id: 'claude-3-opus', vendor: 'Anthropic', color: '#D4A76A', position: [3, 1, -1], capabilities: ['text', 'analysis', 'creative'] },
  { id: 'dall-e-3', vendor: 'OpenAI', color: '#00D26A', position: [-2, 2, 1], capabilities: ['image', 'creative'] },
  { id: 'gemini-1.5-pro', vendor: 'Google', color: '#4285F4', position: [1, -2, 2], capabilities: ['text', 'multimodal', 'long-context'] },
  { id: 'llama-3-70b', vendor: 'Meta', color: '#0084FF', position: [-3, -1, -2], capabilities: ['text', 'instruction'] },
  { id: 'stable-diffusion-xl', vendor: 'Stability', color: '#8B5CF6', position: [2, -3, 0], capabilities: ['image', 'art'] },
  { id: 'mistral-large', vendor: 'Mistral', color: '#FF6B6B', position: [-1, 3, -3], capabilities: ['text', 'code', 'multilingual'] }
]

// Animated Agent Node
function AgentNode({ agent, isActive, connections }: any) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current) {
      // Pulsing effect
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.1)

      // Rotation for active agents
      if (isActive) {
        meshRef.current.rotation.y += 0.02
      }
    }
  })

  return (
    <group position={agent.position}>
      <Sphere
        ref={meshRef}
        args={[0.3, 32, 32]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={agent.color}
          emissive={agent.color}
          emissiveIntensity={hovered ? 0.8 : 0.3}
          transparent
          opacity={0.9}
        />
      </Sphere>
      <Text
        position={[0, 0.6, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {agent.id}
      </Text>
    </group>
  )
}

// Neural pathway connections
function Connections({ agents, activeConnections }: any) {
  return (
    <>
      {activeConnections.map((conn: any, i: number) => {
        const from = agents.find((a: any) => a.id === conn.from)
        const to = agents.find((a: any) => a.id === conn.to)
        if (!from || !to) return null

        return (
          <Line
            key={i}
            points={[from.position, to.position]}
            color={conn.active ? '#3FD3C6' : '#333333'}
            lineWidth={conn.active ? 2 : 1}
            transparent
            opacity={conn.active ? 0.8 : 0.3}
          />
        )
      })}
    </>
  )
}

// Main Agent Consciousness Map
export default function AgentConsciousnessMap() {
  const [activeAgents, setActiveAgents] = useState<string[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [selectedExperiment, setSelectedExperiment] = useState<string>('none')
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    activeConnections: 0,
    avgLatency: 0,
    capabilities: {} as Record<string, number>
  })

  // Simulate real-time activity
  useEffect(() => {
    const interval = setInterval(() => {
      // Random agent activation
      const randomAgent = AGENTS[Math.floor(Math.random() * AGENTS.length)]
      setActiveAgents(prev => {
        const newActive = [...prev, randomAgent.id]
        return newActive.slice(-3) // Keep last 3 active
      })

      // Update metrics
      setMetrics(prev => ({
        totalRequests: prev.totalRequests + Math.floor(Math.random() * 10),
        activeConnections: Math.floor(Math.random() * 20),
        avgLatency: 50 + Math.random() * 100,
        capabilities: {
          text: Math.floor(Math.random() * 100),
          image: Math.floor(Math.random() * 50),
          code: Math.floor(Math.random() * 75),
          analysis: Math.floor(Math.random() * 60)
        }
      }))

      // Create random connections
      if (Math.random() > 0.5) {
        const from = AGENTS[Math.floor(Math.random() * AGENTS.length)]
        const to = AGENTS[Math.floor(Math.random() * AGENTS.length)]
        if (from.id !== to.id) {
          setConnections(prev => [
            ...prev.slice(-5),
            { from: from.id, to: to.id, active: true }
          ])
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Experimental behaviors
  const runExperiment = (type: string) => {
    setSelectedExperiment(type)

    switch(type) {
      case 'swarm':
        // Activate all agents in sequence
        AGENTS.forEach((agent, i) => {
          setTimeout(() => {
            setActiveAgents(prev => [...prev, agent.id])
          }, i * 200)
        })
        break

      case 'democracy':
        // Create voting connections
        const voteConnections = AGENTS.map(a => ({
          from: 'claude-3-opus',
          to: a.id,
          active: true
        }))
        setConnections(voteConnections)
        break

      case 'creative':
        // Chain creative agents
        const chain = ['gpt-4-turbo', 'dall-e-3', 'stable-diffusion-xl']
        chain.forEach((id, i) => {
          if (i < chain.length - 1) {
            setConnections(prev => [...prev, {
              from: chain[i],
              to: chain[i + 1],
              active: true
            }])
          }
        })
        break
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="p-6 border-b border-[#333]">
        <h1 className="text-3xl font-bold mb-2">NANDA Agent Consciousness Map</h1>
        <p className="text-gray-400">Living visualization of AI agent federation</p>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* 3D Visualization */}
        <div className="flex-1 h-[600px]">
          <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />

            {/* Grid */}
            <gridHelper args={[10, 10, '#333', '#111']} />

            {/* Agents */}
            {AGENTS.map(agent => (
              <AgentNode
                key={agent.id}
                agent={agent}
                isActive={activeAgents.includes(agent.id)}
                connections={connections}
              />
            ))}

            {/* Connections */}
            <Connections agents={AGENTS} activeConnections={connections} />
          </Canvas>
        </div>

        {/* Control Panel */}
        <div className="w-96 p-6 border-l border-[#333]">
          {/* Metrics */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Live Metrics</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Requests</span>
                <span className="text-[#3FD3C6] font-mono">{metrics.totalRequests.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Active Connections</span>
                <span className="text-[#3FD3C6] font-mono">{metrics.activeConnections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg Latency</span>
                <span className="text-[#3FD3C6] font-mono">{metrics.avgLatency.toFixed(1)}ms</span>
              </div>
            </div>
          </div>

          {/* Capability Usage */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Capability Usage</h2>
            <div className="space-y-2">
              {Object.entries(metrics.capabilities).map(([cap, value]) => (
                <div key={cap}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">{cap}</span>
                    <span className="text-[#3FD3C6]">{value}%</span>
                  </div>
                  <div className="w-full bg-[#1a1a1a] h-2 rounded">
                    <div
                      className="bg-gradient-to-r from-[#3FD3C6] to-[#00D26A] h-full rounded transition-all"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Experimental Behaviors */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Experiments</h2>
            <div className="space-y-2">
              <button
                onClick={() => runExperiment('swarm')}
                className="w-full p-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded text-left transition"
              >
                <div className="font-semibold text-[#3FD3C6]">Swarm Intelligence</div>
                <div className="text-xs text-gray-400">Agents self-organize</div>
              </button>

              <button
                onClick={() => runExperiment('democracy')}
                className="w-full p-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded text-left transition"
              >
                <div className="font-semibold text-[#D4A76A]">Agent Democracy</div>
                <div className="text-xs text-gray-400">Consensus voting</div>
              </button>

              <button
                onClick={() => runExperiment('creative')}
                className="w-full p-3 bg-[#1a1a1a] hover:bg-[#2a2a2a] rounded text-left transition"
              >
                <div className="font-semibold text-[#8B5CF6]">Creative Chain</div>
                <div className="text-xs text-gray-400">Multi-modal generation</div>
              </button>
            </div>
          </div>

          {/* Active Agents */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Active Agents</h2>
            <div className="space-y-1">
              {activeAgents.slice(-5).map((id, i) => {
                const agent = AGENTS.find(a => a.id === id)
                return agent ? (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: agent.color }}
                    />
                    <span>{agent.id}</span>
                    <span className="text-gray-500 text-xs">({agent.vendor})</span>
                  </div>
                ) : null
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <footer className="p-6 border-t border-[#333]">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Federation Status: <span className="text-[#3FD3C6]">ACTIVE</span> |
            Platforms: <span className="text-[#3FD3C6]">7</span> |
            Agents: <span className="text-[#3FD3C6]">{AGENTS.length}</span>
          </div>
          <div className="text-xs text-gray-500">
            Powered by NANDA Index • Candlefish AI
          </div>
        </div>
      </footer>
    </div>
  )
}
