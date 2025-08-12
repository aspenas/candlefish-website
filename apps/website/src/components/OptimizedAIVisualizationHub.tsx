import React, { useState, lazy, Suspense, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIntersectionObserver } from '../hooks/useIntersectionObserver'

type VisualizationType = '3d' | 'canvas' | 'hybrid' | 'classic'

// Lazy load heavy visualization components
const AdvancedAIVisualization = lazy(() => 
  import('./AdvancedAIVisualization').then(module => ({
    default: module.default
  }))
)

const NeuralNetworkCanvas = lazy(() => 
  import('./NeuralNetworkCanvas').then(module => ({
    default: module.default
  }))
)

const AIAnimation = lazy(() => 
  import('./AIAnimation').then(module => ({
    default: module.default
  }))
)

const LoadingFallback: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="text-center">
      <div className="mb-4">
        <motion.div
          className="w-16 h-16 mx-auto border-4 border-cyan-400 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <motion.p
        className="text-cyan-400 font-mono"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Initializing Neural Network...
      </motion.p>
    </div>
  </div>
)

const OptimizedAIVisualizationHub: React.FC = () => {
  const [activeView, setActiveView] = useState<VisualizationType>('3d')
  const [autoRotate, setAutoRotate] = useState(false) // Start with auto-rotate off
  const [isLoaded, setIsLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const rotationTimerRef = useRef<NodeJS.Timeout>()
  
  // Use intersection observer to only load when visible
  const { isIntersecting } = useIntersectionObserver(containerRef, {
    threshold: 0.1,
    rootMargin: '100px'
  })

  // Only start auto-rotation when component is visible and loaded
  useEffect(() => {
    if (autoRotate && isIntersecting && isLoaded) {
      const views: VisualizationType[] = ['3d', 'canvas', 'hybrid', 'classic']
      
      rotationTimerRef.current = setInterval(() => {
        setActiveView(prev => {
          const currentIndex = views.indexOf(prev)
          return views[(currentIndex + 1) % views.length]
        })
      }, 15000) // Rotate every 15 seconds
      
      return () => {
        if (rotationTimerRef.current) {
          clearInterval(rotationTimerRef.current)
        }
      }
    }
  }, [autoRotate, isIntersecting, isLoaded])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current)
      }
    }
  }, [])

  const handleViewChange = useCallback((view: VisualizationType) => {
    setActiveView(view)
    setAutoRotate(false)
    if (rotationTimerRef.current) {
      clearInterval(rotationTimerRef.current)
    }
  }, [])

  const toggleAutoRotate = useCallback(() => {
    setAutoRotate(prev => !prev)
  }, [])

  useEffect(() => {
    if (isIntersecting) {
      // Delay loading to improve initial page load
      const timer = setTimeout(() => {
        setIsLoaded(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isIntersecting])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Only render content when visible */}
      {isIntersecting && (
        <>
          {/* Visualization Controls */}
          <motion.div 
            className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center space-x-2 p-1 rounded-full bg-black/30 backdrop-blur-md border border-cyan-500/20">
              {(['3d', 'canvas', 'hybrid', 'classic'] as VisualizationType[]).map((view) => (
                <motion.button
                  key={view}
                  onClick={() => handleViewChange(view)}
                  className={`px-4 py-2 rounded-full text-sm font-mono transition-all ${
                    activeView === view
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-gray-400 hover:text-cyan-300 hover:bg-white/5'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {view === '3d' && '3D Neural'}
                  {view === 'canvas' && '2D Network'}
                  {view === 'hybrid' && 'Hybrid'}
                  {view === 'classic' && 'Classic'}
                </motion.button>
              ))}
              
              <motion.button
                onClick={toggleAutoRotate}
                className={`px-3 py-2 rounded-full text-sm ${
                  autoRotate
                    ? 'text-green-400 bg-green-500/10'
                    : 'text-gray-400 hover:text-cyan-300'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={autoRotate ? 'Auto-rotate ON' : 'Auto-rotate OFF'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </motion.button>
            </div>
          </motion.div>

          {/* Main Visualization Area */}
          {isLoaded && (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                className="w-full h-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5 }}
              >
                <Suspense fallback={<LoadingFallback />}>
                  {activeView === '3d' && (
                    <div className="w-full h-full">
                      <AdvancedAIVisualization />
                    </div>
                  )}
                  
                  {activeView === 'canvas' && (
                    <div className="w-full h-full">
                      <NeuralNetworkCanvas />
                    </div>
                  )}
                  
                  {activeView === 'hybrid' && (
                    <div className="w-full h-full relative">
                      {/* Layer 1: Canvas background */}
                      <div className="absolute inset-0 opacity-60">
                        <NeuralNetworkCanvas />
                      </div>
                      {/* Layer 2: 3D overlay */}
                      <div className="absolute inset-0">
                        <AdvancedAIVisualization />
                      </div>
                    </div>
                  )}
                  
                  {activeView === 'classic' && (
                    <div className="w-full h-full flex items-center justify-center">
                      <AIAnimation />
                    </div>
                  )}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Performance Metrics */}
          <motion.div
            className="absolute bottom-4 left-4 z-20"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex flex-col space-y-1 text-xs font-mono">
              <div className="flex items-center space-x-2 px-2 py-1 rounded bg-black/20 backdrop-blur-sm">
                <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                <span className="text-gray-400">Mode:</span>
                <span className="text-cyan-300">
                  {activeView === '3d' && 'WebGL 3D Rendering'}
                  {activeView === 'canvas' && 'Canvas 2D Processing'}
                  {activeView === 'hybrid' && 'Hybrid Visualization'}
                  {activeView === 'classic' && 'SVG Animation'}
                </span>
              </div>
              <div className="flex items-center space-x-2 px-2 py-1 rounded bg-black/20 backdrop-blur-sm">
                <span className="text-gray-400">Performance:</span>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.div
                      key={i}
                      className="w-1 h-2 bg-cyan-400 rounded-full"
                      animate={{
                        opacity: [0.3, 1, 0.3],
                        scaleY: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 1,
                        delay: i * 0.1,
                        repeat: Infinity,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Data Flow Indicator */}
          <motion.div
            className="absolute bottom-4 right-4 z-20"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9 }}
          >
            <div className="flex items-center space-x-2 px-3 py-2 rounded-full bg-black/20 backdrop-blur-sm border border-purple-500/20">
              <span className="text-xs text-gray-400">Data Flow:</span>
              <div className="flex space-x-1">
                <motion.div
                  className="w-2 h-2 rounded-full bg-cyan-400"
                  animate={{
                    x: [0, 20, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="w-2 h-2 rounded-full bg-blue-400"
                  animate={{
                    x: [0, 20, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <motion.div
                  className="w-2 h-2 rounded-full bg-purple-400"
                  animate={{
                    x: [0, 20, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}

export default OptimizedAIVisualizationHub