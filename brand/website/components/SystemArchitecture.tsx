'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { getFranchiseGraph } from '../lib/api';
import type { FranchiseGraph, FranchiseNode as FranchiseNodeType } from '../types/api';

// Vertex shader for nodes
const nodeVertexShader = `
  attribute vec3 position;
  uniform float uTime;
  varying float vPulse;

  void main() {
    vPulse = 0.5 + 0.5 * sin(uTime + position.x * 0.1);
    vec3 displaced = position + normal * vPulse * 0.05;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

// Fragment shader for nodes
const nodeFragmentShader = `
  uniform vec3 uBaseColor;
  uniform float uState;
  varying float vPulse;

  void main() {
    vec3 color = uBaseColor;

    if (uState < 0.5) {
      // CALIBRATING - blue tint
      color = mix(color, vec3(0.3,0.6,1.0), 0.3 + 0.2*vPulse);
    } else if (uState < 1.5) {
      // ACTIVE - pulsing brightness
      color *= (0.8 + 0.2*vPulse);
    } else {
      // OPERATIONAL - white pulse
      color = mix(color, vec3(0.9,0.95,1.0), vPulse * 0.5);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Particle system for data flow
function ParticleFlow({
  start,
  end,
  count = 20,
  speed = 0.5,
  color = new THREE.Color(0x3FD3C6)
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  count?: number;
  speed?: number;
  color?: THREE.Color;
}) {
  const particlesRef = useRef<THREE.Points>(null);
  const progressRef = useRef<Float32Array>(new Float32Array(count));

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      progressRef.current[i] = Math.random();
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [count]);

  useFrame((state, delta) => {
    if (!particlesRef.current) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      progressRef.current[i] += delta * speed;
      if (progressRef.current[i] > 1) {
        progressRef.current[i] = 0;
      }

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
        size={0.02}
        color={color}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Franchise node component
function FranchiseNode({
  node,
  position,
  status,
  onHover
}: {
  node: FranchiseNodeType;
  position: THREE.Vector3;
  status: 'CALIBRATING' | 'ACTIVE' | 'OPERATIONAL';
  onHover: (node: FranchiseNodeType | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Calculate node size based on streams (log scale)
  const size = useMemo(() => {
    return 0.1 + Math.log10(node.streams + 1) * 0.05;
  }, [node.streams]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  const stateValue = status === 'CALIBRATING' ? 0 : status === 'ACTIVE' ? 1 : 2;

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={() => onHover(node)}
      onPointerOut={() => onHover(null)}
    >
      <sphereGeometry args={[size, 32, 16]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={nodeVertexShader}
        fragmentShader={nodeFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uBaseColor: { value: new THREE.Color(0x415A77) },
          uState: { value: stateValue }
        }}
      />
    </mesh>
  );
}

// Link component
function NetworkLink({
  start,
  end,
  status
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  status: 'CALIBRATING' | 'ACTIVE' | 'OPERATIONAL';
}) {
  const lineRef = useRef<any>(null);

  const points = useMemo(() => {
    return [start, end];
  }, [start, end]);

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  useFrame((state) => {
    if (!lineRef.current || status !== 'CALIBRATING') return;

    // Gentle drift for calibrating state
    const time = state.clock.getElapsedTime();
    const material = lineRef.current.material as THREE.LineBasicMaterial;
    material.opacity = 0.3 + Math.sin(time) * 0.1;
  });

  return (
    <>
      <mesh ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={0x3FD3C6}
          transparent
          opacity={status === 'CALIBRATING' ? 0.3 : 0.5}
        />
      </mesh>
      {status === 'OPERATIONAL' && (
        <ParticleFlow
          start={start}
          end={end}
          count={10}
          speed={status === 'OPERATIONAL' ? 1 : 0.5}
        />
      )}
    </>
  );
}

// Main graph component
function NetworkGraph({ data }: { data: FranchiseGraph }) {
  const [hoveredNode, setHoveredNode] = useState<FranchiseNodeType | null>(null);

  // Calculate node positions using force-directed layout simulation
  const nodePositions = useMemo(() => {
    const positions = new Map<string, THREE.Vector3>();
    const nodeCount = data.franchises.length;

    // Simple circular layout for now
    data.franchises.forEach((node, i) => {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 2;
      positions.set(
        node.id,
        new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.5, // Elliptical
          0
        )
      );
    });

    return positions;
  }, [data]);

  return (
    <>
      {/* Nodes */}
      {data.franchises.map((node) => (
        <FranchiseNode
          key={node.id}
          node={node}
          position={nodePositions.get(node.id) || new THREE.Vector3()}
          status={data.status}
          onHover={setHoveredNode}
        />
      ))}

      {/* Links */}
      {data.links.map((link, i) => {
        const start = nodePositions.get(link.source);
        const end = nodePositions.get(link.target);

        if (!start || !end) return null;

        return (
          <NetworkLink
            key={`${link.source}-${link.target}-${i}`}
            start={start}
            end={end}
            status={data.status}
          />
        );
      })}

      {/* Tooltip */}
      {hoveredNode && (
        <Html
          position={nodePositions.get(hoveredNode.id)}
          style={{
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          <div className="bg-[#1B263B]/95 backdrop-blur-sm border border-[#415A77]/30 px-3 py-2 rounded shadow-lg">
            <div className="text-[#3FD3C6] text-xs font-mono mb-1">{hoveredNode.id}</div>
            <div className="text-[#F8F8F2] text-sm font-light">{hoveredNode.name}</div>
            <div className="text-[#415A77] text-xs mt-1">
              {hoveredNode.streams.toLocaleString()} streams • {hoveredNode.latency}
            </div>
          </div>
        </Html>
      )}
    </>
  );
}

export default function SystemArchitecture() {
  const [data, setData] = useState<FranchiseGraph>({
    franchises: [],
    links: [],
    status: 'CALIBRATING'
  });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Load franchise data
  useEffect(() => {
    const loadData = async () => {
      const graphData = await getFranchiseGraph();
      setData(graphData);
    };

    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

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

  // Static fallback for reduced motion
  if (prefersReducedMotion || !data.franchises.length) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#1B263B]/20">
        <div className="text-center">
          <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4">
            System Status: {data.status}
          </div>
          <div className="space-y-2">
            {data.franchises.map((node) => (
              <div key={node.id} className="text-[#E0E1DD] text-sm">
                {node.name} • {node.streams} streams
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />

        <NetworkGraph data={data} />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={true}
          autoRotate={data.status === 'OPERATIONAL'}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
