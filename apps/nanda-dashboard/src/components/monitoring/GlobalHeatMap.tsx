import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { AgentMetrics } from '../../hooks/useRealtimeData'

interface GlobalHeatMapProps {
  agents: AgentMetrics[]
}

interface RegionData {
  name: string
  count: number
  responseTime: number
  status: 'healthy' | 'warning' | 'critical'
  coordinates: { x: number; y: number }
}

// Simplified world map regions with coordinates (percentage-based)
const regions = [
  { name: 'US-East', coordinates: { x: 25, y: 35 } },
  { name: 'US-West', coordinates: { x: 15, y: 35 } },
  { name: 'EU-West', coordinates: { x: 50, y: 25 } },
  { name: 'Asia-Pacific', coordinates: { x: 75, y: 45 } },
  { name: 'Canada', coordinates: { x: 22, y: 25 } },
  { name: 'Australia', coordinates: { x: 80, y: 70 } },
  { name: 'Brazil', coordinates: { x: 35, y: 60 } },
  { name: 'India', coordinates: { x: 70, y: 40 } },
  { name: 'Japan', coordinates: { x: 85, y: 35 } },
  { name: 'UK', coordinates: { x: 48, y: 22 } }
]

const RegionDot = ({ region, maxCount }: { region: RegionData; maxCount: number }) => {
  const getStatusColor = (status: RegionData['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500 border-green-400 shadow-green-500/50'
      case 'warning':
        return 'bg-yellow-500 border-yellow-400 shadow-yellow-500/50'
      case 'critical':
        return 'bg-red-500 border-red-400 shadow-red-500/50'
      default:
        return 'bg-gray-500 border-gray-400 shadow-gray-500/50'
    }
  }

  const size = Math.max(12, (region.count / maxCount) * 32)
  const pulseDelay = Math.random() * 2

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: pulseDelay }}
      className="absolute group cursor-pointer"
      style={{
        left: `${region.coordinates.x}%`,
        top: `${region.coordinates.y}%`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Main dot */}
      <div
        className={`
          rounded-full border-2 ${getStatusColor(region.status)}
          shadow-lg animate-pulse-glow
        `}
        style={{ width: size, height: size }}
      >
        {/* Inner glow */}
        <div className="absolute inset-1 rounded-full bg-current opacity-60" />

        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-full border border-current animate-ping opacity-30" />
        <div className="absolute inset-0 rounded-full border border-current animate-ping opacity-20"
             style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Tooltip */}
      <div className="
        absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
        opacity-0 group-hover:opacity-100 transition-opacity duration-200
        pointer-events-none z-10
      ">
        <div className="glass-card p-3 text-xs whitespace-nowrap">
          <div className="font-semibold text-foreground mb-1">{region.name}</div>
          <div className="space-y-1 text-muted-foreground">
            <div>Agents: <span className="text-primary font-medium">{region.count}</span></div>
            <div>Avg Response: <span className="text-primary font-medium">{Math.round(region.responseTime)}ms</span></div>
            <div>Status: <span className={`font-medium capitalize
              ${region.status === 'healthy' ? 'text-green-400' :
                region.status === 'warning' ? 'text-yellow-400' : 'text-red-400'}
            `}>{region.status}</span></div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

const SimplifiedWorldMap = () => (
  <svg
    viewBox="0 0 1000 500"
    className="w-full h-full opacity-20"
    style={{ filter: 'drop-shadow(0 0 2px rgba(14, 184, 166, 0.3))' }}
  >
    {/* Simplified continent outlines */}
    {/* North America */}
    <path
      d="M150,150 Q200,120 280,140 L300,180 Q280,220 250,240 L200,250 Q150,230 120,200 Q130,170 150,150 Z"
      fill="none"
      stroke="hsl(var(--primary))"
      strokeWidth="2"
      opacity="0.6"
    />

    {/* South America */}
    <path
      d="M280,280 Q300,300 310,350 L320,420 Q300,450 280,440 L260,400 Q250,350 260,320 Q270,300 280,280 Z"
      fill="none"
      stroke="hsl(var(--primary))"
      strokeWidth="2"
      opacity="0.6"
    />

    {/* Europe */}
    <path
      d="M450,120 Q500,110 520,140 L530,180 Q510,200 480,190 L450,170 Q440,150 450,120 Z"
      fill="none"
      stroke="hsl(var(--primary))"
      strokeWidth="2"
      opacity="0.6"
    />

    {/* Asia */}
    <path
      d="M550,140 Q650,120 750,150 L800,180 Q820,220 780,250 L700,240 Q600,230 550,200 Q530,170 550,140 Z"
      fill="none"
      stroke="hsl(var(--primary))"
      strokeWidth="2"
      opacity="0.6"
    />

    {/* Australia */}
    <path
      d="M720,350 Q780,340 820,360 L830,380 Q810,400 780,390 L740,385 Q720,370 720,350 Z"
      fill="none"
      stroke="hsl(var(--primary))"
      strokeWidth="2"
      opacity="0.6"
    />

    {/* Grid lines */}
    <defs>
      <pattern id="grid" width="100" height="50" patternUnits="userSpaceOnUse">
        <path d="M 100 0 L 0 0 0 50" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3"/>
      </pattern>
    </defs>
    <rect width="1000" height="500" fill="url(#grid)" />
  </svg>
)

export function GlobalHeatMap({ agents }: GlobalHeatMapProps) {
  const regionData = useMemo(() => {
    const regionMap = new Map<string, RegionData>()

    // Initialize all regions
    regions.forEach(region => {
      regionMap.set(region.name, {
        name: region.name,
        count: 0,
        responseTime: 0,
        status: 'healthy',
        coordinates: region.coordinates
      })
    })

    // Aggregate agent data by region
    agents.forEach(agent => {
      const region = regionMap.get(agent.region)
      if (region) {
        region.count++
        region.responseTime = (region.responseTime + agent.responseTime) / 2
      }
    })

    // Determine status for each region
    regionMap.forEach(region => {
      if (region.count === 0) {
        region.status = 'critical'
      } else if (region.responseTime > 200) {
        region.status = 'warning'
      } else {
        region.status = 'healthy'
      }
    })

    return Array.from(regionMap.values()).filter(region => region.count > 0)
  }, [agents])

  const maxCount = Math.max(...regionData.map(r => r.count))
  const totalAgents = regionData.reduce((sum, r) => sum + r.count, 0)

  return (
    <div className="heat-map-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Global Agent Distribution</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {totalAgents} agents across {regionData.length} regions
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-muted-foreground">Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="text-muted-foreground">Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-muted-foreground">Critical</span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-80 mb-6 bg-gradient-to-br from-background to-muted/20 rounded-xl border border-border/50 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-radial from-primary/20 to-transparent animate-pulse-glow" />
        </div>

        {/* World Map */}
        <div className="absolute inset-0 p-4">
          <SimplifiedWorldMap />
        </div>

        {/* Region Dots */}
        {regionData.map(region => (
          <RegionDot
            key={region.name}
            region={region}
            maxCount={maxCount}
          />
        ))}

        {/* Connecting lines (subtle) */}
        <svg className="absolute inset-0 pointer-events-none opacity-20">
          {regionData.slice(0, 3).map((region, index) => {
            const next = regionData[index + 1]
            if (!next) return null

            return (
              <motion.line
                key={`line-${index}`}
                x1={`${region.coordinates.x}%`}
                y1={`${region.coordinates.y}%`}
                x2={`${next.coordinates.x}%`}
                y2={`${next.coordinates.y}%`}
                stroke="hsl(var(--primary))"
                strokeWidth="1"
                strokeDasharray="2,2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: index * 0.5 }}
              />
            )
          })}
        </svg>
      </div>

      {/* Region Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {regionData
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
          .map((region, index) => (
            <motion.div
              key={region.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="glass bg-muted/30 p-4 rounded-lg border border-border/50"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground">{region.name}</h4>
                <div className={`
                  w-2 h-2 rounded-full
                  ${region.status === 'healthy' ? 'bg-green-500' :
                    region.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}
                `} />
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agents:</span>
                  <span className="font-medium text-primary">{region.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Response:</span>
                  <span className="font-medium text-foreground">{Math.round(region.responseTime)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Load:</span>
                  <span className="font-medium text-foreground">
                    {((region.count / totalAgents) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
      </div>

      {/* Heat Map Legend */}
      <div className="heat-map-legend mt-4 pt-4 border-t border-border/50">
        <span>Agent Density:</span>
        <div className="flex items-center gap-2">
          <span>Low</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="w-4 h-4 rounded border border-primary/30"
                style={{
                  backgroundColor: `hsl(var(--primary) / ${i * 0.2})`
                }}
              />
            ))}
          </div>
          <span>High</span>
        </div>
      </div>
    </div>
  )
}
