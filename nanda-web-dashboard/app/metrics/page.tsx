'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Zap,
  Users,
  Server,
  Database,
  Cpu,
  Memory,
  Network,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  LineChart,
  PieChart
} from 'lucide-react'

interface MetricCard {
  id: string
  title: string
  value: string
  change: number
  changeLabel: string
  status: 'good' | 'warning' | 'critical'
  icon: React.ReactNode
  sparklineData: number[]
}

interface ChartData {
  time: string
  value: number
  label?: string
}

const MetricsPage = () => {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h')
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null)

  // Mock metrics data
  const [metrics, setMetrics] = useState<MetricCard[]>([
    {
      id: 'response-time',
      title: 'Avg Response Time',
      value: '124ms',
      change: -8.2,
      changeLabel: '8.2ms faster',
      status: 'good',
      icon: <Zap className="w-5 h-5" />,
      sparklineData: [145, 142, 138, 135, 132, 128, 124]
    },
    {
      id: 'requests-per-sec',
      title: 'Requests/sec',
      value: '2.4k',
      change: 12.5,
      changeLabel: '12.5% increase',
      status: 'good',
      icon: <Activity className="w-5 h-5" />,
      sparklineData: [2100, 2200, 2150, 2300, 2350, 2380, 2400]
    },
    {
      id: 'error-rate',
      title: 'Error Rate',
      value: '0.02%',
      change: -45.3,
      changeLabel: '45.3% decrease',
      status: 'good',
      icon: <AlertTriangle className="w-5 h-5" />,
      sparklineData: [0.08, 0.06, 0.05, 0.04, 0.03, 0.025, 0.02]
    },
    {
      id: 'active-agents',
      title: 'Active Agents',
      value: '5/6',
      change: 0,
      changeLabel: 'No change',
      status: 'warning',
      icon: <Users className="w-5 h-5" />,
      sparklineData: [6, 6, 5, 5, 5, 5, 5]
    },
    {
      id: 'cpu-usage',
      title: 'CPU Usage',
      value: '67%',
      change: 5.2,
      changeLabel: '5.2% increase',
      status: 'good',
      icon: <Cpu className="w-5 h-5" />,
      sparklineData: [62, 64, 65, 66, 67, 68, 67]
    },
    {
      id: 'memory-usage',
      title: 'Memory Usage',
      value: '8.2GB',
      change: 2.1,
      changeLabel: '2.1% increase',
      status: 'good',
      icon: <Memory className="w-5 h-5" />,
      sparklineData: [7.8, 7.9, 8.0, 8.1, 8.1, 8.2, 8.2]
    },
    {
      id: 'network-io',
      title: 'Network I/O',
      value: '456MB/s',
      change: 18.7,
      changeLabel: '18.7% increase',
      status: 'good',
      icon: <Network className="w-5 h-5" />,
      sparklineData: [380, 390, 410, 425, 440, 450, 456]
    },
    {
      id: 'storage-usage',
      title: 'Storage Usage',
      value: '124GB',
      change: 1.2,
      changeLabel: '1.2% increase',
      status: 'good',
      icon: <HardDrive className="w-5 h-5" />,
      sparklineData: [120, 121, 122, 122, 123, 123, 124]
    }
  ])

  // Mock detailed chart data
  const [detailedChartData, setDetailedChartData] = useState<ChartData[]>([
    { time: '00:00', value: 120 },
    { time: '02:00', value: 115 },
    { time: '04:00', value: 108 },
    { time: '06:00', value: 125 },
    { time: '08:00', value: 135 },
    { time: '10:00', value: 142 },
    { time: '12:00', value: 138 },
    { time: '14:00', value: 145 },
    { time: '16:00', value: 132 },
    { time: '18:00', value: 128 },
    { time: '20:00', value: 125 },
    { time: '22:00', value: 124 }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-400 border-green-400/30'
      case 'warning': return 'text-yellow-400 border-yellow-400/30'
      case 'critical': return 'text-red-400 border-red-400/30'
      default: return 'text-gray-400 border-gray-400/30'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500/10'
      case 'warning': return 'bg-yellow-500/10'
      case 'critical': return 'bg-red-500/10'
      default: return 'bg-gray-500/10'
    }
  }

  const formatChange = (change: number) => {
    if (change > 0) return { icon: <TrendingUp className="w-4 h-4 text-green-400" />, color: 'text-green-400' }
    if (change < 0) return { icon: <TrendingDown className="w-4 h-4 text-red-400" />, color: 'text-red-400' }
    return { icon: null, color: 'text-gray-400' }
  }

  // Mock sparkline component
  const Sparkline = ({ data, color = 'rgb(139, 92, 246)' }: { data: number[], color?: string }) => {
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = 100 - ((value - min) / range) * 100
      return `${x},${y}`
    }).join(' ')

    return (
      <div className="w-full h-8">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
          />
        </svg>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">System Metrics</h1>
            <p className="text-gray-400">Real-time performance analytics and monitoring</p>
          </div>

          {/* Time Range Selector */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-1">
            {(['1h', '6h', '24h', '7d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-md text-sm transition-colors ${
                  timeRange === range
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => {
          const changeFormat = formatChange(metric.change)

          return (
            <motion.div
              key={metric.id}
              className={`bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border-2 cursor-pointer transition-all hover:scale-105 ${getStatusColor(metric.status)} ${getStatusBg(metric.status)}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => setSelectedMetric(selectedMetric === metric.id ? null : metric.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-gray-400">
                  {metric.icon}
                </div>
                <div className="flex items-center gap-1">
                  {changeFormat.icon}
                  <span className={`text-sm ${changeFormat.color}`}>
                    {Math.abs(metric.change)}%
                  </span>
                </div>
              </div>

              <div className="mb-2">
                <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
                <div className="text-sm text-gray-400">{metric.title}</div>
              </div>

              <div className="mb-3">
                <Sparkline data={metric.sparklineData} />
              </div>

              <div className="text-xs text-gray-500">{metric.changeLabel}</div>
            </motion.div>
          )
        })}
      </div>

      {/* Detailed Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Response Time Chart */}
        <motion.div
          className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-purple-400" />
              Response Time Trend
            </h3>
            <select className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-white text-sm">
              <option>Last 24 hours</option>
              <option>Last week</option>
              <option>Last month</option>
            </select>
          </div>

          {/* Mock chart visualization */}
          <div className="h-64 bg-slate-900/30 rounded-lg p-4 flex items-end justify-between">
            {detailedChartData.map((point, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <div
                  className="bg-purple-500 w-4 rounded-t-sm transition-all hover:bg-purple-400"
                  style={{ height: `${(point.value / 150) * 100}%` }}
                />
                <span className="text-xs text-gray-400 transform -rotate-45">
                  {point.time}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Agent Performance Distribution */}
        <motion.div
          className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-green-400" />
              Agent Performance
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-400 rounded-full" />
                <span className="text-white">Eggshell Monitor</span>
              </div>
              <div className="text-green-400 font-medium">98.2%</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-400 rounded-full" />
                <span className="text-white">Paintbox Engine</span>
              </div>
              <div className="text-blue-400 font-medium">96.8%</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                <span className="text-white">PKB Cognitive</span>
              </div>
              <div className="text-yellow-400 font-medium">89.4%</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-purple-400 rounded-full" />
                <span className="text-white">Security Monitor</span>
              </div>
              <div className="text-purple-400 font-medium">99.1%</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-400 rounded-full" />
                <span className="text-white">Deployment Agent</span>
              </div>
              <div className="text-red-400 font-medium">0%</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* System Health Overview */}
      <motion.div
        className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-400" />
            System Health Overview
          </h3>
          <div className="text-sm text-gray-400">
            Updated {new Date().toLocaleTimeString()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">99.9%</div>
            <div className="text-gray-400 text-sm">Uptime</div>
            <CheckCircle className="w-6 h-6 text-green-400 mx-auto mt-2" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">2.4M</div>
            <div className="text-gray-400 text-sm">Requests Today</div>
            <Activity className="w-6 h-6 text-blue-400 mx-auto mt-2" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">124ms</div>
            <div className="text-gray-400 text-sm">Avg Response</div>
            <Zap className="w-6 h-6 text-purple-400 mx-auto mt-2" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400 mb-2">5/6</div>
            <div className="text-gray-400 text-sm">Active Agents</div>
            <Server className="w-6 h-6 text-orange-400 mx-auto mt-2" />
          </div>
        </div>

        {/* Resource Utilization */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-medium">CPU Usage</span>
              <span className="text-gray-400">67%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div className="bg-gradient-to-r from-green-400 to-yellow-400 h-3 rounded-full" style={{ width: '67%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-medium">Memory Usage</span>
              <span className="text-gray-400">8.2GB / 16GB</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div className="bg-gradient-to-r from-blue-400 to-purple-400 h-3 rounded-full" style={{ width: '51%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-medium">Disk Usage</span>
              <span className="text-gray-400">124GB / 500GB</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div className="bg-gradient-to-r from-purple-400 to-pink-400 h-3 rounded-full" style={{ width: '25%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-medium">Network I/O</span>
              <span className="text-gray-400">456 MB/s</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div className="bg-gradient-to-r from-cyan-400 to-teal-400 h-3 rounded-full" style={{ width: '73%' }} />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default MetricsPage
