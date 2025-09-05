'use client'

import React, { Suspense } from 'react'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Lazy load alert components
const AlertsTable = React.lazy(() => import('@/components/security/AlertsTable'))
const AlertsFilters = React.lazy(() => import('@/components/security/AlertsFilters'))
const AlertsMetrics = React.lazy(() => import('@/components/security/AlertsMetrics'))
const AlertsHeatmap = React.lazy(() => import('@/components/security/AlertsHeatmap'))

export default function AlertsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Security Alerts
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Real-time security alerts and notifications
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Live Alerts
                </span>
              </div>
            </div>
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
            <AlertsMetrics />
          </Suspense>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Alerts Heatmap - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Suspense fallback={
              <Card className="p-6 h-96">
                <LoadingSpinner size="large" />
              </Card>
            }>
              <AlertsHeatmap />
            </Suspense>
          </div>

          {/* Filters */}
          <div>
            <Suspense fallback={
              <Card className="p-6 h-96">
                <LoadingSpinner size="medium" />
              </Card>
            }>
              <AlertsFilters />
            </Suspense>
          </div>
        </div>

        {/* Alerts Table */}
        <div>
          <Suspense fallback={
            <Card className="p-6">
              <LoadingSpinner size="large" />
            </Card>
          }>
            <AlertsTable />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

// Note: Metadata moved to layout.tsx for client components