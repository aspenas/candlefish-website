'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Float, 
  MeshDistortMaterial,
  Sparkles
} from '@react-three/drei';
import * as THREE from 'three';
import type { DimensionScore } from '@/types/assessment';

// Animated data point component
function DataPoint({ position, value, label, delay = 0 }: any) {
  const meshRef = useRef<any>();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + delay) * 0.05;
    }
  });

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh
          ref={meshRef}
          scale={hovered ? 1.5 : 1}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <octahedronGeometry args={[0.1, 0]} />
          <meshPhysicalMaterial
            color={hovered ? '#4FE3D6' : '#3FD3C6'}
            emissive={hovered ? '#4FE3D6' : '#3FD3C6'}
            emissiveIntensity={0.5}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </Float>
      
      <Sparkles
        count={20}
        scale={0.5}
        size={2}
        speed={0.5}
        opacity={hovered ? 1 : 0.3}
        color="#3FD3C6"
      />
    </group>
  );
}

// Main 3D Radar Component
function Radar3D({ dimensions }: { dimensions: DimensionScore[] }) {
  const groupRef = useRef<any>();
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  // Calculate 3D positions for radar points
  const dataPoints = useMemo(() => {
    return dimensions.map((dim, i) => {
      const angle = (i / dimensions.length) * Math.PI * 2;
      const radius = (dim.rawScore / 4) * 2;
      return {
        position: [
          Math.cos(angle) * radius,
          Math.sin(i * 0.5) * 0.3,
          Math.sin(angle) * radius
        ] as [number, number, number],
        value: dim.rawScore,
        label: dim.name
      };
    });
  }, [dimensions]);

  // Create line geometry connecting points
  const lineGeometry = useMemo(() => {
    const points = dataPoints.map(p => new THREE.Vector3(...p.position));
    points.push(points[0]); // Close the loop
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [dataPoints]);

  return (
    <group ref={groupRef}>
      {/* Base grid rings */}
      {[1, 2, 3, 4].map((level) => (
        <mesh key={level} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[level * 0.5 - 0.02, level * 0.5, 32]} />
          <meshBasicMaterial
            color="#415A77"
            transparent
            opacity={0.2}
            wireframe
          />
        </mesh>
      ))}

      {/* Data points */}
      {dataPoints.map((point, i) => (
        <DataPoint
          key={i}
          position={point.position}
          value={point.value}
          label={point.label}
          delay={i * 0.1}
        />
      ))}

      {/* Connection lines */}
      <line geometry={lineGeometry}>
        <lineBasicMaterial color="#3FD3C6" transparent opacity={0.5} />
      </line>

      {/* Particle field */}
      <Sparkles
        count={100}
        scale={5}
        size={1}
        speed={0.2}
        opacity={0.5}
        color="#3FD3C6"
      />
    </group>
  );
}

// Main component
export function DimensionalRadarEnhanced({ 
  dimensions
}: { 
  dimensions: DimensionScore[]
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="relative bg-[#1C1C1C] p-8 rounded h-[600px] flex items-center justify-center">
        <div className="text-[#3FD3C6] animate-pulse">Loading 3D Visualization...</div>
      </div>
    );
  }

  return (
    <div className="relative bg-[#1C1C1C] p-8 rounded overflow-hidden">
      <div className="relative" style={{ height: '600px' }}>
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[4, 3, 5]} />
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            maxPolarAngle={Math.PI * 0.85}
            minPolarAngle={Math.PI * 0.15}
            autoRotate
            autoRotateSpeed={0.5}
          />
          
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <pointLight position={[-10, -10, -10]} intensity={0.3} color="#3FD3C6" />
          
          <Radar3D dimensions={dimensions} />
        </Canvas>
      </div>

      {/* UI Overlay */}
      <div className="absolute top-8 left-8 pointer-events-none">
        <div className="text-[#3FD3C6] font-mono text-xs opacity-80">
          <div>OPERATIONAL PORTRAIT v2.0</div>
          <div className="text-[#415A77] mt-1">REALTIME DIMENSIONAL ANALYSIS</div>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 pointer-events-none">
        <div className="text-[#E0E1DD] text-xs opacity-60">
          <div>Click and drag to rotate</div>
          <div>Scroll to zoom</div>
        </div>
      </div>
    </div>
  );
}