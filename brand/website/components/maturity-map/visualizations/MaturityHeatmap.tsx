'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  InformationCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { DimensionScore, Insight } from '@/lib/graphql/types'

interface MaturityHeatmapProps {
  dimensions: DimensionScore[]
  insights: Insight[]
  title?: string
}

interface HeatmapCell {
  dimension: DimensionScore
  color: string
  intensity: number
  insights: Insight[]
}

export function MaturityHeatmap({ 
  dimensions, 
  insights,
  title = "Maturity Heatmap" 
}: MaturityHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null)
  const [viewMode, setViewMode] = useState<'score' | 'percentile' | 'gap'>('score')

  // Create heatmap cells
  const heatmapData: HeatmapCell[] = dimensions.map(dimension => {
    const dimensionInsights = insights.filter(insight => 
      insight.sources.some(source => source.includes(dimension.id))
    )
    
    const scorePercentage = (dimension.score / dimension.maxScore) * 100
    
    let intensity: number
    let color: string

    switch (viewMode) {
      case 'percentile':
        intensity = dimension.percentile / 100
        color = getPercentileColor(dimension.percentile)
        break
      case 'gap':
        const gap = 100 - scorePercentage
        intensity = gap / 100
        color = getGapColor(gap)
        break
      default: // score
        intensity = scorePercentage / 100
        color = getScoreColor(scorePercentage)
    }

    return {
      dimension,
      color,
      intensity,
      insights: dimensionInsights
    }
  })

  // Arrange in grid (4 columns max)
  const gridCols = Math.min(4, Math.ceil(Math.sqrt(dimensions.length)))
  const gridRows = Math.ceil(dimensions.length / gridCols)

  function getScoreColor(score: number): string {
    if (score >= 80) return '#10B981' // Green
    if (score >= 60) return '#3B82F6' // Blue  
    if (score >= 40) return '#F59E0B' // Yellow
    if (score >= 20) return '#F97316' // Orange
    return '#EF4444' // Red
  }

  function getPercentileColor(percentile: number): string {
    if (percentile >= 80) return '#10B981' // Green
    if (percentile >= 60) return '#06B6D4' // Cyan
    if (percentile >= 40) return '#8B5CF6' // Purple
    if (percentile >= 20) return '#F59E0B' // Yellow
    return '#EF4444' // Red
  }

  function getGapColor(gap: number): string {
    if (gap >= 60) return '#EF4444' // High gap - Red
    if (gap >= 40) return '#F97316' // Medium-high gap - Orange
    if (gap >= 20) return '#F59E0B' // Medium gap - Yellow
    if (gap >= 10) return '#3B82F6' // Low gap - Blue
    return '#10B981' // Minimal gap - Green
  }

  const getValueForMode = (cell: HeatmapCell): number => {
    switch (viewMode) {
      case 'percentile':
        return cell.dimension.percentile
      case 'gap':
        return 100 - (cell.dimension.score / cell.dimension.maxScore) * 100
      default:
        return (cell.dimension.score / cell.dimension.maxScore) * 100
    }
  }

  const getValueLabel = (cell: HeatmapCell): string => {
    const value = getValueForMode(cell)
    switch (viewMode) {
      case 'percentile':
        return `${value} %ile`
      case 'gap':
        return `${value.toFixed(1)}% gap`
      default:
        return `${value.toFixed(1)}%`
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              {title}
            </h3>
            <p className="text-gray-400 text-sm">
              Visual representation of maturity across all dimensions
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={viewMode === 'score' ? 'default' : 'outline'}
              onClick={() => setViewMode('score')}
              className="text-xs"
            >
              Score
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'percentile' ? 'default' : 'outline'}
              onClick={() => setViewMode('percentile')}
              className="text-xs"
            >
              Percentile
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'gap' ? 'default' : 'outline'}
              onClick={() => setViewMode('gap')}
              className="text-xs"
            >
              Gap Analysis
            </Button>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div 
          className="grid gap-3 mb-6"
          style={{ 
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gridTemplateRows: `repeat(${gridRows}, 1fr)`
          }}
        >
          {heatmapData.map((cell, index) => (
            <motion.div
              key={cell.dimension.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`relative p-4 rounded-lg cursor-pointer transition-all hover:scale-105 border-2 ${
                selectedCell?.dimension.id === cell.dimension.id
                  ? 'border-white ring-2 ring-white/20'
                  : 'border-transparent'
              }`}
              style={{
                backgroundColor: `${cell.color}${Math.round(cell.intensity * 255).toString(16).padStart(2, '0')}20`,
                borderColor: selectedCell?.dimension.id === cell.dimension.id ? '#FFFFFF' : cell.color
              }}
              onClick={() => setSelectedCell(cell)}
            >
              <div className="text-center">
                <h4 className="text-white font-medium text-sm mb-2 leading-tight">
                  {cell.dimension.name}
                </h4>
                
                <div 
                  className="text-2xl font-bold mb-1"
                  style={{ color: cell.color }}
                >
                  {getValueLabel(cell)}
                </div>
                
                <div className="flex items-center justify-center space-x-1">
                  {cell.insights.length > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs"
                      style={{ backgroundColor: `${cell.color}30` }}
                    >
                      {cell.insights.length} insights
                    </Badge>
                  )}
                </div>

                {/* Performance indicator */}
                <div className="mt-2 flex justify-center">
                  {viewMode === 'score' && (
                    <>
                      {getValueForMode(cell) >= 70 ? (
                        <TrendingUpIcon className="w-4 h-4 text-green-400" />
                      ) : getValueForMode(cell) <= 30 ? (
                        <TrendingDownIcon className="w-4 h-4 text-red-400" />
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              {/* Intensity overlay */}
              <div 
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{
                  backgroundColor: cell.color,
                  opacity: cell.intensity * 0.1
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Legend */}
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">
              {viewMode === 'score' ? 'Score Range:' : 
               viewMode === 'percentile' ? 'Percentile Range:' : 
               'Gap Range:'}
            </span>
            <div className="flex items-center space-x-4">
              {viewMode === 'gap' ? (
                <>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }} />
                    <span className="text-gray-300">Low Gap</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F59E0B' }} />
                    <span className="text-gray-300">Medium Gap</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }} />
                    <span className="text-gray-300">High Gap</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }} />
                    <span className="text-gray-300">Low</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#F59E0B' }} />
                    <span className="text-gray-300">Medium</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }} />
                    <span className="text-gray-300">High</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Selected Cell Details */}
      {selectedCell && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6" style={{ borderColor: selectedCell.color, borderWidth: 1 }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-white mb-1">
                  {selectedCell.dimension.name}
                </h4>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span>Score: {selectedCell.dimension.score}/{selectedCell.dimension.maxScore}</span>
                  <span>Percentile: {selectedCell.dimension.percentile}</span>
                  <span style={{ color: selectedCell.color }}>
                    {getValueLabel(selectedCell)}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedCell(null)}
              >
                Close
              </Button>
            </div>

            {/* Insights */}
            {selectedCell.insights.length > 0 && (
              <div className="space-y-3">
                <h5 className="font-medium text-white flex items-center space-x-2">
                  <InformationCircleIcon className="w-4 h-4" />
                  <span>Key Insights</span>
                </h5>
                <div className="space-y-2">
                  {selectedCell.insights.slice(0, 3).map((insight, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-gray-800/50 rounded-lg border-l-4"
                      style={{ borderLeftColor: selectedCell.color }}
                    >
                      <h6 className="text-white font-medium text-sm mb-1">
                        {insight.title}
                      </h6>
                      <p className="text-gray-300 text-sm">
                        {insight.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge 
                          variant="secondary"
                          className={`text-xs ${
                            insight.type === 'STRENGTH' ? 'bg-green-500/20 text-green-400' :
                            insight.type === 'WEAKNESS' ? 'bg-red-500/20 text-red-400' :
                            insight.type === 'OPPORTUNITY' ? 'bg-blue-500/20 text-blue-400' :
                            insight.type === 'RISK' ? 'bg-orange-500/20 text-orange-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}
                        >
                          {insight.type.toLowerCase()}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {insight.confidence}% confidence
                        </span>
                      </div>
                    </div>
                  ))}
                  {selectedCell.insights.length > 3 && (
                    <div className="text-center">
                      <Button size="sm" variant="outline">
                        View All {selectedCell.insights.length} Insights
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  )
}