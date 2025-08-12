import React, { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'

// Lazy load the heavy AI visualization component
const AIVisualizationHub = lazy(() => 
  import('./AIVisualizationHub').then(module => ({
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
        Loading AI Visualization...
      </motion.p>
    </div>
  </div>
)

const LazyAIVisualizationHub: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AIVisualizationHub />
    </Suspense>
  )
}

export default LazyAIVisualizationHub