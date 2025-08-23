'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// NANDA-style particle node-graph system
// Nodes = franchises, Links = data pipelines, Particles = order data streams
// Reskinned with Candlefish atelier brand colors (deep blues, aquas, muted purples)

interface FranchiseNode {
  id: string;
  name: string;
  streams: number;
  latency: string;
  status: 'ACTIVE' | 'CALIBRATING' | 'OPERATIONAL';
}

interface NetworkLink {
  source: string;
  target: string;
  strength: number;
}

// Particle flow component for data stream visualization
function ParticleFlow({
  start,
  end,
  count = 15,
  speed = 0.8,
  color = new THREE.Color(0x3FD3C6),
  status
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  count?: number;
  speed?: number;
  color?: THREE.Color;
  status: string;
}) {
  const particlesRef = useRef<THREE.Points>(null);
  const progressRef = useRef<Float32Array>(new Float32Array(count));

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    // Initialize random progress for each particle
    for (let i = 0; i < count; i++) {
      progressRef.current[i] = Math.random();
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
    const actualSpeed = status === 'OPERATIONAL' ? speed * 1.5 : speed;

    for (let i = 0; i < count; i++) {
      // Update progress
      progressRef.current[i] += delta * actualSpeed;
      if (progressRef.current[i] > 1) {
        progressRef.current[i] = 0;
      }

      // Interpolate position along path
      const t = progressRef.current[i];
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t;
      const z = start.z + (end.z - start.z) * t;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial
        size={0.015}
        color={color}
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Franchise node component with pulsing behavior
function FranchiseNode({
  node,
  position,
  onHover
}: {
  node: FranchiseNode;
  position: THREE.Vector3;
  onHover: (node: FranchiseNode | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Node size based on stream count
  const size = useMemo(() => {
    return 0.08 + Math.log10(node.streams + 1) * 0.04;
  }, [node.streams]);

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();

    // Pulsing behavior based on status
    if (node.status === 'ACTIVE') {
      const pulse = 1 + Math.sin(time * 2) * 0.1;
      meshRef.current.scale.setScalar(pulse);
    } else if (node.status === 'CALIBRATING') {
      // Gentle drift for calibrating
      const drift = Math.sin(time) * 0.02;
      meshRef.current.position.y = position.y + drift;
    } else if (node.status === 'OPERATIONAL') {
      // Fast pulse for operational
      const pulse = 1 + Math.sin(time * 4) * 0.05;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  // Color based on status
  const nodeColor = useMemo(() => {
    if (node.status === 'CALIBRATING') return new THREE.Color(0x4A90E2); // Blue
    if (node.status === 'ACTIVE') return new THREE.Color(0x3FD3C6); // Aqua
    if (node.status === 'OPERATIONAL') return new THREE.Color(0x8E7CC3); // Muted purple
    return new THREE.Color(0x415A77); // Default gray-blue
  }, [node.status]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(node);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
      }}
    >
      <sphereGeometry args={[size, 24, 16]} />
      <meshStandardMaterial
        color={nodeColor}
        emissive={nodeColor}
        emissiveIntensity={hovered ? 0.5 : 0.2}
        roughness={0.3}
        metalness={0.7}
      />
    </mesh>
  );
}

// Network link with morphing behavior
function NetworkLink({
  start,
  end,
  status,
  strength = 1
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  status: string;
  strength?: number;
}) {
  const lineRef = useRef<THREE.Line>(null);

  useFrame((state) => {
    if (!lineRef.current) return;

    const time = state.clock.getElapsedTime();
    const material = lineRef.current.material as THREE.LineBasicMaterial;

    // Shift connections gently during CALIBRATING
    if (status === 'CALIBRATING') {
      material.opacity = 0.3 + Math.sin(time * 2) * 0.1;
    } else {
      material.opacity = 0.4 + strength * 0.2;
    }
  });

  const points = useMemo(() => [start, end], [start, end]);
  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <>
      <line ref={lineRef} geometry={geometry}>
        <lineBasicMaterial
          color={0x4A90E2}
          transparent
          opacity={0.4}
          linewidth={1}
        />
      </line>
      {/* Particle flow for OPERATIONAL status */}
      {status === 'OPERATIONAL' && (
        <ParticleFlow
          start={start}
          end={end}
          count={10}
          speed={1.2}
          color={new THREE.Color(0x3FD3C6)}
          status={status}
        />
      )}
    </>
  );
}

// Main network graph component
function NetworkGraph() {
  const [hoveredNode, setHoveredNode] = useState<FranchiseNode | null>(null);
  const [nodes, setNodes] = useState<FranchiseNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [systemStatus, setSystemStatus] = useState<'CALIBRATING' | 'ACTIVE' | 'OPERATIONAL'>('ACTIVE');

  // Initialize network data
  useEffect(() => {
    // Generate franchise nodes
    const franchiseNodes: FranchiseNode[] = [
      { id: 'crown-1', name: 'Crown Trophy NYC', streams: 342, latency: '8ms', status: 'OPERATIONAL' },
      { id: 'crown-2', name: 'Crown Trophy LA', streams: 278, latency: '12ms', status: 'OPERATIONAL' },
      { id: 'crown-3', name: 'Crown Trophy CHI', streams: 195, latency: '10ms', status: 'ACTIVE' },
      { id: 'crown-4', name: 'Crown Trophy MIA', streams: 156, latency: '15ms', status: 'ACTIVE' },
      { id: 'crown-5', name: 'Crown Trophy SEA', streams: 89, latency: '18ms', status: 'CALIBRATING' },
      { id: 'crown-6', name: 'Crown Trophy BOS', streams: 134, latency: '9ms', status: 'ACTIVE' },
    ];

    // Generate network links
    const networkLinks: NetworkLink[] = [
      { source: 'crown-1', target: 'crown-2', strength: 0.9 },
      { source: 'crown-1', target: 'crown-3', strength: 0.8 },
      { source: 'crown-2', target: 'crown-4', strength: 0.7 },
      { source: 'crown-3', target: 'crown-5', strength: 0.5 },
      { source: 'crown-3', target: 'crown-6', strength: 0.8 },
      { source: 'crown-4', target: 'crown-6', strength: 0.6 },
    ];

    setNodes(franchiseNodes);
    setLinks(networkLinks);

    // Cycle through statuses for demo
    const statusInterval = setInterval(() => {
      setSystemStatus((prev) => {
        if (prev === 'CALIBRATING') return 'ACTIVE';
        if (prev === 'ACTIVE') return 'OPERATIONAL';
        return 'CALIBRATING';
      });
    }, 10000);

    return () => clearInterval(statusInterval);
  }, []);

  // Calculate node positions using force-directed layout
  const nodePositions = useMemo(() => {
    const positions = new Map<string, THREE.Vector3>();
    const nodeCount = nodes.length;

    // Circular layout with some variation
    nodes.forEach((node, i) => {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 1.5 + Math.sin(i * 0.8) * 0.3;
      positions.set(
        node.id,
        new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.6,
          Math.sin(i * 0.5) * 0.2
        )
      );
    });

    return positions;
  }, [nodes]);

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={0.6} color={0x3FD3C6} />
      <pointLight position={[-5, -5, 5]} intensity={0.4} color={0x8E7CC3} />

      {/* Render nodes */}
      {nodes.map((node) => {
        const updatedNode = { ...node, status: systemStatus };
        return (
          <FranchiseNode
            key={node.id}
            node={updatedNode}
            position={nodePositions.get(node.id) || new THREE.Vector3()}
            onHover={setHoveredNode}
          />
        );
      })}

      {/* Render links */}
      {links.map((link, i) => {
        const start = nodePositions.get(link.source);
        const end = nodePositions.get(link.target);

        if (!start || !end) return null;

        return (
          <NetworkLink
            key={`${link.source}-${link.target}-${i}`}
            start={start}
            end={end}
            status={systemStatus}
            strength={link.strength}
          />
        );
      })}

      {/* Hover tooltip */}
      {hoveredNode && (
        <Html
          position={nodePositions.get(hoveredNode.id)}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
            transform: 'translate3d(50px, -50px, 0)'
          }}
        >
          <div className="bg-[#0D1B2A]/95 backdrop-blur-sm border border-[#3FD3C6]/30 px-4 py-3 rounded-lg shadow-xl">
            <div className="text-[#3FD3C6] text-xs font-mono uppercase tracking-wider mb-1">
              {hoveredNode.id}
            </div>
            <div className="text-[#F8F8F2] text-sm font-light mb-2">{hoveredNode.name}</div>
            <div className="flex gap-4 text-xs">
              <div>
                <span className="text-[#415A77]">Streams:</span>
                <span className="text-[#E0E1DD] ml-1">{hoveredNode.streams.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[#415A77]">Latency:</span>
                <span className="text-[#E0E1DD] ml-1">{hoveredNode.latency}</span>
              </div>
            </div>
          </div>
        </Html>
      )}
    </>
  );
}

export default function SystemArchitecture() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Static fallback for reduced motion or no WebGL
  if (prefersReducedMotion) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0D1B2A]/20">
        <div className="text-center">
          <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4">
            Franchise Network Status
          </div>
          <div className="text-[#E0E1DD] text-sm">
            6 franchises connected • 1,294 active streams
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace
        }}
      >
        <NetworkGraph />

        {/* Auto-rotation for visual interest */}
        <group rotation={[0, 0, 0]}>
          <mesh
            onUpdate={(self) => {
              self.rotation.y += 0.001;
            }}
          />
        </group>
      </Canvas>
    </div>
  );
}
