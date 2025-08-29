'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'

interface ThreatEvent {
  id: string
  latitude: number
  longitude: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: string
  timestamp: number
  country: string
}

interface ThreatMapProps {
  threats?: ThreatEvent[]
  className?: string
}

const SEVERITY_COLORS = {
  low: '#22c55e',
  medium: '#f59e0b', 
  high: '#ef4444',
  critical: '#dc2626'
}

const ThreatMap: React.FC<ThreatMapProps> = ({ 
  threats = [],
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedThreat, setSelectedThreat] = useState<ThreatEvent | null>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 })

  // Mock data for demonstration
  const mockThreats = useMemo(() => [
    {
      id: '1',
      latitude: 40.7128,
      longitude: -74.0060,
      severity: 'critical' as const,
      type: 'DDoS Attack',
      timestamp: Date.now() - 300000,
      country: 'United States'
    },
    {
      id: '2', 
      latitude: 51.5074,
      longitude: -0.1278,
      severity: 'high' as const,
      type: 'Malware Detection',
      timestamp: Date.now() - 600000,
      country: 'United Kingdom'
    },
    {
      id: '3',
      latitude: 35.6762,
      longitude: 139.6503,
      severity: 'medium' as const,
      type: 'Suspicious Activity',
      timestamp: Date.now() - 900000,
      country: 'Japan'
    },
    {
      id: '4',
      latitude: -33.8688,
      longitude: 151.2093,
      severity: 'low' as const,
      type: 'Failed Login',
      timestamp: Date.now() - 1200000,
      country: 'Australia'
    }
  ], [])

  const activeThreats = threats.length > 0 ? threats : mockThreats

  // Convert lat/lng to SVG coordinates
  const coordToSvg = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * dimensions.width
    const y = ((90 - lat) / 180) * dimensions.height
    return { x, y }
  }

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        const { width } = svgRef.current.parentElement.getBoundingClientRect()
        setDimensions({ width: width - 32, height: (width - 32) * 0.5 })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <Card className={`p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Global Threat Map
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Real-time threat activity across global infrastructure
        </p>
      </div>

      {/* Map Container */}
      <div className="relative bg-slate-900 rounded-lg overflow-hidden" style={{ height: dimensions.height + 'px' }}>
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="absolute inset-0"
          role="img"
          aria-label="Global threat map showing security incidents worldwide"
        >
          {/* World Map Outline (simplified) */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Threat Points */}
          {activeThreats.map((threat) => {
            const { x, y } = coordToSvg(threat.latitude, threat.longitude)
            const isSelected = selectedThreat?.id === threat.id
            
            return (
              <g key={threat.id}>
                {/* Pulsing animation for high severity */}
                {(threat.severity === 'high' || threat.severity === 'critical') && (
                  <circle
                    cx={x}
                    cy={y}
                    r="20"
                    fill={SEVERITY_COLORS[threat.severity]}
                    opacity="0.3"
                    className="animate-ping"
                  />
                )}
                
                {/* Main threat point */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? "8" : "6"}
                  fill={SEVERITY_COLORS[threat.severity]}
                  className="cursor-pointer transition-all hover:r-8"
                  onClick={() => setSelectedThreat(isSelected ? null : threat)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedThreat(isSelected ? null : threat)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Threat: ${threat.type} in ${threat.country}, severity: ${threat.severity}`}
                />
                
                {/* Selection indicator */}
                {isSelected && (
                  <circle
                    cx={x}
                    cy={y}
                    r="12"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                )}
              </g>
            )
          })}
        </svg>

        {/* Threat Details Popup */}
        {selectedThreat && (
          <div 
            className="absolute bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 p-4 max-w-xs z-10"
            style={{
              top: coordToSvg(selectedThreat.latitude, selectedThreat.longitude).y - 100,
              left: Math.min(
                coordToSvg(selectedThreat.latitude, selectedThreat.longitude).x - 75,
                dimensions.width - 200
              )
            }}
            role="dialog"
            aria-labelledby="threat-details-title"
          >
            <h4 id="threat-details-title" className="font-semibold text-gray-900 dark:text-white mb-2">
              {selectedThreat.type}
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Location:</span>
                <span className="text-gray-900 dark:text-white">{selectedThreat.country}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Severity:</span>
                <span 
                  className="capitalize font-medium"
                  style={{ color: SEVERITY_COLORS[selectedThreat.severity] }}
                >
                  {selectedThreat.severity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Time:</span>
                <span className="text-gray-900 dark:text-white">
                  {new Date(selectedThreat.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setSelectedThreat(null)}
              aria-label="Close threat details"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Severity:</span>
        {Object.entries(SEVERITY_COLORS).map(([severity, color]) => (
          <div key={severity} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {severity}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default ThreatMap