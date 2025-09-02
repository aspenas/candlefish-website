'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Trail, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useSpring, animated } from '@react-spring/three';

// Floating energy particles
export function EnergyParticles({ count = 200, spread = 10 }) {
  const particles = useRef<any>();
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }
    return pos;
  }, [count, spread]);

  const colors = useMemo(() => {
    const cols = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const color = new THREE.Color();
      color.setHSL(0.5 + Math.random() * 0.1, 0.8, 0.5);
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }
    return cols;
  }, [count]);

  useFrame((state) => {
    if (particles.current) {
      particles.current.rotation.y = state.clock.elapsedTime * 0.05;
      particles.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
      
      // Pulse effect
      const scale = 1 + Math.sin(state.clock.elapsedTime) * 0.1;
      particles.current.scale.setScalar(scale);
    }
  });

  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Energy beam connecting points
export function EnergyBeam({ start, end, color = "#3FD3C6", intensity = 1 }) {
  const beamRef = useRef<any>();
  const glowRef = useRef<any>();
  
  useFrame((state) => {
    if (beamRef.current) {
      beamRef.current.material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 5) * 0.3;
    }
    if (glowRef.current) {
      glowRef.current.material.emissiveIntensity = 
        0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.5;
    }
  });

  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(...start),
      new THREE.Vector3(
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2 + Math.random() * 0.5,
        (start[2] + end[2]) / 2
      ),
      new THREE.Vector3(...end)
    ]);
  }, [start, end]);

  return (
    <group>
      {/* Main beam */}
      <mesh ref={beamRef}>
        <tubeGeometry args={[curve, 32, 0.02, 8, false]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={intensity}
          transparent
          opacity={0.6}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Glow effect */}
      <mesh ref={glowRef}>
        <tubeGeometry args={[curve, 32, 0.05, 8, false]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={intensity * 0.5}
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  );
}

// Pulsing orb at data points
export function DataOrb({ position, value, label, color = "#3FD3C6" }) {
  const orbRef = useRef<any>();
  const [hovered, setHovered] = React.useState(false);
  
  const { scale } = useSpring({
    scale: hovered ? 1.5 : 1,
    config: { tension: 300, friction: 10 }
  });

  useFrame((state) => {
    if (orbRef.current) {
      orbRef.current.rotation.x = state.clock.elapsedTime;
      orbRef.current.rotation.y = state.clock.elapsedTime * 0.7;
      
      // Pulsing effect based on value
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2 + value) * 0.2;
      orbRef.current.scale.setScalar(pulse * (value / 4));
    }
  });

  return (
    <group position={position}>
      <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
        <animated.mesh
          ref={orbRef}
          scale={scale}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <icosahedronGeometry args={[0.15, 1]} />
          <MeshDistortMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            metalness={0.9}
            roughness={0.1}
            distort={0.4}
            speed={2}
          />
        </animated.mesh>
        
        {/* Outer glow */}
        <mesh scale={1.5}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshPhysicalMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.1}
            side={THREE.BackSide}
          />
        </mesh>
      </Float>
      
      {/* Value display on hover */}
      {hovered && (
        <Float speed={2}>
          <mesh position={[0, 0.5, 0]}>
            <planeGeometry args={[1, 0.3]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.8}
            />
          </mesh>
        </Float>
      )}
    </group>
  );
}

// Holographic grid floor
export function HolographicGrid() {
  const gridRef = useRef<any>();
  
  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.material.opacity = 0.1 + Math.sin(state.clock.elapsedTime) * 0.05;
    }
  });

  return (
    <mesh ref={gridRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[20, 20, 50, 50]} />
      <meshBasicMaterial
        color="#3FD3C6"
        wireframe
        transparent
        opacity={0.1}
      />
    </mesh>
  );
}

// Rotating rings around the visualization
export function OrbitalRings({ radius = 3 }) {
  const ring1Ref = useRef<any>();
  const ring2Ref = useRef<any>();
  const ring3Ref = useRef<any>();
  
  useFrame((state) => {
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = state.clock.elapsedTime * 0.3;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = state.clock.elapsedTime * 0.2;
      ring2Ref.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y = -state.clock.elapsedTime * 0.15;
      ring3Ref.current.rotation.z = state.clock.elapsedTime * 0.25;
    }
  });

  return (
    <>
      <mesh ref={ring1Ref}>
        <torusGeometry args={[radius, 0.01, 3, 100]} />
        <meshPhysicalMaterial
          color="#3FD3C6"
          emissive="#3FD3C6"
          emissiveIntensity={0.2}
          transparent
          opacity={0.3}
        />
      </mesh>
      
      <mesh ref={ring2Ref}>
        <torusGeometry args={[radius * 0.8, 0.01, 3, 100]} />
        <meshPhysicalMaterial
          color="#4FE3D6"
          emissive="#4FE3D6"
          emissiveIntensity={0.2}
          transparent
          opacity={0.2}
        />
      </mesh>
      
      <mesh ref={ring3Ref}>
        <torusGeometry args={[radius * 1.2, 0.01, 3, 100]} />
        <meshPhysicalMaterial
          color="#2FA39B"
          emissive="#2FA39B"
          emissiveIntensity={0.2}
          transparent
          opacity={0.15}
        />
      </mesh>
    </>
  );
}

// Data flow visualization
export function DataFlow({ points }) {
  const flowRef = useRef<any>();
  const time = useRef(0);
  
  useFrame((state, delta) => {
    time.current += delta;
    
    if (flowRef.current) {
      const positions = flowRef.current.geometry.attributes.position.array;
      
      for (let i = 0; i < positions.length; i += 3) {
        const t = (time.current + i * 0.01) % 1;
        const pointIndex = Math.floor(t * (points.length - 1));
        const nextIndex = Math.min(pointIndex + 1, points.length - 1);
        
        const point = points[pointIndex];
        const nextPoint = points[nextIndex];
        
        const alpha = (t * (points.length - 1)) % 1;
        
        positions[i] = point[0] + (nextPoint[0] - point[0]) * alpha;
        positions[i + 1] = point[1] + (nextPoint[1] - point[1]) * alpha;
        positions[i + 2] = point[2] + (nextPoint[2] - point[2]) * alpha;
      }
      
      flowRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(100 * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <points ref={flowRef} geometry={geometry}>
      <pointsMaterial
        color="#3FD3C6"
        size={0.03}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}