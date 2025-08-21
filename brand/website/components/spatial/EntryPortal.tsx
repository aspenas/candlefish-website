/**
 * Entry Portal Component
 * WebGL environment that responds to system metrics and time
 */

'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { getWebSocketManager } from '@/lib/realtime/websocket-manager';

// Custom shader material for responsive environment
const SystemShaderMaterial = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const wsManager = getWebSocketManager();

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      systemLoad: { value: 0 },
      healthStatus: { value: new THREE.Vector3(1, 1, 1) },
      visitorCount: { value: 0 },
      mousePosition: { value: new THREE.Vector2(0, 0) },
    }),
    []
  );

  // Update uniforms based on system metrics
  useEffect(() => {
    const handleMetricsUpdate = (metrics: any) => {
      uniforms.systemLoad.value = metrics.cpu / 100;
      uniforms.visitorCount.value = metrics.requests;
    };

    const handleHealthUpdate = (health: any) => {
      const statusVector = new THREE.Vector3(
        health.operational ? 1 : 0,
        health.degraded ? 0.5 : 1,
        health.incident ? 0 : 1
      );
      uniforms.healthStatus.value = statusVector;
    };

    wsManager.on('metrics:update', handleMetricsUpdate);
    wsManager.on('health:update', handleHealthUpdate);

    return () => {
      wsManager.off('metrics:update', handleMetricsUpdate);
      wsManager.off('health:update', handleHealthUpdate);
    };
  }, [uniforms, wsManager]);

  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      uniforms.mousePosition.value.x = (e.clientX / window.innerWidth) * 2 - 1;
      uniforms.mousePosition.value.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [uniforms]);

  // Animate time uniform
  useFrame((state) => {
    if (meshRef.current) {
      uniforms.time.value = state.clock.elapsedTime;
    }
  });

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    uniform float time;
    uniform float systemLoad;
    uniform vec2 mousePosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);

      vec3 pos = position;

      // Wave distortion based on system load
      float wave = sin(pos.x * 5.0 + time * 2.0) * 0.1;
      float load = sin(pos.y * 3.0 + time * 1.5) * systemLoad * 0.2;
      pos.z += wave + load;

      // Mouse interaction
      float mouseInfluence = 1.0 - distance(mousePosition, uv * 2.0 - 1.0);
      mouseInfluence = smoothstep(0.0, 1.0, mouseInfluence);
      pos.z += mouseInfluence * 0.3;

      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    uniform float time;
    uniform float systemLoad;
    uniform vec3 healthStatus;
    uniform float visitorCount;
    uniform vec2 mousePosition;

    vec3 palette(float t) {
      vec3 a = vec3(0.5, 0.5, 0.5);
      vec3 b = vec3(0.5, 0.5, 0.5);
      vec3 c = vec3(1.0, 1.0, 1.0);
      vec3 d = vec3(0.263, 0.416, 0.557);

      return a + b * cos(6.28318 * (c * t + d));
    }

    void main() {
      // Base color influenced by system health
      vec3 healthyColor = vec3(0.1, 0.3, 0.5); // Deep blue
      vec3 warningColor = vec3(0.5, 0.3, 0.1); // Amber
      vec3 criticalColor = vec3(0.5, 0.1, 0.1); // Deep red

      vec3 baseColor = mix(
        mix(criticalColor, warningColor, healthStatus.x),
        healthyColor,
        healthStatus.y
      );

      // Dynamic gradient based on position and time
      float gradient = vPosition.y * 0.5 + 0.5;
      vec3 gradientColor = palette(gradient + time * 0.1);

      // Mix base with gradient
      vec3 color = mix(baseColor, gradientColor, 0.3);

      // Pulse effect based on visitor count
      float pulse = sin(time * 3.0 + visitorCount * 0.1) * 0.5 + 0.5;
      color += pulse * 0.1;

      // Edge glow
      float edge = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
      edge = pow(edge, 2.0);
      color += edge * healthStatus * 0.3;

      // System load intensity
      float intensity = 1.0 + systemLoad * 0.5;
      color *= intensity;

      // Mouse highlight
      float mouseDistance = distance(mousePosition, vUv * 2.0 - 1.0);
      float mouseGlow = 1.0 - smoothstep(0.0, 1.0, mouseDistance);
      color += mouseGlow * 0.2;

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[10, 10, 64, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        wireframe={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// Particle field for depth
const ParticleField: React.FC = () => {
  const points = useRef<THREE.Points>(null);
  const particleCount = 1000;

  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.05;
      points.current.rotation.x = state.clock.elapsedTime * 0.03;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#4a9eff"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
};

// Camera controller for smooth navigation
const CameraController: React.FC = () => {
  const { camera } = useThree();

  useFrame((state) => {
    // Subtle floating motion
    camera.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2 + 5;
    camera.lookAt(0, 0, 0);
  });

  return null;
};

// Main Entry Portal Component
export const EntryPortal: React.FC<{
  onEnter?: () => void;
  className?: string;
}> = ({ onEnter, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-screen ${className}`}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
      >
        <PerspectiveCamera
          makeDefault
          position={[0, 5, 10]}
          fov={50}
          near={0.1}
          far={100}
        />

        <CameraController />

        {/* Ambient lighting */}
        <ambientLight intensity={0.2} />

        {/* Directional light */}
        <directionalLight
          position={[10, 10, 5]}
          intensity={0.5}
          castShadow
        />

        {/* Point lights for depth */}
        <pointLight position={[-10, -10, -5]} intensity={0.3} color="#ff6b6b" />
        <pointLight position={[10, -10, 5]} intensity={0.3} color="#4ecdc4" />

        {/* Main shader plane */}
        <SystemShaderMaterial />

        {/* Particle field for depth */}
        <ParticleField />

        {/* Environment for reflections */}
        <Environment preset="city" />

        {/* Controls */}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 4}
        />
      </Canvas>

      {/* Transcendent Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="h-full flex flex-col justify-between p-8">
          {/* Atelier Identity */}
          <div className="space-y-6">
            <div className="text-pearl">
              <h1 className="text-display-xl font-light tracking-wider opacity-95 breathing-element">
                CANDLEFISH
              </h1>
              <div className="text-display-sm mt-4 opacity-80 font-manuscript">
                Transcendent Operational Presence
              </div>
            </div>

            {/* Living Status Indicators */}
            <div className="flex items-center space-x-6 text-interface-sm">
              <div className="flex items-center space-x-2 system-active">
                <span className="text-living-cyan">●</span>
                <span className="text-pearl/70">Atelier operational</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-living-cyan animate-pulse-glow">◈</span>
                <span className="text-pearl/70">Instruments responsive</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-copper">◇</span>
                <span className="text-pearl/70">Queue: 14 positions</span>
              </div>
            </div>
          </div>

          {/* Evolving Statement */}
          <div className="text-center space-y-8 transform-style-3d">
            <div className="text-manuscript-lg text-pearl/90 max-w-2xl mx-auto leading-relaxed">
              <span className="block animate-drift">
                "What emerges when craft meets consciousness,
              </span>
              <span className="block animate-drift" style={{animationDelay: '1s'}}>
                when systems breathe with intention,
              </span>
              <span className="block animate-drift text-copper" style={{animationDelay: '2s'}}>
                when operational becomes transcendent."
              </span>
            </div>

            {/* Primary Interface */}
            <div className="space-y-4">
              <button
                onClick={onEnter}
                data-cursor="workshop"
                className="pointer-events-auto group px-12 py-4 bg-graphite/20 backdrop-blur-md
                         border border-living-cyan/30 hover:border-living-cyan/60 text-pearl
                         transition-all duration-500 hover-lift transform-style-3d
                         hover:bg-graphite/40 hover:shadow-lg hover:shadow-living-cyan/20"
              >
                <span className="text-interface-lg tracking-wide">
                  Request Workshop Visit
                </span>
                <div className="text-interface-sm text-pearl/60 mt-1 group-hover:text-pearl/80 transition-colors">
                  Position 15 in queue
                </div>
              </button>

              {/* Secondary Navigation */}
              <div className="flex justify-center space-x-8 text-interface-sm">
                <button
                  data-cursor="instrument"
                  className="pointer-events-auto text-pearl/60 hover:text-living-cyan transition-colors duration-300 hover-lift"
                >
                  View Instruments
                </button>
                <button
                  data-cursor="manifesto"
                  className="pointer-events-auto text-pearl/60 hover:text-copper transition-colors duration-300 hover-lift"
                >
                  Read Manifesto
                </button>
                <button
                  data-cursor="queue"
                  className="pointer-events-auto text-pearl/60 hover:text-pearl transition-colors duration-300 hover-lift"
                >
                  Queue Status
                </button>
              </div>
            </div>
          </div>

          {/* System Telemetry */}
          <div className="flex justify-between items-end">
            <div className="space-y-2 text-code-sm font-code text-pearl/40">
              <div className="metric-pulse">WebGL.operational: true</div>
              <div className="metric-pulse">Realtime.latency: 12ms</div>
              <div className="metric-pulse">System.health: optimal</div>
            </div>

            {/* Time and Context */}
            <div className="text-right text-code-sm font-code text-pearl/40 space-y-1">
              <div>Local: {new Date().toLocaleTimeString()}</div>
              <div>Visitors: 247 active</div>
              <div>Craft.mode: engaged</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntryPortal;
