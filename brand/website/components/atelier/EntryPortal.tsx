'use client';

import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { OrbitControls, shaderMaterial } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';

// Custom shader material for the portal effect
const PortalMaterial = shaderMaterial(
  {
    time: 0,
    mousePosition: new THREE.Vector2(0.5, 0.5),
    portalIntensity: 0.5,
    colorA: new THREE.Color('#b87333'), // copper
    colorB: new THREE.Color('#f8f8f2'), // cream
    colorC: new THREE.Color('#0a0a0a'), // deep black
  },
  // Vertex shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float time;

    // Noise function
    vec3 mod289(vec3 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }
    vec4 mod289(vec4 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }
    vec4 permute(vec4 x) {
      return mod289(((x*34.0)+1.0)*x);
    }
    vec4 taylorInvSqrt(vec4 r) {
      return 1.79284291400159 - 0.85373472095314 * r;
    }
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vUv = uv;

      // Add noise-based displacement for organic movement
      vec3 pos = position;
      float noise = snoise(vec3(position.xy * 2.0, time * 0.1));
      pos.z += noise * 0.1;

      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform vec2 mousePosition;
    uniform float portalIntensity;
    uniform vec3 colorA;
    uniform vec3 colorB;
    uniform vec3 colorC;
    varying vec2 vUv;
    varying vec3 vPosition;

    // Hash function for noise
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    // Noise function
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    // Fractal noise
    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for(int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = vec2(0.5, 0.5);

      // Distance from center for portal effect
      float distanceFromCenter = length(uv - center);

      // Create spiral pattern
      float angle = atan(uv.y - center.y, uv.x - center.x);
      float spiral = sin(angle * 8.0 + time * 2.0) * 0.5 + 0.5;

      // Volumetric portal effect
      float portalMask = 1.0 - smoothstep(0.1, 0.4, distanceFromCenter);
      portalMask *= spiral;

      // Add flowing noise patterns
      vec2 flowUv = uv + vec2(sin(time * 0.3), cos(time * 0.2)) * 0.1;
      float flowPattern = fbm(flowUv * 6.0 + time * 0.5);

      // Data stream lines
      float streams = 0.0;
      for(int i = 0; i < 5; i++) {
        float streamY = fract(uv.y + float(i) * 0.2 + time * 0.3);
        streams += smoothstep(0.48, 0.52, streamY) * (1.0 - streamY);
      }
      streams *= 0.3;

      // Circuit-like patterns
      vec2 circuitUv = uv * 20.0;
      float circuits = step(0.95, noise(circuitUv + time * 0.1));
      circuits *= (1.0 - distanceFromCenter);

      // Combine all effects
      float intensity = portalMask * portalIntensity + flowPattern * 0.3 + streams + circuits * 0.5;

      // Color mixing based on depth and effects
      vec3 color = mix(colorC, colorA, intensity);
      color = mix(color, colorB, portalMask * 0.5);

      // Add chromatic aberration near edges
      float chromatic = smoothstep(0.3, 0.5, distanceFromCenter);
      color.r += chromatic * 0.1;
      color.b -= chromatic * 0.1;

      // Enhance glow near mouse
      float mouseInfluence = 1.0 - length(uv - mousePosition) * 2.0;
      mouseInfluence = smoothstep(0.0, 1.0, mouseInfluence);
      color += colorA * mouseInfluence * 0.3;

      // Final alpha with depth-based falloff
      float alpha = intensity * (1.0 - distanceFromCenter * 0.8);
      alpha = max(alpha, streams * 0.5);

      gl_FragColor = vec4(color, alpha);
    }
  `
);

extend({ PortalMaterial });

// Floating code fragments component
function FloatingCodeFragments() {
  const meshRef = useRef<THREE.Group>(null);

  const codeFragments = useMemo(() => [
    '// Operational transcendence\nconst portal = createPortal();',
    'async function synthesize() {\n  return await consciousness.merge();\n}',
    'const workshop = {\n  craft: reality,\n  dimension: impossible\n}',
    'pipeline.transform()\n  .optimize()\n  .transcend()',
    'system.bootstrap()\n  .evolve()\n  .become()',
  ], []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.elapsedTime * 0.1;
      meshRef.current.children.forEach((child, i) => {
        child.position.y = Math.sin(clock.elapsedTime + i) * 0.5;
        child.rotation.z = Math.sin(clock.elapsedTime + i * 0.5) * 0.1;
      });
    }
  });

  return (
    <group ref={meshRef}>
      {codeFragments.map((code, i) => {
        const angle = (i / codeFragments.length) * Math.PI * 2;
        const radius = 3 + Math.sin(i) * 0.5;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              Math.sin(i * 0.7) * 2,
              Math.sin(angle) * radius
            ]}
          >
            <planeGeometry args={[1.5, 0.8]} />
            <meshBasicMaterial
              transparent
              opacity={0.3}
              color="#b87333"
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Holographic metrics component
function HolographicMetrics() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.05;
    }
  });

  return (
    <group ref={groupRef} position={[2, 1, 0]}>
      {/* Floating data cubes */}
      {Array.from({ length: 8 }).map((_, i) => {
        const height = 0.3 + Math.sin(i) * 0.2;
        return (
          <mesh key={i} position={[i * 0.3 - 1.2, 0, 0]}>
            <boxGeometry args={[0.1, height, 0.1]} />
            <meshBasicMaterial
              transparent
              opacity={0.6}
              color={new THREE.Color().setHSL(0.1 + i * 0.05, 0.7, 0.6)}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Main 3D scene component
function Scene() {
  const { viewport, camera } = useThree();
  const materialRef = useRef<any>();
  const [mousePos, setMousePos] = useState(new THREE.Vector2(0.5, 0.5));
  const [portalIntensity, setPortalIntensity] = useState(0.5);

  useFrame(({ clock, mouse }) => {
    if (materialRef.current) {
      materialRef.current.time = clock.elapsedTime;
      materialRef.current.mousePosition.set(
        (mouse.x + 1) / 2,
        (mouse.y + 1) / 2
      );
    }
  });

  const handlePointerMove = (event: any) => {
    const newMousePos = new THREE.Vector2(
      (event.clientX / window.innerWidth),
      1 - (event.clientY / window.innerHeight)
    );
    setMousePos(newMousePos);
    setPortalIntensity(0.8);
  };

  const handlePointerLeave = () => {
    setPortalIntensity(0.5);
  };

  return (
    <>
      {/* Main portal plane */}
      <mesh
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        scale={[viewport.width, viewport.height, 1]}
      >
        <planeGeometry args={[1, 1, 100, 100]} />
        {/* @ts-ignore */}
        <portalMaterial
          ref={materialRef}
          transparent
          portalIntensity={portalIntensity}
        />
      </mesh>

      {/* Floating elements in 3D space */}
      <FloatingCodeFragments />
      <HolographicMetrics />

      {/* Depth layers with geometric forms */}
      <group position={[0, 0, -2]}>
        <mesh position={[-3, 2, 0]}>
          <octahedronGeometry args={[0.3]} />
          <meshBasicMaterial
            transparent
            opacity={0.2}
            color="#b87333"
            wireframe
          />
        </mesh>

        <mesh position={[3, -1, 0]}>
          <icosahedronGeometry args={[0.4]} />
          <meshBasicMaterial
            transparent
            opacity={0.15}
            color="#f8f8f2"
            wireframe
          />
        </mesh>
      </group>

      {/* Orbital camera controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.2}
        minPolarAngle={Math.PI / 2.2}
        maxPolarAngle={Math.PI / 1.8}
      />
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-copper border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function EntryPortal() {
  return (
    <div className="fixed inset-0 z-0">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          style={{ background: 'transparent' }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
          }}
        >
          <Scene />
        </Canvas>
      </Suspense>

      {/* Atmospheric overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/20 pointer-events-none" />
    </div>
  );
}
