'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ParticleFieldProps {
  count?: number;
  burst?: boolean;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
}

export default function ParticleField({ count = 30, burst = false, className = '' }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        const speed = burst ? Math.random() * 5 + 2 : Math.random() * 0.5 + 0.1;
        
        particlesRef.current.push({
          x: burst ? canvas.width / 2 : Math.random() * canvas.width,
          y: burst ? canvas.height / 2 : Math.random() * canvas.height,
          vx: burst ? Math.cos(angle) * speed : (Math.random() - 0.5) * speed,
          vy: burst ? Math.sin(angle) * speed : (Math.random() - 0.5) * speed,
          size: Math.random() * 3 + 1,
          opacity: burst ? 1 : Math.random() * 0.5 + 0.2,
          life: burst ? 100 : Infinity
        });
      }
    };
    initParticles();

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle, index) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges if not burst mode
        if (!burst) {
          if (particle.x < 0) particle.x = canvas.width;
          if (particle.x > canvas.width) particle.x = 0;
          if (particle.y < 0) particle.y = canvas.height;
          if (particle.y > canvas.height) particle.y = 0;
        }

        // Update life for burst particles
        if (burst && particle.life > 0) {
          particle.life--;
          particle.opacity = particle.life / 100;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(63, 211, 198, ${particle.opacity})`;
        ctx.fill();

        // Remove dead particles
        if (burst && particle.life <= 0) {
          particlesRef.current.splice(index, 1);
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [count, burst]);

  return (
    <motion.canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    />
  );
}