'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ParticleFieldProps {
  intensity?: number;
  interactionOnly?: boolean;
}

interface DelightParticle {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  opacity: number;
  size: number;
  life: number;
  maxLife: number;
  type: 'interaction' | 'ambient';
}

// Refined ParticleField - Only shows particles during meaningful interactions
export function ParticleField({
  intensity = 0.3,
  interactionOnly = true
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const particlesRef = useRef<DelightParticle[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);
  const lastInteractionTime = useRef(0);
  const mousePosition = useRef({ x: 0, y: 0 });

  // Brand colors with refined opacity
  const colors = {
    livingCyan: { r: 63, g: 211, b: 198 },
    pearl: { r: 248, g: 248, b: 242 },
    charcoal: { r: 26, g: 26, b: 28 },
  };

  // Create particle on interaction
  const createDelightParticle = useCallback((
    x: number,
    y: number,
    type: 'interaction' | 'ambient' = 'interaction'
  ): DelightParticle => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 40;

    return {
      id: Date.now() + Math.random(),
      x,
      y,
      targetX: x + Math.cos(angle) * distance,
      targetY: y + Math.sin(angle) * distance - 30, // Slight upward bias
      opacity: intensity * (0.4 + Math.random() * 0.6),
      size: 1 + Math.random() * 2,
      life: 0,
      maxLife: 1500 + Math.random() * 1000,
      type,
    };
  }, [intensity]);

  // Generate particles only on meaningful interactions
  const generateInteractionParticles = useCallback((x: number, y: number, count: number = 3) => {
    const newParticles = Array.from({ length: count }, () =>
      createDelightParticle(x, y, 'interaction')
    );

    particlesRef.current = [...particlesRef.current, ...newParticles].slice(-20); // Max 20 particles
    setIsInteracting(true);
    lastInteractionTime.current = Date.now();

    // Auto-stop interaction state
    setTimeout(() => {
      if (Date.now() - lastInteractionTime.current >= 2000) {
        setIsInteracting(false);
      }
    }, 2000);
  }, [createDelightParticle]);

  // Detect meaningful mouse interactions
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const currentTime = Date.now();
    const { clientX, clientY } = e;

    // Update mouse position
    const previousX = mousePosition.current.x;
    const previousY = mousePosition.current.y;
    mousePosition.current = { x: clientX, y: clientY };

    // Only generate particles on significant movement or button interactions
    const distance = Math.sqrt(
      Math.pow(clientX - previousX, 2) + Math.pow(clientY - previousY, 2)
    );

    const timeSinceLastInteraction = currentTime - lastInteractionTime.current;

    // Generate particles on:
    // 1. Rapid mouse movement (gesture-like)
    // 2. Infrequent but deliberate movement
    if ((distance > 20 && timeSinceLastInteraction > 500) || distance > 50) {
      generateInteractionParticles(clientX, clientY, Math.ceil(distance / 25));
    }
  }, [generateInteractionParticles]);

  // Handle click interactions - always generate particles
  const handleClick = useCallback((e: MouseEvent) => {
    generateInteractionParticles(e.clientX, e.clientY, 5);
  }, [generateInteractionParticles]);

  // Handle button hover interactions
  const handleButtonInteraction = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // Only trigger on specific interactive elements
    if (target.matches('button, a, [role="button"], .interactive')) {
      const rect = target.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      generateInteractionParticles(centerX, centerY, 2);
    }
  }, [generateInteractionParticles]);

  // Update particles with physics-based movement
  const updateParticles = useCallback(() => {
    const particles = particlesRef.current;

    particlesRef.current = particles
      .map(particle => {
        // Age the particle
        particle.life += 16; // ~60fps

        // Smooth movement towards target using easing
        const progress = particle.life / particle.maxLife;
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);

        particle.x = particle.x + (particle.targetX - particle.x) * 0.02;
        particle.y = particle.y + (particle.targetY - particle.y) * 0.02;

        // Fade out over time
        particle.opacity = particle.opacity * (1 - progress * 0.005);

        return particle;
      })
      .filter(particle => particle.life < particle.maxLife && particle.opacity > 0.01);
  }, []);

  // Refined rendering with minimal visual impact
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with minimal trail effect
    ctx.fillStyle = 'rgba(10, 10, 11, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const particles = particlesRef.current;

    if (particles.length === 0) return;

    // Draw particles with subtle glow
    particles.forEach(particle => {
      const color = particle.type === 'interaction' ? colors.livingCyan : colors.pearl;

      // Main particle
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);

      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * 3
      );
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.opacity})`);
      gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.opacity * 0.3})`);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fill();

      // Subtle outer glow for interaction particles
      if (particle.type === 'interaction') {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.opacity * 0.1})`;
        ctx.fill();
      }
    });
  }, [colors]);

  // Main animation loop
  const animate = useCallback(() => {
    if (!isVisible || (!interactionOnly && !isInteracting && particlesRef.current.length === 0)) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    updateParticles();
    render();
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [updateParticles, render, isVisible, interactionOnly, isInteracting]);

  // Handle canvas resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  const handleVisibilityChange = useCallback(() => {
    setIsVisible(!document.hidden);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    handleResize();

    // Event listeners for meaningful interactions only
    window.addEventListener('resize', handleResize);
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('click', handleClick);
    document.addEventListener('mouseenter', handleButtonInteraction, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('mouseenter', handleButtonInteraction, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate, handleMouseMove, handleClick, handleButtonInteraction, handleResize, handleVisibilityChange]);

  // Don't render if no particles and interaction-only mode
  if (interactionOnly && !isInteracting && particlesRef.current.length === 0) {
    return null;
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-5"
        style={{
          mixBlendMode: 'screen',
          opacity: isInteracting ? 0.8 : 0.4,
          transition: 'opacity 0.6s ease-out',
        }}
      />

      {/* Visual feedback for development */}
      {process.env.NODE_ENV === 'development' && isInteracting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-4 left-4 z-50 text-xs font-mono text-pearl/50 bg-charcoal/80 px-2 py-1 rounded"
        >
          Particles: {particlesRef.current.length}
        </motion.div>
      )}
    </>
  );
}
