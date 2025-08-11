import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initPerformanceMonitoring } from './utils/performanceMonitor'

// Initialize performance monitoring
const perfMonitor = initPerformanceMonitoring({
  enableLogging: process.env.NODE_ENV !== 'production',
  enableAnalytics: process.env.NODE_ENV === 'production',
  analyticsEndpoint: '/api/analytics/performance',
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
  debug: process.env.NODE_ENV === 'development'
})

// Performance monitoring
const startTime = performance.now()

// Remove loading screen once app starts rendering
const removeLoadingScreen = () => {
  const loadingScreen = document.querySelector('.loading-screen')
  if (loadingScreen) {
    loadingScreen.classList.add('fade-out')
    setTimeout(() => {
      loadingScreen.remove()
      document.body.classList.remove('no-transitions')
      document.body.style.overflow = ''
    }, 300)
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Remove loading screen after initial render
requestAnimationFrame(removeLoadingScreen)

// Log performance metrics
if (typeof window !== 'undefined') {
  // Track app load time
  window.addEventListener('load', () => {
    const loadTime = performance.now() - startTime
    perfMonitor.markCustomMetric('appLoadTime', loadTime)
    console.log(`App loaded in ${loadTime.toFixed(2)}ms`)
  })

  // Add global error tracking
  window.addEventListener('error', (event) => {
    perfMonitor.markCustomMetric('jsError', 1)
  })

  window.addEventListener('unhandledrejection', (event) => {
    perfMonitor.markCustomMetric('unhandledRejection', 1)
  })
}
