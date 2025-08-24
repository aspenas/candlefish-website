import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, format, addDays, isPast } from 'date-fns'
import {
  KeyIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  CalendarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { SecretRotation, EnvironmentType } from '../../types/deployment.types'
import { useSecretRotations, useDeploymentOperations } from '../../hooks/useDeploymentOperations'
import { EnvironmentBadge } from './EnvironmentSelector'

interface SecretRotationManagerProps {
  environment: EnvironmentType
  onRotationComplete?: () => void
}

interface RotateSecretModalProps {
  isOpen: boolean
  onClose: () => void
  secretRotation?: SecretRotation
  environment: EnvironmentType
  onConfirm: (environments: EnvironmentType[], rotationType: 'immediate' | 'scheduled', scheduledTime?: string) => Promise<void>
}

const secretTypeConfig = {
  api_key: {
    icon: KeyIcon,
    label: 'API Key',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    description: 'External service API key'
  },
  database: {
    icon: KeyIcon,
    label: 'Database',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    description: 'Database connection credentials'
  },
  jwt: {
    icon: ShieldCheckIcon,
    label: 'JWT Secret',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    description: 'JWT signing secret'
  },
  oauth: {
    icon: ShieldCheckIcon,
    label: 'OAuth',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20',
    description: 'OAuth client credentials'
  },
  certificate: {
    icon: ShieldCheckIcon,
    label: 'Certificate',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    description: 'TLS/SSL certificate'
  }
}

const validationStatusConfig = {
  valid: {
    icon: CheckCircleIcon,
    color: 'text-green-400',
    label: 'Valid'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-400',
    label: 'Warning'
  },
  expired: {
    icon: XCircleIcon,
    color: 'text-red-400',
    label: 'Expired'
  },
  invalid: {
    icon: XCircleIcon,
    color: 'text-red-400',
    label: 'Invalid'
  }
}

function RotateSecretModal({
  isOpen,
  onClose,
  secretRotation,
  environment,
  onConfirm
}: RotateSecretModalProps) {
  const [selectedEnvironments, setSelectedEnvironments] = useState<EnvironmentType[]>([environment])
  const [rotationType, setRotationType] = useState<'immediate' | 'scheduled'>('immediate')
  const [scheduledTime, setScheduledTime] = useState('')
  const [isRotating, setIsRotating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allEnvironments: EnvironmentType[] = ['production', 'staging', 'preview']

  useEffect(() => {
    if (isOpen && secretRotation) {
      setSelectedEnvironments(secretRotation.environments || [environment])
    }
  }, [isOpen, secretRotation, environment])

  const handleConfirm = async () => {
    if (selectedEnvironments.length === 0) {
      setError('Please select at least one environment')
      return
    }

    if (rotationType === 'scheduled' && !scheduledTime) {
      setError('Please select a scheduled time')
      return
    }

    setIsRotating(true)
    setError(null)

    try {
      await onConfirm(selectedEnvironments, rotationType, scheduledTime || undefined)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate secret')
    } finally {
      setIsRotating(false)
    }
  }

  const handleClose = () => {
    if (!isRotating) {
      setSelectedEnvironments([environment])
      setRotationType('immediate')
      setScheduledTime('')
      setError(null)
      onClose()
    }
  }

  if (!isOpen || !secretRotation) return null

  const typeConfig = secretTypeConfig[secretRotation.type]

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
          className="glass-card max-w-2xl w-full"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${typeConfig.bgColor} rounded-lg`}>
                <typeConfig.icon className={`w-6 h-6 ${typeConfig.color}`} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Rotate Secret</h2>
                <p className="text-sm text-muted-foreground">
                  {secretRotation.service} - {secretRotation.secretName}
                </p>
              </div>
            </div>
          </div>

          {/* Secret Info */}
          <div className="mb-6 p-4 bg-muted/20 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <span className="ml-2 text-foreground">{typeConfig.label}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Service:</span>
                <span className="ml-2 text-foreground">{secretRotation.service}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Rotated:</span>
                <span className="ml-2 text-foreground">
                  {formatDistanceToNow(new Date(secretRotation.lastRotated), { addSuffix: true })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Next Rotation:</span>
                <span className="ml-2 text-foreground">
                  {formatDistanceToNow(new Date(secretRotation.nextRotation), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>

          {/* Environment Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-foreground mb-3">Environments</h3>
            <div className="space-y-2">
              {allEnvironments.map((env) => (
                <label key={env} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEnvironments.includes(env)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEnvironments([...selectedEnvironments, env])
                      } else {
                        setSelectedEnvironments(selectedEnvironments.filter(e => e !== env))
                      }
                    }}
                    disabled={isRotating}
                    className="rounded border-border text-primary focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                  />
                  <EnvironmentBadge environment={env} />
                </label>
              ))}
            </div>
          </div>

          {/* Rotation Type */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-foreground mb-3">Rotation Type</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="rotationType"
                  value="immediate"
                  checked={rotationType === 'immediate'}
                  onChange={(e) => setRotationType(e.target.value as 'immediate' | 'scheduled')}
                  disabled={isRotating}
                  className="border-border text-primary focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                />
                <div>
                  <div className="font-medium text-foreground">Immediate</div>
                  <div className="text-sm text-muted-foreground">Rotate secret immediately</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg cursor-pointer">
                <input
                  type="radio"
                  name="rotationType"
                  value="scheduled"
                  checked={rotationType === 'scheduled'}
                  onChange={(e) => setRotationType(e.target.value as 'immediate' | 'scheduled')}
                  disabled={isRotating}
                  className="border-border text-primary focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                />
                <div className="flex-1">
                  <div className="font-medium text-foreground">Scheduled</div>
                  <div className="text-sm text-muted-foreground mb-2">Schedule rotation for later</div>
                  {rotationType === 'scheduled' && (
                    <input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd\'T\'HH:mm')}
                      disabled={isRotating}
                      className="px-3 py-1.5 bg-muted/50 border border-border rounded text-foreground
                               focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isRotating}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground
                       border border-border rounded-lg hover:bg-muted/50 transition-colors
                       disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={handleConfirm}
              disabled={isRotating || selectedEnvironments.length === 0}
              className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/80
                       text-primary-foreground rounded-lg transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
            >
              {isRotating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </motion.div>
                  Rotating...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-4 h-4" />
                  Rotate Secret
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function SecretCard({
  secretRotation,
  onRotate
}: {
  secretRotation: SecretRotation
  onRotate: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)

  const typeConfig = secretTypeConfig[secretRotation.type]
  const statusConfig = validationStatusConfig[secretRotation.validationStatus]

  const isOverdue = isPast(new Date(secretRotation.nextRotation))
  const isExpiringSoon = !isOverdue &&
    new Date(secretRotation.nextRotation).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 // 7 days

  const urgency = isOverdue ? 'critical' : isExpiringSoon ? 'warning' : 'normal'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        glass-card transition-all duration-200 hover:border-primary/30
        ${urgency === 'critical' ? 'ring-1 ring-red-500/30' : ''}
        ${urgency === 'warning' ? 'ring-1 ring-yellow-500/30' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${typeConfig.bgColor} rounded-lg`}>
            <typeConfig.icon className={`w-5 h-5 ${typeConfig.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{secretRotation.secretName}</h3>
            <p className="text-sm text-muted-foreground">{secretRotation.service}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`p-1 ${statusConfig.color === 'text-green-400' ? 'bg-green-500/20' :
                                 statusConfig.color === 'text-yellow-400' ? 'bg-yellow-500/20' : 'bg-red-500/20'} rounded`}>
            <statusConfig.icon className={`w-3 h-3 ${statusConfig.color}`} />
          </div>
        </div>
      </div>

      {/* Status and Type */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Type:</span>
          <span className={`text-sm font-medium ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <span className={`text-sm font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Rotation Info */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Last Rotated:</span>
          <span className="text-foreground">
            {formatDistanceToNow(new Date(secretRotation.lastRotated), { addSuffix: true })}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Next Rotation:</span>
          <span className={`${
            isOverdue ? 'text-red-400' : isExpiringSoon ? 'text-yellow-400' : 'text-foreground'
          }`}>
            {isOverdue ? 'Overdue' : formatDistanceToNow(new Date(secretRotation.nextRotation), { addSuffix: true })}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Rotated By:</span>
          <span className="text-foreground">{secretRotation.rotatedBy}</span>
        </div>
      </div>

      {/* Environments */}
      <div className="mb-4">
        <div className="text-sm text-muted-foreground mb-2">Environments:</div>
        <div className="flex flex-wrap gap-2">
          {secretRotation.environments.map((env) => (
            <EnvironmentBadge key={env} environment={env} showStatus={false} />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors
                   flex items-center gap-1"
        >
          {showDetails ? (
            <>
              <EyeSlashIcon className="w-4 h-4" />
              Hide Details
            </>
          ) : (
            <>
              <EyeIcon className="w-4 h-4" />
              Show Details
            </>
          )}
        </button>

        <button
          onClick={onRotate}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1
            ${urgency === 'critical' ? 'bg-red-500 hover:bg-red-600 text-white' :
              urgency === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
              'bg-primary hover:bg-primary/80 text-primary-foreground'}
          `}
        >
          <ArrowPathIcon className="w-3 h-3" />
          Rotate Now
        </button>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-border"
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="text-foreground">
                  {format(new Date(secretRotation.lastRotated), 'PPp')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Due:</span>
                <span className="text-foreground">
                  {format(new Date(secretRotation.nextRotation), 'PPp')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Validation:</span>
                <span className={statusConfig.color}>
                  {secretRotation.validationStatus.charAt(0).toUpperCase() + secretRotation.validationStatus.slice(1)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function SecretRotationManager({
  environment,
  onRotationComplete
}: SecretRotationManagerProps) {
  const [selectedSecret, setSelectedSecret] = useState<SecretRotation | null>(null)
  const [showRotateModal, setShowRotateModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'expired' | 'warning' | 'valid'>('all')

  const { secretRotations, loading, refetch } = useSecretRotations()
  const { rotateSecret } = useDeploymentOperations()

  // Filter secrets by environment and status
  const filteredSecrets = secretRotations.filter((secret) => {
    const hasEnvironment = secret.environments.includes(environment)

    if (!hasEnvironment) return false

    if (filterStatus === 'all') return true
    if (filterStatus === 'expired') return secret.validationStatus === 'expired' || isPast(new Date(secret.nextRotation))
    if (filterStatus === 'warning') return secret.validationStatus === 'warning' ||
      (!isPast(new Date(secret.nextRotation)) && new Date(secret.nextRotation).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000)
    if (filterStatus === 'valid') return secret.validationStatus === 'valid' && !isPast(new Date(secret.nextRotation))

    return true
  })

  const handleRotateSecret = async (environments: EnvironmentType[], rotationType: 'immediate' | 'scheduled', scheduledTime?: string) => {
    if (!selectedSecret) return

    await rotateSecret({
      service: selectedSecret.service,
      secretName: selectedSecret.secretName,
      environments,
      triggeredBy: 'current_user', // Would get from auth context
      rotationType,
      scheduledTime
    })

    refetch()
    onRotationComplete?.()
  }

  const openRotateModal = (secret: SecretRotation) => {
    setSelectedSecret(secret)
    setShowRotateModal(true)
  }

  const closeRotateModal = () => {
    setSelectedSecret(null)
    setShowRotateModal(false)
  }

  // Calculate stats
  const expiredCount = filteredSecrets.filter(s => isPast(new Date(s.nextRotation)) || s.validationStatus === 'expired').length
  const warningCount = filteredSecrets.filter(s =>
    !isPast(new Date(s.nextRotation)) &&
    new Date(s.nextRotation).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 ||
    s.validationStatus === 'warning'
  ).length
  const validCount = filteredSecrets.filter(s => s.validationStatus === 'valid' && !isPast(new Date(s.nextRotation))).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Secret Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage and rotate secrets for the {environment} environment
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 bg-muted/50 border border-border rounded-lg text-foreground
                     focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            <option value="all">All Secrets</option>
            <option value="expired">Expired</option>
            <option value="warning">Expiring Soon</option>
            <option value="valid">Valid</option>
          </select>

          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
            aria-label="Refresh secrets"
          >
            <ArrowPathIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-red-400">{expiredCount}</div>
              <div className="text-sm text-muted-foreground">Expired</div>
            </div>
            <XCircleIcon className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-yellow-400">{warningCount}</div>
              <div className="text-sm text-muted-foreground">Expiring Soon</div>
            </div>
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-green-400">{validCount}</div>
              <div className="text-sm text-muted-foreground">Valid</div>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Secrets Grid */}
      {filteredSecrets.length === 0 ? (
        <div className="glass-card text-center py-12">
          <KeyIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Secrets Found</h3>
          <p className="text-muted-foreground">
            No secrets found for the {environment} environment with the current filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSecrets
            .sort((a, b) => {
              // Sort by urgency: expired -> warning -> valid
              const aUrgent = isPast(new Date(a.nextRotation)) || a.validationStatus === 'expired'
              const bUrgent = isPast(new Date(b.nextRotation)) || b.validationStatus === 'expired'

              if (aUrgent && !bUrgent) return -1
              if (!aUrgent && bUrgent) return 1

              return new Date(a.nextRotation).getTime() - new Date(b.nextRotation).getTime()
            })
            .map((secret) => (
              <SecretCard
                key={secret.id}
                secretRotation={secret}
                onRotate={() => openRotateModal(secret)}
              />
            ))}
        </div>
      )}

      {/* Rotate Secret Modal */}
      <RotateSecretModal
        isOpen={showRotateModal}
        onClose={closeRotateModal}
        secretRotation={selectedSecret}
        environment={environment}
        onConfirm={handleRotateSecret}
      />
    </div>
  )
}
