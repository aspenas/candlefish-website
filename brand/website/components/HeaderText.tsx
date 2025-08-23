'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getWorkshopProjects } from '../lib/api';
import type { WorkshopProjects } from '../types/api';
import { WebGLPerformanceMonitor } from '../lib/webgl-performance-monitor';

// Vertex shader
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader with simplex noise
const fragmentShader = `
  // 2D simplex noise (inline, compact)
  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v   - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                   + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ; m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  uniform float uTime;
  uniform float uProgress;
  uniform float uIntensity;
  uniform sampler2D uTextureFrom;
  uniform sampler2D uTextureTo;
  varying vec2 vUv;

  void main() {
    // drifting noise field for mist
    float n = snoise(vUv * 2.0 + vec2(uTime*0.05, uTime*0.03));
    float edge = smoothstep(0.35, 0.65, n * (0.75 + uProgress));
    float mixAmt = clamp(uProgress * 1.1 + edge * 0.35 * uIntensity, 0.0, 1.0);

    vec4 fromColor = texture2D(uTextureFrom, vUv);
    vec4 toColor   = texture2D(uTextureTo,   vUv);

    vec4 col = mix(fromColor, toColor, mixAmt);
    col.a *= 0.97; // slight airy feel
    gl_FragColor = col;
  }
`;

// Text transition mesh component
function TextTransitionMesh({
  fromText,
  toText,
  progress,
  font,
  textColor = '#415A77'
}: {
  fromText: string;
  toText: string;
  progress: number;
  font?: string;
  textColor?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const [fromTexture, toTexture] = useMemo(() => {
    const createTextTexture = (text: string) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 1024;
      canvas.height = 128;

      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = textColor;
      ctx.font = font || '48px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 20, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    };

    return [createTextTexture(fromText), createTextTexture(toText)];
  }, [fromText, toText, font, textColor]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      materialRef.current.uniforms.uProgress.value = progress;
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[8, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uProgress: { value: 0 },
          uIntensity: { value: 0.6 },
          uTextureFrom: { value: fromTexture },
          uTextureTo: { value: toTexture }
        }}
        transparent
      />
    </mesh>
  );
}

export default function HeaderText() {
  const [projects, setProjects] = useState<WorkshopProjects>({ projects: [] });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const animationFrameRef = useRef<number>();
  const performanceMonitorRef = useRef<WebGLPerformanceMonitor | null>(null);

  // Load projects data
  useEffect(() => {
    getWorkshopProjects().then(setProjects);
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

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Handle intersection observer for performance
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting && !document.hidden);
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Project rotation logic
  useEffect(() => {
    if (projects.projects.length <= 1 || !isVisible) return;

    intervalRef.current = setInterval(() => {
      setIsTransitioning(true);

      // Animate transition
      const startTime = Date.now();
      const duration = prefersReducedMotion ? 100 : 1000;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        setTransitionProgress(progress);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setCurrentIndex((prev) => (prev + 1) % projects.projects.length);
          setTransitionProgress(0);
          setIsTransitioning(false);
        }
      };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animate();
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [projects, isVisible, prefersReducedMotion]);

  // Cleanup performance monitor on unmount
  useEffect(() => {
    return () => {
      if (performanceMonitorRef.current) {
        performanceMonitorRef.current.dispose();
        performanceMonitorRef.current = null;
      }
    };
  }, []);

  const currentProject = projects.projects[currentIndex] || { title: 'operational excellence systems' };
  const nextProject = projects.projects[(currentIndex + 1) % projects.projects.length] || currentProject;

  // Fallback for reduced motion or when WebGL is not available
  if (prefersReducedMotion || !projects.projects.length) {
    return (
      <div ref={containerRef} className="relative">
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-light text-[#F8F8F2] leading-[0.9] tracking-tight max-w-6xl">
          Currently engineering<br />
          <span className="text-[#415A77] transition-opacity duration-300">
            {currentProject.title.toLowerCase()}
          </span>
        </h1>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <h1 className="text-6xl md:text-7xl lg:text-8xl font-light text-[#F8F8F2] leading-[0.9] tracking-tight max-w-6xl">
        Currently engineering<br />
        <span className="text-[#415A77] relative inline-block">
          {/* Canvas overlay for WebGL transition */}
          {isTransitioning && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              <Canvas
                camera={{ position: [0, 0, 5], fov: 50 }}
                style={{ width: '100%', height: '100%' }}
                gl={{ alpha: true, antialias: true }}
              >
                <TextTransitionMesh
                  fromText={currentProject.title.toLowerCase()}
                  toText={nextProject.title.toLowerCase()}
                  progress={transitionProgress}
                  textColor="#415A77"
                />
              </Canvas>
            </div>
          )}
          {/* Regular text (hidden during transition) */}
          <span className={isTransitioning ? 'opacity-0' : 'opacity-100'}>
            {currentProject.title.toLowerCase()}
          </span>
        </span>
      </h1>
    </div>
  );
}
