'use client'

import React, { useState } from 'react'
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { DimensionScore, BenchmarkComparison } from '@/lib/graphql/types'

interface MaturityRadarChartProps {
  dimensions: DimensionScore[]
  benchmarkData?: BenchmarkComparison[]
  title?: string
  showBenchmark?: boolean
}

interface ChartDataPoint {
  dimension: string
  yourScore: number
  industryAverage?: number
  topQuartile?: number
  maxScore: number
  percentile: number
}

export function MaturityRadarChart({ 
  dimensions, 
  benchmarkData = [],
  title = "Operational Maturity Overview",
  showBenchmark = true 
}: MaturityRadarChartProps) {
  const [selectedView, setSelectedView] = useState<'percentage' | 'percentile'>('percentage')
  const [highlightedDimension, setHighlightedDimension] = useState<string | null>(null)

  // Transform data for radar chart
  const chartData: ChartDataPoint[] = dimensions.map(dimension => {
    const benchmark = benchmarkData.find(b => b.dimension === dimension.id)
    
    return {
      dimension: dimension.name.replace(/\s+/g, '\n'), // Line breaks for long names
      yourScore: selectedView === 'percentage' 
        ? (dimension.score / dimension.maxScore) * 100 
        : dimension.percentile,
      industryAverage: benchmark?.industryAverage || undefined,
      topQuartile: benchmark?.topQuartile || undefined,
      maxScore: 100,
      percentile: dimension.percentile
    }
  })

  // Get overall maturity level
  const averageScore = dimensions.reduce((sum, d) => sum + (d.score / d.maxScore) * 100, 0) / dimensions.length
  
  const getMaturityLevel = (score: number) => {
    if (score >= 80) return { level: 'Autonomous', color: 'text-green-400', bg: 'bg-green-500/10' }
    if (score >= 65) return { level: 'Optimized', color: 'text-blue-400', bg: 'bg-blue-500/10' }
    if (score >= 45) return { level: 'Systematic', color: 'text-purple-400', bg: 'bg-purple-500/10' }
    if (score >= 25) return { level: 'Emerging', color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
    return { level: 'Fragmented', color: 'text-red-400', bg: 'bg-red-500/10' }
  }

  const maturityInfo = getMaturityLevel(averageScore)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && label) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg max-w-xs">
          <h4 className="text-white font-medium mb-2">
            {label.replace(/\n/g, ' ')}
          </h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Your Score:</span>
              <span className="text-blue-400 font-medium">
                {selectedView === 'percentage' ? `${data.yourScore.toFixed(1)}%` : `${data.percentile} percentile`}
              </span>
            </div>
            {data.industryAverage && (
              <div className="flex justify-between">
                <span className="text-gray-300">Industry Avg:</span>
                <span className="text-gray-400">
                  {data.industryAverage.toFixed(1)}%
                </span>
              </div>
            )}
            {data.topQuartile && (
              <div className="flex justify-between">
                <span className="text-gray-300">Top 25%:</span>
                <span className="text-green-400">
                  {data.topQuartile.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {title}
          </h3>
          <div className="flex items-center space-x-3">
            <Badge className={`${maturityInfo.bg} ${maturityInfo.color} border-current`}>
              {maturityInfo.level} Level
            </Badge>
            <span className="text-gray-400 text-sm">
              {averageScore.toFixed(1)}% Overall Score
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant={selectedView === 'percentage' ? 'default' : 'outline'}
            onClick={() => setSelectedView('percentage')}
            className="text-xs"
          >
            Percentage
          </Button>
          <Button
            size="sm"
            variant={selectedView === 'percentile' ? 'default' : 'outline'}
            onClick={() => setSelectedView('percentile')}
            className="text-xs"
          >
            Percentile
          </Button>
        </div>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={chartData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
            <PolarGrid stroke="#374151" />
            
            <PolarAngleAxis 
              dataKey="dimension" 
              tick={{ 
                fill: '#9CA3AF', 
                fontSize: 11,
                textAnchor: 'middle'
              }}
            />
            
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#6B7280', fontSize: 10 }}
              tickCount={6}
              axisLine={false}
            />

            {/* Industry Average (if available) */}
            {showBenchmark && benchmarkData.length > 0 && (
              <Radar
                name="Industry Average"
                dataKey="industryAverage"
                stroke="#6B7280"
                strokeWidth={1}
                fill="transparent"
                strokeDasharray="4 4"
              />
            )}

            {/* Top Quartile (if available) */}
            {showBenchmark && benchmarkData.length > 0 && (
              <Radar
                name="Top 25%"
                dataKey="topQuartile"
                stroke="#10B981"
                strokeWidth={1}
                fill="transparent"
                strokeDasharray="2 2"
              />
            )}

            {/* Your Scores */}
            <Radar
              name="Your Score"
              dataKey="yourScore"
              stroke="#60A5FA"
              strokeWidth={2}
              fill="#60A5FA"
              fillOpacity={0.1}
              dot={{ fill: '#60A5FA', strokeWidth: 2, r: 4 }}
            />

            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex justify-center space-x-6 mt-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-400 rounded-full" />
            <span className="text-gray-300">Your Score</span>
          </div>
          {showBenchmark && benchmarkData.length > 0 && (
            <>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5 bg-gray-400 border-dashed border-t" />
                <span className="text-gray-400">Industry Average</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5 bg-green-400 border-dashed border-t" />
                <span className="text-green-400">Top 25%</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dimension Details */}
      <div className="mt-6 space-y-3">
        <h4 className="text-white font-medium">Dimension Breakdown</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dimensions.map((dimension) => {
            const scorePercentage = (dimension.score / dimension.maxScore) * 100
            const benchmark = benchmarkData.find(b => b.dimension === dimension.id)
            
            return (
              <motion.div
                key={dimension.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  highlightedDimension === dimension.id
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onMouseEnter={() => setHighlightedDimension(dimension.id)}
                onMouseLeave={() => setHighlightedDimension(null)}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-medium">
                    {dimension.name}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-400 text-sm font-medium">
                      {scorePercentage.toFixed(1)}%
                    </span>
                    {benchmark && (
                      <span className="text-xs text-gray-500">
                        (vs {benchmark.industryAverage.toFixed(1)}% avg)
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{dimension.score} / {dimension.maxScore}</span>
                    <span>{dimension.percentile} percentile</span>
                  </div>
                  
                  {/* Progress bars */}
                  <div className="relative">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${scorePercentage}%` }}
                      />
                    </div>
                    {benchmark && (
                      <div className="flex justify-between mt-1">
                        <div 
                          className="absolute top-0 w-0.5 h-2 bg-gray-400"
                          style={{ left: `${benchmark.industryAverage}%` }}
                        />
                        <div 
                          className="absolute top-0 w-0.5 h-2 bg-green-400"
                          style={{ left: `${benchmark.topQuartile}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}