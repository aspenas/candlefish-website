'use client'

import React, { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'

// Lazy load heavy Three.js components
const Heavy3DVisualization = lazy(() => import('./Heavy3DVisualization'))

interface PerformanceMetric {
  label: string
  before: string
  after: string
  value: number
  unit: string
  improvement: string
}

/**
 * Optimized Architecture Visualization Component
 *
 * Performance Optimizations:
 * 1. Progressive enhancement - starts with CSS animation, loads 3D later
 * 2. Lazy loading of Three.js components
 * 3. CSS-only animations for initial load
 * 4. requestAnimationFrame for smooth updates
 * 5. Intersection Observer for visibility-based loading
 * 6. GPU-accelerated transforms
 * 7. Reduced complexity on initial load
 */
export default function ArchitectureVisualizationOptimized() {
  const [isVisible, setIsVisible] = useState(false)
  const [isEnhanced, setIsEnhanced] = useState(false)
  const [currentMetric, setCurrentMetric] = useState(0)
  const [animationPhase, setAnimationPhase] = useState<'loading' | 'active' | 'complete'>('loading')
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number>()

  const performanceMetrics: PerformanceMetric[] = [
    { label: 'Processing Time', before: '45+ min', after: '<1 min', value: 98, unit: '%', improvement: 'reduction' },
    { label: 'Error Rate', before: '12%', after: '<1%', value: 92, unit: '%', improvement: 'reduction' },
    { label: 'Throughput', before: '1.3/hr', after: '60/hr', value: 4600, unit: '%', improvement: 'increase' },
    { label: 'Labor Cost', before: '$45', after: '$0.75', value: 98, unit: '%', improvement: 'reduction' }
  ]

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)

          // Progressive enhancement: Load 3D after initial render
          setTimeout(() => {
            setIsEnhanced(true)
          }, 100)

          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Optimized animation loop using RAF
  useEffect(() => {
    if (!isVisible) return

    let startTime = Date.now()

    const animate = () => {
      const now = Date.now()
      const elapsed = now - startTime

      // Update metrics every 3.5 seconds
      if (elapsed > 3500) {
        setCurrentMetric(prev => (prev + 1) % performanceMetrics.length)
        startTime = now
      }

      // Update animation phase
      if (elapsed < 1000) {
        setAnimationPhase('loading')
      } else if (elapsed < 4000) {
        setAnimationPhase('active')
      } else {
        setAnimationPhase('complete')
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [isVisible, performanceMetrics.length])

  const currentMetricData = performanceMetrics[currentMetric]

  if (!isVisible) {
    // Placeholder to prevent layout shift
    return (
      <div
        ref={containerRef}
        className="relative h-[800px] bg-[#1B263B]/20 animate-pulse"
        style={{ contain: 'layout size style' }}
      />
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <style jsx>{`
        @keyframes quantum-flow {
          0% {
            transform: translateX(-100%) translateZ(0);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(100%) translateZ(0);
            opacity: 0;
          }
        }

        @keyframes node-pulse {
          0%, 100% {
            transform: scale(1) translateZ(0);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1) translateZ(0);
            opacity: 1;
          }
        }

        .quantum-pipeline {
          transform: translateZ(0);
          backface-visibility: hidden;
          will-change: transform;
        }

        .flow-particle {
          animation: quantum-flow 3s ease-in-out infinite;
          animation-delay: var(--delay);
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        .node-circle {
          animation: node-pulse 2s ease-in-out infinite;
          animation-delay: var(--node-delay);
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        @media (prefers-reduced-motion: reduce) {
          .flow-particle,
          .node-circle {
            animation: none;
          }
        }
      `}</style>

      {/* System Status Banner */}
      <motion.div
        className="mb-6 flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-[#3FD3C6] text-sm font-mono tracking-wider">
          SYSTEM_STATUS: {animationPhase.toUpperCase()}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-[#415A77] text-xs tracking-wider">MODE</div>
            <div className="text-[#F8F8F2] font-mono">{isEnhanced ? '3D' : '2D'}</div>
          </div>
        </div>
      </motion.div>

      {/* Main Visualization Container */}
      <motion.div
        className="quantum-pipeline bg-gradient-to-br from-[#0D1B2A]/40 to-[#1B263B]/60 border border-[#415A77]/30 p-0 mb-8 relative overflow-hidden backdrop-blur-sm"
        style={{
          borderRadius: '4px',
          boxShadow: '0 8px 32px rgba(13, 27, 42, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          contain: 'layout style paint'
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {/* Progressive Enhancement: Start with CSS animation */}
        {!isEnhanced ? (
          <div className="w-full h-[600px] relative bg-gradient-to-br from-[#0D1B2A] to-[#1B263B]">
            {/* CSS-only quantum pipeline visualization */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600">
              {/* Pipeline nodes */}
              {[
                { x: 150, y: 200, label: 'Intake', delay: 0 },
                { x: 300, y: 200, label: 'Validation', delay: 0.2 },
                { x: 450, y: 200, label: 'Processing', delay: 0.4 },
                { x: 600, y: 200, label: 'Delivery', delay: 0.6 },
                { x: 225, y: 350, label: 'Inventory', delay: 0.8 },
                { x: 400, y: 350, label: 'Engraving', delay: 1 },
                { x: 575, y: 350, label: 'Assembly', delay: 1.2 }
              ].map((node, i) => (
                <g key={i}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="20"
                    className="node-circle"
                    fill="#3FD3C6"
                    fillOpacity="0.3"
                    stroke="#3FD3C6"
                    strokeWidth="2"
                    style={{ '--node-delay': `${node.delay}s` } as React.CSSProperties}
                  />
                  <text
                    x={node.x}
                    y={node.y - 30}
                    textAnchor="middle"
                    fill="#F8F8F2"
                    fontSize="12"
                    fontFamily="SF Mono, monospace"
                  >
                    {node.label}
                  </text>
                </g>
              ))}

              {/* Connections */}
              <path
                d="M 170 200 L 280 200 M 320 200 L 430 200 M 470 200 L 580 200 M 300 220 L 225 330 M 450 220 L 400 330 M 425 350 L 550 350 M 400 370 L 400 450"
                stroke="#415A77"
                strokeWidth="2"
                fill="none"
                opacity="0.5"
              />

              {/* Flow particles */}
              {Array.from({ length: 8 }, (_, i) => (
                <circle
                  key={i}
                  r="4"
                  fill="#3FD3C6"
                  className="flow-particle"
                  style={{ '--delay': `${i * 0.4}s` } as React.CSSProperties}
                >
                  <animateMotion
                    dur="4s"
                    repeatCount="indefinite"
                    begin={`${i * 0.5}s`}
                  >
                    <mpath href="#flowPath" />
                  </animateMotion>
                </circle>
              ))}

              {/* Hidden path for particle motion */}
              <path
                id="flowPath"
                d="M 150 200 L 300 200 L 450 200 L 600 200"
                fill="none"
                stroke="none"
              />
            </svg>

            {/* Loading text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-[#3FD3C6] text-base font-mono tracking-widest opacity-50">
                QUANTUM PIPELINE ACTIVE
              </div>
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="w-full h-[600px] flex items-center justify-center bg-gradient-to-br from-[#0D1B2A] to-[#1B263B]">
                <div className="text-[#3FD3C6] text-base font-mono tracking-widest">
                  LOADING 3D VISUALIZATION...
                </div>
              </div>
            }
          >
            <Heavy3DVisualization
              animationPhase={animationPhase}
              performanceMetrics={performanceMetrics}
              currentMetric={currentMetric}
            />
          </Suspense>
        )}
      </motion.div>

      {/* Performance Metrics Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transformation Impact */}
        <motion.div
          className="bg-[#0D1B2A]/50 border border-[#415A77]/30 p-6 relative overflow-hidden backdrop-blur-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{ contain: 'layout style paint' }}
        >
          <div className="relative z-10">
            <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4">
              Transformation Impact
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#415A77] text-sm">Before</span>
                <span className="text-[#E84855] font-mono text-lg">{currentMetricData.before}</span>
              </div>

              {/* CSS-only animated line */}
              <div className="relative h-px bg-gradient-to-r from-[#E84855] to-[#3FD3C6]">
                <div
                  className="absolute h-full w-2 bg-[#F8F8F2] opacity-80"
                  style={{
                    animation: 'slide 2s ease-in-out infinite',
                    transform: 'translateZ(0)'
                  }}
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#415A77] text-sm">After</span>
                <span className="text-[#3FD3C6] font-mono text-lg">{currentMetricData.after}</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <div className="text-[#F8F8F2] text-3xl font-light mb-1">
                {currentMetricData.value}{currentMetricData.unit}
              </div>
              <div className="text-[#415A77] text-sm">
                {currentMetricData.label} {currentMetricData.improvement}
              </div>
            </div>
          </div>
        </motion.div>

        {/* System Telemetry */}
        <motion.div
          className="bg-[#0D1B2A]/50 border border-[#415A77]/30 p-6 backdrop-blur-sm"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          style={{ contain: 'layout style paint' }}
        >
          <div className="text-[#3FD3C6] text-xs uppercase tracking-wider mb-4">
            System Telemetry
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#415A77] text-sm">Pipeline Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#3FD3C6] animate-pulse"></div>
                <span className="text-[#3FD3C6] text-sm">OPERATIONAL</span>
              </div>
            </div>

            <div className="flex justify-between">
              <span className="text-[#415A77] text-sm">Mode</span>
              <span className="text-[#3FD3C6]">
                {isEnhanced ? '3D ENHANCED' : '2D OPTIMIZED'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#415A77] text-sm">Performance</span>
              <span className="text-[#3FD3C6]">OPTIMIZED</span>
            </div>
          </div>
        </motion.div>
      </div>

      <style jsx global>{`
        @keyframes slide {
          0% { left: 0; }
          100% { left: calc(100% - 8px); }
        }
      `}</style>
    </div>
  )
}
