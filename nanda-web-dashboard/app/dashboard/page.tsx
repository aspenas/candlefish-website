'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, Cpu, Database, Globe, Users, Zap, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

// Mock data types
interface AgentStatus {
  id: string
  name: string
  status: 'online' | 'offline' | 'warning' | 'error'
  uptime: string
  cpu: number
  memory: number
  tasks: number
}

interface SystemMetric {
  name: string
  value: string
  change: string
  status: 'good' | 'warning' | 'error'
  icon: React.ReactNode
}

const Dashboard = () => {
  const [agents, setAgents] = useState<AgentStatus[]>([
    { id: '1', name: 'Eggshell Monitor', status: 'online', uptime: '24h 15m', cpu: 45, memory: 67, tasks: 142 },
    { id: '2', name: 'Paintbox Engine', status: 'online', uptime: '12h 03m', cpu: 78, memory: 89, tasks: 89 },
    { id: '3', name: 'PKB Cognitive', status: 'warning', uptime: '6h 44m', cpu: 92, memory: 76, tasks: 234 },
    { id: '4', name: 'Security Monitor', status: 'online', uptime: '48h 12m', cpu: 23, memory: 45, tasks: 67 },
    { id: '5', name: 'Deployment Agent', status: 'offline', uptime: '0h 00m', cpu: 0, memory: 0, tasks: 0 },
    { id: '6', name: 'Neural Network', status: 'online', uptime: '72h 05m', cpu: 56, memory: 82, tasks: 345 }
  ])

  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([
    { name: 'Total Requests', value: '2.4M', change: '+12%', status: 'good', icon: <Globe className="w-5 h-5" /> },
    { name: 'Active Agents', value: '5/6', change: '+0', status: 'warning', icon: <Users className="w-5 h-5" /> },
    { name: 'System Load', value: '67%', change: '+5%', status: 'good', icon: <Cpu className="w-5 h-5" /> },
    { name: 'Response Time', value: '124ms', change: '-8ms', status: 'good', icon: <Zap className="w-5 h-5" /> },
    { name: 'Error Rate', value: '0.02%', change: '-0.01%', status: 'good', icon: <AlertTriangle className="w-5 h-5" /> },
    { name: 'Uptime', value: '99.9%', change: '+0.1%', status: 'good', icon: <TrendingUp className="w-5 h-5" /> }
  ])

  const [recentActivities, setRecentActivities] = useState([
    { time: '2 min ago', message: 'Paintbox Engine completed batch calculation', type: 'success' },
    { time: '5 min ago', message: 'PKB Cognitive memory optimization started', type: 'warning' },
    { time: '8 min ago', message: 'New deployment initiated for Security Monitor', type: 'info' },
    { time: '12 min ago', message: 'Neural Network achieved new coherence threshold', type: 'success' },
    { time: '15 min ago', message: 'Deployment Agent went offline for maintenance', type: 'error' }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400 bg-green-900/20'
      case 'offline': return 'text-red-400 bg-red-900/20'
      case 'warning': return 'text-yellow-400 bg-yellow-900/20'
      case 'error': return 'text-red-400 bg-red-900/20'
      default: return 'text-gray-400 bg-gray-900/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4" />
      case 'offline': return <AlertTriangle className="w-4 h-4" />
      case 'warning': return <Clock className="w-4 h-4" />
      case 'error': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getMetricColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      case 'info': return 'text-blue-400'
      default: return 'text-gray-400'
    }
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
        <h1 className="text-4xl font-bold text-white mb-2">NANDA Dashboard</h1>
        <p className="text-gray-400">Real-time monitoring and control of distributed consciousness agents</p>
      </motion.div>

      {/* System Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {systemMetrics.map((metric, index) => (
          <motion.div
            key={metric.name}
            className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={getMetricColor(metric.status)}>
                {metric.icon}
              </div>
              <span className={`text-sm ${getMetricColor(metric.status)}`}>
                {metric.change}
              </span>
            </div>
            <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
            <div className="text-sm text-gray-400">{metric.name}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Status Grid */}
        <div className="lg:col-span-2">
          <motion.div
            className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-purple-400" />
                Agent Network Status
              </h2>
              <div className="text-sm text-gray-400">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white">{agent.name}</h3>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(agent.status)}`}>
                      {getStatusIcon(agent.status)}
                      {agent.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Uptime</div>
                      <div className="text-white font-medium">{agent.uptime}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Tasks</div>
                      <div className="text-white font-medium">{agent.tasks}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">CPU</div>
                      <div className="text-white font-medium">{agent.cpu}%</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Memory</div>
                      <div className="text-white font-medium">{agent.memory}%</div>
                    </div>
                  </div>

                  {/* Resource usage bars */}
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>CPU</span>
                        <span>{agent.cpu}%</span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${agent.cpu > 80 ? 'bg-red-400' : agent.cpu > 60 ? 'bg-yellow-400' : 'bg-green-400'}`}
                          style={{ width: `${agent.cpu}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Memory</span>
                        <span>{agent.memory}%</span>
                      </div>
                      <div className="w-full bg-slate-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${agent.memory > 80 ? 'bg-red-400' : agent.memory > 60 ? 'bg-yellow-400' : 'bg-green-400'}`}
                          style={{ width: `${agent.memory}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Activity Feed */}
        <div>
          <motion.div
            className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Database className="w-6 h-6 text-green-400" />
              Activity Feed
            </h2>

            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <motion.div
                  key={index}
                  className="border-l-2 border-slate-600 pl-4 py-2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                >
                  <div className="text-sm text-gray-400 mb-1">{activity.time}</div>
                  <div className={`text-sm ${getActivityTypeColor(activity.type)}`}>
                    {activity.message}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-600">
              <button className="w-full text-center text-sm text-purple-400 hover:text-purple-300 transition-colors">
                View All Activities →
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div
        className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg transition-colors">
          <div className="text-lg font-semibold">Deploy Agent</div>
          <div className="text-sm opacity-80">Launch new instance</div>
        </button>
        <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-colors">
          <div className="text-lg font-semibold">View Metrics</div>
          <div className="text-sm opacity-80">Detailed analytics</div>
        </button>
        <button className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition-colors">
          <div className="text-lg font-semibold">Manage Agents</div>
          <div className="text-sm opacity-80">Control & configure</div>
        </button>
        <button className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-lg transition-colors">
          <div className="text-lg font-semibold">System Health</div>
          <div className="text-sm opacity-80">Full diagnostics</div>
        </button>
      </motion.div>
    </div>
  )
}

export default Dashboard
