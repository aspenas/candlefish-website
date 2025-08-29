'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Card } from '@/components/ui/Card'

interface Incident {
  id: string
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  assignee: string
  createdAt: number
  updatedAt: number
  affectedSystems: string[]
  description: string
  source: string
}

interface IncidentTableProps {
  incidents?: Incident[]
  className?: string
  pageSize?: number
}

const SEVERITY_COLORS = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
}

const STATUS_COLORS = {
  open: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  investigating: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
}

const IncidentTable: React.FC<IncidentTableProps> = ({ 
  incidents = [],
  className = '',
  pageSize = 50
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<keyof Incident>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null)

  // Generate mock data for demonstration
  const mockIncidents = useMemo(() => {
    const incidents: Incident[] = []
    const titles = [
      'DDoS Attack on API Gateway',
      'Malware Detection in Email System',
      'Unauthorized Access Attempt',
      'Data Breach Investigation',
      'Phishing Campaign Detected',
      'SQL Injection Attack',
      'Ransomware Activity',
      'Insider Threat Alert',
      'Network Intrusion Detection',
      'Credential Stuffing Attack'
    ]
    
    const assignees = ['Tyler Johnson', 'Patrick Smith', 'Aaron Wilson', 'James Chen', 'Security Team']
    const sources = ['SIEM', 'EDR', 'WAF', 'Email Security', 'Network Monitor', 'User Report']
    const systems = ['Web Server', 'Database', 'Email Server', 'API Gateway', 'Load Balancer', 'VPN']
    
    for (let i = 1; i <= 200; i++) {
      const createdAt = Date.now() - Math.random() * 86400000 * 30 // Random time in last 30 days
      incidents.push({
        id: `INC-${i.toString().padStart(4, '0')}`,
        title: titles[Math.floor(Math.random() * titles.length)],
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
        status: ['open', 'investigating', 'resolved', 'closed'][Math.floor(Math.random() * 4)] as any,
        assignee: assignees[Math.floor(Math.random() * assignees.length)],
        createdAt,
        updatedAt: createdAt + Math.random() * 86400000 * 5,
        affectedSystems: systems.slice(0, Math.floor(Math.random() * 3) + 1),
        description: `Security incident requiring immediate attention and investigation.`,
        source: sources[Math.floor(Math.random() * sources.length)]
      })
    }
    return incidents
  }, [])

  const activeIncidents = incidents.length > 0 ? incidents : mockIncidents

  // Sorting logic
  const sortedIncidents = useMemo(() => {
    return [...activeIncidents].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' 
          ? aValue - bValue
          : bValue - aValue
      }
      
      return 0
    })
  }, [activeIncidents, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(sortedIncidents.length / pageSize)
  const paginatedIncidents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedIncidents.slice(startIndex, startIndex + pageSize)
  }, [sortedIncidents, currentPage, pageSize])

  const handleSort = useCallback((field: keyof Incident) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }, [sortField])

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor(diff / 60000)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return `${minutes}m ago`
  }

  const SortIcon: React.FC<{ field: keyof Incident }> = ({ field }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  return (
    <Card className={`p-0 overflow-hidden ${className}`}>
      <div className="p-6 border-b border-gray-200 dark:border-gray-600">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Security Incidents
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {sortedIncidents.length} total incidents
            </p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" role="table">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('id')}
                role="columnheader"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSort('id')
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  ID
                  <SortIcon field="id" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('title')}
                role="columnheader"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSort('title')
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  Title
                  <SortIcon field="title" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('severity')}
                role="columnheader"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSort('severity')
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  Severity
                  <SortIcon field="severity" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('status')}
                role="columnheader"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSort('status')
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  Status
                  <SortIcon field="status" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('assignee')}
                role="columnheader"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSort('assignee')
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  Assignee
                  <SortIcon field="assignee" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => handleSort('createdAt')}
                role="columnheader"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSort('createdAt')
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  Created
                  <SortIcon field="createdAt" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-600">
            {paginatedIncidents.map((incident) => (
              <tr 
                key={incident.id} 
                className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                onClick={() => setSelectedIncident(selectedIncident === incident.id ? null : incident.id)}
                role="row"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {incident.id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                  {incident.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[incident.severity]}`}>
                    {incident.severity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[incident.status]}`}>
                    {incident.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {incident.assignee}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {getTimeAgo(incident.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button 
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Handle view action
                    }}
                    aria-label={`View incident ${incident.id}`}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedIncidents.length)} of {sortedIncidents.length} incidents
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              aria-label="Previous page"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default IncidentTable