'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Float, 
  MeshDistortMaterial,
  Environment,
  Sparkles,
  Trail,
  Text3D,
  Center,
  useTexture,
  shaderMaterial
} from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Glitch, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useSpring, animated, config } from '@react-spring/three';
import type { DimensionScore } from '@/types/assessment';
import { EnergyParticles, EnergyBeam, DataOrb, HolographicGrid, OrbitalRings } from './dimensional-effects';

// Custom shader for holographic effect
const HolographicMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(0.2, 0.8, 0.7),
    opacity: 0.8
  },
  // Vertex shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      float pulse = sin(time * 2.0) * 0.5 + 0.5;
      float scanline = sin(vUv.y * 100.0 + time * 5.0) * 0.03;
      float glitch = step(0.98, sin(time * 20.0)) * 0.05;
      
      vec3 finalColor = color + vec3(scanline) + vec3(glitch);
      float finalOpacity = opacity * (0.8 + pulse * 0.2);
      
      gl_FragColor = vec4(finalColor, finalOpacity);
    }
  `
);


// Main 3D Radar Component
function Radar3D({ dimensions, industry }: { dimensions: DimensionScore[], industry?: number[] }) {
  const groupRef = useRef<any>();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
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
        ],
        value: dim.rawScore,
        label: dim.name,
        dimension: dim
      };
    });
  }, [dimensions]);

  return (
    <group ref={groupRef}>
      {/* Holographic grid floor */}
      <HolographicGrid />
      
      {/* Orbital rings for visual depth */}
      <OrbitalRings radius={2.5} />
      
      {/* Base grid */}
      <group>
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
      </group>

      {/* Axis lines */}
      {dimensions.map((_, i) => {
        const angle = (i / dimensions.length) * Math.PI * 2;
        return (
          <mesh key={i}>
            <boxGeometry args={[0.01, 0.01, 4]} />
            <meshBasicMaterial color="#415A77" transparent opacity={0.3} />
            <mesh rotation={[0, angle, 0]} />
          </mesh>
        );
      })}

      {/* Enhanced data points with orbs */}
      {dataPoints.map((point, i) => (
        <DataOrb
          key={i}
          position={point.position}
          value={point.value}
          label={point.label}
          color="#3FD3C6"
        />
      ))}

      {/* Energy beams connecting points */}
      {dataPoints.map((point, i) => {
        const nextPoint = dataPoints[(i + 1) % dataPoints.length];
        return (
          <EnergyBeam
            key={`beam-${i}`}
            start={point.position}
            end={nextPoint.position}
            color="#3FD3C6"
            intensity={0.5 + point.value * 0.2}
          />
        );
      })}

      {/* Enhanced particle field */}
      <EnergyParticles count={300} spread={5} />

      {/* Particle field */}
      <Sparkles
        count={100}
        scale={5}
        size={1}
        speed={0.2}
        opacity={0.5}
        color="#3FD3C6"
      />

      {/* Floating labels */}
      {dimensions.map((dim, i) => {
        const angle = (i / dimensions.length) * Math.PI * 2;
        const radius = 2.5;
        return (
          <Float key={i} speed={1} rotationIntensity={0.2} floatIntensity={0.3}>
            <Center
              position={[
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
              ]}
            >
              <Text3D
                font="/fonts/helvetiker_regular.typeface.json"
                size={0.1}
                height={0.01}
                curveSegments={12}
              >
                {dim.name}
                <meshPhysicalMaterial
                  color="#E0E1DD"
                  emissive="#E0E1DD"
                  emissiveIntensity={0.2}
                />
              </Text3D>
            </Center>
          </Float>
        );
      })}
    </group>
  );
}

// Scene setup component
function Scene({ dimensions, industry }: { dimensions: DimensionScore[], industry?: number[] }) {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(4, 3, 5);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
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
      
      <Radar3D dimensions={dimensions} industry={industry} />
      
      <Environment preset="night" />
      
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
          radius={0.8}
        />
        <ChromaticAberration offset={[0.002, 0.002]} />
        <Vignette offset={0.3} darkness={0.5} />
      </EffectComposer>
    </>
  );
}

// Main component
export function DimensionalRadar3D({ 
  dimensions, 
  industry 
}: { 
  dimensions: DimensionScore[], 
  industry?: number[] 
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
      {/* Scanline effect overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="scanlines"></div>
      </div>
      
      <div className="relative" style={{ height: '600px' }}>
        <Canvas shadows dpr={[1, 2]}>
          <Scene dimensions={dimensions} industry={industry} />
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

      <style jsx>{`
        .scanlines {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            transparent 50%,
            rgba(63, 211, 198, 0.03) 50%
          );
          background-size: 100% 4px;
          animation: scanline 8s linear infinite;
          pointer-events: none;
        }

        @keyframes scanline {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(10px);
          }
        }
      `}</style>
    </div>
  );
}