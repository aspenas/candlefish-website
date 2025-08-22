import React from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { format } from 'date-fns'
import type { PerformanceMetrics } from '../../hooks/useRealtimeData'

interface PerformanceChartProps {
  data: PerformanceMetrics[]
  type?: 'line' | 'area'
  height?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border border-primary/20">
        <p className="text-sm font-medium text-foreground mb-2">
          {format(new Date(label), 'MMM dd, HH:mm')}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {entry.name === 'Response Time'
                ? `${Math.round(entry.value)}ms`
                : entry.name === 'Error Rate'
                ? `${entry.value.toFixed(1)}%`
                : entry.value.toLocaleString()
              }
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const CustomDot = (props: any) => {
  const { cx, cy, fill } = props
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3}
      fill={fill}
      stroke="rgba(14, 184, 166, 0.8)"
      strokeWidth={2}
      className="animate-pulse-glow"
    />
  )
}

export function PerformanceChart({ data, type = 'line', height = 300 }: PerformanceChartProps) {
  const chartData = data.map(point => ({
    timestamp: point.timestamp.getTime(),
    'Response Time': Math.round(point.responseTime),
    'Request Volume': point.requestVolume,
    'Error Rate': Number(point.errorRate.toFixed(1)),
    'Active Connections': point.activeConnections
  }))

  const formatXAxisLabel = (tickItem: number) => {
    return format(new Date(tickItem), 'HH:mm')
  }

  if (type === 'area') {
    return (
      <div className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">Performance Metrics</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full" />
              <span>Response Time</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-accent rounded-full" />
              <span>Request Volume</span>
            </div>
          </div>
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="responseTimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="requestVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxisLabel}
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="Response Time"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#responseTimeGradient)"
                dot={<CustomDot />}
                activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 3 }}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="Request Volume"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                fill="url(#requestVolumeGradient)"
                dot={<CustomDot />}
                activeDot={{ r: 6, stroke: "hsl(var(--accent))", strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">Real-time Performance</h3>
        <div className="flex items-center gap-1 text-xs">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-muted-foreground">Live</span>
        </div>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxisLabel}
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="Response Time"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 3, fill: "hsl(var(--primary))" }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="Request Volume"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 6, stroke: "hsl(var(--accent))", strokeWidth: 3, fill: "hsl(var(--accent))" }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="Error Rate"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: "hsl(var(--destructive))", strokeWidth: 2, fill: "hsl(var(--destructive))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
