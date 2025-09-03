'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface FPSCounterProps {
  className?: string
  showDetailed?: boolean
  onFPSChange?: (fps: number) => void
}

export const FPSCounter: React.FC<FPSCounterProps> = ({
  className = '',
  showDetailed = false,
  onFPSChange
}) => {
  const [fps, setFPS] = useState(0)
  const [frameTime, setFrameTime] = useState(0)
  const [minFPS, setMinFPS] = useState(Infinity)
  const [maxFPS, setMaxFPS] = useState(0)
  
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  const animationId = useRef<number>()
  const fpsHistory = useRef<number[]>([])

  const measure = useCallback(() => {
    const now = performance.now()
    const delta = now - lastTime.current
    
    frameCount.current++
    
    // Calculate FPS every second
    if (delta >= 1000) {
      const currentFPS = Math.round((frameCount.current * 1000) / delta)
      
      setFPS(currentFPS)
      setFrameTime(Math.round(delta / frameCount.current * 100) / 100)
      
      // Update min/max
      setMinFPS(prev => Math.min(prev, currentFPS))
      setMaxFPS(prev => Math.max(prev, currentFPS))
      
      // Store in history (keep last 60 seconds)
      fpsHistory.current.push(currentFPS)
      if (fpsHistory.current.length > 60) {
        fpsHistory.current.shift()
      }
      
      onFPSChange?.(currentFPS)
      
      // Reset counters
      frameCount.current = 0
      lastTime.current = now
    }
    
    animationId.current = requestAnimationFrame(measure)
  }, [onFPSChange])

  const getAverageFPS = useCallback(() => {
    if (fpsHistory.current.length === 0) return 0
    const sum = fpsHistory.current.reduce((a, b) => a + b, 0)
    return Math.round(sum / fpsHistory.current.length)
  }, [])

  const getPerformanceColor = useCallback((fpsValue: number) => {
    if (fpsValue >= 55) return 'text-green-400'
    if (fpsValue >= 40) return 'text-[#3FD3C6]'
    if (fpsValue >= 25) return 'text-yellow-400'
    return 'text-red-400'
  }, [])

  const reset = useCallback(() => {
    setMinFPS(Infinity)
    setMaxFPS(0)
    fpsHistory.current = []
  }, [])

  useEffect(() => {
    measure()
    
    return () => {
      if (animationId.current) {
        cancelAnimationFrame(animationId.current)
      }
    }
  }, [measure])

  if (showDetailed) {
    const avgFPS = getAverageFPS()
    
    return (
      <div className={`bg-black/80 backdrop-blur-sm rounded-lg p-4 text-xs font-mono ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-medium">FPS Monitor</span>
          <button
            onClick={reset}
            className="text-gray-400 hover:text-white text-xs"
          >
            Reset
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-300">Current:</span>
            <span className={`font-bold ${getPerformanceColor(fps)}`}>
              {fps} FPS
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-300">Frame Time:</span>
            <span className="text-gray-100">{frameTime}ms</span>
          </div>
          
          {avgFPS > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-300">Average:</span>
              <span className={getPerformanceColor(avgFPS)}>
                {avgFPS} FPS
              </span>
            </div>
          )}
          
          {minFPS < Infinity && (
            <div className="flex justify-between">
              <span className="text-gray-300">Min:</span>
              <span className={getPerformanceColor(minFPS)}>
                {minFPS} FPS
              </span>
            </div>
          )}
          
          {maxFPS > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-300">Max:</span>
              <span className={getPerformanceColor(maxFPS)}>
                {maxFPS} FPS
              </span>
            </div>
          )}
        </div>
        
        {/* Simple FPS Chart */}
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="text-gray-400 text-xs mb-1">Last 60s</div>
          <div className="flex items-end gap-px h-8">
            {fpsHistory.current.slice(-30).map((fpsValue, index) => (
              <div
                key={index}
                className={`w-1 ${getPerformanceColor(fpsValue).replace('text-', 'bg-')}`}
                style={{
                  height: `${Math.min((fpsValue / 60) * 100, 100)}%`,
                  minHeight: '2px'
                }}
                title={`${fpsValue} FPS`}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Simple compact version
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 bg-black/60 rounded-full text-xs font-mono ${className}`}>
      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      <span className={`font-medium ${getPerformanceColor(fps)}`}>
        {fps} FPS
      </span>
      {frameTime > 0 && (
        <span className="text-gray-400">
          {frameTime}ms
        </span>
      )}
    </div>
  )
}