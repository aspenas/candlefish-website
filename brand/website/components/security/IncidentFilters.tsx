'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'

interface FilterState {
  search: string
  severity: string
  status: string
  assignee: string
  dateRange: string
}

interface IncidentFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  className?: string
}

const IncidentFilters: React.FC<IncidentFiltersProps> = ({ 
  filters = {
    search: '',
    severity: '',
    status: '',
    assignee: '',
    dateRange: ''
  },
  onFiltersChange,
  className = ''
}) => {
  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      severity: '',
      status: '',
      assignee: '',
      dateRange: ''
    })
  }

  const assignees = [
    'Tyler Johnson',
    'Patrick Smith', 
    'Aaron Wilson',
    'James Chen',
    'Security Team'
  ]

  const activeFilterCount = Object.values(filters).filter(v => v).length

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search incidents..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Search incidents"
          />
        </div>

        {/* Severity Filter */}
        <div>
          <select
            value={filters.severity}
            onChange={(e) => updateFilter('severity', e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by severity"
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Assignee Filter */}
        <div>
          <select
            value={filters.assignee}
            onChange={(e) => updateFilter('assignee', e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by assignee"
          >
            <option value="">All Assignees</option>
            {assignees.map(assignee => (
              <option key={assignee} value={assignee}>{assignee}</option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <select
            value={filters.dateRange}
            onChange={(e) => updateFilter('dateRange', e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by date range"
          >
            <option value="">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`Clear ${activeFilterCount} active filters`}
          >
            Clear ({activeFilterCount})
          </button>
        )}
      </div>
    </Card>
  )
}

// Default export with empty filters for standalone use
const IncidentFiltersStandalone: React.FC<{ className?: string }> = ({ className }) => {
  const [filters, setFilters] = React.useState<FilterState>({
    search: '',
    severity: '',
    status: '',
    assignee: '',
    dateRange: ''
  })

  return (
    <IncidentFilters 
      filters={filters}
      onFiltersChange={setFilters}
      className={className}
    />
  )
}

export default IncidentFiltersStandalone
export { IncidentFilters }