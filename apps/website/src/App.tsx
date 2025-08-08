import React, { Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import LoadingScreen from './components/LoadingScreen'
import ParticleBackground from './components/ParticleBackground'

// Lazy load pages for code splitting
const HomePage = React.lazy(() => import('./pages/HomePage'))
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'))

function App() {
  useEffect(() => {
    // Remove no-transitions class after initial load
    const timer = setTimeout(() => {
      document.body.classList.remove('no-transitions')
    }, 100)

    // Add dashboard scroll class for smooth scrolling
    document.documentElement.classList.add('dashboard-scroll')

    return () => clearTimeout(timer)
  }, [])

  // Handle theme preference
  React.useEffect(() => {
    // Always use dark theme for this app
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  return (
    <ErrorBoundary>
      <Router>
        <div className="relative min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white overflow-x-hidden antialiased">
          {/* WebGL Particle Background - only on main pages */}
          <ParticleBackground />

          {/* Global loading state */}
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-black">
              <LoadingScreen />
            </div>
          }>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>

          {/* Global accessibility improvements */}
          <div className="sr-only" aria-live="polite" aria-atomic="true" id="status-announcer"></div>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
