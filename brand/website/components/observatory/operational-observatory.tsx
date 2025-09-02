'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment,
  Float,
  Stars,
  Trail,
  MeshDistortMaterial,
  MeshWobbleMaterial,
  Sparkles,
  Cloud,
  useTexture,
  Text,
  Html
} from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { EffectComposer, Bloom, ChromaticAberration, Vignette, DepthOfField } from '@react-three/postprocessing';
import type { AssessmentScore, OperationalPortrait } from '@/types/assessment';
import { SpatialAudio, AudioToggle } from './spatial-audio';

// Dimensional Orb Component - Each assessment dimension as a celestial body
function DimensionalOrb({ 
  dimension, 
  score, 
  position, 
  index,
  onHover,
  onSelect 
}: {
  dimension: string;
  score: number;
  position: [number, number, number];
  index: number;
  onHover: (dimension: string | null) => void;
  onSelect: (dimension: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);
  
  // Normalize score to size (0.5 to 2.5)
  const size = 0.5 + (score / 100) * 2;
  
  // Color based on score performance
  const color = useMemo(() => {
    if (score >= 80) return '#3FD3C6'; // Cyan for excellence
    if (score >= 60) return '#60A5FA'; // Blue for good
    if (score >= 40) return '#FBBF24'; // Amber for developing
    return '#F87171'; // Red for needs attention
  }, [score]);

  // Pulsation based on improvement velocity
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Gentle rotation
    meshRef.current.rotation.x += 0.001;
    meshRef.current.rotation.y += 0.002;
    
    // Pulsation effect
    const pulse = Math.sin(state.clock.elapsedTime * 2 + index) * 0.05;
    meshRef.current.scale.setScalar(size + pulse);
    
    // Hover effect
    if (hovered) {
      meshRef.current.scale.setScalar(size * 1.1 + pulse);
    }
  });

  return (
    <Float
      speed={1 + index * 0.1}
      rotationIntensity={0.5}
      floatIntensity={0.5}
    >
      <group position={position}>
        {/* Orbital rings showing benchmarks */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 1.5, 0.02, 8, 64]} />
          <meshBasicMaterial color={color} opacity={0.2} transparent />
        </mesh>
        
        {/* Main orb */}
        <mesh
          ref={meshRef}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            onHover(dimension);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            onHover(null);
            document.body.style.cursor = 'auto';
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelected(!selected);
            onSelect(dimension);
          }}
        >
          <sphereGeometry args={[size, 32, 32]} />
          <MeshDistortMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.5 : 0.2}
            roughness={0.1}
            metalness={0.8}
            distort={0.2}
            speed={2}
          />
        </mesh>
        
        {/* Particle aura */}
        <Sparkles
          count={score}
          scale={size * 2}
          size={2}
          speed={0.4}
          color={color}
        />
        
        {/* Label */}
        {hovered && (
          <Html
            position={[0, size + 1, 0]}
            center
            style={{
              transition: 'all 0.2s',
              opacity: hovered ? 1 : 0,
            }}
          >
            <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-lg border border-cyan-500/30">
              <div className="text-cyan-400 font-mono text-sm">{dimension}</div>
              <div className="text-white text-2xl font-bold">{score}%</div>
            </div>
          </Html>
        )}
      </group>
    </Float>
  );
}

// Synaptic Bridge - Neural connections between dimensions
function SynapticBridge({ 
  start, 
  end, 
  strength 
}: {
  start: [number, number, number];
  end: [number, number, number];
  strength: number;
}) {
  const lineRef = useRef<THREE.Line>(null);
  
  // Create curve between points
  const curve = useMemo(() => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const midPoint = startVec.clone().add(endVec).multiplyScalar(0.5);
    midPoint.y += 1; // Arc upward
    
    return new THREE.QuadraticBezierCurve3(startVec, midPoint, endVec);
  }, [start, end]);
  
  const points = curve.getPoints(50);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  // Animate data flow
  useFrame((state) => {
    if (!lineRef.current) return;
    const material = lineRef.current.material as THREE.LineBasicMaterial;
    material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
  });
  
  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial 
        color="#3FD3C6" 
        opacity={strength} 
        transparent 
        linewidth={2}
      />
    </line>
  );
}

// Ambient particle field
function ParticleField({ count = 500 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return positions;
  }, [count]);
  
  useFrame((state) => {
    if (!points.current) return;
    points.current.rotation.x = state.clock.elapsedTime * 0.01;
    points.current.rotation.y = state.clock.elapsedTime * 0.02;
  });
  
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#3FD3C6"
        transparent
        opacity={0.3}
        sizeAttenuation
      />
    </points>
  );
}

// Main Observatory Scene
function ObservatoryScene({ 
  score, 
  portrait,
  onHoverDimension,
  onSelectDimension
}: { 
  score: AssessmentScore; 
  portrait: OperationalPortrait;
  onHoverDimension: (dimension: string | null) => void;
  onSelectDimension: (dimension: string | null) => void;
}) {
  const handleHover = (dimension: string | null) => {
    onHoverDimension(dimension);
  };
  
  const handleSelect = (dimension: string) => {
    onSelectDimension(dimension);
  };
  
  // Calculate positions for orbs in a 3D spiral
  const orbPositions = useMemo(() => {
    const dimensions = Object.keys(score.dimensions);
    return dimensions.map((_, i) => {
      const angle = (i / dimensions.length) * Math.PI * 2;
      const radius = 8 + i * 0.5;
      const height = Math.sin(i * 0.5) * 3;
      return [
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      ] as [number, number, number];
    });
  }, [score]);
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.1} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#3FD3C6" />
      
      {/* Background */}
      <Stars 
        radius={100} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0} 
        fade 
        speed={1}
      />
      
      {/* Particle field */}
      <ParticleField count={300} />
      
      {/* Dimensional orbs */}
      {Object.entries(score.dimensions).map(([dimension, value], index) => (
        <DimensionalOrb
          key={dimension}
          dimension={dimension}
          score={value}
          position={orbPositions[index]}
          index={index}
          onHover={handleHover}
          onSelect={handleSelect}
        />
      ))}
      
      {/* Synaptic bridges between related dimensions */}
      {orbPositions.map((start, i) => 
        orbPositions.slice(i + 1).map((end, j) => {
          const strength = Math.random() * 0.5 + 0.2; // Correlation strength
          return (
            <SynapticBridge
              key={`${i}-${j}`}
              start={start}
              end={end}
              strength={strength}
            />
          );
        })
      )}
      
      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        maxDistance={30}
        minDistance={5}
        autoRotate
        autoRotateSpeed={0.5}
        dampingFactor={0.05}
        enableDamping
      />
      
      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom 
          intensity={0.5} 
          luminanceThreshold={0.2} 
          luminanceSmoothing={0.9} 
        />
        <ChromaticAberration offset={[0.0005, 0.0005]} />
        <Vignette eskil={false} offset={0.1} darkness={0.4} />
        <DepthOfField 
          focusDistance={0}
          focalLength={0.02}
          bokehScale={2}
          height={480}
        />
      </EffectComposer>
    </>
  );
}

// Main Component
export function OperationalObservatory({
  score,
  portrait,
  responses,
  sessionId,
  onRequestConsultation
}: {
  score: AssessmentScore;
  portrait: OperationalPortrait;
  responses: any[];
  sessionId: string;
  onRequestConsultation: () => void;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [showInsights, setShowInsights] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [hoveredDimension, setHoveredDimension] = useState<string | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  
  // Progressive reveal timing
  useEffect(() => {
    const timer1 = setTimeout(() => setIsLoading(false), 1000);
    const timer2 = setTimeout(() => setShowInsights(true), 5000);
    const timer3 = setTimeout(() => setShowCTA(true), 15000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);
  
  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden">
      {/* Loading state */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950"
          >
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-8 relative">
                <div className="absolute inset-0 border-4 border-cyan-500/20 rounded-full animate-ping" />
                <div className="absolute inset-0 border-4 border-cyan-500/40 rounded-full animate-ping animation-delay-200" />
                <div className="absolute inset-0 border-4 border-cyan-500/60 rounded-full animate-ping animation-delay-400" />
              </div>
              <h2 className="text-cyan-400 text-xl font-mono">Initializing Observatory</h2>
              <p className="text-gray-500 text-sm mt-2">Analyzing operational constellation...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main 3D Scene */}
      <Canvas
        camera={{ position: [0, 5, 20], fov: 60 }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
      >
        <Suspense fallback={null}>
          <ObservatoryScene 
            score={score} 
            portrait={portrait}
            onHoverDimension={setHoveredDimension}
            onSelectDimension={setSelectedDimension}
          />
        </Suspense>
      </Canvas>
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex justify-between items-start"
          >
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Your Operational Observatory
              </h1>
              <p className="text-cyan-400 font-mono">
                Maturity Score: {score.overall}% | Classification: {portrait.classification}
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-gray-400 text-sm">Session {sessionId}</div>
              <div className="text-gray-500 text-xs mt-1">
                {new Date().toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Insights Panel */}
        <AnimatePresence>
          {showInsights && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="absolute right-8 top-32 w-96 pointer-events-auto"
            >
              <div className="bg-slate-900/80 backdrop-blur-xl rounded-lg border border-cyan-500/30 p-6">
                <h3 className="text-cyan-400 font-mono text-sm mb-4">DIMENSIONAL ANALYSIS</h3>
                
                {/* Top strengths */}
                <div className="mb-6">
                  <h4 className="text-white text-sm font-semibold mb-2">Core Strengths</h4>
                  {portrait.strengths.slice(0, 3).map((strength, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                      <span className="text-gray-300 text-sm">{strength}</span>
                    </div>
                  ))}
                </div>
                
                {/* Improvement areas */}
                <div className="mb-6">
                  <h4 className="text-white text-sm font-semibold mb-2">Growth Opportunities</h4>
                  {portrait.improvements.slice(0, 2).map((improvement, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-amber-400 rounded-full" />
                      <span className="text-gray-300 text-sm">{improvement}</span>
                    </div>
                  ))}
                </div>
                
                {/* Industry comparison */}
                <div className="border-t border-gray-700 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400 text-sm">Industry Percentile</span>
                    <span className="text-cyan-400 font-mono text-lg">
                      {Math.round(score.overall * 0.8 + 20)}th
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score.overall}%` }}
                      transition={{ delay: 0.5, duration: 1.5 }}
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* CTA */}
        <AnimatePresence>
          {showCTA && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto"
            >
              <button
                onClick={onRequestConsultation}
                className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-400 
                         text-slate-900 font-semibold rounded-lg overflow-hidden
                         hover:shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300"
              >
                <span className="relative z-10">Unlock Full Observatory Access</span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
              </button>
              
              <div className="text-center mt-3">
                <span className="text-gray-400 text-sm">
                  Join 1,247 operational leaders • Limited availability
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Navigation hints */}
        <div className="absolute bottom-8 right-20 text-gray-500 text-xs font-mono pointer-events-auto">
          <div>DRAG to rotate</div>
          <div>SCROLL to zoom</div>
          <div>CLICK orbs for details</div>
        </div>
      </div>
      
      {/* Spatial Audio */}
      <SpatialAudio
        enabled={audioEnabled}
        score={score.overall}
        hoveredDimension={hoveredDimension}
        selectedDimension={selectedDimension}
      />
      
      {/* Audio Toggle */}
      <AudioToggle
        enabled={audioEnabled}
        onToggle={setAudioEnabled}
      />
    </div>
  );
}