'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { HeroFishConfig } from '../src/heroFish/types';

interface WebHeroFishProps {
  className?: string;
  enableMouseInteraction?: boolean;
  enableKeyboardControls?: boolean;
  enableFullscreen?: boolean;
  enableScrollEffects?: boolean;
  onInteraction?: (type: string, data: any) => void;
  onPerformanceChange?: (metrics: any) => void;
  config?: Partial<HeroFishConfig>;
}

export default function WebHeroFish({
  className = '',
  enableMouseInteraction = true,
  enableKeyboardControls = true,
  enableFullscreen = true,
  enableScrollEffects = true,
  onInteraction,
  onPerformanceChange,
  config = {}
}: WebHeroFishProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const heroFishRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [performance, setPerformance] = useState('T1');
  const [showControls, setShowControls] = useState(false);

  // Mouse interaction
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!enableMouseInteraction || !heroFishRef.current) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    heroFishRef.current.handleMouseMove?.(x, y);
    onInteraction?.('mouse:move', { x, y });
  }, [enableMouseInteraction, onInteraction]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!enableMouseInteraction || !heroFishRef.current) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    heroFishRef.current.triggerDart?.();
    onInteraction?.('mouse:click', { x, y });
  }, [enableMouseInteraction, onInteraction]);

  // Keyboard controls
  useEffect(() => {
    if (!enableKeyboardControls) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key) {
        case 'ArrowUp':
        case 'w':
          heroFishRef.current?.moveUp?.();
          onInteraction?.('keyboard', { key: e.key, action: 'up' });
          break;
        case 'ArrowDown':
        case 's':
          heroFishRef.current?.moveDown?.();
          onInteraction?.('keyboard', { key: e.key, action: 'down' });
          break;
        case 'ArrowLeft':
        case 'a':
          heroFishRef.current?.moveLeft?.();
          onInteraction?.('keyboard', { key: e.key, action: 'left' });
          break;
        case 'ArrowRight':
        case 'd':
          heroFishRef.current?.moveRight?.();
          onInteraction?.('keyboard', { key: e.key, action: 'right' });
          break;
        case ' ':
          e.preventDefault();
          heroFishRef.current?.triggerDart?.();
          onInteraction?.('keyboard', { key: 'space', action: 'dart' });
          break;
        case 'f':
          if (enableFullscreen) {
            toggleFullscreen();
          }
          break;
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardControls, enableFullscreen, isFullscreen, onInteraction]);

  // Scroll effects
  useEffect(() => {
    if (!enableScrollEffects) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollY / maxScroll;
      
      heroFishRef.current?.setScrollInfluence?.(scrollPercent);
      onInteraction?.('scroll', { percent: scrollPercent, y: scrollY });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [enableScrollEffects, onInteraction]);

  // Fullscreen functionality
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
        onInteraction?.('fullscreen', { active: true });
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        onInteraction?.('fullscreen', { active: false });
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, [onInteraction]);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Initialize HeroFish
  useEffect(() => {
    const initFish = async () => {
      if (!canvasRef.current) return;

      try {
        // Dynamic import for code splitting
        const { createHeroFish } = await import('../src/heroFish');
        
        const bounds = {
          x: 0,
          y: 0,
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight
        };

        heroFishRef.current = await createHeroFish(canvasRef.current, {
          ...config,
          bounds,
          enableBloom: true,
          enableAdaptiveQuality: true,
          targetFPS: 60,
          respectReducedMotion: true
        });

        // Performance monitoring
        if (onPerformanceChange) {
          const interval = setInterval(() => {
            const metrics = heroFishRef.current?.getMetrics?.();
            if (metrics) {
              setPerformance(metrics.qualityTier || 'T1');
              onPerformanceChange(metrics);
            }
          }, 1000);

          return () => clearInterval(interval);
        }

        heroFishRef.current.start();
      } catch (error) {
        console.error('Failed to initialize HeroFish:', error);
      }
    };

    initFish();

    return () => {
      heroFishRef.current?.dispose();
    };
  }, [config, onPerformanceChange]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !heroFishRef.current) return;
      
      const bounds = {
        x: 0,
        y: 0,
        width: canvasRef.current.clientWidth,
        height: canvasRef.current.clientHeight
      };
      
      heroFishRef.current.resize?.(bounds);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`hero-fish-container ${className} ${isFullscreen ? 'fullscreen' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
      onMouseEnter={() => setShowControls(true)}
    >
      <canvas
        ref={canvasRef}
        className="hero-fish-canvas"
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%',
          cursor: enableMouseInteraction ? 'crosshair' : 'default'
        }}
      />
      
      {/* Control Overlay */}
      <div className={`controls-overlay ${showControls ? 'visible' : ''}`}>
        <div className="controls-panel">
          {enableKeyboardControls && (
            <div className="control-hint">
              <kbd>↑↓←→</kbd> Move • <kbd>Space</kbd> Dart
            </div>
          )}
          {enableFullscreen && (
            <button 
              onClick={toggleFullscreen}
              className="fullscreen-btn"
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? '⊡' : '⊞'}
            </button>
          )}
          <div className="performance-indicator">
            Quality: <span className={`tier tier-${performance.toLowerCase()}`}>{performance}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hero-fish-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 400px;
          background: var(--deep-indigo, #3A3A60);
          overflow: hidden;
        }

        .hero-fish-container.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
        }

        .hero-fish-canvas {
          display: block;
        }

        .controls-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          padding: 1rem;
          background: linear-gradient(to bottom, rgba(0,0,0,0.3), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .controls-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .controls-panel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }

        .control-hint {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.875rem;
          font-family: var(--font-mono, monospace);
        }

        .control-hint kbd {
          padding: 0.25rem 0.5rem;
          margin: 0 0.125rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.25rem;
          font-size: 0.75rem;
        }

        .fullscreen-btn {
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 0.25rem;
          color: white;
          cursor: pointer;
          font-size: 1.25rem;
          transition: all 0.2s ease;
        }

        .fullscreen-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .performance-indicator {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.875rem;
          font-family: var(--font-mono, monospace);
        }

        .tier {
          padding: 0.125rem 0.5rem;
          border-radius: 0.25rem;
          font-weight: 600;
        }

        .tier-t1 { background: rgba(0, 255, 0, 0.3); }
        .tier-t2 { background: rgba(255, 255, 0, 0.3); }
        .tier-t3 { background: rgba(255, 165, 0, 0.3); }
        .tier-t4 { background: rgba(255, 0, 0, 0.3); }

        @media (max-width: 768px) {
          .controls-panel {
            flex-direction: column;
            gap: 0.5rem;
            align-items: flex-start;
          }

          .control-hint {
            font-size: 0.75rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .controls-overlay {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}