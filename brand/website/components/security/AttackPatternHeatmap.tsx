'use client'

import React, { useMemo } from 'react'
import { Card } from '@/components/ui/Card'

interface AttackPattern {
  type: string
  count: number
  severity: number
  timeSlot: number // Hour of day (0-23)
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
}

interface AttackPatternHeatmapProps {
  patterns?: AttackPattern[]
  className?: string
}

const AttackPatternHeatmap: React.FC<AttackPatternHeatmapProps> = ({ 
  patterns = [],
  className = ''
}) => {
  const mockPatterns = useMemo(() => {
    const patterns: AttackPattern[] = []
    const attackTypes = ['DDoS', 'Malware', 'Phishing', 'SQL Injection', 'Brute Force', 'XSS']
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    // Generate mock data for a week (24 hours x 7 days)
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)]
        const baseCount = Math.floor(Math.random() * 20)
        
        // Simulate higher activity during business hours
        const businessHourMultiplier = (hour >= 9 && hour <= 17) ? 1.5 : 0.7
        // Simulate higher activity on weekdays
        const weekdayMultiplier = (day >= 1 && day <= 5) ? 1.3 : 0.8
        
        const count = Math.floor(baseCount * businessHourMultiplier * weekdayMultiplier)
        
        if (count > 0) {
          patterns.push({
            type: attackType,
            count,
            severity: Math.floor(Math.random() * 4) + 1, // 1-4
            timeSlot: hour,
            dayOfWeek: day
          })
        }
      }
    }
    
    return patterns
  }, [])

  const activePatterns = patterns.length > 0 ? patterns : mockPatterns

  // Create heatmap data structure
  const heatmapData = useMemo(() => {
    const data: number[][] = Array(7).fill(null).map(() => Array(24).fill(0))
    
    activePatterns.forEach(pattern => {
      data[pattern.dayOfWeek][pattern.timeSlot] += pattern.count
    })
    
    return data
  }, [activePatterns])

  // Find max value for color scaling
  const maxValue = useMemo(() => {
    return Math.max(...heatmapData.flat())
  }, [heatmapData])

  const getIntensity = (value: number): number => {
    if (maxValue === 0) return 0
    return value / maxValue
  }

  const getColorClass = (intensity: number): string => {
    if (intensity === 0) return 'bg-gray-100 dark:bg-gray-800'
    if (intensity < 0.2) return 'bg-blue-200 dark:bg-blue-900'
    if (intensity < 0.4) return 'bg-blue-400 dark:bg-blue-700'
    if (intensity < 0.6) return 'bg-orange-400 dark:bg-orange-700'
    if (intensity < 0.8) return 'bg-red-400 dark:bg-red-700'
    return 'bg-red-600 dark:bg-red-600'
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Card className={`p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Attack Pattern Heatmap
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Attack frequency by day of week and hour of day
        </p>
      </div>

      <div className="space-y-4">
        {/* Heatmap Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Hour labels */}
            <div className="flex mb-2">
              <div className="w-12"></div> {/* Space for day labels */}
              {hours.map(hour => (
                <div 
                  key={hour} 
                  className="w-6 h-6 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400"
                >
                  {hour % 4 === 0 ? hour.toString().padStart(2, '0') : ''}
                </div>
              ))}
            </div>

            {/* Heatmap rows */}
            {days.map((day, dayIndex) => (
              <div key={day} className="flex items-center mb-1">
                <div className="w-12 text-xs text-gray-500 dark:text-gray-400 text-right pr-2">
                  {day}
                </div>
                <div className="flex gap-1">
                  {hours.map(hour => {
                    const value = heatmapData[dayIndex][hour]
                    const intensity = getIntensity(value)
                    const colorClass = getColorClass(intensity)
                    
                    return (
                      <div
                        key={hour}
                        className={`w-6 h-6 rounded-sm ${colorClass} transition-colors hover:ring-2 hover:ring-blue-500 cursor-pointer`}
                        title={`${day} ${hour.toString().padStart(2, '0')}:00 - ${value} attacks`}
                        role="cell"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            // Handle selection
                          }
                        }}
                        aria-label={`${day} at ${hour}:00, ${value} attacks`}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Attack Intensity
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Low</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded-sm" />
              <div className="w-4 h-4 bg-blue-200 dark:bg-blue-900 rounded-sm" />
              <div className="w-4 h-4 bg-blue-400 dark:bg-blue-700 rounded-sm" />
              <div className="w-4 h-4 bg-orange-400 dark:bg-orange-700 rounded-sm" />
              <div className="w-4 h-4 bg-red-400 dark:bg-red-700 rounded-sm" />
              <div className="w-4 h-4 bg-red-600 dark:bg-red-600 rounded-sm" />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">High</span>
          </div>
        </div>

        {/* Attack Type Breakdown */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Top Attack Types
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(() => {
              const typeCounts = activePatterns.reduce((acc, pattern) => {
                acc[pattern.type] = (acc[pattern.type] || 0) + pattern.count
                return acc
              }, {} as Record<string, number>)
              
              return Object.entries(typeCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 6)
                .map(([type, count]) => (
                  <div key={type} className="text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300">{type}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                    </div>
                    <div className="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div 
                        className="bg-blue-600 h-1 rounded-full"
                        style={{ width: `${(count / Math.max(...Object.values(typeCounts))) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
            })()}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default AttackPatternHeatmap