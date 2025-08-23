'use client';

import React, { useEffect, useState, useRef } from 'react';

// Subtle mist particle effect using WebGL shaders
// Implements fog-like dissolve transition between project titles
export default function HeaderText() {
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const animationFrameRef = useRef<number>();
  const intervalRef = useRef<NodeJS.Timeout>();

  // Load projects from static data (works with static export)
  useEffect(() => {
    // Use static project data since API routes don't work with static export
    setProjects([
      { id: 'engraving', title: 'engraving automation for a trophy franchise network' },
      { id: 'promoteros', title: 'concert intelligence platform for live music venues' },
      { id: 'inventory', title: 'inventory management system for real estate operations' },
      { id: 'paintbox', title: 'excel-to-web platform for construction estimating' }
    ]);
  }, []);

  // Rotation logic - every 5 seconds
  useEffect(() => {
    if (projects.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setIsTransitioning(true);
      
      // Start the mist transition
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % projects.length);
        
        // End transition after animation
        setTimeout(() => {
          setIsTransitioning(false);
        }, 800);
      }, 400); // Halfway through transition
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [projects]);

  // WebGL mist particle effect
  useEffect(() => {
    if (!canvasRef.current || !isTransitioning) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match text
    const updateCanvasSize = () => {
      if (!textRef.current) return;
      const rect = textRef.current.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };
    updateCanvasSize();

    // Mist particle system
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      life: number;
    }> = [];

    // Generate particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 3 + 1,
        opacity: 0,
        life: 0
      });
    }

    let animationProgress = 0;
    const animationDuration = 1200; // milliseconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      animationProgress = Math.min(elapsed / animationDuration, 1);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particles.forEach(particle => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Update opacity based on animation progress
        if (animationProgress < 0.5) {
          particle.opacity = animationProgress * 2 * 0.3; // Fade in
        } else {
          particle.opacity = (1 - (animationProgress - 0.5) * 2) * 0.3; // Fade out
        }

        // Draw particle
        ctx.fillStyle = `rgba(65, 90, 119, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      if (animationProgress < 1) {
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

  const currentProject = projects[currentIndex];

  if (!currentProject) {
    return (
      <h1 className="text-6xl md:text-7xl lg:text-8xl font-light text-[#F8F8F2] leading-[0.9] tracking-tight max-w-6xl">
        Currently engineering<br />
        <span className="text-[#415A77]">
          operational excellence systems
        </span>
      </h1>
    );
  }

  return (
    <h1 className="text-6xl md:text-7xl lg:text-8xl font-light text-[#F8F8F2] leading-[0.9] tracking-tight max-w-6xl">
      Currently engineering<br />
      <span className="text-[#415A77] relative inline-block">
        {/* Canvas for mist effect overlay */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 pointer-events-none z-10 ${
            isTransitioning ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-300`}
          aria-hidden="true"
        />
        
        {/* Text with transition */}
        <span
          ref={textRef}
          className={`relative transition-all duration-800 ${
            isTransitioning ? 'opacity-60 blur-[1px]' : 'opacity-100 blur-0'
          }`}
          style={{
            filter: isTransitioning ? 'blur(1px)' : 'blur(0)',
            transform: isTransitioning ? 'scale(0.98)' : 'scale(1)',
            color: isTransitioning ? '#526781' : '#415A77'
          }}
        >
          {currentProject.title}
        </span>
      </span>
    </h1>
  );
}