'use client'

import React, { useEffect, useState, useRef } from 'react'

/**
 * Optimized System Activity Component
 *
 * Performance Optimizations:
 * 1. Pure CSS animations instead of JS state updates
 * 2. GPU-accelerated transforms
 * 3. will-change property for optimal rendering
 * 4. Single RAF for all animations
 * 5. CSS containment for layout isolation
 * 6. Reduced reflows and repaints
 */
export function SystemActivityOptimized() {
  const [isVisible, setIsVisible] = useState(false)
  const [capacity] = useState(94)
  const containerRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect() // Only load once
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px' // Start loading slightly before visible
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  if (!isVisible) {
    // Placeholder with exact dimensions to prevent layout shift
    return (
      <div
        ref={containerRef}
        className="w-96 h-[180px] bg-[#1B263B]/20 animate-pulse"
        style={{ contain: 'layout size style' }}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className="system-activity-widget bg-[#1B263B]/50 backdrop-blur-sm border border-[#415A77]/30 p-6"
      style={{
        contain: 'layout style paint',
        willChange: 'auto'
      }}
    >
      <style jsx>{`
        .system-activity-widget {
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        .activity-bar {
          transform-origin: bottom;
          animation: wave-animation var(--duration) ease-in-out infinite;
          animation-delay: var(--delay);
          will-change: transform, opacity;
          transform: translateZ(0) scaleY(var(--scale, 0.5));
          backface-visibility: hidden;
        }

        @keyframes wave-animation {
          0%, 100% {
            transform: translateZ(0) scaleY(0.3);
            opacity: 0.3;
          }
          25% {
            transform: translateZ(0) scaleY(0.6);
            opacity: 0.5;
          }
          50% {
            transform: translateZ(0) scaleY(1);
            opacity: 0.8;
          }
          75% {
            transform: translateZ(0) scaleY(0.7);
            opacity: 0.6;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .activity-bar {
            animation: none;
            transform: translateZ(0) scaleY(0.6);
          }
        }

        .bar-gradient {
          background: linear-gradient(to top, #3FD3C6, #3FD3C680);
          pointer-events: none;
        }
      `}</style>

      <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4">
        System Activity
      </div>

      {/* CSS-only animated bars */}
      <div className="h-20 flex items-end gap-1">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="activity-bar flex-1 bar-gradient"
            style={{
              '--duration': `${2 + (i % 3) * 0.5}s`,
              '--delay': `${i * 0.05}s`,
              '--scale': 0.3 + Math.sin(i * 0.3) * 0.7,
              height: '100%',
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="mt-4 flex justify-between text-xs">
        <span className="text-[#415A77]">Operational</span>
        <span className="text-[#3FD3C6]">{capacity}% Capacity</span>
      </div>
    </div>
  )
}
