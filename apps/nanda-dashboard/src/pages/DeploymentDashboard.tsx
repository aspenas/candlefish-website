import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RocketLaunchIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import {
  useDeployments,
  useHealthStatus,
  useEnvironments,
  useRealtimeDeploymentUpdates
} from '../hooks/useDeploymentOperations'
import { EnvironmentSelector } from '../components/deployment/EnvironmentSelector'
import { DeploymentHistory } from '../components/deployment/DeploymentHistory'
import { HealthStatusGrid } from '../components/deployment/HealthStatusGrid'
import { DeploymentProgress } from '../components/deployment/DeploymentProgress'
import { RollbackInterface } from '../components/deployment/RollbackInterface'
import { SecretRotationManager } from '../components/deployment/SecretRotationManager'
import { AuditLogViewer } from '../components/deployment/AuditLogViewer'
import { CreateDeploymentModal } from '../components/deployment/CreateDeploymentModal'
import { LoadingScreen } from '../components/common/LoadingSpinner'
import { EnvironmentType, DeploymentStatus } from '../types/deployment.types'

type DashboardTab = 'overview' | 'deployments' | 'health' | 'secrets' | 'audit' | 'rollback'

export function DeploymentDashboard() {
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentType>('production')
  const [selectedTab, setSelectedTab] = useState<DashboardTab>('overview')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null)

  // API Hooks
  const { deployments, loading: deploymentsLoading, refetch: refetchDeployments } = useDeployments({
    environment: [selectedEnvironment]
  })
  const { healthChecks, loading: healthLoading, refetch: refetchHealth } = useHealthStatus()
  const { environments, loading: environmentsLoading } = useEnvironments()
  const { updates: realtimeUpdates } = useRealtimeDeploymentUpdates()

  // Real-time updates effect
  useEffect(() => {
    if (realtimeUpdates.length > 0) {
      // Refetch deployments when we receive updates
      refetchDeployments()
      refetchHealth()
    }
  }, [realtimeUpdates, refetchDeployments, refetchHealth])

  // Get current deployments by status
  const activeDeployments = deployments.filter(d =>
    ['pending', 'running', 'deploying', 'testing'].includes(d.status)
  )
  const recentDeployments = deployments.slice(0, 5)
  const failedDeployments = deployments.filter(d => d.status === 'failed').length
  const successRate = deployments.length > 0
    ? (deployments.filter(d => d.status === 'completed').length / deployments.length) * 100
    : 0

  // Health status summary
  const healthySystems = healthChecks.filter(hc => hc.status === 'healthy').length
  const criticalSystems = healthChecks.filter(hc => hc.status === 'critical').length
  const warningSystems = healthChecks.filter(hc => hc.status === 'warning').length

  const TabButton = ({ tab, label, icon: Icon, isActive, onClick }: {
    tab: DashboardTab
    label: string
    icon: any
    isActive: boolean
    onClick: () => void
  }) => (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background
        ${isActive
          ? 'bg-primary text-primary-foreground shadow-glow'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }
      `}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )

  if (environmentsLoading || deploymentsLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-card mb-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Deployment Management
            </h1>
            <p className="text-lg text-muted-foreground">
              Monitor and manage deployments across all environments
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            <EnvironmentSelector
              environments={environments}
              selected={selectedEnvironment}
              onChange={setSelectedEnvironment}
            />
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <RocketLaunchIcon className="w-4 h-4" />
              New Deployment
            </button>
          </div>
        </div>
      </motion.div>

      {/* Overview Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <div className="glass-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <RocketLaunchIcon className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-2xl font-bold text-foreground">{activeDeployments.length}</span>
          </div>
          <p className="text-sm text-muted-foreground">Active Deployments</p>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-2xl font-bold text-foreground">{successRate.toFixed(1)}%</span>
          </div>
          <p className="text-sm text-muted-foreground">Success Rate</p>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <ShieldCheckIcon className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-2xl font-bold text-foreground">{healthySystems}</span>
          </div>
          <p className="text-sm text-muted-foreground">Healthy Systems</p>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 ${criticalSystems > 0 ? 'bg-red-500/20' : 'bg-yellow-500/20'} rounded-lg`}>
              {criticalSystems > 0 ? (
                <XCircleIcon className="w-5 h-5 text-red-400" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
              )}
            </div>
            <span className="text-2xl font-bold text-foreground">{criticalSystems + warningSystems}</span>
          </div>
          <p className="text-sm text-muted-foreground">Systems at Risk</p>
        </div>
      </motion.div>

      {/* Active Deployments Progress */}
      {activeDeployments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-foreground mb-4">Active Deployments</h2>
          <div className="space-y-4">
            {activeDeployments.map((deployment) => (
              <DeploymentProgress
                key={deployment.id}
                deployment={deployment}
                onCancel={(id) => console.log('Cancel deployment:', id)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="glass-card mb-8 p-2"
      >
        <div className="flex flex-wrap gap-2">
          <TabButton
            tab="overview"
            label="Overview"
            icon={Cog6ToothIcon}
            isActive={selectedTab === 'overview'}
            onClick={() => setSelectedTab('overview')}
          />
          <TabButton
            tab="deployments"
            label="Deployments"
            icon={RocketLaunchIcon}
            isActive={selectedTab === 'deployments'}
            onClick={() => setSelectedTab('deployments')}
          />
          <TabButton
            tab="health"
            label="Health Status"
            icon={ShieldCheckIcon}
            isActive={selectedTab === 'health'}
            onClick={() => setSelectedTab('health')}
          />
          <TabButton
            tab="rollback"
            label="Rollback"
            icon={ClockIcon}
            isActive={selectedTab === 'rollback'}
            onClick={() => setSelectedTab('rollback')}
          />
          <TabButton
            tab="secrets"
            label="Secrets"
            icon={Cog6ToothIcon}
            isActive={selectedTab === 'secrets'}
            onClick={() => setSelectedTab('secrets')}
          />
          <TabButton
            tab="audit"
            label="Audit Logs"
            icon={ClockIcon}
            isActive={selectedTab === 'audit'}
            onClick={() => setSelectedTab('audit')}
          />
        </div>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {selectedTab === 'overview' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <DeploymentHistory
                deployments={recentDeployments}
                environment={selectedEnvironment}
                onDeploymentSelect={setSelectedDeploymentId}
              />
              <HealthStatusGrid
                healthChecks={healthChecks}
                loading={healthLoading}
              />
            </div>
          )}

          {selectedTab === 'deployments' && (
            <DeploymentHistory
              deployments={deployments}
              environment={selectedEnvironment}
              onDeploymentSelect={setSelectedDeploymentId}
              showAll={true}
            />
          )}

          {selectedTab === 'health' && (
            <HealthStatusGrid
              healthChecks={healthChecks}
              loading={healthLoading}
              expanded={true}
            />
          )}

          {selectedTab === 'rollback' && (
            <RollbackInterface
              deployments={deployments.filter(d => d.status === 'completed')}
              environment={selectedEnvironment}
            />
          )}

          {selectedTab === 'secrets' && (
            <SecretRotationManager
              environment={selectedEnvironment}
            />
          )}

          {selectedTab === 'audit' && (
            <AuditLogViewer
              environment={selectedEnvironment}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Create Deployment Modal */}
      <CreateDeploymentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        environments={environments}
        onSuccess={() => {
          setShowCreateModal(false)
          refetchDeployments()
        }}
      />
    </div>
  )
}
