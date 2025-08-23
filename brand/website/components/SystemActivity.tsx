'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';

// Minimal horizontal bar graph animation
// Extends across header text width with 1-2px tall bars
export default function SystemActivity() {
  const [activity, setActivity] = useState<number[]>([]);
  const [capacity, setCapacity] = useState(0.9);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();

  // Initialize activity data
  useEffect(() => {
    // Generate initial bar values (20-40 bars for density)
    const barCount = 30;
    const initialActivity = Array.from({ length: barCount }, () => Math.random() * 0.6 + 0.2);
    setActivity(initialActivity);
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

  // Smooth noise function for bar animation
  const smoothNoise = useCallback((x: number, t: number) => {
    return Math.sin(x * 0.5 + t) * 0.15 +
           Math.sin(x * 1.3 + t * 1.5) * 0.1 +
           Math.sin(x * 2.1 + t * 0.8) * 0.05;
  }, []);

  // Canvas rendering for smooth GPU-accelerated animation
  const render = useCallback((timestamp: number) => {
    if (!canvasRef.current || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Get container bounds
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Update canvas size if needed
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate bar dimensions
    const barCount = activity.length;
    if (barCount === 0) return;

    const totalWidth = rect.width;
    const barWidth = totalWidth / barCount;
    const spacing = barWidth * 0.7; // 70% spacing, 30% bar
    const actualBarWidth = barWidth * 0.3;
    const maxHeight = 2; // Maximum 2px tall

    // Draw bars with smooth animation
    ctx.fillStyle = 'rgba(65, 90, 119, 0.25)'; // Subtle monochrome (faint gray/blue)

    activity.forEach((baseValue, i) => {
      // Add smooth noise to base value
      const noiseValue = smoothNoise(i * 0.3, timestamp * 0.0008);
      const value = Math.max(0.1, Math.min(1, baseValue + noiseValue));

      // Calculate bar position and height
      const height = value * maxHeight;
      const x = i * barWidth + (barWidth - actualBarWidth) / 2;
      const y = (rect.height - height) / 2;

      // Draw bar
      ctx.fillRect(x, y, actualBarWidth, height);
    });

    // Optional: Draw subtle capacity line
    if (capacity > 0) {
      ctx.strokeStyle = 'rgba(63, 211, 198, 0.15)'; // Very subtle aqua
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(0, rect.height / 2);
      ctx.lineTo(totalWidth * capacity, rect.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    animationFrameRef.current = requestAnimationFrame(render);
  }, [activity, capacity, prefersReducedMotion, smoothNoise]);

  // Start animation loop
  useEffect(() => {
    if (prefersReducedMotion) return;

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render, prefersReducedMotion]);

  // Static fallback for reduced motion
  if (prefersReducedMotion) {
    return (
      <div
        ref={containerRef}
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#415A77]/10 to-transparent z-50"
        style={{
          marginLeft: 'auto',
          marginRight: 'auto',
          maxWidth: '80rem'
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 right-0 h-[4px] pointer-events-none z-50 flex items-center justify-center"
    >
      <div
        className="w-full h-full"
        style={{
          maxWidth: '80rem',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem'
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          aria-hidden="true"
          style={{
            imageRendering: 'crisp-edges',
            WebkitFontSmoothing: 'antialiased'
          }}
        />
      </div>
    </div>
  );
}
