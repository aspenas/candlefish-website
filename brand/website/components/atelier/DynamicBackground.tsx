'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface SpatialLayer {
  id: string;
  depth: number;
  type: 'gradient' | 'texture' | 'ambient';
  opacity: number;
  blur: number;
  parallaxStrength: number;
}

interface DynamicBackgroundProps {
  intensity?: number;
  enableParallax?: boolean;
  readingMode?: boolean;
}

// Refined background following Jony Ive's spatial hierarchy principles
export function DynamicBackground({
  intensity = 0.4,
  enableParallax = true,
  readingMode = false
}: DynamicBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Smooth mouse tracking with spring physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { damping: 30, stiffness: 200 });
  const smoothMouseY = useSpring(mouseY, { damping: 30, stiffness: 200 });

  // Spatial layers for depth without distraction
  const spatialLayers: SpatialLayer[] = [
    {
      id: 'depth-base',
      depth: 0.1,
      type: 'gradient',
      opacity: 0.6,
      blur: 0,
      parallaxStrength: 0.005,
    },
    {
      id: 'depth-mid',
      depth: 0.3,
      type: 'ambient',
      opacity: 0.3,
      blur: 8,
      parallaxStrength: 0.01,
    },
    {
      id: 'depth-far',
      depth: 0.6,
      type: 'texture',
      opacity: 0.15,
      blur: 16,
      parallaxStrength: 0.02,
    },
  ];

  // Handle mouse movement for parallax
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enableParallax) return;

    const { clientX, clientY } = e;
    setMousePosition({ x: clientX, y: clientY });
    mouseX.set(clientX);
    mouseY.set(clientY);
  }, [enableParallax, mouseX, mouseY]);

  // Handle visibility changes for performance
  const handleVisibilityChange = useCallback(() => {
    setIsVisible(!document.hidden);
  }, []);

  useEffect(() => {
    let moveTimer: NodeJS.Timeout;

    const throttledMouseMove = (e: MouseEvent) => {
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => handleMouseMove(e), 16);
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
    >
      {/* Base gradient layer - foundational depth */}
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: readingMode ? intensity * 0.3 : intensity,
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              `radial-gradient(ellipse 100% 80% at 50% 30%,
                rgba(26, 26, 28, ${intensity * 0.8}) 0%,
                rgba(10, 10, 11, ${intensity * 0.9}) 60%,
                rgba(10, 10, 11, ${intensity}) 100%)`,
              `radial-gradient(ellipse 110% 90% at 50% 30%,
                rgba(26, 26, 28, ${intensity * 0.9}) 0%,
                rgba(10, 10, 11, ${intensity}) 60%,
                rgba(10, 10, 11, ${intensity * 1.1}) 100%)`,
              `radial-gradient(ellipse 100% 80% at 50% 30%,
                rgba(26, 26, 28, ${intensity * 0.8}) 0%,
                rgba(10, 10, 11, ${intensity * 0.9}) 60%,
                rgba(10, 10, 11, ${intensity}) 100%)`,
            ]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Spatial layers with subtle parallax */}
      {spatialLayers.map((layer, index) => (
        <motion.div
          key={layer.id}
          className="absolute inset-0"
          style={{
            filter: `blur(${layer.blur}px)`,
            transform: enableParallax ?
              `translate3d(${mousePosition.x * layer.parallaxStrength}px, ${mousePosition.y * layer.parallaxStrength}px, 0)` :
              'none',
            willChange: 'transform',
          }}
          animate={{
            opacity: readingMode ? layer.opacity * 0.4 : layer.opacity,
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {layer.type === 'gradient' && (
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  `linear-gradient(135deg,
                    rgba(63, 211, 198, ${layer.opacity * 0.1}) 0%,
                    transparent 30%,
                    rgba(26, 26, 28, ${layer.opacity * 0.2}) 70%,
                    transparent 100%)`,
                  `linear-gradient(135deg,
                    rgba(63, 211, 198, ${layer.opacity * 0.15}) 0%,
                    transparent 30%,
                    rgba(26, 26, 28, ${layer.opacity * 0.25}) 70%,
                    transparent 100%)`,
                  `linear-gradient(135deg,
                    rgba(63, 211, 198, ${layer.opacity * 0.1}) 0%,
                    transparent 30%,
                    rgba(26, 26, 28, ${layer.opacity * 0.2}) 70%,
                    transparent 100%)`,
                ]
              }}
              transition={{
                duration: 8 + index * 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}

          {layer.type === 'ambient' && (
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  `radial-gradient(circle at 30% 20%,
                    rgba(63, 211, 198, ${layer.opacity * 0.08}) 0%,
                    transparent 50%),
                   radial-gradient(circle at 70% 80%,
                    rgba(26, 26, 28, ${layer.opacity * 0.12}) 0%,
                    transparent 50%)`,
                  `radial-gradient(circle at 35% 25%,
                    rgba(63, 211, 198, ${layer.opacity * 0.12}) 0%,
                    transparent 50%),
                   radial-gradient(circle at 65% 75%,
                    rgba(26, 26, 28, ${layer.opacity * 0.16}) 0%,
                    transparent 50%)`,
                  `radial-gradient(circle at 30% 20%,
                    rgba(63, 211, 198, ${layer.opacity * 0.08}) 0%,
                    transparent 50%),
                   radial-gradient(circle at 70% 80%,
                    rgba(26, 26, 28, ${layer.opacity * 0.12}) 0%,
                    transparent 50%)`,
                ]
              }}
              transition={{
                duration: 15 + index * 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}

          {layer.type === 'texture' && (
            <div
              className="absolute inset-0"
              style={{
                background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundSize: '180px 180px',
                opacity: layer.opacity,
                mixBlendMode: 'overlay',
              }}
            />
          )}
        </motion.div>
      ))}

      {/* Subtle mouse-following highlight */}
      {enableParallax && (
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle,
              rgba(63, 211, 198, ${intensity * 0.04}) 0%,
              rgba(63, 211, 198, ${intensity * 0.02}) 40%,
              transparent 70%)`,
            left: smoothMouseX,
            top: smoothMouseY,
            x: -400,
            y: -400,
            filter: 'blur(40px)',
            willChange: 'transform',
          }}
          animate={{
            scale: readingMode ? [0.8, 1, 0.8] : [0.9, 1.1, 0.9],
            opacity: readingMode ? [0.3, 0.5, 0.3] : [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: readingMode ? 6 : 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Edge vignette for focus */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: readingMode
            ? `radial-gradient(ellipse 60% 60% at 50% 50%,
                transparent 20%,
                rgba(10, 10, 11, 0.3) 60%,
                rgba(10, 10, 11, 0.7) 100%)`
            : `radial-gradient(ellipse 70% 70% at 50% 50%,
                transparent 40%,
                rgba(10, 10, 11, 0.1) 70%,
                rgba(10, 10, 11, 0.3) 100%)`,
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}
