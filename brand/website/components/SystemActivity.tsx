'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getSystemActivity } from '../lib/api';
import type { SystemActivity as SystemActivityType } from '../types/api';

export default function SystemActivity() {
  const [data, setData] = useState<SystemActivityType>({ capacity: 0.9, activity: [] });
  const [animatedActivity, setAnimatedActivity] = useState<number[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastFrameTime = useRef<number>(0);

  // Load system activity data
  useEffect(() => {
    const loadData = async () => {
      const activityData = await getSystemActivity();
      setData(activityData);
      // Initialize animated values
      setAnimatedActivity(activityData.activity.map(() => Math.random() * 0.5));
    };

    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
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

  // Handle intersection observer
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

  // Simple noise generator for smooth animation
  const noise = useCallback((x: number, t: number) => {
    return Math.sin(x * 2 + t) * 0.3 +
           Math.sin(x * 3.7 + t * 1.3) * 0.2 +
           Math.sin(x * 5.2 + t * 0.7) * 0.1;
  }, []);

  // Canvas rendering
  const render = useCallback((timestamp: number) => {
    if (!canvasRef.current || !isVisible || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Throttle to ~30-60 FPS
    const deltaTime = timestamp - lastFrameTime.current;
    if (deltaTime < 16) { // Cap at 60 FPS
      animationFrameRef.current = requestAnimationFrame(render);
      return;
    }
    lastFrameTime.current = timestamp;

    // Get container bounds for responsive sizing
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size if changed
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    }

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate bar dimensions
    const barCount = data.activity.length || 8;
    const barSpacing = rect.width / barCount;
    const barWidth = Math.max(1, barSpacing * 0.3); // 30% width, 70% spacing
    const maxHeight = 2; // 1-2px tall bars

    // Draw bars
    ctx.fillStyle = 'rgba(65, 90, 119, 0.4)'; // #415A77 with transparency

    for (let i = 0; i < barCount; i++) {
      const baseValue = data.activity[i] || 0.5;
      const noiseValue = noise(i, timestamp * 0.001);
      const value = Math.max(0, Math.min(1, baseValue + noiseValue * 0.2));

      const height = value * maxHeight;
      const x = i * barSpacing + (barSpacing - barWidth) / 2;
      const y = (rect.height - height) / 2;

      ctx.fillRect(x, y, barWidth, height);
    }

    // Draw capacity indicator (subtle line)
    ctx.strokeStyle = 'rgba(63, 211, 198, 0.3)'; // #3FD3C6 with transparency
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, rect.height / 2);
    ctx.lineTo(rect.width * data.capacity, rect.height / 2);
    ctx.stroke();

    animationFrameRef.current = requestAnimationFrame(render);
  }, [data, isVisible, prefersReducedMotion, noise]);

  // Start animation loop
  useEffect(() => {
    if (!isVisible || prefersReducedMotion) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render, isVisible, prefersReducedMotion]);

  // Static fallback for reduced motion
  if (prefersReducedMotion) {
    return (
      <div
        ref={containerRef}
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#415A77]/20 to-transparent"
        style={{
          marginLeft: 'max(1.5rem, calc((100vw - 80rem) / 2))',
          marginRight: 'max(1.5rem, calc((100vw - 80rem) / 2))'
        }}
      >
        <div
          className="h-full bg-[#3FD3C6]/30 transition-all duration-1000"
          style={{ width: `${data.capacity * 100}%` }}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 right-0 h-1 pointer-events-none z-50"
      style={{
        marginLeft: 'max(1.5rem, calc((100vw - 80rem) / 2))',
        marginRight: 'max(1.5rem, calc((100vw - 80rem) / 2))'
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        aria-hidden="true"
      />
    </div>
  );
}
