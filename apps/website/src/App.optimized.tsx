import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingScreen from './components/LoadingScreen'
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor'

// Lazy load components
const Navigation = lazy(() => import('./components/Navigation'))
const ParticleField = lazy(() => import('./components/ParticleField'))
const HomePage = lazy(() =>
  import('./pages/HomePage.optimized' /* webpackChunkName: "home" */)
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage' /* webpackChunkName: "404" */)
)

// Preload critical chunks
const preloadHomePage = () => {
  import('./pages/HomePage.optimized' /* webpackChunkName: "home" */)
}

function App() {
  // Monitor performance metrics
  usePerformanceMonitor()

  // Preload home page after initial render
  useEffect(() => {
    const timer = setTimeout(preloadHomePage, 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <ErrorBoundary>
      <Router>
        <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
          {/* Background Effects */}
          <Suspense fallback={null}>
            <ParticleField />
          </Suspense>

          {/* Navigation */}
          <Suspense fallback={<div className="h-20" />}>
            <Navigation />
          </Suspense>

          {/* Routes */}
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
