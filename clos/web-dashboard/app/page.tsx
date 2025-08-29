'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ServiceGrid } from '@/components/ServiceGrid'
import { PortAllocationMap } from '@/components/PortAllocationMap'
import { SystemHealth } from '@/components/SystemHealth'
import { QuickActions } from '@/components/QuickActions'
import { ServiceDependencyGraph } from '@/components/ServiceDependencyGraph'
import { HealthMonitor } from '@/components/HealthMonitor'
import { PortConflictResolution } from '@/components/PortConflictResolution'
import { serviceApi, queryKeys } from '@/lib/api'
import { Activity, Network, Shield, LayoutDashboard } from 'lucide-react'

interface Service {
  id?: string
  name: string
  status: 'running' | 'stopped' | 'unhealthy'
  port: number
  cpu?: number
  memory?: number
  health?: string
  group: string
}

export default function Dashboard() {
  const [activeView, setActiveView] = useState<'overview' | 'dependencies' | 'health' | 'ports'>('overview')
  const [showPortConflicts, setShowPortConflicts] = useState(false)
  const [portConflicts, setPortConflicts] = useState([])
  const [time, setTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch services from API
  const { data: allServices = [], isLoading, error } = useQuery({
    queryKey: queryKeys.services,
    queryFn: serviceApi.getServices,
    refetchInterval: 10000, // Refetch every 10 seconds
  })

  // Filter services based on current filters
  const services = allServices.filter((service: Service) => {
    const matchesStatus = !statusFilter || service.status === statusFilter
    const matchesSearch = !searchTerm || 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.group.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  // Calculate summary statistics
  const serviceCounts = allServices.reduce((counts, service: Service) => {
    const status = service.status || 'unknown'
    counts[status] = (counts[status] || 0) + 1
    return counts
  }, {} as Record<string, number>)

  useEffect(() => {
    setMounted(true)
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                CLOS Dashboard
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Candlefish Localhost Orchestration System - {allServices.length} Services
                {statusFilter && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Filtered: {statusFilter}
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              {mounted && time ? (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {time.toLocaleDateString()}
                  </p>
                  <p className="text-lg font-mono text-slate-900 dark:text-white">
                    {time.toLocaleTimeString()}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Loading...
                  </p>
                  <p className="text-lg font-mono text-slate-900 dark:text-white">
                    --:--:--
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6 -mb-px">
            <button
              onClick={() => setActiveView('overview')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeView === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveView('dependencies')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeView === 'dependencies'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <Network className="w-4 h-4" />
              Dependencies
            </button>
            <button
              onClick={() => setActiveView('health')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeView === 'health'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <Activity className="w-4 h-4" />
              Health Monitor
            </button>
            <button
              onClick={() => setActiveView('ports')}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeView === 'ports'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <Shield className="w-4 h-4" />
              Port Management
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-600 dark:text-red-400">
              Failed to load services. Please check if the API server is running.
            </p>
          </div>
        )}

        {/* Overview View */}
        {activeView === 'overview' && !isLoading && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* System Health */}
              <SystemHealth />
              
              {/* Quick Actions */}
              <div className="lg:col-span-2">
                <QuickActions />
              </div>
            </div>

            {/* Service Summary & Filters */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Services Status
                </h2>
                
                {/* Search Bar */}
                <div className="flex-shrink-0">
                  <input
                    type="text"
                    placeholder="Search services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Summary Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setStatusFilter(null)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === null
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  All ({allServices.length})
                </button>
                
                <button
                  onClick={() => setStatusFilter('running')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === 'running'
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Running ({serviceCounts.running || 0})
                </button>
                
                <button
                  onClick={() => setStatusFilter('stopped')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === 'stopped'
                      ? 'bg-red-500 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Stopped ({serviceCounts.stopped || 0})
                </button>
                
                <button
                  onClick={() => setStatusFilter('unhealthy')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === 'unhealthy'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Unhealthy ({serviceCounts.unhealthy || 0})
                </button>
              </div>
            </div>

            {/* Services Grid */}
            <div className="mb-8">
              <ServiceGrid services={services} />
            </div>

            {/* Port Allocation Map */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
                Port Allocations
              </h2>
              <PortAllocationMap services={services} />
            </div>
          </>
        )}

        {/* Dependencies View */}
        {activeView === 'dependencies' && !isLoading && (
          <div>
            <ServiceDependencyGraph services={services} />
          </div>
        )}

        {/* Health Monitor View */}
        {activeView === 'health' && !isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HealthMonitor />
            <div className="space-y-6">
              <HealthMonitor compact />
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                  Service Health Trends
                </h3>
                <div className="space-y-3">
                  {services.slice(0, 5).map((service) => (
                    <div key={service.id || service.name} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {service.name}
                      </span>
                      <span className={`text-sm font-medium ${
                        service.health === 'healthy' ? 'text-green-600' : 
                        service.health === 'unhealthy' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {service.health || 'unknown'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Port Management View */}
        {activeView === 'ports' && !isLoading && (
          <div className="space-y-6">
            <PortAllocationMap services={services} />
            <button
              onClick={() => setShowPortConflicts(true)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Check for Port Conflicts
            </button>
          </div>
        )}

        {/* Port Conflict Resolution Modal */}
        {showPortConflicts && portConflicts.length > 0 && (
          <PortConflictResolution
            conflicts={portConflicts}
            onClose={() => setShowPortConflicts(false)}
            onResolved={() => {
              setPortConflicts([])
              setShowPortConflicts(false)
            }}
          />
        )}
      </main>
    </div>
  )
}