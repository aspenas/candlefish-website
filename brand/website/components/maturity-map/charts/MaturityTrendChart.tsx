'use client'

import React from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { useQuery } from '@apollo/client'
import { GET_MATURITY_ANALYTICS } from '@/lib/graphql/queries'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface MaturityTrendChartProps {
  operatorId: string
  timeRange?: 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR'
}

interface TrendData {
  period: string
  averageScore: number
  assessmentCount: number
  improvementRate: number
}

export function MaturityTrendChart({ 
  operatorId, 
  timeRange = 'MONTH' 
}: MaturityTrendChartProps) {
  const { data, loading, error } = useQuery(GET_MATURITY_ANALYTICS, {
    variables: { operatorId, timeRange },
    pollInterval: 60000 // Poll every minute
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner className="w-6 h-6" />
      </div>
    )
  }

  if (error || !data?.maturityAnalytics?.trends) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <p>Unable to load trend data</p>
          <p className="text-sm mt-1">Complete more assessments to see trends</p>
        </div>
      </div>
    )
  }

  const trends: TrendData[] = data.maturityAnalytics.trends

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-white text-sm font-medium">{label}</p>
          <div className="space-y-1 mt-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full" />
              <span className="text-gray-300 text-sm">
                Avg Score: {payload[0].value.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full" />
              <span className="text-gray-300 text-sm">
                Assessments: {payload[1]?.value || 0}
              </span>
            </div>
            {payload[2] && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-400 rounded-full" />
                <span className="text-gray-300 text-sm">
                  Improvement: {payload[2].value > 0 ? '+' : ''}{payload[2].value.toFixed(1)}%
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
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#374151" 
            horizontal={true}
            vertical={false}
          />
          
          <XAxis 
            dataKey="period" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          
          <YAxis 
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            tickFormatter={(value) => `${value}%`}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Area
            type="monotone"
            dataKey="averageScore"
            stroke="#60A5FA"
            strokeWidth={2}
            fill="url(#scoreGradient)"
            dot={{ fill: '#60A5FA', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: '#60A5FA', strokeWidth: 2, stroke: '#1E293B' }}
          />
          
          <Line
            type="monotone"
            dataKey="assessmentCount"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
            yAxisId="right"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}