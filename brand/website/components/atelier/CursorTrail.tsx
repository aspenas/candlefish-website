'use client';

import React, { useEffect, useRef, useState } from 'react';

interface TrailParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  opacity: number;
}

export function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<TrailParticle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (!isActive) setIsActive(true);
      
      // Create new particles at mouse position
      const numParticles = Math.random() * 3 + 1;
      for (let i = 0; i < numParticles; i++) {
        particlesRef.current.push(createParticle(e.clientX, e.clientY));
      }
    };

    const handleMouseLeave = () => {
      setTimeout(() => setIsActive(false), 2000); // Fade out after 2 seconds
    };

    const createParticle = (x: number, y: number): TrailParticle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 0.5;
      const life = Math.random() * 40 + 20;
      
      return {
        x,
        y,
        vx: Math.cos(angle) * speed * 0.3,
        vy: Math.sin(angle) * speed * 0.3,
        life,
        maxLife: life,
        size: Math.random() * 3 + 1,
        opacity: 1,
      };
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const particle = particlesRef.current[i];
        
        // Update particle physics
        particle.life--;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.98; // Friction
        particle.vy *= 0.98;
        
        // Calculate opacity based on life
        particle.opacity = particle.life / particle.maxLife;
        
        // Draw particle with copper glow
        if (particle.opacity > 0.01) {
          const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size * 2
          );
          
          gradient.addColorStop(0, `rgba(184, 115, 51, ${particle.opacity * 0.8})`);
          gradient.addColorStop(0.5, `rgba(184, 115, 51, ${particle.opacity * 0.4})`);
          gradient.addColorStop(1, `rgba(184, 115, 51, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Core particle
          ctx.fillStyle = `rgba(248, 248, 242, ${particle.opacity * 0.6})`;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Remove dead particles
        if (particle.life <= 0) {
          particlesRef.current.splice(i, 1);
        }
      }
      
      // Limit particle count for performance
      if (particlesRef.current.length > 150) {
        particlesRef.current = particlesRef.current.slice(-100);
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-30 transition-opacity duration-1000 ${
        isActive ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ mixBlendMode: 'screen' }}
    />
  );
}