'use client'

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import workshopIndex from '../../workshop/index.json'
import { WorkshopIndexEntry, ViewMode, ProjectStatus } from '../../lib/workshop/types'
import { getStatusColor, formatDate } from '../../lib/workshop/utils'
import { getPublicClientName } from '../../lib/workshop/privacy'

// View toggle component
const ViewToggle = ({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) => (
  <div className="flex rounded-lg border border-[#333] overflow-hidden">
    <button
      onClick={() => onChange('operator')}
      className={`px-4 py-2 text-sm transition-all ${
        mode === 'operator'
          ? 'bg-[#3FD3C6]/10 text-[#3FD3C6] border-r border-[#3FD3C6]/20'
          : 'text-[#888] hover:text-[#fff]'
      }`}
    >
      Operator
    </button>
    <button
      onClick={() => onChange('builder')}
      className={`px-4 py-2 text-sm transition-all ${
        mode === 'builder'
          ? 'bg-[#3FD3C6]/10 text-[#3FD3C6]'
          : 'text-[#888] hover:text-[#fff]'
      }`}
    >
      Builder
    </button>
  </div>
)

// Filter chips component
const FilterChips = ({
  filters,
  onChange
}: {
  filters: {
    status: ProjectStatus[]
    domain: string[]
    complexity: string[]
    impact: string[]
    updatedWithin?: number
  }
  onChange: (filters: any) => void
}) => {
  const allStatuses: ProjectStatus[] = ['IDEATION', 'ACTIVE', 'CALIBRATING', 'OPERATIONAL', 'PAUSED']
  const allComplexity = ['L', 'M', 'H']
  const allImpact = ['Low', 'Medium', 'High']
  const allDomains = useMemo(() => {
    const domains = new Set<string>()
    workshopIndex.forEach(p => p.domain.forEach(d => domains.add(d)))
    return Array.from(domains).sort()
  }, [])

  return (
    <div className="space-y-3">
      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-[#666] mr-2">Status:</span>
        {allStatuses.map(status => (
          <button
            key={status}
            onClick={() => {
              const newStatuses = filters.status.includes(status)
                ? filters.status.filter(s => s !== status)
                : [...filters.status, status]
              onChange({ ...filters, status: newStatuses })
            }}
            className={`px-3 py-1 text-xs rounded border transition-all ${
              filters.status.includes(status)
                ? `${getStatusColor(status)} bg-opacity-10`
                : 'border-[#333] text-[#666] hover:text-[#fff] hover:border-[#666]'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Domain filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-[#666] mr-2">Domain:</span>
        {allDomains.map(domain => (
          <button
            key={domain}
            onClick={() => {
              const newDomains = filters.domain.includes(domain)
                ? filters.domain.filter(d => d !== domain)
                : [...filters.domain, domain]
              onChange({ ...filters, domain: newDomains })
            }}
            className={`px-3 py-1 text-xs rounded border transition-all ${
              filters.domain.includes(domain)
                ? 'border-[#3FD3C6] text-[#3FD3C6] bg-[#3FD3C6]/10'
                : 'border-[#333] text-[#666] hover:text-[#fff] hover:border-[#666]'
            }`}
          >
            {domain}
          </button>
        ))}
      </div>

      {/* Updated within */}
      <div className="flex gap-2">
        <span className="text-xs text-[#666] mr-2">Updated:</span>
        {[7, 30, 90].map(days => (
          <button
            key={days}
            onClick={() => {
              onChange({
                ...filters,
                updatedWithin: filters.updatedWithin === days ? undefined : days
              })
            }}
            className={`px-3 py-1 text-xs rounded border transition-all ${
              filters.updatedWithin === days
                ? 'border-[#3FD3C6] text-[#3FD3C6] bg-[#3FD3C6]/10'
                : 'border-[#333] text-[#666] hover:text-[#fff] hover:border-[#666]'
            }`}
          >
            ≤{days}d
          </button>
        ))}
      </div>
    </div>
  )
}

// Project card component
const ProjectCard = ({
  project,
  mode
}: {
  project: WorkshopIndexEntry & { client_name_masked?: string }
  mode: ViewMode
}) => {
  const clientName = getPublicClientName({
    client_name_masked: 'Private Client',
    safe_public: project.safe_public
  })

  return (
    <Link href={`/workshop/${project.slug}`}>
      <article className="group border border-[#333] p-6 hover:border-[#3FD3C6]/50 transition-all cursor-pointer relative overflow-hidden">
        {/* Subtle hover effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#3FD3C6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-lg text-[#fff] mb-2 group-hover:text-[#3FD3C6] transition-colors">
                {project.title}
              </h3>
              <p className="text-xs text-[#666]">{clientName}</p>
            </div>
            <span className={`px-2 py-1 text-xs border ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
          </div>

          {/* Operator View */}
          {mode === 'operator' && (
            <div className="space-y-3">
              {/* Metrics preview - using mock data for now */}
              <div className="flex gap-4 text-xs">
                <div className="text-[#888]">
                  <span className="text-[#3FD3C6]">Impact:</span> {project.impact}
                </div>
                <div className="text-[#888]">
                  <span className="text-[#3FD3C6]">Complexity:</span> {project.complexity}
                </div>
              </div>

              {/* Mini telemetry visualization placeholder */}
              <div className="h-[2px] bg-[#1a1a1a] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3FD3C6]/30 to-transparent animate-pulse" />
              </div>

              {/* Last updated */}
              <div className="text-xs text-[#666]">
                Updated {formatDate(project.updated_at)}
              </div>
            </div>
          )}

          {/* Builder View */}
          {mode === 'builder' && (
            <div className="space-y-3">
              {/* Stack badges */}
              <div className="flex flex-wrap gap-2">
                {project.domain.slice(0, 3).map(domain => (
                  <span key={domain} className="px-2 py-1 text-xs bg-[#1a1a1a] text-[#888] rounded">
                    {domain}
                  </span>
                ))}
                {project.domain.length > 3 && (
                  <span className="px-2 py-1 text-xs text-[#666]">
                    +{project.domain.length - 3} more
                  </span>
                )}
              </div>

              {/* Mini architecture preview placeholder */}
              <div className="h-12 bg-[#0a0a0a] rounded flex items-center justify-center text-xs text-[#444]">
                Architecture Preview
              </div>

              {/* Last updated */}
              <div className="text-xs text-[#666]">
                Updated {formatDate(project.updated_at)}
              </div>
            </div>
          )}
        </div>
      </article>
    </Link>
  )
}

// Workshop content component that uses search params
function WorkshopContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // State management
  const [viewMode, setViewMode] = useState<ViewMode>(
    (searchParams.get('view') as ViewMode) || 'operator'
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: [] as ProjectStatus[],
    domain: [] as string[],
    complexity: [] as string[],
    impact: [] as string[],
    updatedWithin: undefined as number | undefined
  })

  // Update URL when view mode changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    if (viewMode !== 'operator') {
      params.set('view', viewMode)
    } else {
      params.delete('view')
    }
    router.replace(`/workshop?${params.toString()}`)
  }, [viewMode, searchParams, router])

  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem('workshop-view-mode', viewMode)
  }, [viewMode])

  // Load view mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('workshop-view-mode') as ViewMode
    if (savedMode && !searchParams.get('view')) {
      setViewMode(savedMode)
    }
  }, [searchParams])

  // Filter projects
  const filteredProjects = useMemo(() => {
    let projects = [...(workshopIndex as WorkshopIndexEntry[])]

    // Apply filters
    if (filters.status.length > 0) {
      projects = projects.filter(p => filters.status.includes(p.status as ProjectStatus))
    }
    if (filters.domain.length > 0) {
      projects = projects.filter(p =>
        p.domain.some(d => filters.domain.includes(d))
      )
    }
    if (filters.complexity.length > 0) {
      projects = projects.filter(p => filters.complexity.includes(p.complexity))
    }
    if (filters.impact.length > 0) {
      projects = projects.filter(p => filters.impact.includes(p.impact))
    }
    if (filters.updatedWithin) {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - filters.updatedWithin)
      projects = projects.filter(p => new Date(p.updated_at) >= cutoffDate)
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      projects = projects.filter(p =>
        p.title.toLowerCase().includes(term) ||
        p.domain.some(d => d.toLowerCase().includes(term))
      )
    }

    return projects
  }, [filters, searchTerm])

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono pt-20 relative">
      {/* Subtle brand accent overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          background: `linear-gradient(135deg, transparent 0%, rgba(63, 211, 198, 0.1) 50%, transparent 100%)`
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-[#333] px-6 py-4 relative">
          <div className="absolute left-0 bottom-0 w-full h-px bg-gradient-to-r from-transparent via-[#3FD3C6]/20 to-transparent" />
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-start">
              <div>
                <Link href="/" className="text-xs text-[#888] hover:text-[#3FD3C6] transition-colors">
                  ← Back to Home
                </Link>
                <h1 className="text-2xl text-[#fff] mt-2">Workshop</h1>
                <p className="text-sm text-[#666] mt-1">
                  Public R&D board. Live operational work. No projections.
                </p>
              </div>

              {/* View Toggle */}
              <ViewToggle mode={viewMode} onChange={setViewMode} />
            </div>
          </div>
        </header>

        {/* Controls */}
        <section className="max-w-7xl mx-auto px-6 py-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#333] text-[#fff] placeholder-[#666] focus:border-[#3FD3C6]/50 focus:outline-none rounded"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#fff]"
              >
                ×
              </button>
            )}
          </div>

          {/* Filters */}
          <FilterChips filters={filters} onChange={setFilters} />

          {/* Results count */}
          <div className="text-xs text-[#666]">
            Showing {filteredProjects.length} of {workshopIndex.length} projects
          </div>
        </section>

        {/* Project Grid */}
        <section className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.slug}
                project={project}
                mode={viewMode}
              />
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#666]">No projects match your filters</p>
              <button
                onClick={() => {
                  setFilters({
                    status: [],
                    domain: [],
                    complexity: [],
                    impact: [],
                    updatedWithin: undefined
                  })
                  setSearchTerm('')
                }}
                className="mt-4 px-4 py-2 text-sm text-[#3FD3C6] hover:text-[#fff] transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

// Loading fallback for Suspense
function WorkshopLoading() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#d4d4d4] font-mono pt-20">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-[#1a1a1a] rounded mb-4 w-1/4"></div>
          <div className="h-4 bg-[#1a1a1a] rounded mb-8 w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-[#1a1a1a] rounded border border-[#333]"></div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

// Main export wrapped in Suspense
export default function Workshop() {
  return (
    <Suspense fallback={<WorkshopLoading />}>
      <WorkshopContent />
    </Suspense>
  )
}
