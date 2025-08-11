import React, { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import './HeroSectionV2.css';

const HeroSectionV2: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationIdRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    // Get context after resize to ensure proper dimensions
    const ctx = canvas.getContext('2d');

    // CRITICAL FIX: Clean up resize listener if context creation fails
    if (!ctx) {
      window.removeEventListener('resize', resizeCanvas);
      return;
    }

    // Add resize listener only after successful context creation
    window.addEventListener('resize', resizeCanvas);

    // Particle system with performance optimizations
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;

      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.3; // Reduced speed for performance
        this.vy = (Math.random() - 0.5) * 0.3;
        this.radius = Math.random() * 2 + 0.5;
        this.opacity = Math.random() * 0.3 + 0.1; // Reduced opacity
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around edges
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 206, 209, ${this.opacity})`;
        ctx.fill();
      }
    }

    // Create fewer particles for better performance
    const particles: Particle[] = [];
    const particleCount = 30; // Reduced from 50
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // FPS limiting for performance
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    // Animation loop with FPS limiting
    const animate = (currentTime: number) => {
      // FPS limiting
      if (currentTime - lastFrameTimeRef.current < frameInterval) {
        animationIdRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameTimeRef.current = currentTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections (optimized with distance check)
      particles.forEach((p1, i) => {
        // Limit connection checks for performance
        const nearbyParticles = particles.slice(i + 1, Math.min(i + 6, particles.length));

        nearbyParticles.forEach(p2 => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) { // Reduced from 150
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 206, 209, ${0.08 * (1 - distance / 120)})`;
            ctx.stroke();
          }
        });

        // Mouse interaction (optimized)
        const dx = mouseX - p1.x;
        const dy = mouseY - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 80) { // Reduced from 100
          p1.vx += dx * 0.000008; // Reduced force
          p1.vy += dy * 0.000008;
        }

        p1.update();
        p1.draw();
      });

      animationIdRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationIdRef.current = requestAnimationFrame(animate);

    // Cleanup function with proper memory management
    return () => {
      // Cancel animation frame
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      // Remove all event listeners
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      // Clear particles array
      particles.length = 0;
    };
  }, []);

  return (
    <section className="hero-section-v2" ref={containerRef}>
      <canvas ref={canvasRef} className="hero-canvas" />

      <div className="hero-content">
        <div className="hero-badge">
          <Sparkles size={16} />
          <span>AI Transformation Experts</span>
        </div>

        <h1 className="hero-title">
          <span className="title-line">Illuminating the path</span>
          <span className="title-line accent">to AI transformation</span>
        </h1>

        <p className="hero-description">
          We turn your slowest business processes into your fastest competitive
          advantages through discrete, composable AI modules.
        </p>

        <div className="hero-actions">
          <button className="btn-primary">
            <span>Explore Partnership</span>
            <ArrowRight size={20} />
          </button>
          <button className="btn-secondary">
            <span>View Our Work</span>
          </button>
        </div>

        <div className="hero-stats">
          <div className="stat">
            <span className="stat-value">50+</span>
            <span className="stat-label">AI Modules Deployed</span>
          </div>
          <div className="stat">
            <span className="stat-value">10x</span>
            <span className="stat-label">Average Speed Improvement</span>
          </div>
          <div className="stat">
            <span className="stat-value">24/7</span>
            <span className="stat-label">Automated Operations</span>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <div className="visual-wrapper">
          <div className="glow-orb"></div>
          <img
            src="/logo/candlefish_highquality.png"
            alt="Candlefish AI"
            className="hero-logo"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSectionV2;
