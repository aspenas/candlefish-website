'use client';

import React, { useEffect, useState, useRef } from 'react';

export default function HeaderText() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const animationFrameRef = useRef<number>();

  // Static project data - always available
  const projects = [
    { id: 'engraving', title: 'engraving automation for a trophy franchise network' },
    { id: 'promoteros', title: 'concert intelligence platform for live music venues' },
    { id: 'inventory', title: 'inventory management system for real estate operations' },
    { id: 'paintbox', title: 'excel-to-web platform for construction estimating' }
  ];

  // Rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % projects.length);
        setTimeout(() => setIsTransitioning(false), 800);
      }, 400);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Mist particle effect
  useEffect(() => {
    if (!canvasRef.current || !isTransitioning) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update canvas size
    const updateSize = () => {
      if (!textRef.current) return;
      const rect = textRef.current.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    updateSize();

    // Particle system
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 3 + 1,
        opacity: 0
      });
    }

    const startTime = Date.now();
    const animate = () => {
      const progress = Math.min((Date.now() - startTime) / 1200, 1);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        
        p.opacity = progress < 0.5 
          ? progress * 2 * 0.3 
          : (1 - (progress - 0.5) * 2) * 0.3;
        
        ctx.fillStyle = `rgba(65, 90, 119, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isTransitioning]);

  return (
    <h1 className="text-6xl md:text-7xl lg:text-8xl font-light text-[#F8F8F2] leading-[0.9] tracking-tight max-w-6xl">
      Currently engineering<br />
      <span className="text-[#415A77] relative inline-block">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 pointer-events-none z-10 transition-opacity duration-300 ${
            isTransitioning ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />
        <span
          ref={textRef}
          className={`relative transition-all duration-800 ${
            isTransitioning ? 'opacity-60' : 'opacity-100'
          }`}
          style={{
            filter: isTransitioning ? 'blur(1px)' : 'blur(0)',
            transform: isTransitioning ? 'scale(0.98)' : 'scale(1)',
          }}
        >
          {projects[currentIndex].title}
        </span>
      </span>
    </h1>
  );
}
