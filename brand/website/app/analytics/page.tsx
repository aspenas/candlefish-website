'use client'

import React, { Suspense } from 'react'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Lazy load analytics components
const SecurityMetricsChart = React.lazy(() => import('@/components/security/SecurityMetricsChart'))
const AttackPatternHeatmap = React.lazy(() => import('@/components/security/AttackPatternHeatmap'))
const ThreatTrendAnalysis = React.lazy(() => import('@/components/security/ThreatTrendAnalysis'))
const VulnerabilityBreakdown = React.lazy(() => import('@/components/security/VulnerabilityBreakdown'))

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Security Analytics
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Advanced security metrics, trends, and threat intelligence
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select 
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Select time range"
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Row - Metrics Chart */}
        <div className="mb-8">
          <Suspense fallback={
            <Card className="p-6 h-96">
              <LoadingSpinner size="large" />
            </Card>
          }>
            <SecurityMetricsChart />
          </Suspense>
        </div>

        {/* Middle Row - Attack Patterns and Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Suspense fallback={
            <Card className="p-6 h-96">
              <LoadingSpinner size="large" />
            </Card>
          }>
            <AttackPatternHeatmap />
          </Suspense>
          
          <Suspense fallback={
            <Card className="p-6 h-96">
              <LoadingSpinner size="large" />
            </Card>
          }>
            <ThreatTrendAnalysis />
          </Suspense>
        </div>

        {/* Bottom Row - Vulnerability Analysis */}
        <div>
          <Suspense fallback={
            <Card className="p-6 h-96">
              <LoadingSpinner size="large" />
            </Card>
          }>
            <VulnerabilityBreakdown />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

// Note: Metadata moved to layout.tsx for client components