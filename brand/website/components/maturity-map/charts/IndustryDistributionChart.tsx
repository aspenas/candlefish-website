'use client'

import React from 'react'
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts'

interface IndustryData {
  industry: string
  count: number
  averageScore: number
}

interface IndustryDistributionChartProps {
  data: IndustryData[]
}

const COLORS = [
  '#60A5FA', // Blue
  '#10B981', // Green  
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280'  // Gray
]

export function IndustryDistributionChart({ data }: IndustryDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <p>No industry data available</p>
          <p className="text-sm mt-1">Complete assessments to see distribution</p>
        </div>
      </div>
    )
  }

  // Format industry names for display
  const chartData = data.map(item => ({
    ...item,
    displayName: item.industry
      .replace('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase())
  }))

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{data.displayName}</p>
          <div className="space-y-1 mt-2">
            <p className="text-gray-300 text-sm">
              Assessments: {data.count}
            </p>
            <p className="text-gray-300 text-sm">
              Avg Score: {data.averageScore.toFixed(1)}%
            </p>
            <p className="text-gray-300 text-sm">
              Share: {((data.count / data.total) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom label function
  const renderLabel = (entry: any) => {
    const percent = ((entry.count / entry.total) * 100)
    if (percent < 5) return '' // Don't show labels for small slices
    return `${percent.toFixed(0)}%`
  }

  // Calculate total for percentage calculation
  const total = chartData.reduce((sum, item) => sum + item.count, 0)
  const dataWithTotal = chartData.map(item => ({ ...item, total }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={dataWithTotal}
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
            paddingAngle={2}
            dataKey="count"
            label={renderLabel}
            labelLine={false}
          >
            {dataWithTotal.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                stroke="#1E293B"
                strokeWidth={1}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry: any) => (
              <span style={{ color: entry.color }} className="text-sm">
                {entry.payload.displayName}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}