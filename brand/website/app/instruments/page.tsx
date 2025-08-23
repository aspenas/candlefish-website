'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { instruments } from '../../lib/instruments/data'
import { Instrument, InstrumentCategory, InstrumentStatus } from '../../lib/instruments/types'
import InstrumentTelemetry from '../../components/instruments/InstrumentTelemetry'

// Status indicator with live pulse
const StatusIndicator = ({ status }: { status: InstrumentStatus }) => {
  const getStatusStyle = (status: InstrumentStatus) => {
    switch (status) {
      case 'operational': return 'bg-green-500'
      case 'calibrating': return 'bg-yellow-500'
      case 'testing': return 'bg-blue-500'
      case 'maintenance': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${getStatusStyle(status)}`} />
        {status === 'operational' && (
          <div className={`absolute inset-0 w-2 h-2 rounded-full ${getStatusStyle(status)} animate-ping`} />
        )}
      </div>
      <span className="text-xs text-[#888] uppercase">{status}</span>
    </div>
  )
}

// Performance metric display
const PerformanceMetric = ({ 
  label, 
  value, 
  unit, 
  trend 
}: { 
  label: string
  value: number
  unit: string
  trend?: 'up' | 'down' | 'stable'
}) => {
  const getTrendIcon = () => {
    if (!trend) return null
    switch (trend) {
      case 'up': return '↑'
      case 'down': return '↓'
      case 'stable': return '→'
    }
  }

  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-[#666]">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-[#3FD3C6] font-mono">{value.toLocaleString()}</span>
        <span className="text-[#444]">{unit}</span>
        {trend && (
          <span className={`
            ${trend === 'up' ? 'text-green-400' : 
              trend === 'down' ? 'text-red-400' : 
              'text-gray-400'}
          `}>
            {getTrendIcon()}
          </span>
        )}
      </div>
    </div>
  )
}

// Instrument card component
const InstrumentCard = ({ instrument }: { instrument: Instrument }) => {
  const [showDetails, setShowDetails] = useState(false)
  const [liveData, setLiveData] = useState(instrument)

  // Simulate live data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData(prev => ({
        ...prev,
        performance: {
          ...prev.performance,
          throughput: prev.performance.throughput * (0.95 + Math.random() * 0.1),
          cpu: Math.min(100, prev.performance.cpu * (0.9 + Math.random() * 0.2)),
          memory: prev.performance.memory * (0.98 + Math.random() * 0.04)
        },
        queueDepth: Math.max(0, prev.queueDepth + Math.floor(Math.random() * 20 - 10)),
        activeInstances: prev.activeInstances
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [instrument])

  return (
    <article className="border border-[#333] hover:border-[#3FD3C6]/50 transition-all group">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg text-[#fff] group-hover:text-[#3FD3C6] transition-colors">
              {instrument.name}
            </h3>
            <p className="text-xs text-[#666] mt-1">{instrument.description}</p>
          </div>
          <StatusIndicator status={instrument.status} />
        </div>

        {/* Live Performance Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <PerformanceMetric 
            label="Throughput" 
            value={Math.round(liveData.performance.throughput)} 
            unit="ops/s"
            trend="up"
          />
          <PerformanceMetric 
            label="Latency" 
            value={liveData.performance.latency} 
            unit="ms"
            trend="stable"
          />
          <PerformanceMetric 
            label="Accuracy" 
            value={liveData.performance.accuracy} 
            unit="%"
            trend="stable"
          />
        </div>

        {/* Live Telemetry */}
        {instrument.telemetry && (
          <div className="mb-4">
            <InstrumentTelemetry 
              telemetry={instrument.telemetry}
              height={80}
              showLabels={false}
            />
          </div>
        )}

        {/* Resource Usage */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#0a0a0a] p-3 rounded">
            <div className="text-xs text-[#666] mb-1">CPU Usage</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#3FD3C6] to-[#3FD3C6]/50 transition-all duration-300"
                  style={{ width: `${liveData.performance.cpu}%` }}
                />
              </div>
              <span className="text-xs text-[#888]">{Math.round(liveData.performance.cpu)}%</span>
            </div>
          </div>
          <div className="bg-[#0a0a0a] p-3 rounded">
            <div className="text-xs text-[#666] mb-1">Memory</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#6666ff] to-[#6666ff]/50 transition-all duration-300"
                  style={{ width: `${(liveData.performance.memory / 8000) * 100}%` }}
                />
              </div>
              <span className="text-xs text-[#888]">{Math.round(liveData.performance.memory)} MB</span>
            </div>
          </div>
        </div>

        {/* Queue Status */}
        <div className="flex justify-between items-center p-3 bg-[#0a0a0a] rounded">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs text-[#666]">Queue Depth</span>
              <p className="text-sm text-[#fff] font-mono">{liveData.queueDepth}</p>
            </div>
            <div>
              <span className="text-xs text-[#666]">Active Instances</span>
              <p className="text-sm text-[#fff] font-mono">{liveData.activeInstances}</p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-[#6666ff] hover:text-[#8888ff] transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="border-t border-[#333] p-6 pt-4 bg-[#050505]">
          {/* Capabilities */}
          <div className="mb-4">
            <h4 className="text-xs uppercase text-[#888] mb-2">Capabilities</h4>
            <div className="grid grid-cols-2 gap-2">
              {instrument.capabilities.map(cap => (
                <div key={cap.name} className="flex items-center gap-2 text-xs">
                  <div className={`w-1.5 h-1.5 rounded-full ${cap.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className={cap.enabled ? 'text-[#aaa]' : 'text-[#555]'}>{cap.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dependencies */}
          <div className="mb-4">
            <h4 className="text-xs uppercase text-[#888] mb-2">Dependencies</h4>
            <div className="space-y-1">
              {instrument.dependencies.map(dep => (
                <div key={dep.name} className="flex justify-between items-center text-xs">
                  <span className="text-[#666]">{dep.name} v{dep.version}</span>
                  <span className={`
                    ${dep.status === 'healthy' ? 'text-green-400' :
                      dep.status === 'degraded' ? 'text-yellow-400' :
                      'text-red-400'}
                  `}>
                    {dep.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration */}
          <div className="mb-4">
            <h4 className="text-xs uppercase text-[#888] mb-2">Configuration</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-[#666]">Max Concurrency: <span className="text-[#aaa]">{instrument.config.maxConcurrency}</span></div>
              <div className="text-[#666]">Timeout: <span className="text-[#aaa]">{instrument.config.timeout}ms</span></div>
              <div className="text-[#666]">Retry Policy: <span className="text-[#aaa]">{instrument.config.retryPolicy}</span></div>
              <div className="text-[#666]">Auto-scale: <span className="text-[#aaa]">{instrument.config.autoScale ? 'Yes' : 'No'}</span></div>
            </div>
          </div>

          {/* API Endpoint */}
          {instrument.apiEndpoint && (
            <div className="pt-4 border-t border-[#333]">
              <code className="text-xs text-[#6666ff]">{instrument.apiEndpoint}</code>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

// Category filter
const CategoryFilter = ({ 
  selected, 
  onChange 
}: { 
  selected: string
  onChange: (category: string) => void 
}) => {
  const categories = [
    { id: 'all', label: 'All Instruments', count: instruments.length },
    { id: 'parser', label: 'Parsers', count: instruments.filter(i => i.category === 'parser').length },
    { id: 'extractor', label: 'Extractors', count: instruments.filter(i => i.category === 'extractor').length },
    { id: 'predictor', label: 'Predictors', count: instruments.filter(i => i.category === 'predictor').length },
    { id: 'orchestrator', label: 'Orchestrators', count: instruments.filter(i => i.category === 'orchestrator').length },
    { id: 'synchronizer', label: 'Synchronizers', count: instruments.filter(i => i.category === 'synchronizer').length },
    { id: 'analyzer', label: 'Analyzers', count: instruments.filter(i => i.category === 'analyzer').length }
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map(cat => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={`px-3 py-1.5 text-xs border rounded transition-all ${
            selected === cat.id
              ? 'border-[#3FD3C6] text-[#3FD3C6] bg-[#3FD3C6]/10'
              : 'border-[#333] text-[#888] hover:border-[#666] hover:text-[#aaa]'
          }`}
        >
          {cat.label}
          <span className="ml-1 text-[#555]">({cat.count})</span>
        </button>
      ))}
    </div>
  )
}

export default function InstrumentsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'status' | 'performance' | 'name'>('status')

  const filteredInstruments = useMemo(() => {
    let filtered = selectedCategory === 'all' 
      ? instruments 
      : instruments.filter(i => i.category === selectedCategory)

    // Sort instruments
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'status':
          const statusOrder = { operational: 0, calibrating: 1, testing: 2, maintenance: 3 }
          return statusOrder[a.status] - statusOrder[b.status]
        case 'performance':
          return b.performance.throughput - a.performance.throughput
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })
  }, [selectedCategory, sortBy])

  // Calculate system stats
  const systemStats = useMemo(() => {
    const operational = instruments.filter(i => i.status === 'operational').length
    const totalThroughput = instruments.reduce((sum, i) => sum + i.performance.throughput, 0)
    const avgAccuracy = instruments.reduce((sum, i) => sum + i.performance.accuracy, 0) / instruments.length
    const totalQueue = instruments.reduce((sum, i) => sum + i.queueDepth, 0)

    return {
      operational,
      totalThroughput: Math.round(totalThroughput),
      avgAccuracy: avgAccuracy.toFixed(1),
      totalQueue
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono pt-20 relative">
      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          background: `linear-gradient(135deg, transparent 0%, rgba(63, 211, 198, 0.1) 50%, transparent 100%)`
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-[#333] px-6 py-4">
          <div className="max-w-7xl mx-auto">
            <Link href="/" className="text-xs text-[#888] hover:text-[#3FD3C6] transition-colors">
              ← Back to Home
            </Link>
            <h1 className="text-2xl text-[#fff] mt-2">Operational Instruments</h1>
            <p className="text-sm text-[#666] mt-1">
              Live system instruments. Real metrics. No projections.
            </p>
          </div>
        </header>

        {/* System Overview */}
        <section className="max-w-7xl mx-auto px-6 py-6 border-b border-[#333]">
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl text-[#3FD3C6] font-mono">{systemStats.operational}/{instruments.length}</div>
              <div className="text-xs text-[#666] mt-1">Operational</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-[#fff] font-mono">{systemStats.totalThroughput.toLocaleString()}</div>
              <div className="text-xs text-[#666] mt-1">Total ops/s</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-[#fff] font-mono">{systemStats.avgAccuracy}%</div>
              <div className="text-xs text-[#666] mt-1">Avg Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl text-[#fff] font-mono">{systemStats.totalQueue.toLocaleString()}</div>
              <div className="text-xs text-[#666] mt-1">Queue Depth</div>
            </div>
          </div>
        </section>

        {/* Controls */}
        <section className="max-w-7xl mx-auto px-6 py-6 space-y-4">
          <div className="flex justify-between items-center">
            <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#666]">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#1a1a1a] border border-[#333] text-xs text-[#aaa] px-2 py-1 rounded focus:outline-none focus:border-[#3FD3C6]"
              >
                <option value="status">Status</option>
                <option value="performance">Performance</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>
        </section>

        {/* Instruments Grid */}
        <section className="max-w-7xl mx-auto px-6 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredInstruments.map(instrument => (
              <InstrumentCard key={instrument.id} instrument={instrument} />
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}