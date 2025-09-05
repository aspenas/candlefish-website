'use client'

import React, { Suspense } from 'react'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Lazy load heavy security components for better performance
const ThreatMap = React.lazy(() => import('@/components/security/ThreatMap'))
const SecurityTimeline = React.lazy(() => import('@/components/security/SecurityTimeline'))
const RiskScoreGauges = React.lazy(() => import('@/components/security/RiskScoreGauges'))
const ComplianceCards = React.lazy(() => import('@/components/security/ComplianceCards'))

export default function SecurityDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Security Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Real-time security monitoring and threat analysis
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" 
                     aria-hidden="true"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Live Monitoring
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Risk Score Overview */}
        <div className="mb-8">
          <Suspense fallback={
            <Card className="p-6">
              <LoadingSpinner size="large" />
            </Card>
          }>
            <RiskScoreGauges />
          </Suspense>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Threat Map - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <Suspense fallback={
              <Card className="p-6 h-96">
                <LoadingSpinner size="large" />
              </Card>
            }>
              <ThreatMap />
            </Suspense>
          </div>

          {/* Compliance Status */}
          <div>
            <Suspense fallback={
              <Card className="p-6 h-96">
                <LoadingSpinner size="medium" />
              </Card>
            }>
              <ComplianceCards />
            </Suspense>
          </div>
        </div>

        {/* Security Timeline */}
        <div className="mb-8">
          <Suspense fallback={
            <Card className="p-6">
              <LoadingSpinner size="large" />
            </Card>
          }>
            <SecurityTimeline />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

// Note: Metadata moved to layout.tsx for client components