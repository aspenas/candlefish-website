'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface AmbientSystemProps {
  intensity?: number;
  followMouse?: boolean;
  breathingRate?: number;
  depthLayers?: number;
}

interface DepthLayer {
  id: string;
  depth: number;
  opacity: number;
  blur: number;
  parallaxStrength: number;
}

export function AmbientSystem({
  intensity = 0.4,
  followMouse = true,
  breathingRate = 8000,
  depthLayers = 4,
}: AmbientSystemProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth mouse tracking with spring physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { damping: 25, stiffness: 200 });
  const smoothMouseY = useSpring(mouseY, { damping: 25, stiffness: 200 });

  // Create depth layers for spatial hierarchy
  const depthLayersConfig: DepthLayer[] = Array.from({ length: depthLayers }, (_, i) => ({
    id: `depth-${i}`,
    depth: i / (depthLayers - 1),
    opacity: 0.15 - (i * 0.03),
    blur: 4 + (i * 8),
    parallaxStrength: 0.02 + (i * 0.01),
  }));

  // Handle mouse movement with throttling
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!followMouse) return;

    const x = e.clientX;
    const y = e.clientY;

    setMousePosition({ x, y });
    mouseX.set(x);
    mouseY.set(y);
  }, [followMouse, mouseX, mouseY]);

  // Handle page visibility for performance
  const handleVisibilityChange = useCallback(() => {
    setIsVisible(!document.hidden);
  }, []);

  // Setup event listeners
  useEffect(() => {
    let moveTimer: NodeJS.Timeout;

    const throttledMouseMove = (e: MouseEvent) => {
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => handleMouseMove(e), 16); // ~60fps
    };

    document.addEventListener('mousemove', throttledMouseMove, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(moveTimer);
      document.removeEventListener('mousemove', throttledMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleMouseMove, handleVisibilityChange]);

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ willChange: 'transform' }}
    >
      {/* Base breathing gradient */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: [
            `radial-gradient(ellipse 80% 60% at 50% 40%,
              rgba(63, 211, 198, ${intensity * 0.1}) 0%,
              rgba(63, 211, 198, ${intensity * 0.05}) 25%,
              rgba(10, 10, 11, ${intensity * 0.3}) 60%,
              transparent 100%)`,
            `radial-gradient(ellipse 85% 65% at 50% 40%,
              rgba(63, 211, 198, ${intensity * 0.15}) 0%,
              rgba(63, 211, 198, ${intensity * 0.08}) 25%,
              rgba(10, 10, 11, ${intensity * 0.35}) 60%,
              transparent 100%)`,
            `radial-gradient(ellipse 80% 60% at 50% 40%,
              rgba(63, 211, 198, ${intensity * 0.1}) 0%,
              rgba(63, 211, 198, ${intensity * 0.05}) 25%,
              rgba(10, 10, 11, ${intensity * 0.3}) 60%,
              transparent 100%)`,
          ]
        }}
        transition={{
          duration: breathingRate / 1000,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Depth layers with parallax */}
      {depthLayersConfig.map((layer) => (
        <motion.div
          key={layer.id}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 50%,
              rgba(26, 26, 28, ${layer.opacity}) 0%,
              rgba(26, 26, 28, ${layer.opacity * 0.5}) 40%,
              transparent 70%)`,
            filter: `blur(${layer.blur}px)`,
            transform: followMouse ? `translate3d(${mousePosition.x * layer.parallaxStrength}px, ${mousePosition.y * layer.parallaxStrength}px, 0)` : 'none',
            willChange: 'transform',
          }}
          animate={{
            opacity: [layer.opacity * 0.8, layer.opacity, layer.opacity * 0.8],
            scale: [0.95, 1, 0.95],
          }}
          transition={{
            duration: breathingRate / 1000 + layer.depth * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Mouse-following subtle highlight */}
      {followMouse && (
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle,
              rgba(63, 211, 198, ${intensity * 0.08}) 0%,
              rgba(63, 211, 198, ${intensity * 0.04}) 30%,
              transparent 60%)`,
            left: smoothMouseX,
            top: smoothMouseY,
            x: -300,
            y: -300,
            filter: 'blur(20px)',
            willChange: 'transform',
          }}
          animate={{
            scale: [0.8, 1.1, 0.8],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: breathingRate / 1000 * 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Gaussian noise texture for depth */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
          mixBlendMode: 'overlay',
          filter: 'blur(1px) contrast(150%) brightness(50%)',
        }}
      />

      {/* Subtle vignette for edge darkening */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 70% at 50% 50%,
            transparent 40%,
            rgba(10, 10, 11, 0.1) 60%,
            rgba(10, 10, 11, 0.3) 90%,
            rgba(10, 10, 11, 0.5) 100%)`,
        }}
      />

      {/* Atmospheric particles (minimal, only on interaction) */}
      <AtmosphericParticles mousePosition={mousePosition} intensity={intensity} />
    </div>
  );
}

// Minimal atmospheric particles that only appear on specific interactions
function AtmosphericParticles({
  mousePosition,
  intensity
}: {
  mousePosition: { x: number; y: number };
  intensity: number;
}) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    life: number;
    opacity: number;
  }>>([]);
  const [isInteracting, setIsInteracting] = useState(false);
  const lastMousePos = useRef(mousePosition);

  // Detect significant mouse movement for particle generation
  useEffect(() => {
    const distance = Math.sqrt(
      Math.pow(mousePosition.x - lastMousePos.current.x, 2) +
      Math.pow(mousePosition.y - lastMousePos.current.y, 2)
    );

    if (distance > 10) { // Only on significant movement
      setIsInteracting(true);

      // Generate a few particles
      const newParticles = Array.from({ length: 2 }, (_, i) => ({
        id: Date.now() + i,
        x: mousePosition.x + (Math.random() - 0.5) * 100,
        y: mousePosition.y + (Math.random() - 0.5) * 100,
        life: 1000 + Math.random() * 1000,
        opacity: intensity * 0.4,
      }));

      setParticles(prev => [...prev.slice(-8), ...newParticles]); // Keep max 10 particles

      // Stop interaction after delay
      setTimeout(() => setIsInteracting(false), 2000);
    }

    lastMousePos.current = mousePosition;
  }, [mousePosition, intensity]);

  // Update particle lifetimes
  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles(prev =>
        prev.map(p => ({
          ...p,
          life: p.life - 50,
          opacity: p.opacity * 0.98
        })).filter(p => p.life > 0)
      );
    }, 50);

    return () => clearInterval(interval);
  }, [particles.length]);

  if (!isInteracting && particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1 h-1 bg-livingCyan/60 rounded-full"
          initial={{
            x: particle.x,
            y: particle.y,
            opacity: particle.opacity,
            scale: 0,
          }}
          animate={{
            y: particle.y - 50,
            opacity: 0,
            scale: [0, 1, 0],
          }}
          transition={{
            duration: particle.life / 1000,
            ease: "easeOut",
          }}
          onAnimationComplete={() => {
            setParticles(prev => prev.filter(p => p.id !== particle.id));
          }}
        />
      ))}
    </div>
  );
}
