'use client'

import React, { Suspense } from 'react'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Lazy load incident management components
const IncidentTable = React.lazy(() => import('@/components/security/IncidentTable'))
const IncidentFilters = React.lazy(() => import('@/components/security/IncidentFilters'))
const IncidentMetrics = React.lazy(() => import('@/components/security/IncidentMetrics'))

export default function IncidentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Security Incidents
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage and track security incidents and responses
              </p>
            </div>
            <button 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Create new incident"
            >
              New Incident
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Overview */}
        <div className="mb-8">
          <Suspense fallback={
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-6">
                  <LoadingSpinner size="small" />
                </Card>
              ))}
            </div>
          }>
            <IncidentMetrics />
          </Suspense>
        </div>

        {/* Filters and Search */}
        <div className="mb-6">
          <Suspense fallback={
            <Card className="p-4">
              <LoadingSpinner size="medium" />
            </Card>
          }>
            <IncidentFilters />
          </Suspense>
        </div>

        {/* Incidents Table */}
        <div>
          <Suspense fallback={
            <Card className="p-6">
              <LoadingSpinner size="large" />
            </Card>
          }>
            <IncidentTable />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

// Note: Metadata moved to layout.tsx for client components