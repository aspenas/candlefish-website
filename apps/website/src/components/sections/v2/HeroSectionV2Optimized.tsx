import React, { useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { QuadTree, type Rectangle, type Particle as ParticleType } from '../../../utils/QuadTree';
import './HeroSectionV2.css';

// Performance configuration
const PERFORMANCE_CONFIG = {
  targetFPS: 30,
  particleCount: { desktop: 40, mobile: 20 },
  connectionDistance: { desktop: 120, mobile: 80 },
  mouseInfluenceDistance: 80,
  maxConnectionsPerParticle: 5,
  enableQuadTree: true,
  respectReducedMotion: true
};

class Particle implements ParticleType {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.radius = Math.random() * 2 + 0.5;
    this.opacity = Math.random() * 0.3 + 0.1;
  }

  update(deltaTime: number = 1): void {
    // Use deltaTime for frame-independent movement
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    // Apply friction
    this.vx *= 0.999;
    this.vy *= 0.999;

    // Wrap around edges
    if (this.x < 0) this.x = this.canvasWidth;
    if (this.x > this.canvasWidth) this.x = 0;
    if (this.y < 0) this.y = this.canvasHeight;
    if (this.y > this.canvasHeight) this.y = 0;
  }

  applyForce(fx: number, fy: number): void {
    this.vx += fx;
    this.vy += fy;

    // Limit max velocity
    const maxVelocity = 2;
    const velocity = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (velocity > maxVelocity) {
      this.vx = (this.vx / velocity) * maxVelocity;
      this.vy = (this.vy / velocity) * maxVelocity;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 206, 209, ${this.opacity})`;
    ctx.fill();
  }
}

const HeroSectionV2Optimized: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationIdRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const quadTreeRef = useRef<QuadTree<Particle>>();
  const mouseRef = useRef({ x: 0, y: 0 });
  const isVisibleRef = useRef(true);
  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);

  // Check for reduced motion preference
  const prefersReducedMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Check if mobile device
  const isMobile = useCallback(() => {
    return window.innerWidth <= 768;
  }, []);

  // Initialize particles
  const initParticles = useCallback((canvas: HTMLCanvasElement) => {
    const count = isMobile() ?
      PERFORMANCE_CONFIG.particleCount.mobile :
      PERFORMANCE_CONFIG.particleCount.desktop;

    particlesRef.current = [];
    for (let i = 0; i < count; i++) {
      particlesRef.current.push(new Particle(canvas.width, canvas.height));
    }
  }, [isMobile]);

  // Build QuadTree for efficient spatial queries
  const buildQuadTree = useCallback((canvas: HTMLCanvasElement) => {
    const boundary: Rectangle = {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height
    };

    quadTreeRef.current = new QuadTree<Particle>(boundary, 4);

    for (const particle of particlesRef.current) {
      quadTreeRef.current.insert(particle);
    }
  }, []);

  // Optimized drawing function using offscreen canvas when available
  const drawFrame = useCallback((
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    canvas: HTMLCanvasElement | OffscreenCanvas,
    deltaTime: number
  ) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rebuild QuadTree each frame for moving particles
    if (PERFORMANCE_CONFIG.enableQuadTree && canvas instanceof HTMLCanvasElement) {
      buildQuadTree(canvas);
    }

    const connectionDistance = isMobile() ?
      PERFORMANCE_CONFIG.connectionDistance.mobile :
      PERFORMANCE_CONFIG.connectionDistance.desktop;

    // Draw particles and connections
    particlesRef.current.forEach((particle, i) => {
      // Find nearby particles efficiently using QuadTree
      let nearbyParticles: Particle[];

      if (PERFORMANCE_CONFIG.enableQuadTree && quadTreeRef.current) {
        nearbyParticles = quadTreeRef.current.queryRadius(
          particle.x,
          particle.y,
          connectionDistance
        );
      } else {
        // Fallback to limited neighbor check
        nearbyParticles = particlesRef.current.slice(
          i + 1,
          Math.min(i + PERFORMANCE_CONFIG.maxConnectionsPerParticle + 1, particlesRef.current.length)
        );
      }

      // Draw connections
      let connectionsDrawn = 0;
      for (const otherParticle of nearbyParticles) {
        if (otherParticle === particle) continue;
        if (connectionsDrawn >= PERFORMANCE_CONFIG.maxConnectionsPerParticle) break;

        const dx = particle.x - otherParticle.x;
        const dy = particle.y - otherParticle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < connectionDistance) {
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(otherParticle.x, otherParticle.y);
          const opacity = 0.08 * (1 - distance / connectionDistance);
          ctx.strokeStyle = `rgba(0, 206, 209, ${opacity})`;
          ctx.stroke();
          connectionsDrawn++;
        }
      }

      // Mouse interaction
      const dx = mouseRef.current.x - particle.x;
      const dy = mouseRef.current.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < PERFORMANCE_CONFIG.mouseInfluenceDistance && distance > 0) {
        const force = (1 - distance / PERFORMANCE_CONFIG.mouseInfluenceDistance) * 0.00002;
        particle.applyForce(dx * force, dy * force);
      }

      // Update and draw particle
      particle.update(deltaTime);
      particle.draw(ctx as CanvasRenderingContext2D);
    });
  }, [buildQuadTree, isMobile]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check for reduced motion preference
    if (PERFORMANCE_CONFIG.respectReducedMotion && prefersReducedMotion()) {
      // Don't animate if user prefers reduced motion
      return;
    }

    // Set up canvas
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      // Reinitialize particles on resize
      initParticles(canvas);

      // Create offscreen canvas if supported
      if ('OffscreenCanvas' in window && !offscreenCanvasRef.current) {
        try {
          offscreenCanvasRef.current = new OffscreenCanvas(canvas.width, canvas.height);
        } catch (e) {
          console.log('OffscreenCanvas not available');
        }
      }
    };

    resizeCanvas();

    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true // Hint for better performance
    });

    if (!ctx) {
      return;
    }

    // Scale for device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    // Event listeners
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) * dpr;
      mouseRef.current.y = (e.clientY - rect.top) * dpr;
    };

    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };

    // Set up Intersection Observer for viewport visibility
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          isVisibleRef.current = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize particles
    initParticles(canvas);

    // Animation loop with FPS limiting and delta time
    const frameInterval = 1000 / PERFORMANCE_CONFIG.targetFPS;
    let lastTime = 0;

    const animate = (currentTime: number) => {
      // Skip animation if not visible
      if (!isVisibleRef.current) {
        animationIdRef.current = requestAnimationFrame(animate);
        return;
      }

      // FPS limiting
      const deltaTime = currentTime - lastTime;
      if (deltaTime < frameInterval) {
        animationIdRef.current = requestAnimationFrame(animate);
        return;
      }

      // Calculate actual delta for physics
      const physicsDelta = Math.min(deltaTime / 16.67, 2); // Cap at 2x speed
      lastTime = currentTime - (deltaTime % frameInterval);

      // Draw frame
      drawFrame(ctx, canvas, physicsDelta);

      animationIdRef.current = requestAnimationFrame(animate);
    };

    // Start animation
    animationIdRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
      observer.disconnect();

      // Clear references
      particlesRef.current = [];
      quadTreeRef.current?.clear();
      offscreenCanvasRef.current = null;
    };
  }, [initParticles, drawFrame, prefersReducedMotion]);

  return (
    <section className="hero-section-v2" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="hero-canvas"
        aria-hidden="true"
      />

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
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSectionV2Optimized;
