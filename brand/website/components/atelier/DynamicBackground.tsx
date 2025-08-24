'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ParallaxLayer {
  id: string;
  depth: number;
  pattern: 'circuit' | 'grid' | 'dots' | 'lines';
  opacity: number;
  speed: number;
  color: 'copper' | 'living-cyan' | 'pearl';
}

interface DynamicBackgroundProps {
  scrollY?: number;
  mouseX?: number;
  mouseY?: number;
}

export function DynamicBackground({
  scrollY = 0,
  mouseX = 0,
  mouseY = 0
}: DynamicBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [currentScrollY, setCurrentScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const parallaxLayers: ParallaxLayer[] = [
    {
      id: 'circuit-deep',
      depth: 0.1,
      pattern: 'circuit',
      opacity: 0.05,
      speed: 0.2,
      color: 'copper'
    },
    {
      id: 'grid-mid',
      depth: 0.3,
      pattern: 'grid',
      opacity: 0.08,
      speed: 0.5,
      color: 'living-cyan'
    },
    {
      id: 'dots-surface',
      depth: 0.6,
      pattern: 'dots',
      opacity: 0.12,
      speed: 0.8,
      color: 'pearl'
    },
    {
      id: 'lines-overlay',
      depth: 0.9,
      pattern: 'lines',
      opacity: 0.04,
      speed: 1.2,
      color: 'living-cyan'
    },
  ];

  const colors = {
    copper: { r: 218, g: 165, b: 32 },
    'living-cyan': { r: 0, g: 188, b: 212 },
    pearl: { r: 240, g: 248, b: 255 },
  };

  const drawCircuitPattern = useCallback((
    ctx: CanvasRenderingContext2D,
    layer: ParallaxLayer,
    time: number,
    offset: { x: number; y: number }
  ) => {
    const { width, height } = viewportSize;
    const color = colors[layer.color];

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
    ctx.lineWidth = 0.5;

    const gridSize = 80;
    const animatedOffset = {
      x: offset.x + Math.sin(time * 0.001) * 10,
      y: offset.y + Math.cos(time * 0.0015) * 15
    };

    for (let x = -gridSize; x < width + gridSize; x += gridSize) {
      for (let y = -gridSize; y < height + gridSize; y += gridSize) {
        const adjustedX = x + animatedOffset.x;
        const adjustedY = y + animatedOffset.y;

        // Draw circuit node
        ctx.beginPath();
        ctx.arc(adjustedX, adjustedY, 2, 0, Math.PI * 2);
        ctx.stroke();

        // Draw connecting lines with random patterns
        if (Math.random() > 0.6) {
          ctx.beginPath();
          ctx.moveTo(adjustedX, adjustedY);

          const direction = Math.floor(Math.random() * 4);
          switch (direction) {
            case 0: // right
              ctx.lineTo(adjustedX + gridSize * 0.7, adjustedY);
              break;
            case 1: // down
              ctx.lineTo(adjustedX, adjustedY + gridSize * 0.7);
              break;
            case 2: // L-shape
              ctx.lineTo(adjustedX + gridSize * 0.3, adjustedY);
              ctx.lineTo(adjustedX + gridSize * 0.3, adjustedY + gridSize * 0.7);
              break;
            case 3: // T-shape
              ctx.lineTo(adjustedX + gridSize * 0.5, adjustedY);
              ctx.moveTo(adjustedX + gridSize * 0.25, adjustedY);
              ctx.lineTo(adjustedX + gridSize * 0.25, adjustedY + gridSize * 0.4);
              break;
          }
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }, [viewportSize, colors]);

  const drawGridPattern = useCallback((
    ctx: CanvasRenderingContext2D,
    layer: ParallaxLayer,
    time: number,
    offset: { x: number; y: number }
  ) => {
    const { width, height } = viewportSize;
    const color = colors[layer.color];

    ctx.save();
    ctx.globalAlpha = layer.opacity * (0.5 + Math.sin(time * 0.002) * 0.2);
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
    ctx.lineWidth = 0.3;

    const spacing = 40;

    // Vertical lines
    for (let x = offset.x % spacing; x < width; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = offset.y % spacing; y < height; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
  }, [viewportSize, colors]);

  const drawDotsPattern = useCallback((
    ctx: CanvasRenderingContext2D,
    layer: ParallaxLayer,
    time: number,
    offset: { x: number; y: number }
  ) => {
    const { width, height } = viewportSize;
    const color = colors[layer.color];

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;

    const spacing = 60;
    const pulseTime = time * 0.003;

    for (let x = offset.x % spacing; x < width; x += spacing) {
      for (let y = offset.y % spacing; y < height; y += spacing) {
        const distance = Math.sqrt(
          Math.pow(x - mousePosition.x, 2) + Math.pow(y - mousePosition.y, 2)
        );
        const pulse = Math.sin(pulseTime + distance * 0.01) * 0.5 + 0.5;
        const size = 1 + pulse * 2;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }, [viewportSize, colors, mousePosition]);

  const drawLinesPattern = useCallback((
    ctx: CanvasRenderingContext2D,
    layer: ParallaxLayer,
    time: number,
    offset: { x: number; y: number }
  ) => {
    const { width, height } = viewportSize;
    const color = colors[layer.color];

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
    ctx.lineWidth = 1;

    const waveAmplitude = 30;
    const waveFrequency = 0.01;
    const timeOffset = time * 0.002;

    // Draw flowing lines
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();

      const lineY = (height / 6) * (i + 1) + offset.y * 0.3;
      let isFirst = true;

      for (let x = -50; x < width + 50; x += 5) {
        const waveY = lineY + Math.sin(x * waveFrequency + timeOffset + i * 0.5) * waveAmplitude;

        if (isFirst) {
          ctx.moveTo(x, waveY);
          isFirst = false;
        } else {
          ctx.lineTo(x, waveY);
        }
      }

      ctx.stroke();
    }

    ctx.restore();
  }, [viewportSize, colors]);

  const drawLayer = useCallback((
    ctx: CanvasRenderingContext2D,
    layer: ParallaxLayer,
    time: number
  ) => {
    const parallaxOffset = {
      x: (mousePosition.x - viewportSize.width / 2) * layer.depth * 0.1,
      y: (mousePosition.y - viewportSize.height / 2) * layer.depth * 0.1 + currentScrollY * layer.speed * 0.5,
    };

    switch (layer.pattern) {
      case 'circuit':
        drawCircuitPattern(ctx, layer, time, parallaxOffset);
        break;
      case 'grid':
        drawGridPattern(ctx, layer, time, parallaxOffset);
        break;
      case 'dots':
        drawDotsPattern(ctx, layer, time, parallaxOffset);
        break;
      case 'lines':
        drawLinesPattern(ctx, layer, time, parallaxOffset);
        break;
    }
  }, [
    mousePosition,
    viewportSize,
    currentScrollY,
    drawCircuitPattern,
    drawGridPattern,
    drawDotsPattern,
    drawLinesPattern
  ]);

  const animate = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each parallax layer
    parallaxLayers.forEach(layer => {
      drawLayer(ctx, layer, timestamp);
    });

    animationRef.current = requestAnimationFrame(animate);
  }, [drawLayer, parallaxLayers]);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { innerWidth, innerHeight } = window;
    canvas.width = innerWidth;
    canvas.height = innerHeight;

    setViewportSize({ width: innerWidth, height: innerHeight });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleScroll = useCallback(() => {
    setCurrentScrollY(window.scrollY);
  }, []);

  useEffect(() => {
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [handleResize, handleMouseMove, handleScroll, animate]);

  // Update from props if provided
  useEffect(() => {
    setCurrentScrollY(scrollY);
  }, [scrollY]);

  useEffect(() => {
    setMousePosition({ x: mouseX, y: mouseY });
  }, [mouseX, mouseY]);

  return (
    <>
      {/* Main background canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          mixBlendMode: 'multiply',
          filter: 'brightness(0.8) contrast(1.1)'
        }}
      />

      {/* Gradient overlays for depth */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Top gradient */}
        <motion.div
          className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/40 to-transparent"
          animate={{
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: 'reverse'
          }}
        />

        {/* Bottom gradient */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 to-transparent"
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            repeatType: 'reverse'
          }}
        />

        {/* Center radial gradient for focus */}
        <div
          className="absolute inset-0 bg-radial-gradient opacity-10"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px,
              rgba(0, 188, 212, 0.15) 0%,
              rgba(218, 165, 32, 0.1) 40%,
              transparent 70%)`
          }}
        />

        {/* Subtle color shifts based on scroll */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg,
              rgba(0, 188, 212, ${Math.min(0.05, currentScrollY * 0.0001)}) 0%,
              transparent 50%,
              rgba(218, 165, 32, ${Math.min(0.03, currentScrollY * 0.00008)}) 100%)`
          }}
        />
      </div>

      {/* Floating particles for additional depth */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-living-cyan/20 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              x: [
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
                Math.random() * window.innerWidth,
              ],
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
              ],
              opacity: [0.2, 0.6, 0.1, 0.4, 0.2],
            }}
            transition={{
              duration: 20 + Math.random() * 30,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              transform: `translate3d(${mousePosition.x * (i * 0.002)}, ${mousePosition.y * (i * 0.002)}, 0)`,
            }}
          />
        ))}
      </div>
    </>
  );
}
