import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Performance monitoring
const startTime = performance.now()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Log performance metrics
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const loadTime = performance.now() - startTime
    console.log(`App loaded in ${loadTime.toFixed(2)}ms`)
  })
}
