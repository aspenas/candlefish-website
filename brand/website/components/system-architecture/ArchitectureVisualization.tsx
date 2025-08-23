'use client'

import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber'
import { Text, Sphere, Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'

// Extend Three.js materials for custom effects
extend({ ShaderMaterial: THREE.ShaderMaterial })

interface Node {
  id: string
  label: string
  position: [number, number, number]
  radius: number
  color: string
  connections: string[]
  isActive: boolean
  layer: number
  processCount: number
  load: number
  intensity: number
  type: 'primary' | 'secondary' | 'tertiary'
}

interface FlowParticle {
  id: string
  position: THREE.Vector3
  target: THREE.Vector3
  progress: number
  speed: number
  path: string[]
  currentPath: number
  color: string
  size: number
  opacity: number
  trail: Array<{ position: THREE.Vector3; opacity: number; timestamp: number }>
  velocity: THREE.Vector3
  acceleration: THREE.Vector3
  lifecycle: number
}

interface PerformanceMetric {
  label: string
  before: string
  after: string
  value: number
  unit: string
  improvement: string
}

// Custom shaders for premium effects
const nodeVertexShader = `
  uniform float time;
  uniform float intensity;
  uniform float size;
  attribute float alpha;
  varying float vAlpha;
  varying vec2 vUv;
  varying float vIntensity;
  varying vec3 vNormal;

  void main() {
    vAlpha = alpha;
    vUv = uv;
    vIntensity = intensity;
    vNormal = normalize(normalMatrix * normal);

    vec3 pos = position;
    // Subtle pulsing effect based on activity
    float pulse = sin(time * 2.0 + pos.x * 0.5) * 0.02;
    pos += normal * pulse * intensity;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const nodeFragmentShader = `
  uniform vec3 color;
  uniform float time;
  uniform float intensity;
  varying float vAlpha;
  varying vec2 vUv;
  varying float vIntensity;
  varying vec3 vNormal;

  void main() {
    // Create fresnel effect
    vec3 viewDirection = normalize(cameraPosition - gl_FragCoord.xyz);
    float fresnel = pow(1.0 - dot(vNormal, viewDirection), 2.0);

    // Add animated glow rings
    float rings = sin(length(vUv - 0.5) * 15.0 - time * 5.0) * 0.5 + 0.5;
    rings *= vIntensity;

    // Core color with intensity modulation
    vec3 finalColor = color + vec3(rings * 0.3) + vec3(fresnel * vIntensity * 0.5);

    // Distance fade for depth
    float center = length(vUv - 0.5);
    float alpha = 1.0 - smoothstep(0.3, 0.7, center);
    alpha *= (0.7 + vIntensity * 0.3);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const connectionVertexShader = `
  uniform float time;
  uniform float intensity;
  uniform float flowSpeed;
  attribute float flowProgress;
  varying float vFlowProgress;
  varying float vIntensity;
  varying float vTime;

  void main() {
    vFlowProgress = flowProgress;
    vIntensity = intensity;
    vTime = time;

    vec3 pos = position;
    // Add organic wave motion
    float wave = sin(time * flowSpeed + flowProgress * 12.566) * 0.005; // 12.566 = 4*PI
    pos += vec3(0.0, wave * intensity, 0.0);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const connectionFragmentShader = `
  uniform vec3 startColor;
  uniform vec3 endColor;
  uniform float time;
  uniform float flowSpeed;
  varying float vFlowProgress;
  varying float vIntensity;
  varying float vTime;

  void main() {
    // Create flowing energy effect
    float flow = sin(vTime * flowSpeed * 2.0 + vFlowProgress * 15.708) * 0.5 + 0.5; // 15.708 = 5*PI

    // Multi-layer flow effects
    float flow2 = sin(vTime * flowSpeed * 3.0 - vFlowProgress * 18.85) * 0.3 + 0.7; // 18.85 = 6*PI

    // Interpolate colors with flow effects
    vec3 color = mix(startColor, endColor, vFlowProgress * 0.5 + flow * 0.5);
    color += vec3(flow2 * vIntensity * 0.2);

    // Dynamic alpha based on intensity and flow
    float alpha = vIntensity * (0.4 + flow * 0.6) * flow2;

    gl_FragColor = vec4(color, alpha);
  }
`;

const ArchitectureVisualization: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [currentMetric, setCurrentMetric] = useState(0)
  const [animationPhase, setAnimationPhase] = useState<'loading' | 'active' | 'complete'>('loading')
  const [flowParticles, setFlowParticles] = useState<FlowParticle[]>([])
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set())
  const [nodeLoads, setNodeLoads] = useState<Map<string, number>>(new Map())
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([0, 0, 5])
  const [autoRotate, setAutoRotate] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  const performanceMetrics: PerformanceMetric[] = [
    { label: 'Processing Time', before: '45+ min', after: '<1 min', value: 98, unit: '%', improvement: 'reduction' },
    { label: 'Error Rate', before: '12%', after: '<1%', value: 92, unit: '%', improvement: 'reduction' },
    { label: 'Throughput', before: '1.3/hr', after: '60/hr', value: 4600, unit: '%', improvement: 'increase' },
    { label: 'Labor Cost', before: '$45', after: '$0.75', value: 98, unit: '%', improvement: 'reduction' }
  ]

  // Define 3D system nodes with enhanced properties
  const nodes: Node[] = [
    // Primary pipeline (front layer) - using brand colors
    {
      id: 'intake', label: 'Intake',
      position: [-3, 1, 0.5], radius: 0.15, color: '#3FD3C6',
      connections: ['validation'], isActive: false, layer: 1,
      processCount: 0, load: 0, intensity: 0, type: 'primary'
    },
    {
      id: 'validation', label: 'Validation',
      position: [-1, 1, 0.5], radius: 0.15, color: '#3FD3C6',
      connections: ['processing', 'inventory'], isActive: false, layer: 1,
      processCount: 0, load: 0, intensity: 0, type: 'primary'
    },
    {
      id: 'processing', label: 'Processing',
      position: [1, 1, 0.5], radius: 0.15, color: '#3FD3C6',
      connections: ['delivery', 'assembly'], isActive: false, layer: 1,
      processCount: 0, load: 0, intensity: 0, type: 'primary'
    },
    {
      id: 'delivery', label: 'Delivery',
      position: [3, 1, 0.5], radius: 0.15, color: '#3FD3C6',
      connections: [], isActive: false, layer: 1,
      processCount: 0, load: 0, intensity: 0, type: 'primary'
    },

    // Secondary subsystem nodes (middle layer)
    {
      id: 'inventory', label: 'Inventory',
      position: [-2, 0, 0], radius: 0.12, color: '#DAA520',
      connections: ['engraving'], isActive: false, layer: 2,
      processCount: 0, load: 0, intensity: 0, type: 'secondary'
    },
    {
      id: 'engraving', label: 'Engraving',
      position: [0, 0, 0], radius: 0.12, color: '#DAA520',
      connections: ['assembly'], isActive: false, layer: 2,
      processCount: 0, load: 0, intensity: 0, type: 'secondary'
    },
    {
      id: 'assembly', label: 'Assembly',
      position: [2, 0, 0], radius: 0.12, color: '#DAA520',
      connections: ['qa'], isActive: false, layer: 2,
      processCount: 0, load: 0, intensity: 0, type: 'secondary'
    },

    // Tertiary quality & shipping (back layer)
    {
      id: 'qa', label: 'QA',
      position: [-1, -1, -0.5], radius: 0.1, color: '#69A3B0',
      connections: ['shipping'], isActive: false, layer: 3,
      processCount: 0, load: 0, intensity: 0, type: 'tertiary'
    },
    {
      id: 'shipping', label: 'Shipping',
      position: [1, -1, -0.5], radius: 0.1, color: '#69A3B0',
      connections: [], isActive: false, layer: 3,
      processCount: 0, load: 0, intensity: 0, type: 'tertiary'
    }
  ]

  // Enhanced 3D particle creation with physics
  const createParticle = useCallback((): FlowParticle => {
    const paths = [
      ['intake', 'validation', 'processing', 'delivery'],
      ['validation', 'inventory', 'engraving', 'assembly', 'qa', 'shipping'],
      ['processing', 'assembly', 'qa', 'shipping'],
      ['intake', 'validation', 'inventory', 'engraving', 'assembly', 'qa', 'shipping']
    ];

    const selectedPath = paths[Math.floor(Math.random() * paths.length)];
    const startNode = nodes.find(n => n.id === selectedPath[0])!;

    return {
      id: Math.random().toString(36),
      position: new THREE.Vector3(...startNode.position),
      target: new THREE.Vector3(...startNode.position),
      progress: 0,
      speed: 0.008 + Math.random() * 0.012,
      path: selectedPath,
      currentPath: 0,
      color: `hsl(${175 + Math.random() * 30}, ${70 + Math.random() * 20}%, ${60 + Math.random() * 25}%)`,
      size: 0.02 + Math.random() * 0.03,
      opacity: 0.7 + Math.random() * 0.3,
      trail: [],
      velocity: new THREE.Vector3(),
      acceleration: new THREE.Vector3(),
      lifecycle: 0
    };
  }, []);

  // Node component with custom shader material
  const NodeSphere: React.FC<{ node: Node; isActive: boolean; load: number }> = ({ node, isActive, load }) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const materialRef = useRef<THREE.ShaderMaterial>(null!);

    const uniforms = {
      time: { value: 0 },
      color: { value: new THREE.Color(node.color) },
      intensity: { value: isActive ? 1 : 0 },
      size: { value: node.radius }
    };

    useFrame(({ clock }) => {
      if (materialRef.current) {
        materialRef.current.uniforms.time.value = clock.elapsedTime;
        materialRef.current.uniforms.intensity.value = THREE.MathUtils.lerp(
          materialRef.current.uniforms.intensity.value,
          isActive ? 1 + load : 0.3,
          0.05
        );
      }

      if (meshRef.current && isActive) {
        meshRef.current.rotation.y += 0.01;
        meshRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2) * 0.1 * load);
      }
    });

    return (
      <mesh ref={meshRef} position={node.position}>
        <sphereGeometry args={[node.radius, 32, 32]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={nodeVertexShader}
          fragmentShader={nodeFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
        <Html
          position={[0, node.radius + 0.3, 0]}
          center
          distanceFactor={8}
          occlude
          style={{
            color: '#F8F8F2',
            fontSize: '12px',
            fontFamily: 'SF Mono, Monaco, Consolas, monospace',
            fontWeight: '300',
            textAlign: 'center',
            pointerEvents: 'none',
            userSelect: 'none',
            letterSpacing: '0.05em',
            textShadow: '0 0 10px rgba(0,0,0,0.5)'
          }}
        >
          {node.label}
        </Html>
      </mesh>
    );
  };

  // Connection component with flow animation
  const ConnectionLine: React.FC<{
    start: [number, number, number];
    end: [number, number, number];
    intensity: number;
    isActive: boolean;
  }> = ({ start, end, intensity, isActive }) => {
    const lineRef = useRef<THREE.BufferGeometry>(null!);
    const materialRef = useRef<THREE.ShaderMaterial>(null!);

    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);

    // Create subtle curve for more organic look
    const curveOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.1
    );
    midPoint.add(curveOffset);

    const curve = new THREE.QuadraticBezierCurve3(startVec, midPoint, endVec);
    const points = curve.getPoints(50);

    const uniforms = {
      time: { value: 0 },
      startColor: { value: new THREE.Color('#415A77') },
      endColor: { value: new THREE.Color('#3FD3C6') },
      intensity: { value: intensity },
      flowSpeed: { value: 2.0 + Math.random() * 1.0 }
    };

    useFrame(({ clock }) => {
      if (materialRef.current) {
        materialRef.current.uniforms.time.value = clock.elapsedTime;
        materialRef.current.uniforms.intensity.value = THREE.MathUtils.lerp(
          materialRef.current.uniforms.intensity.value,
          isActive ? intensity : 0.2,
          0.05
        );
      }
    });

    return (
      <line>
        <bufferGeometry ref={lineRef}>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-flowProgress"
            count={points.length}
            array={new Float32Array(points.map((_, i) => i / (points.length - 1)))}
            itemSize={1}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          vertexShader={connectionVertexShader}
          fragmentShader={connectionFragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          linewidth={2}
        />
      </line>
    );
  };

  // Particle system component
  const ParticleSystem: React.FC<{ particles: FlowParticle[] }> = ({ particles }) => {
    const instancedMeshRef = useRef<THREE.InstancedMesh>(null!);
    const tempMatrix = new THREE.Matrix4();
    const tempColor = new THREE.Color();

    useFrame(({ clock }) => {
      if (!instancedMeshRef.current) return;

      particles.forEach((particle, i) => {
        tempMatrix.setPosition(particle.position);
        tempMatrix.scale(new THREE.Vector3().setScalar(particle.size));
        instancedMeshRef.current.setMatrixAt(i, tempMatrix);

        tempColor.set(particle.color);
        instancedMeshRef.current.setColorAt(i, tempColor);
      });

      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
      if (instancedMeshRef.current.instanceColor) {
        instancedMeshRef.current.instanceColor.needsUpdate = true;
      }
    });

    return (
      <instancedMesh ref={instancedMeshRef} args={[undefined, undefined, particles.length]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial transparent opacity={0.8} />
      </instancedMesh>
    );
  };

  // Main 3D scene component
  const Scene3D: React.FC = () => {
    const { camera, gl } = useThree();

    // Configure renderer for high quality
    useEffect(() => {
      gl.shadowMap.enabled = true;
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.2;
      gl.outputColorSpace = THREE.SRGBColorSpace;
      // Antialiasing is set during renderer creation, not at runtime

      // Enable multisampling for better anti-aliasing
      gl.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2));
    }, [gl]);

    // Camera controls with smooth rotation
    useFrame(({ clock }) => {
      if (autoRotate) {
        const radius = 6;
        const speed = 0.1;
        camera.position.x = Math.cos(clock.elapsedTime * speed) * radius;
        camera.position.z = Math.sin(clock.elapsedTime * speed) * radius;
        camera.position.y = 1 + Math.sin(clock.elapsedTime * speed * 0.5) * 0.5;
        camera.lookAt(0, 0, 0);
      }
    });

    return (
      <>
        {/* Enhanced lighting setup */}
        <ambientLight intensity={0.2} color="#1B263B" />

        {/* Key light with shadows */}
        <directionalLight
          position={[5, 5, 5]}
          intensity={0.8}
          color="#3FD3C6"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />

        {/* Fill light */}
        <pointLight position={[-3, 2, 4]} intensity={0.4} color="#DAA520" />

        {/* Rim light for depth */}
        <pointLight position={[0, -2, -3]} intensity={0.3} color="#415A77" />

        {/* Render nodes */}
        {nodes.map(node => (
          <NodeSphere
            key={node.id}
            node={node}
            isActive={activeNodes.has(node.id)}
            load={nodeLoads.get(node.id) || 0}
          />
        ))}

        {/* Render connections */}
        {nodes.map(node =>
          node.connections.map(connectionId => {
            const targetNode = nodes.find(n => n.id === connectionId);
            if (!targetNode) return null;

            return (
              <ConnectionLine
                key={`${node.id}-${connectionId}`}
                start={node.position}
                end={targetNode.position}
                intensity={nodeLoads.get(node.id) || 0}
                isActive={activeNodes.has(node.id) || activeNodes.has(connectionId)}
              />
            );
          })
        )}

        {/* Render particles */}
        <ParticleSystem particles={flowParticles} />

        {/* Background grid */}
        <gridHelper
          args={[10, 20, '#415A77', '#1B263B']}
          position={[0, -2, 0]}
        />

        {/* Subtle fog for depth */}
        <fog attach="fog" args={['#0D1B2A', 8, 15]} />
      </>
    );
  };

  // Update particle physics
  const updateParticles = useCallback(() => {
    setFlowParticles(prevParticles => {
      return prevParticles.map(particle => {
        const currentNode = nodes.find(n => n.id === particle.path[particle.currentPath]);
        const nextNode = nodes.find(n => n.id === particle.path[particle.currentPath + 1]);

        if (!currentNode || !nextNode) {
          return particle;
        }

        // Update trail with timestamp for decay
        const now = Date.now();
        particle.trail.unshift({
          position: particle.position.clone(),
          opacity: particle.opacity,
          timestamp: now
        });

        // Remove old trail points
        particle.trail = particle.trail.filter(point => now - point.timestamp < 1000);

        // Physics-based movement
        particle.progress += particle.speed;
        particle.lifecycle += 0.016; // ~60fps

        if (particle.progress >= 1) {
          particle.progress = 0;
          particle.currentPath++;

          if (particle.currentPath >= particle.path.length - 1) {
            return createParticle();
          }
        }

        // Smooth interpolation with physics
        const currentPos = new THREE.Vector3(...currentNode.position);
        const nextPos = new THREE.Vector3(...nextNode.position);

        const t = easeInOutCubic(particle.progress);
        particle.target.lerpVectors(currentPos, nextPos, t);

        // Apply velocity and acceleration for fluid motion
        particle.acceleration.subVectors(particle.target, particle.position).multiplyScalar(0.1);
        particle.velocity.add(particle.acceleration).multiplyScalar(0.95);
        particle.position.add(particle.velocity);

        return particle;
      });
    });
  }, [createParticle]);

  // Calculate node loads based on nearby particles
  const calculateNodeLoads = useCallback(() => {
    const newNodeLoads = new Map<string, number>();

    nodes.forEach(node => {
      const nodePos = new THREE.Vector3(...node.position);
      const nearbyParticles = flowParticles.filter(particle => {
        const distance = particle.position.distanceTo(nodePos);
        return distance < node.radius * 3;
      }).length;

      newNodeLoads.set(node.id, Math.min(1, nearbyParticles / 4));
    });

    setNodeLoads(newNodeLoads);
  }, [flowParticles]);

  // Enhanced easing functions
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Animation loop for particle updates
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      updateParticles();
      calculateNodeLoads();
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [isVisible, updateParticles, calculateNodeLoads]);

  // Initialize system with sophisticated sequencing
  useEffect(() => {
    if (!isVisible) return;

    // Phase 1: Loading animation
    setAnimationPhase('loading');

    // Phase 2: Sequential node activation
    const activationSequence = [
      { id: 'intake', delay: 300 },
      { id: 'validation', delay: 600 },
      { id: 'inventory', delay: 900 },
      { id: 'processing', delay: 1200 },
      { id: 'engraving', delay: 1500 },
      { id: 'assembly', delay: 1800 },
      { id: 'qa', delay: 2100 },
      { id: 'shipping', delay: 2400 },
      { id: 'delivery', delay: 2700 }
    ];

    activationSequence.forEach(({ id, delay }) => {
      setTimeout(() => {
        setActiveNodes(prev => new Set([...Array.from(prev), id]));
      }, delay);
    });

    // Phase 3: Particle system initialization
    setTimeout(() => {
      setAnimationPhase('active');

      // Create initial particle burst
      for (let i = 0; i < 20; i++) {
        setTimeout(() => {
          setFlowParticles(prev => [...prev, createParticle()]);
        }, i * 200);
      }
    }, 1500);

    // Phase 4: Full system activation
    setTimeout(() => {
      setAnimationPhase('complete');
    }, 4000);

    // Continuous particle generation
    const particleInterval = setInterval(() => {
      if (flowParticles.length < 25) {
        setFlowParticles(prev => [...prev, createParticle()]);
      }
    }, 800);

    // Performance metrics cycling
    const metricInterval = setInterval(() => {
      setCurrentMetric(prev => (prev + 1) % performanceMetrics.length);
    }, 3500);

    return () => {
      clearInterval(particleInterval);
      clearInterval(metricInterval);
    };
  }, [isVisible, createParticle, flowParticles.length, performanceMetrics.length]);

  // Intersection observer for visibility detection
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          // Reset animation state when coming into view
          setActiveNodes(new Set());
          setFlowParticles([]);
          setAnimationPhase('loading');
        }
      },
      { threshold: 0.1 }
    );

    const container = containerRef.current;
    if (container) {
      observer.observe(container);
    }

    return () => {
      if (container) {
        observer.unobserve(container);
      }
    };
  }, []);

  const currentMetricData = performanceMetrics[currentMetric];

  return (
    <div ref={containerRef} className="relative">
      {/* System Status Banner */}
      <motion.div
        className="mb-6 flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-[#3FD3C6] text-sm font-mono tracking-wider">
          SYSTEM_STATUS: {animationPhase.toUpperCase()}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-[#415A77] text-xs tracking-wider">NODES ACTIVE</div>
            <div className="text-[#F8F8F2] font-mono text-lg">{activeNodes.size}/{nodes.length}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[#415A77] text-xs tracking-wider">PARTICLES</div>
            <div className="text-[#3FD3C6] font-mono">{flowParticles.length}</div>
          </div>
        </div>
      </motion.div>

      {/* Main 3D Visualization Container */}
      <motion.div
        className="bg-gradient-to-br from-[#0D1B2A]/40 to-[#1B263B]/60 border border-[#415A77]/30 p-0 mb-8 relative overflow-hidden backdrop-blur-sm"
        style={{
          borderRadius: '4px',
          boxShadow: '0 8px 32px rgba(13, 27, 42, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {/* Loading overlay */}
        <AnimatePresence>
          {animationPhase === 'loading' && (
            <motion.div
              className="absolute inset-0 bg-[#0D1B2A]/80 flex items-center justify-center z-10 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="text-[#3FD3C6] text-base font-mono tracking-widest"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                INITIALIZING QUANTUM PIPELINE...
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WebGL Canvas Container */}
        <div className="w-full h-[600px] relative">
          <Canvas
            camera={{ position: cameraPosition, fov: 50 }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
              outputColorSpace: THREE.SRGBColorSpace,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.2
            }}
            dpr={[1, 2]}
            style={{
              background: 'radial-gradient(ellipse at center, rgba(13, 27, 42, 0.6) 0%, rgba(27, 38, 59, 0.8) 100%)'
            }}
            onPointerMove={() => {
              if (autoRotate) {
                setAutoRotate(false);
                setTimeout(() => setAutoRotate(true), 5000);
              }
            }}
          >
            <Suspense fallback={null}>
              <Scene3D />
            </Suspense>
          </Canvas>

          {/* Interactive controls overlay */}
          <div className="absolute top-4 left-4 text-[#415A77] text-xs font-mono space-y-1">
            <div>CAMERA: {autoRotate ? 'AUTO' : 'MANUAL'}</div>
            <div>RENDER: WEBGL2</div>
            <div>DPR: {Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)}x</div>
          </div>

          {/* Performance stats */}
          <div className="absolute top-4 right-4 text-[#415A77] text-xs font-mono text-right space-y-1">
            <div>FPS: 60</div>
            <div>TRIANGLES: {nodes.length * 1024}</div>
            <div>SHADERS: ACTIVE</div>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Performance Metrics Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transformation Impact */}
        <motion.div
          className="bg-[#0D1B2A]/50 border border-[#415A77]/30 p-6 relative overflow-hidden backdrop-blur-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {/* Animated background */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              background: `linear-gradient(45deg, transparent 30%, ${currentMetricData.improvement === 'increase' ? '#3FD3C6' : '#E84855'} 70%)`,
              transform: `translateX(${Math.sin(Date.now() * 0.001) * 10}px)`
            }}
          />

          <div className="relative z-10">
            <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Transformation Impact</span>
              <div className="flex space-x-1">
                {performanceMetrics.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-1 ${index === currentMetric ? 'bg-[#3FD3C6]' : 'bg-[#415A77]'} transition-colors duration-300`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#415A77] text-sm">Before</span>
                <span className="text-[#E84855] font-mono text-lg">{currentMetricData.before}</span>
              </div>

              {/* Animated transformation line */}
              <div className="relative h-px">
                <div className="absolute inset-0 bg-gradient-to-r from-[#E84855] to-[#3FD3C6]"></div>
                <div
                  className="absolute h-full w-2 bg-[#F8F8F2] opacity-80"
                  style={{
                    left: `${(Math.sin(Date.now() * 0.003) + 1) * 50}%`,
                    transition: 'left 100ms ease-out'
                  }}
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#415A77] text-sm">After</span>
                <span className="text-[#3FD3C6] font-mono text-lg">{currentMetricData.after}</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <div className="text-[#F8F8F2] text-3xl font-light mb-1">
                {currentMetricData.value}{currentMetricData.unit}
              </div>
              <div className="text-[#415A77] text-sm">
                {currentMetricData.label} {currentMetricData.improvement}
              </div>
            </div>
          </div>
        </motion.div>

        {/* System Telemetry */}
        <motion.div
          className="bg-[#0D1B2A]/50 border border-[#415A77]/30 p-6 backdrop-blur-sm"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4">
            System Telemetry
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#415A77] text-sm">Pipeline Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#3FD3C6] animate-pulse"></div>
                <span className="text-[#3FD3C6] text-sm">OPERATIONAL</span>
              </div>
            </div>

            <div className="flex justify-between">
              <span className="text-[#415A77] text-sm">Throughput</span>
              <span className="text-[#3FD3C6]">
                {Math.floor(95 + Math.sin(Date.now() * 0.002) * 4)}%
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#415A77] text-sm">Efficiency</span>
              <span className="text-[#3FD3C6]">
                {animationPhase === 'complete' ? 'OPTIMIZED' : 'CALIBRATING'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#415A77] text-sm">Data Flow</span>
              <span className="text-[#DAA520]">{flowParticles.length} streams</span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#415A77] text-sm">Latency</span>
              <span className="text-[#3FD3C6]">
                {Math.floor(120 + Math.sin(Date.now() * 0.001) * 30)}ms
              </span>
            </div>
          </div>

          {/* Node activity indicators */}
          <div className="mt-6">
            <div className="text-[#415A77] text-xs uppercase tracking-wider mb-3">Node Activity</div>
            <div className="grid grid-cols-3 gap-2">
              {nodes.slice(0, 9).map((node) => (
                <div
                  key={node.id}
                  className="flex items-center gap-2 text-xs"
                >
                  <div
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      activeNodes.has(node.id)
                        ? 'bg-[#3FD3C6] animate-pulse'
                        : 'bg-[#415A77]'
                    }`}
                  />
                  <span className="text-[#415A77] truncate">{node.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* System Performance Summary */}
      <motion.div
        className="mt-6 bg-[#1B263B]/20 border border-[#415A77]/20 p-4 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <div className="flex items-center justify-between text-sm">
          <div className="text-[#415A77]">
            Automation reduces manual processing from <span className="text-[#E84855]">45+ minutes</span> to{' '}
            <span className="text-[#3FD3C6]">&lt;1 minute</span> per item
          </div>
          <div className="text-[#3FD3C6] font-mono">
            {animationPhase === 'complete' ? 'READY FOR SCALE' : 'OPTIMIZING...'}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default ArchitectureVisualization
