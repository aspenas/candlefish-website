'use client'

import React, { useState } from 'react'
import { useQuery } from '@apollo/client'
import { motion } from 'framer-motion'
import { 
  ChartBarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CogIcon,
  PlusIcon,
  BellIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'
import { GET_OPERATOR_DASHBOARD } from '@/lib/graphql/queries'
import { AssessmentCard } from './AssessmentCard'
import { ClientCard } from './ClientCard'
import { UsageQuotaWidget } from './UsageQuotaWidget'
import { RecentActivityFeed } from './RecentActivityFeed'
import { MaturityTrendChart } from './charts/MaturityTrendChart'
import { IndustryDistributionChart } from './charts/IndustryDistributionChart'
import type { Operator, Assessment, Client } from '@/lib/graphql/types'

interface OperatorDashboardProps {
  operatorId: string
}

interface DashboardTab {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
}

export function OperatorDashboard({ operatorId }: OperatorDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  
  const { data, loading, error } = useQuery(GET_OPERATOR_DASHBOARD, {
    variables: { operatorId },
    pollInterval: 30000, // Poll every 30 seconds for real-time updates
    errorPolicy: 'all'
  })

  const operator: Operator = data?.operator
  const metrics = data?.dashboardMetrics

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    )
  }

  if (error || !operator) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="text-red-500 text-lg">Failed to load dashboard</div>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  const tabs: DashboardTab[] = [
    { 
      id: 'overview', 
      label: 'Overview', 
      icon: ChartBarIcon 
    },
    { 
      id: 'assessments', 
      label: 'Assessments', 
      icon: DocumentTextIcon, 
      count: operator.assessments?.length || 0 
    },
    { 
      id: 'clients', 
      label: 'Clients', 
      icon: UserGroupIcon, 
      count: operator.clients?.length || 0 
    },
    { 
      id: 'analytics', 
      label: 'Analytics', 
      icon: ChartBarIcon 
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: CogIcon 
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C]">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Operational Maturity Dashboard
              </h1>
              <p className="text-gray-400 mt-1">
                Welcome back, {operator.name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge 
                variant={operator.franchiseTier === 'ENTERPRISE' ? 'default' : 'secondary'}
                className="px-3 py-1"
              >
                {operator.franchiseTier}
              </Badge>
              <Button size="sm" className="relative">
                <BellIcon className="w-4 h-4 mr-2" />
                Notifications
                {metrics?.recentActivity?.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                )}
              </Button>
              <Button size="sm">
                <PlusIcon className="w-4 h-4 mr-2" />
                New Assessment
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-white/10 bg-black/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {tab.count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <OverviewTab 
              operator={operator} 
              metrics={metrics} 
            />
          )}
          {activeTab === 'assessments' && (
            <AssessmentsTab 
              assessments={operator.assessments || []} 
              operatorId={operatorId} 
            />
          )}
          {activeTab === 'clients' && (
            <ClientsTab 
              clients={operator.clients || []} 
              operatorId={operatorId} 
            />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsTab 
              operatorId={operatorId}
              metrics={metrics} 
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab 
              operator={operator} 
            />
          )}
        </motion.div>
      </main>
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ operator, metrics }: { operator: Operator; metrics: any }) {
  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/20 border-blue-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm">Total Assessments</p>
              <p className="text-3xl font-bold text-white">
                {metrics?.totalAssessments || 0}
              </p>
            </div>
            <DocumentTextIcon className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/20 border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm">Completed This Month</p>
              <p className="text-3xl font-bold text-white">
                {metrics?.completedThisMonth || 0}
              </p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-600/20 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm">Avg Maturity Score</p>
              <p className="text-3xl font-bold text-white">
                {metrics?.averageMaturityScore?.toFixed(1) || '0.0'}%
              </p>
            </div>
            <UserGroupIcon className="w-8 h-8 text-purple-400" />
          </div>
        </Card>

        <Card className="p-6">
          <UsageQuotaWidget usageQuota={operator.usageQuota} />
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Maturity Trends
            </h3>
            <MaturityTrendChart operatorId={operator.id} />
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Industry Distribution
            </h3>
            <IndustryDistributionChart data={metrics?.topIndustries} />
          </Card>
        </div>

        <div>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Recent Activity
            </h3>
            <RecentActivityFeed 
              activities={metrics?.recentActivity || []}
              operatorId={operator.id}
            />
          </Card>
        </div>
      </div>

      {/* Recent Assessments */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            Recent Assessments
          </h2>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(operator.assessments || []).slice(0, 6).map((assessment) => (
            <AssessmentCard 
              key={assessment.id} 
              assessment={assessment}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Assessments Tab Component
function AssessmentsTab({ assessments, operatorId }: { assessments: Assessment[]; operatorId: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          All Assessments
        </h2>
        <Button>
          <PlusIcon className="w-4 h-4 mr-2" />
          New Assessment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assessments.map((assessment) => (
          <AssessmentCard 
            key={assessment.id} 
            assessment={assessment}
            showDetails={true}
          />
        ))}
      </div>
    </div>
  )
}

// Clients Tab Component
function ClientsTab({ clients, operatorId }: { clients: Client[]; operatorId: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          Client Management
        </h2>
        <Button>
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <ClientCard 
            key={client.id} 
            client={client}
          />
        ))}
      </div>
    </div>
  )
}

// Analytics Tab Component
function AnalyticsTab({ operatorId, metrics }: { operatorId: string; metrics: any }) {
  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-white">
        Advanced Analytics
      </h2>
      <div className="text-gray-400">
        Advanced analytics features coming soon...
      </div>
    </div>
  )
}

// Settings Tab Component
function SettingsTab({ operator }: { operator: Operator }) {
  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-white">
        Settings & Configuration
      </h2>
      <div className="text-gray-400">
        Settings panel coming soon...
      </div>
    </div>
  )
}