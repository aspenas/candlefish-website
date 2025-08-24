import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RocketLaunchIcon,
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Environment, CreateDeploymentInput } from '../../types/deployment.types'
import { useDeploymentOperations } from '../../hooks/useDeploymentOperations'
import { EnvironmentBadge } from './EnvironmentSelector'

interface CreateDeploymentModalProps {
  isOpen: boolean
  onClose: () => void
  environments: Environment[]
  onSuccess: () => void
  preSelectedEnvironment?: string
  preSelectedService?: string
}

interface ServiceConfig {
  name: string
  description: string
  defaultBranch: string
  hasTests: boolean
  estimatedDeployTime: number
  requiresApproval: boolean
}

// Mock service configurations - would come from API in real app
const availableServices: ServiceConfig[] = [
  {
    name: 'api',
    description: 'Main API service',
    defaultBranch: 'main',
    hasTests: true,
    estimatedDeployTime: 300, // 5 minutes
    requiresApproval: true
  },
  {
    name: 'frontend',
    description: 'Web frontend application',
    defaultBranch: 'main',
    hasTests: true,
    estimatedDeployTime: 180, // 3 minutes
    requiresApproval: false
  },
  {
    name: 'worker',
    description: 'Background worker service',
    defaultBranch: 'main',
    hasTests: true,
    estimatedDeployTime: 120, // 2 minutes
    requiresApproval: false
  },
  {
    name: 'dashboard',
    description: 'Admin dashboard',
    defaultBranch: 'main',
    hasTests: true,
    estimatedDeployTime: 240, // 4 minutes
    requiresApproval: false
  }
]

export function CreateDeploymentModal({
  isOpen,
  onClose,
  environments,
  onSuccess,
  preSelectedEnvironment,
  preSelectedService
}: CreateDeploymentModalProps) {
  const [selectedService, setSelectedService] = useState('')
  const [selectedEnvironment, setSelectedEnvironment] = useState('')
  const [version, setVersion] = useState('')
  const [branch, setBranch] = useState('main')
  const [commitSha, setCommitSha] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<Record<string, any>>({})

  const { createDeployment } = useDeploymentOperations()

  // Set pre-selected values
  useEffect(() => {
    if (isOpen) {
      setSelectedEnvironment(preSelectedEnvironment || (environments[0]?.name || ''))
      setSelectedService(preSelectedService || '')
      setBranch('main')
      setVersion('')
      setCommitSha('')
      setConfig({})
      setError(null)
    }
  }, [isOpen, preSelectedEnvironment, preSelectedService, environments])

  const selectedServiceConfig = availableServices.find(s => s.name === selectedService)
  const selectedEnv = environments.find(env => env.name === selectedEnvironment)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedService || !selectedEnvironment || !version || !branch) {
      setError('Please fill in all required fields')
      return
    }

    setIsDeploying(true)
    setError(null)

    try {
      const input: CreateDeploymentInput = {
        service: selectedService,
        environment: selectedEnvironment as any,
        version,
        branch,
        commitSha: commitSha || 'HEAD',
        triggeredBy: 'current_user', // Would get from auth context
        config: Object.keys(config).length > 0 ? config : undefined
      }

      await createDeployment(input)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deployment')
    } finally {
      setIsDeploying(false)
    }
  }

  const handleClose = () => {
    if (!isDeploying) {
      onClose()
    }
  }

  const formatEstimatedTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <RocketLaunchIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Create Deployment</h2>
                  <p className="text-sm text-muted-foreground">
                    Deploy a service to your selected environment
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={isDeploying}
                className="p-2 hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
              >
                <XMarkIcon className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Service Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">
                Service *
              </label>
              <div className="grid grid-cols-1 gap-3">
                {availableServices.map((service) => (
                  <label
                    key={service.name}
                    className={`
                      flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${selectedService === service.name
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/20 hover:bg-muted/30'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="service"
                      value={service.name}
                      checked={selectedService === service.name}
                      onChange={(e) => {
                        setSelectedService(e.target.value)
                        setBranch(service.defaultBranch)
                      }}
                      disabled={isDeploying}
                      className="mt-1 border-border text-primary focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-foreground">{service.name}</span>
                        {service.requiresApproval && (
                          <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">
                            Requires Approval
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {service.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Default: {service.defaultBranch}</span>
                        <span>•</span>
                        <span>~{formatEstimatedTime(service.estimatedDeployTime)}</span>
                        {service.hasTests && (
                          <>
                            <span>•</span>
                            <span>Has Tests</span>
                          </>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Environment Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-3">
                Environment *
              </label>
              <div className="grid grid-cols-1 gap-3">
                {environments.map((env) => (
                  <label
                    key={env.name}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                      ${selectedEnvironment === env.name
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-muted/20 hover:bg-muted/30'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="environment"
                      value={env.name}
                      checked={selectedEnvironment === env.name}
                      onChange={(e) => setSelectedEnvironment(e.target.value)}
                      disabled={isDeploying}
                      className="border-border text-primary focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <EnvironmentBadge environment={env.name} />
                        <span className="text-sm text-muted-foreground">
                          {env.region} • {env.replicas} replicas
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {env.resources.cpu} CPU • {env.resources.memory} RAM • {env.resources.storage} Storage
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Deployment Details */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="version" className="block text-sm font-medium text-foreground mb-2">
                  Version *
                </label>
                <input
                  id="version"
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g., 1.2.3"
                  disabled={isDeploying}
                  required
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg
                           text-foreground placeholder-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                />
              </div>

              <div>
                <label htmlFor="branch" className="block text-sm font-medium text-foreground mb-2">
                  Branch *
                </label>
                <input
                  id="branch"
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="e.g., main, develop"
                  disabled={isDeploying}
                  required
                  className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg
                           text-foreground placeholder-muted-foreground
                           focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                />
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="commitSha" className="block text-sm font-medium text-foreground mb-2">
                Commit SHA (optional)
              </label>
              <input
                id="commitSha"
                type="text"
                value={commitSha}
                onChange={(e) => setCommitSha(e.target.value)}
                placeholder="Leave empty for latest commit"
                disabled={isDeploying}
                className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg
                         text-foreground placeholder-muted-foreground
                         focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              />
            </div>

            {/* Warnings */}
            {selectedEnv?.tier === 'production' && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-yellow-400 mb-1">Production Deployment</h3>
                    <p className="text-sm text-yellow-200/80">
                      You are deploying to production. This will affect all users immediately.
                      Ensure your changes have been tested thoroughly.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedServiceConfig?.requiresApproval && selectedEnv?.tier === 'production' && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-400 mb-1">Approval Required</h3>
                    <p className="text-sm text-blue-200/80">
                      This service requires approval for production deployments. The deployment will be
                      queued for review after creation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Estimated Timeline */}
            {selectedServiceConfig && (
              <div className="mb-6 p-4 bg-muted/20 rounded-lg">
                <h3 className="text-sm font-medium text-foreground mb-3">Estimated Timeline</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Build & Test:</span>
                    <span className="text-foreground">~{formatEstimatedTime(selectedServiceConfig.estimatedDeployTime * 0.6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deployment:</span>
                    <span className="text-foreground">~{formatEstimatedTime(selectedServiceConfig.estimatedDeployTime * 0.3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Health Checks:</span>
                    <span className="text-foreground">~{formatEstimatedTime(selectedServiceConfig.estimatedDeployTime * 0.1)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between font-medium">
                    <span className="text-foreground">Total Time:</span>
                    <span className="text-foreground">~{formatEstimatedTime(selectedServiceConfig.estimatedDeployTime)}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isDeploying}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground
                         border border-border rounded-lg hover:bg-muted/50 transition-colors
                         disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isDeploying || !selectedService || !selectedEnvironment || !version || !branch}
                className="px-6 py-2 text-sm font-medium bg-primary hover:bg-primary/80
                         text-primary-foreground rounded-lg transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
              >
                {isDeploying ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <RocketLaunchIcon className="w-4 h-4" />
                    </motion.div>
                    Creating Deployment...
                  </>
                ) : (
                  <>
                    <RocketLaunchIcon className="w-4 h-4" />
                    Create Deployment
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
